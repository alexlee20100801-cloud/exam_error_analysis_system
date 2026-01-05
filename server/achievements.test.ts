/**
 * 成就系统单元测试
 */

import { describe, it, expect } from "vitest";
import {
  checkAndUnlockAchievements,
  getCurrentStreak,
  recordCheckIn,
  getUserAchievements,
  getUserTotalPoints,
} from "./achievementService";
import { getDb } from "./db";
import { users, errorQuestions, checkInRecords, userAchievements } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Achievement System", () => {
  describe("getCurrentStreak", () => {
    it("should return 0 for user with no check-ins", async () => {
      // 使用一个不存在的用户ID
      const streak = await getCurrentStreak(999999);
      expect(streak).toBe(0);
    });

    it("should calculate streak correctly", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 创建测试用户
      const testUser = await db.insert(users).values({
        openId: `test-streak-${Date.now()}`,
        name: "Test Streak User",
      });

      const userId = Number(testUser[0].insertId);

      // 添加连续3天的打卡记录
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        await db.insert(checkInRecords).values({
          userId,
          checkInDate: date,
          activityType: "error_question",
        });
      }

      const streak = await getCurrentStreak(userId);
      expect(streak).toBe(3);

      // 清理测试数据
      await db.delete(checkInRecords).where(eq(checkInRecords.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    });
  });

  describe("recordCheckIn", () => {
    it("should record check-in successfully", { timeout: 15000 }, async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 创建测试用户
      const testUser = await db.insert(users).values({
        openId: `test-checkin-${Date.now()}`,
        name: "Test CheckIn User",
      });

      const userId = Number(testUser[0].insertId);

      // 记录打卡
      await recordCheckIn(userId, "practice");

      // 验证打卡记录
      const records = await db
        .select()
        .from(checkInRecords)
        .where(eq(checkInRecords.userId, userId));

      expect(records.length).toBeGreaterThan(0);
      expect(records[0].activityType).toBe("practice");

      // 清理测试数据
      await db.delete(checkInRecords).where(eq(checkInRecords.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    });

    it("should not create duplicate check-in on same day", { timeout: 15000 }, async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 创建测试用户
      const testUser = await db.insert(users).values({
        openId: `test-duplicate-${Date.now()}`,
        name: "Test Duplicate User",
      });

      const userId = Number(testUser[0].insertId);

      // 第一次打卡
      await recordCheckIn(userId, "error_question");

      // 第二次打卡（同一天）
      await recordCheckIn(userId, "review");

      // 验证只有一条记录
      const records = await db
        .select()
        .from(checkInRecords)
        .where(eq(checkInRecords.userId, userId));

      expect(records.length).toBe(1);

      // 清理测试数据
      await db.delete(checkInRecords).where(eq(checkInRecords.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    });
  });

  describe("checkAndUnlockAchievements", () => {
    it("should unlock first_error_question achievement", { timeout: 15000 }, async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 创建测试用户
      const testUser = await db.insert(users).values({
        openId: `test-achievement-${Date.now()}`,
        name: "Test Achievement User",
      });

      const userId = Number(testUser[0].insertId);

      // 添加一道错题
      await db.insert(errorQuestions).values({
        userId,
        title: "测试错题",
        content: "测试内容",
        subject: "math",
        grade: "junior1",
        difficulty: "medium",
        source: "homework",
      });

      // 检查成就
      const newAchievements = await checkAndUnlockAchievements(userId);

      // 验证是否解锁了first_error_question成就
      const hasFirstError = newAchievements.some((a) => a.code === "first_error_question");
      expect(hasFirstError).toBe(true);

      // 清理测试数据
      await db.delete(errorQuestions).where(eq(errorQuestions.userId, userId));
      await db.delete(userAchievements).where(eq(userAchievements.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    });
  });

  describe("getUserAchievements", () => {
    it("should return all achievements with progress", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 创建测试用户
      const testUser = await db.insert(users).values({
        openId: `test-progress-${Date.now()}`,
        name: "Test Progress User",
      });

      const userId = Number(testUser[0].insertId);

      const achievements = await getUserAchievements(userId);

      // 验证返回了所有成就
      expect(achievements.length).toBeGreaterThan(0);

      // 验证每个成就都有必要的字段
      achievements.forEach((item) => {
        expect(item.achievement).toBeDefined();
        expect(item.achievement.name).toBeDefined();
        expect(item.achievement.description).toBeDefined();
        expect(typeof item.unlocked).toBe("boolean");
        expect(typeof item.progress).toBe("number");
      });

      // 清理测试数据
      await db.delete(users).where(eq(users.id, userId));
    });
  });

  describe("getUserTotalPoints", () => {
    it("should return 0 for user with no achievements", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 创建测试用户
      const testUser = await db.insert(users).values({
        openId: `test-points-${Date.now()}`,
        name: "Test Points User",
      });

      const userId = Number(testUser[0].insertId);

      const totalPoints = await getUserTotalPoints(userId);
      expect(totalPoints).toBe(0);

      // 清理测试数据
      await db.delete(users).where(eq(users.id, userId));
    });
  });
});
