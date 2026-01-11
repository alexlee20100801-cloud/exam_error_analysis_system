/**
 * IP黑名单管理服务
 * 
 * 功能说明：
 * 1. 管理IP黑名单（添加、删除、查询）
 * 2. 检查IP是否被封禁
 * 3. IP封禁统计
 */

import { db } from "../db";
import { ipBlacklist, ipRateLimits } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, or, isNull } from "drizzle-orm";

interface AddToBlacklistParams {
  ipAddress: string;
  reason: string;
  blockedBy?: string;
  expiresAt?: Date | null; // null表示永久封禁
}

interface BlacklistQueryParams {
  ipAddress?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

interface IpBlacklistResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * 检查IP是否在黑名单中
 */
export async function isIpBlocked(ipAddress: string): Promise<{ blocked: boolean; reason?: string; expiresAt?: Date | null }> {
  const now = new Date();

  const [record] = await db
    .select()
    .from(ipBlacklist)
    .where(
      and(
        eq(ipBlacklist.ipAddress, ipAddress),
        eq(ipBlacklist.isActive, 1),
        or(
          isNull(ipBlacklist.expiresAt),
          gte(ipBlacklist.expiresAt, now)
        )
      )
    )
    .limit(1);

  if (record) {
    return {
      blocked: true,
      reason: record.reason,
      expiresAt: record.expiresAt,
    };
  }

  return { blocked: false };
}

/**
 * 添加IP到黑名单
 */
export async function addToBlacklist(params: AddToBlacklistParams): Promise<IpBlacklistResult> {
  const { ipAddress, reason, blockedBy, expiresAt } = params;

  // 验证IP格式
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
    return {
      success: false,
      message: "IP地址格式不正确",
      error: "INVALID_IP_FORMAT",
    };
  }

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
        blockedBy: blockedBy || "admin",
        blockedAt: new Date(),
        expiresAt: expiresAt || null,
        isActive: 1,
      })
      .where(eq(ipBlacklist.ipAddress, ipAddress));

    return {
      success: true,
      message: "IP黑名单已更新",
    };
  }

  // 创建新记录
  await db.insert(ipBlacklist).values({
    ipAddress,
    reason,
    blockedBy: blockedBy || "admin",
    blockedAt: new Date(),
    expiresAt: expiresAt || null,
    isActive: 1,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    message: "IP已添加到黑名单",
  };
}

/**
 * 从黑名单移除IP（解封）
 */
export async function removeFromBlacklist(ipAddress: string): Promise<IpBlacklistResult> {
  const [existing] = await db
    .select()
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ipAddress, ipAddress))
    .limit(1);

  if (!existing) {
    return {
      success: false,
      message: "IP不在黑名单中",
      error: "IP_NOT_FOUND",
    };
  }

  await db
    .update(ipBlacklist)
    .set({ isActive: 0 })
    .where(eq(ipBlacklist.ipAddress, ipAddress));

  return {
    success: true,
    message: "IP已从黑名单移除",
  };
}

/**
 * 查询黑名单列表
 */
export async function getBlacklistEntries(params: BlacklistQueryParams) {
  const { ipAddress, isActive, page = 1, pageSize = 20 } = params;

  const conditions = [];

  if (ipAddress) {
    conditions.push(sql`${ipBlacklist.ipAddress} LIKE ${`%${ipAddress}%`}`);
  }

  if (isActive !== undefined) {
    conditions.push(eq(ipBlacklist.isActive, isActive ? 1 : 0));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, countResult] = await Promise.all([
    db
      .select()
      .from(ipBlacklist)
      .where(whereClause)
      .orderBy(desc(ipBlacklist.blockedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(ipBlacklist)
      .where(whereClause),
  ]);

  return {
    entries: entries.map(entry => ({
      ...entry,
      isPermanent: entry.expiresAt === null,
      isExpired: entry.expiresAt && new Date(entry.expiresAt) < new Date(),
    })),
    total: Number(countResult[0]?.count || 0),
    page,
    pageSize,
    totalPages: Math.ceil(Number(countResult[0]?.count || 0) / pageSize),
  };
}

/**
 * 获取IP封禁统计
 */
export async function getBlacklistStatistics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 总封禁数
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ipBlacklist);

  // 当前活跃封禁数
  const [activeResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ipBlacklist)
    .where(
      and(
        eq(ipBlacklist.isActive, 1),
        or(
          isNull(ipBlacklist.expiresAt),
          gte(ipBlacklist.expiresAt, now)
        )
      )
    );

  // 永久封禁数
  const [permanentResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ipBlacklist)
    .where(
      and(
        eq(ipBlacklist.isActive, 1),
        isNull(ipBlacklist.expiresAt)
      )
    );

  // 最近30天新增封禁
  const [recentResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ipBlacklist)
    .where(gte(ipBlacklist.blockedAt, thirtyDaysAgo));

  // 按封禁原因统计
  const reasonStats = await db
    .select({
      reason: ipBlacklist.reason,
      count: sql<number>`count(*)`,
    })
    .from(ipBlacklist)
    .where(eq(ipBlacklist.isActive, 1))
    .groupBy(ipBlacklist.reason)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // 每日封禁趋势（最近30天）
  const dailyStats = await db
    .select({
      date: sql<string>`DATE(${ipBlacklist.blockedAt})`,
      count: sql<number>`count(*)`,
    })
    .from(ipBlacklist)
    .where(gte(ipBlacklist.blockedAt, thirtyDaysAgo))
    .groupBy(sql`DATE(${ipBlacklist.blockedAt})`)
    .orderBy(sql`DATE(${ipBlacklist.blockedAt})`);

  return {
    total: Number(totalResult?.count || 0),
    active: Number(activeResult?.count || 0),
    permanent: Number(permanentResult?.count || 0),
    recent30Days: Number(recentResult?.count || 0),
    reasonStats: reasonStats.map(r => ({
      reason: r.reason,
      count: Number(r.count),
    })),
    dailyStats: dailyStats.map(d => ({
      date: d.date,
      count: Number(d.count),
    })),
  };
}

