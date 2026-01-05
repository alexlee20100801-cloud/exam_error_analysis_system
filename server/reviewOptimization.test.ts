import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { errorQuestions, errorReviewRecords, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { addToReviewPlan, calculateNextReviewTime, EBBINGHAUS_INTERVALS } from "./reviewPlanService";

describe("复习功能优化测试", () => {
  let testUserId: number;
  let testQuestionId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 创建测试用户
    const [user] = await db.insert(users).values({
      openId: `test-review-opt-${Date.now()}`,
      name: "复习功能测试用户",
      role: "user",
      userType: "student",
      grade: "junior1",
    });
    testUserId = user.insertId;

    // 创建测试错题
    const [question] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: "测试错题 - 复习功能",
      content: "这是一道用于测试复习功能的错题",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      semester: "first",
      isAnalyzed: true,
      correctAnswer: "正确答案是42",
      detailedExplanation: "详细解析：这道题考察的是基础运算",
      errorAnalysis: "错误原因：计算失误",
    });
    testQuestionId = question.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    await db.delete(errorReviewRecords).where(eq(errorReviewRecords.userId, testUserId));
    await db.delete(errorQuestions).where(eq(errorQuestions.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("应该正确计算艾宾浩斯复习间隔", () => {
    const baseTime = new Date("2024-01-01T00:00:00Z");
    
    // 第一次复习：1天后
    const review1 = calculateNextReviewTime(0, baseTime);
    const diff1 = (review1.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff1).toBe(1);
    
    // 第二次复习：2天后
    const review2 = calculateNextReviewTime(1, baseTime);
    const diff2 = (review2.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff2).toBe(2);
    
    // 第三次复习：4天后
    const review3 = calculateNextReviewTime(2, baseTime);
    const diff3 = (review3.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff3).toBe(4);
    
    // 第四次复习：7天后
    const review4 = calculateNextReviewTime(3, baseTime);
    const diff4 = (review4.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff4).toBe(7);
    
    // 第五次复习：15天后
    const review5 = calculateNextReviewTime(4, baseTime);
    const diff5 = (review5.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff5).toBe(15);
  });

  it("应该成功将错题加入复习计划", async () => {
    const result = await addToReviewPlan(testUserId, testQuestionId);
    expect(result).toBe(true);

    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 验证复习记录已创建
    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, testUserId),
          eq(errorReviewRecords.errorQuestionId, testQuestionId)
        )
      );

    expect(records.length).toBe(1);
    expect(records[0].reviewRound).toBe(0);
    expect(records[0].isCompleted).toBe(false);
    expect(records[0].isPaused).toBe(false);
  });

  it("不应该重复添加已在复习计划中的错题", async () => {
    // 第二次添加同一道错题
    const result = await addToReviewPlan(testUserId, testQuestionId);
    expect(result).toBe(false);

    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 验证只有一条记录
    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, testUserId),
          eq(errorReviewRecords.errorQuestionId, testQuestionId)
        )
      );

    expect(records.length).toBe(1);
  });

  it("应该正确设置第一次复习时间为1天后", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, testUserId),
          eq(errorReviewRecords.errorQuestionId, testQuestionId)
        )
      );

    expect(records.length).toBe(1);
    
    const nextReviewAt = new Date(records[0].nextReviewAt);
    const now = new Date();
    const diffInHours = (nextReviewAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // 下次复习时间应该在23-25小时之间（1天左右）
    expect(diffInHours).toBeGreaterThan(23);
    expect(diffInHours).toBeLessThan(25);
  });

  it("艾宾浩斯间隔数组应该包含5个复习节点", () => {
    expect(EBBINGHAUS_INTERVALS).toHaveLength(5);
    expect(EBBINGHAUS_INTERVALS).toEqual([1, 2, 4, 7, 15]);
  });
});
