/**
 * 登录安全服务
 * 实现登录失败次数限制、异地登录检测、设备管理等功能
 */

import { db } from "../db";
import { 
  loginAttempts, 
  loginLocks, 
  userDevices, 
  loginLogs, 
  securityAlerts,
  users
} from "../../drizzle/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// 安全配置
const SECURITY_CONFIG = {
  maxFailedAttempts: 5,        // 最大失败次数
  lockDurationMinutes: 30,     // 锁定时长（分钟）
  attemptWindowMinutes: 15,    // 失败计数窗口（分钟）
  newLocationAlertEnabled: true, // 是否启用异地登录提醒
};

/**
 * 生成设备ID
 */
export function generateDeviceId(userAgent: string, ipAddress: string): string {
  const data = `${userAgent}-${ipAddress}`;
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 16);
}

/**
 * 解析User-Agent获取设备信息
 */
export function parseUserAgent(userAgent: string): {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();
  
  // 设备类型 - 注意检测顺序，iPad优先于mobile
  let deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'unknown';
  if (/tablet|ipad/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/windows|macintosh|linux/i.test(ua)) {
    deviceType = 'desktop';
  }

  // 浏览器
  let browser = 'Unknown';
  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/edge|edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/msie|trident/i.test(ua)) {
    browser = 'IE';
  }

  // 操作系统 - 注意检测顺序，移动设备优先
  let os = 'Unknown';
  if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  return { deviceType, browser, os };
}

/**
 * 检查账号是否被锁定
 */
export async function checkAccountLock(
  identifier: string,
  identifierType: 'phone' | 'username' | 'email' | 'wechat'
): Promise<{ isLocked: boolean; unlocksAt?: Date; remainingMinutes?: number }> {
  const now = new Date();
  
  const locks = await db
    .select()
    .from(loginLocks)
    .where(
      and(
        eq(loginLocks.identifier, identifier),
        eq(loginLocks.identifierType, identifierType),
        gt(loginLocks.unlocksAt, now.toISOString())
      )
    )
    .limit(1);

  if (locks.length > 0) {
    const lock = locks[0];
    const unlocksAt = new Date(lock.unlocksAt);
    const remainingMinutes = Math.ceil((unlocksAt.getTime() - now.getTime()) / 60000);
    
    return {
      isLocked: true,
      unlocksAt,
      remainingMinutes,
    };
  }

  return { isLocked: false };
}

/**
 * 记录登录尝试
 */
export async function recordLoginAttempt(params: {
  identifier: string;
  identifierType: 'phone' | 'username' | 'email' | 'wechat';
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failReason?: string;
}): Promise<void> {
  await db.insert(loginAttempts).values({
    identifier: params.identifier,
    identifierType: params.identifierType,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success ? 1 : 0,
    failReason: params.failReason,
  });

  // 如果登录失败，检查是否需要锁定账号
  if (!params.success) {
    await checkAndLockAccount(params.identifier, params.identifierType);
  }
}

/**
 * 检查并锁定账号
 */
async function checkAndLockAccount(
  identifier: string,
  identifierType: 'phone' | 'username' | 'email' | 'wechat'
): Promise<void> {
  const windowStart = new Date(Date.now() - SECURITY_CONFIG.attemptWindowMinutes * 60 * 1000);
  
  // 统计窗口期内的失败次数
  const failedAttempts = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, identifier),
        eq(loginAttempts.identifierType, identifierType),
        eq(loginAttempts.success, 0),
        gt(loginAttempts.createdAt, windowStart.toISOString())
      )
    );

  const failCount = failedAttempts[0]?.count || 0;

  if (failCount >= SECURITY_CONFIG.maxFailedAttempts) {
    // 锁定账号
    const unlocksAt = new Date(Date.now() + SECURITY_CONFIG.lockDurationMinutes * 60 * 1000);
    
    await db.insert(loginLocks).values({
      identifier,
      identifierType,
      lockReason: `连续${failCount}次登录失败`,
      failedAttempts: failCount,
      unlocksAt: unlocksAt.toISOString(),
    });

    // 如果能找到对应用户，创建安全告警
    const user = await findUserByIdentifier(identifier, identifierType);
    if (user) {
      await createSecurityAlert({
        userId: user.id,
        alertType: 'account_locked',
        title: '账号已被锁定',
        description: `由于连续${failCount}次登录失败，您的账号已被锁定${SECURITY_CONFIG.lockDurationMinutes}分钟`,
      });
    }
  }
}

