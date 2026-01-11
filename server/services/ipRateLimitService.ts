import { db } from "../db";
import { ipRateLimits, ipBlacklist } from "../../drizzle/schema";
import { eq, and, gt, lt, sql } from "drizzle-orm";

// IP频率限制配置
export const IP_RATE_LIMIT_CONFIG = {
  // 短信发送限制
  SMS_SEND: {
    action: "sms_send",
    maxRequests: 10, // 每个时间窗口最大请求数
    windowMinutes: 60, // 时间窗口（分钟）
    blockDurationMinutes: 120, // 超限后封禁时长（分钟）
  },
  // 验证码请求限制
  CAPTCHA_REQUEST: {
    action: "captcha_request",
    maxRequests: 30, // 每个时间窗口最大请求数
    windowMinutes: 60, // 时间窗口（分钟）
    blockDurationMinutes: 60, // 超限后封禁时长（分钟）
  },
  // 登录尝试限制
  LOGIN_ATTEMPT: {
    action: "login_attempt",
    maxRequests: 20, // 每个时间窗口最大请求数
    windowMinutes: 60, // 时间窗口（分钟）
    blockDurationMinutes: 30, // 超限后封禁时长（分钟）
  },
};

export type RateLimitAction = keyof typeof IP_RATE_LIMIT_CONFIG;

/**
 * 检查IP是否在黑名单中
 */
export async function isIpBlacklisted(ipAddress: string): Promise<boolean> {
  const now = new Date();
  
  const blacklistEntry = await db
    .select()
    .from(ipBlacklist)
    .where(
      and(
        eq(ipBlacklist.ipAddress, ipAddress),
        eq(ipBlacklist.isActive, 1)
      )
    )
    .limit(1);

  if (blacklistEntry.length === 0) {
    return false;
  }

  const entry = blacklistEntry[0];
  
  // 如果有过期时间且已过期，则自动解除封禁
  if (entry.expiresAt && entry.expiresAt < now) {
    await db
      .update(ipBlacklist)
      .set({ isActive: 0 })
      .where(eq(ipBlacklist.id, entry.id));
    return false;
  }

  return true;
}

/**
 * 检查IP频率限制
 * @returns { allowed: boolean, remainingRequests: number, resetTime: Date | null }
 */
export async function checkIpRateLimit(
  ipAddress: string,
  actionType: RateLimitAction
): Promise<{
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date | null;
  blockedUntil: Date | null;
  reason?: string;
}> {
  // 首先检查黑名单
  if (await isIpBlacklisted(ipAddress)) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: null,
      blockedUntil: null,
      reason: "IP已被永久封禁",
    };
  }

  const config = IP_RATE_LIMIT_CONFIG[actionType];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000);

  // 查找当前时间窗口内的记录
  const existingRecord = await db
    .select()
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.ipAddress, ipAddress),
        eq(ipRateLimits.action, config.action),
        gt(ipRateLimits.windowEnd, now)
      )
    )
    .limit(1);

  // 如果存在记录且被封禁
  if (existingRecord.length > 0 && existingRecord[0].blocked === 1) {
    const record = existingRecord[0];
    if (record.blockedUntil && record.blockedUntil > now) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: record.windowEnd,
        blockedUntil: record.blockedUntil,
        reason: `请求过于频繁，请在 ${Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 60000)} 分钟后重试`,
      };
    }
    // 封禁已过期，重置记录
    await db
      .update(ipRateLimits)
      .set({
        blocked: 0,
        blockedUntil: null,
        requestCount: 0,
        windowStart: now,
        windowEnd: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
      })
      .where(eq(ipRateLimits.id, record.id));
  }

  // 如果存在有效记录
  if (existingRecord.length > 0 && existingRecord[0].blocked === 0) {
    const record = existingRecord[0];
    const remainingRequests = config.maxRequests - record.requestCount;

    if (remainingRequests <= 0) {
      // 超过限制，封禁IP
      const blockedUntil = new Date(now.getTime() + config.blockDurationMinutes * 60 * 1000);
      await db
        .update(ipRateLimits)
        .set({
          blocked: 1,
          blockedUntil,
        })
        .where(eq(ipRateLimits.id, record.id));

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: record.windowEnd,
        blockedUntil,
        reason: `请求过于频繁，已被暂时封禁 ${config.blockDurationMinutes} 分钟`,
      };
    }

    return {
      allowed: true,
      remainingRequests,
      resetTime: record.windowEnd,
      blockedUntil: null,
    };
  }

  // 没有记录，创建新记录
  return {
    allowed: true,
    remainingRequests: config.maxRequests,
    resetTime: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
    blockedUntil: null,
  };
}

/**
 * 记录IP请求
 */
