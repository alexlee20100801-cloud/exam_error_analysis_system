import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, errorQuestions, errorReviewRecords } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { calculateNextReviewTime, EBBINGHAUS_INTERVALS } from "./reviewPlanService";

describe("复习计划功能测试", () => {
  let testUserId: number;
  let testErrorQuestionId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户
    const [user] = await db
      .insert(users)
      .values({
        openId: `test-review-${Date.now()}`,
        name: "复习计划测试用户",
        role: "user",
      })
      .$returningId();
    testUserId = user.id;

    // 创建测试错题
    const [errorQuestion] = await db
      .insert(errorQuestions)
      .values({
        userId: testUserId,
        title: "测试错题 - 复习计划",
        content: "这是一道用于测试复习计划功能的错题",
        schoolLevel: "junior",
        subject: "math",
        grade: "junior1",
        isAnalyzed: true,
      })
      .$returningId();
    testErrorQuestionId = errorQuestion.id;

    // 创建caller
    caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: `test-review-${Date.now()}`,
        name: "复习计划测试用户",
        role: "user",
      },
    });
  });

  it("应该正确计算艾宾浩斯复习间隔", () => {
    const baseTime = new Date("2024-01-01T00:00:00Z");

    // 第1次复习：1天后
    const review1 = calculateNextReviewTime(0, baseTime);
    const diff1 = Math.round((review1.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff1).toBe(1);

    // 第2次复习：2天后
    const review2 = calculateNextReviewTime(1, baseTime);
    const diff2 = Math.round((review2.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff2).toBe(2);

    // 第3次复习：4天后
    const review3 = calculateNextReviewTime(2, baseTime);
    const diff3 = Math.round((review3.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff3).toBe(4);

    // 第4次复习：7天后
    const review4 = calculateNextReviewTime(3, baseTime);
    const diff4 = Math.round((review4.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff4).toBe(7);

    // 第5次复习：15天后
    const review5 = calculateNextReviewTime(4, baseTime);
    const diff5 = Math.round((review5.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff5).toBe(15);
  });

  it("应该成功将错题加入复习计划", async () => {
    const result = await caller.reviewPlan.addToReviewPlan({
      errorQuestionId: testErrorQuestionId,
    });

    expect(result.success).toBe(true);

    // 验证数据库记录
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, testUserId),
          eq(errorReviewRecords.errorQuestionId, testErrorQuestionId)
        )
      );

    expect(records.length).toBe(1);
    expect(records[0].reviewRound).toBe(0);
    expect(records[0].isCompleted).toBe(false);
    expect(records[0].isPaused).toBe(false);
  });

  it("应该能获取复习统计信息", async () => {
    const stats = await caller.reviewPlan.getReviewStats();

    expect(stats).not.toBeNull();
    expect(stats!.totalCount).toBeGreaterThanOrEqual(1);
    expect(stats!.dueCount).toBeGreaterThanOrEqual(0);
    expect(stats!.completedCount).toBeGreaterThanOrEqual(0);
  });

  it("应该能获取所有复习计划", async () => {
    const plans = await caller.reviewPlan.getAllReviewPlans();

    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThanOrEqual(1);

    const plan = plans.find((p) => p.id === testErrorQuestionId);
    expect(plan).toBeDefined();
    expect(plan!.title).toBe("测试错题 - 复习计划");
    expect(plan!.reviewRound).toBe(0);
  });

  it("应该能标记错题已复习并更新复习轮次", async () => {
    const result = await caller.reviewPlan.markAsReviewed({
      errorQuestionId: testErrorQuestionId,
    });

    expect(result.success).toBe(true);

    // 验证复习轮次已更新
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, testUserId),
          eq(errorReviewRecords.errorQuestionId, testErrorQuestionId)
        )
      );

    expect(records.length).toBe(1);
    expect(records[0].reviewRound).toBe(1); // 从0变为1
    expect(records[0].lastReviewedAt).not.toBeNull();
  });

  it("应该能获取艾宾浩斯复习间隔配置", async () => {
    const config = await caller.reviewPlan.getReviewIntervals();

    expect(config.intervals).toEqual(EBBINGHAUS_INTERVALS);
    expect(config.intervals.length).toBe(5);
    expect(config.intervals).toEqual([1, 2, 4, 7, 15]);
  });

  it("应该能暂停复习计划", async () => {
    const result = await caller.reviewPlan.pauseReviewPlan({
      errorQuestionId: testErrorQuestionId,
    });

    expect(result.success).toBe(true);

    // 验证已暂停
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, testUserId),
          eq(errorReviewRecords.errorQuestionId, testErrorQuestionId)
        )
      );

    expect(records.length).toBe(1);
    expect(records[0].isPaused).toBe(true);
  });

  it("应该能恢复已暂停的复习计划", async () => {
    // 再次加入复习计划应该恢复暂停状态
    const result = await caller.reviewPlan.addToReviewPlan({
      errorQuestionId: testErrorQuestionId,
    });

    expect(result.success).toBe(true);

    // 验证已恢复
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, testUserId),
          eq(errorReviewRecords.errorQuestionId, testErrorQuestionId)
        )
      );

    expect(records.length).toBe(1);
    expect(records[0].isPaused).toBe(false);
  });

  it("完成所有复习轮次后应该标记为已完成", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 模拟完成5轮复习（注意：之前已经标记了1次，恢复后又标记了1次，暂停后复习轮次被重置为1）
    // 需要再标记4次才能达到5轮
    for (let i = 0; i < 4; i++) {
      const result = await caller.reviewPlan.markAsReviewed({
        errorQuestionId: testErrorQuestionId,
      });
      expect(result.success).toBe(true);
    }

    // 验证已完成
    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, testUserId),
          eq(errorReviewRecords.errorQuestionId, testErrorQuestionId)
        )
      );

    expect(records.length).toBe(1);
    expect(records[0].reviewRound).toBeGreaterThanOrEqual(EBBINGHAUS_INTERVALS.length);
    expect(records[0].isCompleted).toBe(true);

    // 验证错题表也已更新
    const questions = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, testErrorQuestionId));

    expect(questions.length).toBe(1);
    expect(questions[0].isMastered).toBe(true);
    expect(questions[0].reviewCount).toBeGreaterThanOrEqual(EBBINGHAUS_INTERVALS.length);
  });
});