/**
 * 根据标识符查找用户
 */
async function findUserByIdentifier(
  identifier: string,
  identifierType: 'phone' | 'username' | 'email' | 'wechat'
) {
  let whereClause;
  switch (identifierType) {
    case 'phone':
      whereClause = eq(users.phone, identifier);
      break;
    case 'username':
      whereClause = eq(users.username, identifier);
      break;
    case 'email':
      whereClause = eq(users.email, identifier);
      break;
    case 'wechat':
      whereClause = eq(users.wechat_open_id, identifier);
      break;
  }

  const result = await db
    .select()
    .from(users)
    .where(whereClause)
    .limit(1);

  return result[0] || null;
}

/**
 * 记录登录日志
 */
export async function recordLoginLog(params: {
  userId?: number;
  loginMethod: 'phone' | 'username' | 'wechat' | 'oauth' | 'email';
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failReason?: string;
}): Promise<{ isNewDevice: boolean; isNewLocation: boolean; riskLevel: 'low' | 'medium' | 'high' }> {
  const deviceId = params.userAgent 
    ? generateDeviceId(params.userAgent, params.ipAddress) 
    : null;
  
  let isNewDevice = false;
  let isNewLocation = false;
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (params.userId && params.success) {
    // 检查是否是新设备
    if (deviceId) {
      const existingDevice = await db
        .select()
        .from(userDevices)
        .where(
          and(
            eq(userDevices.userId, params.userId),
            eq(userDevices.deviceId, deviceId)
          )
        )
        .limit(1);

      isNewDevice = existingDevice.length === 0;

      if (isNewDevice && params.userAgent) {
        // 记录新设备
        const deviceInfo = parseUserAgent(params.userAgent);
        await db.insert(userDevices).values({
          userId: params.userId,
          deviceId,
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ipAddress: params.ipAddress,
        });
      } else if (!isNewDevice) {
        // 更新设备最后活跃时间
        await db
          .update(userDevices)
          .set({ 
            lastActiveAt: new Date().toISOString(),
            ipAddress: params.ipAddress,
          })
          .where(
            and(
              eq(userDevices.userId, params.userId),
              eq(userDevices.deviceId, deviceId)
            )
          );
      }
    }

    // 检查是否是新位置（简单实现：检查IP是否出现过）
    const existingLocation = await db
      .select()
      .from(loginLogs)
      .where(
        and(
          eq(loginLogs.userId, params.userId),
          eq(loginLogs.ipAddress, params.ipAddress),
          eq(loginLogs.success, 1)
        )
      )
      .limit(1);

    isNewLocation = existingLocation.length === 0;

    // 计算风险等级
    if (isNewDevice && isNewLocation) {
      riskLevel = 'high';
    } else if (isNewDevice || isNewLocation) {
      riskLevel = 'medium';
    }

    // 如果是新设备或新位置，创建安全告警
    if (isNewDevice && SECURITY_CONFIG.newLocationAlertEnabled) {
      await createSecurityAlert({
        userId: params.userId,
        alertType: 'new_device',
        title: '检测到新设备登录',
        description: `您的账号在新设备上登录，IP地址：${params.ipAddress}`,
        ipAddress: params.ipAddress,
        deviceInfo: params.userAgent,
      });
    }

    if (isNewLocation && SECURITY_CONFIG.newLocationAlertEnabled) {
      await createSecurityAlert({
        userId: params.userId,
        alertType: 'new_location',
        title: '检测到异地登录',
        description: `您的账号在新的IP地址登录：${params.ipAddress}`,
        ipAddress: params.ipAddress,
      });
    }
  }

  // 记录登录日志
  await db.insert(loginLogs).values({
    userId: params.userId,
    loginMethod: params.loginMethod,
    ipAddress: params.ipAddress,
    deviceId,
    userAgent: params.userAgent,
    success: params.success ? 1 : 0,
    failReason: params.failReason,
    isNewDevice: isNewDevice ? 1 : 0,
    isNewLocation: isNewLocation ? 1 : 0,
    riskLevel,
  });

  return { isNewDevice, isNewLocation, riskLevel };
}

