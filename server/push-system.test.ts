/**
 * 推送系统单元测试
 * 测试用户分组、推送配置和推送执行功能
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  users,
  subscriptionPlans,
  userSubscriptions,
  pushConfigs,
  pushRecords,
  userPushReceipts,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  getTargetUsers,
  countTargetUsers,
  validateFilters,
  type UserGroupFilters,
} from "./services/user-grouping.service";
import {
  createPushConfig,
  getPushConfig,
  getAllPushConfigs,
  previewPushConfig,
} from "./services/push-config.service";
import { executePushTask } from "./services/push-execution.service";

describe("Push System", () => {
  let testUserId: number;
  let testPlanId: number;
  let testSubscriptionId: number;
  let testPushConfigId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试用户
    const [userResult] = await db.insert(users).values({
      openId: `test-push-user-${Date.now()}`,
      name: "测试推送用户",
      email: "test-push@example.com",
      role: "user",
      userType: "student",
      grade: "junior1",
    });
    testUserId = userResult.insertId;

    // 创建测试套餐
    const [planResult] = await db.insert(subscriptionPlans).values({
      name: "测试推送套餐",
      description: "用于测试推送功能",
      price: 9900,
      durationDays: 30,
      features: { aiAnalysisLimit: 100 },
      isActive: true,
    });
    testPlanId = planResult.insertId;

    // 创建测试订阅
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [subscriptionResult] = await db.insert(userSubscriptions).values({
      userId: testUserId,
      planId: testPlanId,
      orderId: 1,
      startDate: now,
      endDate: endDate,
      status: "active",
    });
    testSubscriptionId = subscriptionResult.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    if (testPushConfigId) {
      await db.delete(userPushReceipts).where(eq(userPushReceipts.userId, testUserId));
      await db.delete(pushRecords).where(eq(pushRecords.configId, testPushConfigId));
      await db.delete(pushConfigs).where(eq(pushConfigs.id, testPushConfigId));
    }
    if (testSubscriptionId) {
      await db.delete(userSubscriptions).where(eq(userSubscriptions.id, testSubscriptionId));
    }
    if (testPlanId) {
      await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, testPlanId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe("User Grouping", () => {
    it("should filter users by school level", async () => {
      const filters: UserGroupFilters = {
        schoolLevel: "junior",
      };

      const users = await getTargetUsers(filters);
      expect(users.length).toBeGreaterThan(0);
      expect(users.every((u) => u.grade?.startsWith("junior"))).toBe(true);
    });

    it("should filter users by subscription status", async () => {
      const filters: UserGroupFilters = {
        subscriptionStatus: "active",
      };

      const users = await getTargetUsers(filters);
      expect(users.length).toBeGreaterThan(0);
      expect(users.every((u) => u.subscriptionStatus === "active")).toBe(true);
    });

    it("should count target users correctly", async () => {
      const filters: UserGroupFilters = {
        schoolLevel: "junior",
        subscriptionStatus: "active",
      };

      const count = await countTargetUsers(filters);
      const users = await getTargetUsers(filters);
      expect(count).toBe(users.length);
    });

    it("should validate filters correctly", async () => {
      // 有效的筛选条件
      const validFilters: UserGroupFilters = {
        schoolLevel: "junior",
        grades: ["junior1", "junior2"],
      };
      const validResult = validateFilters(validFilters);
      expect(validResult.valid).toBe(true);

      // 无效的筛选条件（初中学段选择高中年级）
      const invalidFilters: UserGroupFilters = {
        schoolLevel: "junior",
        grades: ["senior1"],
      };
      const invalidResult = validateFilters(invalidFilters);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBeTruthy();
    });
  });

  describe("Push Configuration", () => {
    it("should create push config successfully", async () => {
      const configData = {
        title: "测试推送配置",
        description: "这是一个测试推送配置",
        pushType: "knowledge" as const,
        targetFilters: {
          schoolLevel: "junior" as const,
          subscriptionStatus: "active" as const,
        },
        contentConfig: {
          knowledgePointIds: [1, 2, 3],
          customMessage: "测试推送消息",
        },
        frequency: "daily" as const,
        pushTime: "09:00",
        channels: ["system"] as any,
        createdBy: testUserId,
      };

      testPushConfigId = await createPushConfig(configData);
      expect(testPushConfigId).toBeGreaterThan(0);

      const config = await getPushConfig(testPushConfigId);
      expect(config).toBeTruthy();
      expect(config?.title).toBe(configData.title);
      expect(config?.pushType).toBe(configData.pushType);
    });

    it("should get all push configs", async () => {
      const configs = await getAllPushConfigs();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    it("should preview push config correctly", async () => {
      const filters = {
        schoolLevel: "junior" as const,
        subscriptionStatus: "active" as const,
      };

      const preview = await previewPushConfig(filters);
      expect(preview.validation.valid).toBe(true);
      expect(preview.targetUserCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Push Execution", () => {
    it("should execute push task successfully", async () => {
      if (!testPushConfigId) {
        // 创建测试推送配置
        testPushConfigId = await createPushConfig({
          title: "测试推送执行",
          description: "测试推送执行功能",
          pushType: "knowledge" as const,
          targetFilters: {
            schoolLevel: "junior" as const,
            subscriptionStatus: "active" as const,
          },
          contentConfig: {
            knowledgePointIds: [1],
            customMessage: "测试推送执行",
          },
          frequency: "once" as const,
          pushTime: "09:00",
          channels: ["system"] as any,
          createdBy: testUserId,
        });
      }

      const result = await executePushTask(testPushConfigId);
      expect(result.success).toBe(true);
      expect(result.targetUserCount).toBeGreaterThanOrEqual(0);

      // 如果有目标用户，验证推送记录
      if (result.targetUserCount > 0) {
        expect(result.pushRecordId).toBeGreaterThan(0);
        expect(result.successCount).toBeGreaterThanOrEqual(0);
      }
    });

    it("should create push records correctly", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!testPushConfigId) return;

      const records = await db
        .select()
        .from(pushRecords)
        .where(eq(pushRecords.configId, testPushConfigId));

      expect(records.length).toBeGreaterThan(0);
      const record = records[0];
      expect(record.status).toBe("completed");
      expect(record.targetUserCount).toBeGreaterThanOrEqual(0);
    });
  });
});