export async function recordIpRequest(
  ipAddress: string,
  actionType: RateLimitAction
): Promise<void> {
  const config = IP_RATE_LIMIT_CONFIG[actionType];
  const now = new Date();
  const windowEnd = new Date(now.getTime() + config.windowMinutes * 60 * 1000);

  // 查找当前时间窗口内的记录
  const existingRecord = await db
    .select()
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.ipAddress, ipAddress),
        eq(ipRateLimits.action, config.action),
        gt(ipRateLimits.windowEnd, now)
      )
    )
    .limit(1);

  if (existingRecord.length > 0) {
    // 更新现有记录
    await db
      .update(ipRateLimits)
      .set({
        requestCount: sql`${ipRateLimits.requestCount} + 1`,
      })
      .where(eq(ipRateLimits.id, existingRecord[0].id));
  } else {
    // 创建新记录
    await db.insert(ipRateLimits).values({
      ipAddress,
      action: config.action,
      requestCount: 1,
      windowStart: now,
      windowEnd,
      blocked: 0,
    });
  }
}

/**
 * 将IP加入黑名单
 */
export async function addToBlacklist(params: {
  ipAddress: string;
  reason: string;
  blockedBy?: string;
  expiresAt?: Date;
}): Promise<void> {
  const { ipAddress, reason, blockedBy, expiresAt } = params;

  // 检查是否已存在
  const existing = await db
    .select()
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ipAddress, ipAddress))
    .limit(1);

  if (existing.length > 0) {
    // 更新现有记录
    await db
      .update(ipBlacklist)
      .set({
        reason,
        blockedBy: blockedBy || "system",
        blockedAt: new Date(),
        expiresAt: expiresAt || null,
        isActive: 1,
      })
      .where(eq(ipBlacklist.id, existing[0].id));
  } else {
    // 创建新记录
    await db.insert(ipBlacklist).values({
      ipAddress,
      reason,
      blockedBy: blockedBy || "system",
      blockedAt: new Date(),
      expiresAt: expiresAt || null,
      isActive: 1,
    });
  }
}

/**
 * 从黑名单移除IP
 */
export async function removeFromBlacklist(ipAddress: string): Promise<void> {
  await db
    .update(ipBlacklist)
    .set({ isActive: 0 })
    .where(eq(ipBlacklist.ipAddress, ipAddress));
}

/**
 * 获取IP的频率限制状态
 */
export async function getIpRateLimitStatus(ipAddress: string): Promise<{
  actions: Array<{
    action: string;
    requestCount: number;
    maxRequests: number;
    windowEnd: Date;
    blocked: boolean;
    blockedUntil: Date | null;
  }>;
  isBlacklisted: boolean;
}> {
  const now = new Date();

  // 获取所有活跃的限制记录
  const records = await db
    .select()
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.ipAddress, ipAddress),
        gt(ipRateLimits.windowEnd, now)
      )
    );

  const actions = records.map((record) => {
    const actionKey = Object.keys(IP_RATE_LIMIT_CONFIG).find(
      (key) => IP_RATE_LIMIT_CONFIG[key as RateLimitAction].action === record.action
    ) as RateLimitAction | undefined;

    const maxRequests = actionKey
      ? IP_RATE_LIMIT_CONFIG[actionKey].maxRequests
      : 0;

    return {
      action: record.action,
      requestCount: record.requestCount,
      maxRequests,
      windowEnd: record.windowEnd,
      blocked: record.blocked === 1,
      blockedUntil: record.blockedUntil,
    };
  });

  const isBlacklisted = await isIpBlacklisted(ipAddress);

  return {
    actions,
    isBlacklisted,
  };
}

/**
 * 清理过期的频率限制记录
 */
export async function cleanupExpiredRecords(): Promise<number> {
  const now = new Date();

  // 删除过期的频率限制记录
  const result = await db
    .delete(ipRateLimits)
    .where(lt(ipRateLimits.windowEnd, now));

  return 0; // MySQL不返回删除行数
}

/**
 * 获取被封禁的IP列表
 */
export async function getBlockedIps(): Promise<Array<{
  ipAddress: string;
  action: string;
  blockedUntil: Date | null;
  requestCount: number;
}>> {
  const now = new Date();

  const records = await db
    .select({
      ipAddress: ipRateLimits.ipAddress,
      action: ipRateLimits.action,
      blockedUntil: ipRateLimits.blockedUntil,
      requestCount: ipRateLimits.requestCount,
    })
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.blocked, 1),
        gt(ipRateLimits.blockedUntil, now)
      )
    );

  return records;
}

/**
 * 获取黑名单列表
 */
export async function getBlacklist(): Promise<Array<{
  id: number;
  ipAddress: string;
  reason: string;
  blockedBy: string | null;
  blockedAt: Date;
  expiresAt: Date | null;
}>> {
  const records = await db
    .select({
      id: ipBlacklist.id,
      ipAddress: ipBlacklist.ipAddress,
      reason: ipBlacklist.reason,
      blockedBy: ipBlacklist.blockedBy,
      blockedAt: ipBlacklist.blockedAt,
      expiresAt: ipBlacklist.expiresAt,
    })
    .from(ipBlacklist)
    .where(eq(ipBlacklist.isActive, 1));

  return records;
}
