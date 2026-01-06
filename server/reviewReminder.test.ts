import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import { getDb } from "./db";
import { errorQuestions, reviewReminders, reviewHistory } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("学习提醒功能测试", () => {
  let testUserId: number;
  let testErrorQuestionId: number;
  let testReminderId: number;

  const createTestContext = (userId: string): Context => ({
    user: {
      id: userId,
      openId: "test-open-id",
      name: "测试用户",
      email: "test@example.com",
      loginMethod: "google",
      role: "admin",
      userType: "student",
      grade: null,
      currentSemester: null,
      school: null,
      region: null,
      disabledMenuItems: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  });

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试用户ID
    testUserId = 999;

    // 创建测试错题
    const [result] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: "测试错题-学习提醒",
      content: "这是一道用于测试学习提醒功能的错题",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      difficulty: "medium",
      isAnalyzed: false,
      isMastered: false,
      reviewCount: 0,
    });

    testErrorQuestionId = result.insertId;
  });

  it("应该能创建学习提醒", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.create({
      questionId: testErrorQuestionId,
      questionType: "error_question",
    });

    expect(result.success).toBe(true);
    expect(result.reminderId).toBeGreaterThan(0);
    testReminderId = result.reminderId!;
  });

  it("不应该重复创建相同题目的提醒", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.create({
      questionId: testErrorQuestionId,
      questionType: "error_question",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("已存在");
  });

  it("应该能获取待复习列表", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.getPending();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.reminders)).toBe(true);
  });

  it("应该能获取所有提醒列表", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.getAll({});

    expect(result.success).toBe(true);
    expect(Array.isArray(result.reminders)).toBe(true);
    expect(result.reminders.length).toBeGreaterThan(0);

    // 验证提醒包含题目详情
    const reminder = result.reminders[0];
    expect(reminder.question).toBeDefined();
  });

  it("应该能标记提醒为已复习", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.markReviewed({
      reminderId: testReminderId,
      masteryLevel: 80,
      timeSpent: 120,
      notes: "复习完成，理解了解题思路",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("复习完成");

    // 验证复习次数增加
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [reminder] = await db
      .select()
      .from(reviewReminders)
      .where(eq(reviewReminders.id, testReminderId))
      .limit(1);

    expect(reminder.reviewCount).toBe(1);
    expect(reminder.lastReviewedAt).toBeDefined();
  });

  it("应该能获取复习历史", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.getHistory({
      reminderId: testReminderId,
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.history)).toBe(true);
    expect(result.history.length).toBeGreaterThan(0);

    // 验证复习历史包含详细信息
    const history = result.history[0];
    expect(history.masteryLevel).toBe(80);
    expect(history.timeSpent).toBe(120);
    expect(history.notes).toBe("复习完成，理解了解题思路");
  });

  it("应该能跳过提醒", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.skip({
      reminderId: testReminderId,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("延后");
  });

  it("应该能获取提醒统计", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.getStats();

    expect(result.success).toBe(true);
    expect(result.stats).toBeDefined();
    expect(typeof result.stats.pendingDue).toBe("number");
    expect(typeof result.stats.pendingFuture).toBe("number");
    expect(typeof result.stats.totalReviews).toBe("number");
    expect(result.stats.totalReviews).toBeGreaterThan(0);
  });

  it("应该能删除提醒", async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.reviewReminders.delete({
      reminderId: testReminderId,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("删除");

    // 验证提醒状态已更新
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [reminder] = await db
      .select()
      .from(reviewReminders)
      .where(eq(reviewReminders.id, testReminderId))
      .limit(1);

    expect(reminder.status).toBe("deleted");
  });

  it("艾宾浩斯遗忘曲线算法应该正确计算复习间隔", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建新的测试错题
    const [result] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: "测试错题-遗忘曲线",
      content: "测试艾宾浩斯遗忘曲线算法",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      difficulty: "medium",
      isAnalyzed: false,
      isMastered: false,
      reviewCount: 0,
    });

    const newQuestionId = result.insertId;
    const caller = appRouter.createCaller(createTestContext(testUserId));

    // 创建提醒
    const createResult = await caller.reviewReminders.create({
      questionId: newQuestionId,
      questionType: "error_question",
    });

    const newReminderId = createResult.reminderId!;

    // 验证初始复习时间（应该是1天后）
    const [reminder1] = await db
      .select()
      .from(reviewReminders)
      .where(eq(reviewReminders.id, newReminderId))
      .limit(1);

    const now = new Date();
    const daysDiff1 = Math.floor(
      (reminder1.nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(daysDiff1).toBeGreaterThanOrEqual(0);
    expect(daysDiff1).toBeLessThanOrEqual(1);

    // 标记第一次复习
    await caller.reviewReminders.markReviewed({
      reminderId: newReminderId,
    });

    // 验证第二次复习时间（应该是2天后）
    const [reminder2] = await db
      .select()
      .from(reviewReminders)
      .where(eq(reviewReminders.id, newReminderId))
      .limit(1);

    const daysDiff2 = Math.floor(
      (reminder2.nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(daysDiff2).toBeGreaterThanOrEqual(1);
    expect(daysDiff2).toBeLessThanOrEqual(3);

    // 清理测试数据
    await db.delete(reviewReminders).where(eq(reviewReminders.id, newReminderId));
    await db.delete(errorQuestions).where(eq(errorQuestions.id, newQuestionId));
  });
});
