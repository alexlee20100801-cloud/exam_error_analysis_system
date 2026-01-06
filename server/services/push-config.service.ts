/**
 * 推送配置管理服务
 * 管理推送配置的CRUD操作
 */

import { getDb } from "../db";
import { pushConfigs, InsertPushConfig, type PushConfig } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { validateFilters, countTargetUsers } from "./user-grouping.service";

/**
 * 创建推送配置
 */
export async function createPushConfig(
  data: Omit<InsertPushConfig, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  // 验证筛选条件
  const validation = validateFilters(data.targetFilters as any);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 计算下次推送时间
  const nextPushTime = calculateNextPushTime(data.frequency, data.pushTime || "09:00");

  const [result] = await db.insert(pushConfigs).values({
    ...data,
    nextPushTime,
  });

  return result.insertId;
}

/**
 * 更新推送配置
 */
export async function updatePushConfig(
  id: number,
  data: Partial<Omit<InsertPushConfig, "id" | "createdAt" | "updatedAt" | "createdBy">>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  // 如果更新了筛选条件，验证它们
  if (data.targetFilters) {
    const validation = validateFilters(data.targetFilters as any);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  // 如果更新了频率或推送时间，重新计算下次推送时间
  if (data.frequency || data.pushTime) {
    const [config] = await db.select().from(pushConfigs).where(eq(pushConfigs.id, id));
    if (config) {
      data.nextPushTime = calculateNextPushTime(
        data.frequency || config.frequency,
        data.pushTime || config.pushTime
      );
    }
  }

  await db.update(pushConfigs).set(data).where(eq(pushConfigs.id, id));
}

/**
 * 删除推送配置
 */
export async function deletePushConfig(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  await db.delete(pushConfigs).where(eq(pushConfigs.id, id));
}

/**
 * 获取推送配置详情
 */
export async function getPushConfig(id: number): Promise<PushConfig | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  const [config] = await db.select().from(pushConfigs).where(eq(pushConfigs.id, id));
  return config || null;
}

/**
 * 获取所有推送配置
 */
export async function getAllPushConfigs(filters?: {
  isEnabled?: boolean;
  pushType?: "question" | "knowledge" | "resource";
}): Promise<PushConfig[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  let query = db.select().from(pushConfigs).orderBy(desc(pushConfigs.createdAt));

  // 应用筛选条件
  const conditions: any[] = [];
  if (filters?.isEnabled !== undefined) {
    conditions.push(eq(pushConfigs.isEnabled, filters.isEnabled));
  }
  if (filters?.pushType) {
    conditions.push(eq(pushConfigs.pushType, filters.pushType));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query;
}

/**
 * 获取需要执行的推送配置
 */
export async function getDuePushConfigs(): Promise<PushConfig[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  const now = new Date();

  const configs = await db
    .select()
    .from(pushConfigs)
    .where(
      and(
        eq(pushConfigs.isEnabled, true),
        // nextPushTime <= now
        // 使用SQL函数比较
      )
    );

  // 后处理：筛选出到期的配置
  return configs.filter((config) => {
    if (!config.nextPushTime) return false;
    return config.nextPushTime <= now;
  });
}

/**
 * 启用/禁用推送配置
 */
export async function togglePushConfig(id: number, isEnabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  await db.update(pushConfigs).set({ isEnabled }).where(eq(pushConfigs.id, id));
}

/**
 * 预览推送配置（获取目标用户数量）
 */
export async function previewPushConfig(targetFilters: any): Promise<{
  targetUserCount: number;
  validation: { valid: boolean; error?: string };
}> {
  // 验证筛选条件
  const validation = validateFilters(targetFilters);
  if (!validation.valid) {
    return {
      targetUserCount: 0,
      validation,
    };
  }

  // 计算目标用户数量
  const targetUserCount = await countTargetUsers(targetFilters);

  return {
    targetUserCount,
    validation,
  };
}

/**
 * 计算下次推送时间
 */
function calculateNextPushTime(
  frequency: "daily" | "weekly" | "monthly" | "once",
  pushTime: string
): Date | null {
  if (frequency === "once") {
    return null; // 一次性推送不设置下次推送时间
  }

  const now = new Date();
  const [hours, minutes] = pushTime.split(":").map(Number);

  const nextPush = new Date(now);
  nextPush.setHours(hours, minutes, 0, 0);

  // 如果今天的推送时间已过，计算下一次推送时间
  if (nextPush <= now) {
    switch (frequency) {
      case "daily":
        nextPush.setDate(nextPush.getDate() + 1);
        break;
      case "weekly":
        nextPush.setDate(nextPush.getDate() + 7);
        break;
      case "monthly":
        nextPush.setMonth(nextPush.getMonth() + 1);
        break;
    }
  }

  return nextPush;
}

/**
 * 更新下次推送时间（推送执行后调用）
 */
export async function updateNextPushTime(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  const [config] = await db.select().from(pushConfigs).where(eq(pushConfigs.id, id));
  if (!config) {
    throw new Error(`Push config ${id} not found`);
  }

  // 如果是一次性推送，禁用配置
  if (config.frequency === "once") {
    await db.update(pushConfigs).set({ isEnabled: false }).where(eq(pushConfigs.id, id));
    return;
  }

  // 计算下次推送时间
  const nextPushTime = calculateNextPushTime(config.frequency, config.pushTime);
  await db.update(pushConfigs).set({ nextPushTime }).where(eq(pushConfigs.id, id));
}