/**
 * 批量添加IP到黑名单
 */
export async function batchAddToBlacklist(
  ipAddresses: string[],
  reason: string,
  blockedBy?: string,
  expiresAt?: Date | null
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const ip of ipAddresses) {
    const result = await addToBlacklist({
      ipAddress: ip,
      reason,
      blockedBy,
      expiresAt,
    });

    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push(`${ip}: ${result.message}`);
    }
  }

  return { success, failed, errors };
}

/**
 * 批量解封IP
 */
export async function batchRemoveFromBlacklist(
  ipAddresses: string[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const ip of ipAddresses) {
    const result = await removeFromBlacklist(ip);

    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push(`${ip}: ${result.message}`);
    }
  }

  return { success, failed, errors };
}

/**
 * 清理过期的封禁记录
 */
export async function cleanupExpiredEntries(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(ipBlacklist)
    .set({ isActive: 0 })
    .where(
      and(
        eq(ipBlacklist.isActive, 1),
        lte(ipBlacklist.expiresAt, now)
      )
    );

  // @ts-ignore
  return result.rowsAffected || 0;
}

/**
 * 获取IP的封禁历史
 */
export async function getIpBlockHistory(ipAddress: string) {
  const entries = await db
    .select()
    .from(ipBlacklist)
    .where(eq(ipBlacklist.ipAddress, ipAddress))
    .orderBy(desc(ipBlacklist.blockedAt));

  return entries;
}

/**
 * 检查IP频率限制状态
 */
export async function getIpRateLimitStatus(ipAddress: string) {
  const now = new Date();

  const limits = await db
    .select()
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.ipAddress, ipAddress),
        gte(ipRateLimits.windowEnd, now)
      )
    )
    .orderBy(desc(ipRateLimits.windowEnd));

  return limits.map(limit => ({
    action: limit.action,
    requestCount: limit.requestCount,
    windowStart: limit.windowStart,
    windowEnd: limit.windowEnd,
    blocked: limit.blocked === 1,
    blockedUntil: limit.blockedUntil,
  }));
}

/**
 * 自动封禁频繁触发限制的IP
 */
export async function autoBlockAbusiveIps(
  threshold: number = 10,
  reason: string = "频繁触发频率限制，系统自动封禁"
): Promise<string[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 查找24小时内被封禁次数超过阈值的IP
  const abusiveIps = await db
    .select({
      ipAddress: ipRateLimits.ipAddress,
      blockCount: sql<number>`count(*)`,
    })
    .from(ipRateLimits)
    .where(
      and(
        eq(ipRateLimits.blocked, 1),
        gte(ipRateLimits.windowStart, oneDayAgo)
      )
    )
    .groupBy(ipRateLimits.ipAddress)
    .having(sql`count(*) >= ${threshold}`);

  const blockedIps: string[] = [];

  for (const ip of abusiveIps) {
    // 检查是否已在黑名单
    const isBlocked = await isIpBlocked(ip.ipAddress);
    if (!isBlocked.blocked) {
      await addToBlacklist({
        ipAddress: ip.ipAddress,
        reason,
        blockedBy: "system",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后自动解封
      });
      blockedIps.push(ip.ipAddress);
    }
  }

  return blockedIps;
}