/**
 * 创建安全告警
 */
export async function createSecurityAlert(params: {
  userId: number;
  alertType: 'new_device' | 'new_location' | 'multiple_failures' | 'suspicious_activity' | 'account_locked';
  title: string;
  description?: string;
  ipAddress?: string;
  location?: string;
  deviceInfo?: string;
}): Promise<void> {
  await db.insert(securityAlerts).values({
    userId: params.userId,
    alertType: params.alertType,
    title: params.title,
    description: params.description,
    ipAddress: params.ipAddress,
    location: params.location,
    deviceInfo: params.deviceInfo,
  });
}

/**
 * 获取用户的安全告警
 */
export async function getUserSecurityAlerts(
  userId: number,
  limit: number = 20
): Promise<typeof securityAlerts.$inferSelect[]> {
  return db
    .select()
    .from(securityAlerts)
    .where(eq(securityAlerts.userId, userId))
    .orderBy(desc(securityAlerts.createdAt))
    .limit(limit);
}

/**
 * 标记告警为已读
 */
export async function markAlertAsRead(alertId: number, userId: number): Promise<void> {
  await db
    .update(securityAlerts)
    .set({ isRead: 1 })
    .where(
      and(
        eq(securityAlerts.id, alertId),
        eq(securityAlerts.userId, userId)
      )
    );
}

/**
 * 获取用户的登录设备列表
 */
export async function getUserDevices(userId: number): Promise<typeof userDevices.$inferSelect[]> {
  return db
    .select()
    .from(userDevices)
    .where(eq(userDevices.userId, userId))
    .orderBy(desc(userDevices.lastActiveAt));
}

/**
 * 删除用户设备
 */
export async function removeUserDevice(deviceId: number, userId: number): Promise<void> {
  await db
    .delete(userDevices)
    .where(
      and(
        eq(userDevices.id, deviceId),
        eq(userDevices.userId, userId)
      )
    );
}

/**
 * 设置设备为可信设备
 */
export async function setDeviceTrusted(deviceId: number, userId: number, trusted: boolean): Promise<void> {
  await db
    .update(userDevices)
    .set({ isTrusted: trusted ? 1 : 0 })
    .where(
      and(
        eq(userDevices.id, deviceId),
        eq(userDevices.userId, userId)
      )
    );
}

/**
 * 获取用户的登录历史
 */
export async function getUserLoginHistory(
  userId: number,
  limit: number = 20
): Promise<typeof loginLogs.$inferSelect[]> {
  return db
    .select()
    .from(loginLogs)
    .where(eq(loginLogs.userId, userId))
    .orderBy(desc(loginLogs.createdAt))
    .limit(limit);
}

/**
 * 清除登录失败记录（用于成功登录后）
 */
export async function clearFailedAttempts(
  identifier: string,
  identifierType: 'phone' | 'username' | 'email' | 'wechat'
): Promise<void> {
  // 删除锁定记录
  await db
    .delete(loginLocks)
    .where(
      and(
        eq(loginLocks.identifier, identifier),
        eq(loginLocks.identifierType, identifierType)
      )
    );
}
