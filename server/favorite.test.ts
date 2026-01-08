import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { errorQuestions, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("错题收藏功能测试", () => {
  let testUserId: number;
  let testQuestionId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 创建测试用户
    const [user] = await db.insert(users).values({
      openId: `test-favorite-${Date.now()}`,
      name: "收藏功能测试用户",
      role: "user",
      userType: "student",
      grade: "junior1",
    });
    testUserId = user.insertId;

    // 创建测试错题
    const [question] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: "测试错题 - 收藏功能",
      content: "这是一道用于测试收藏功能的错题",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      semester: "first",
      isAnalyzed: true,
      correctAnswer: "正确答案是42",
      detailedExplanation: "详细解析：这道题考察的是基础运算",
      errorAnalysis: "错误原因：计算失误",
      isFavorite: false,
    });
    testQuestionId = question.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    await db.delete(errorQuestions).where(eq(errorQuestions.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("应该成功收藏错题", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 收藏错题
    await db
      .update(errorQuestions)
      .set({ isFavorite: true })
      .where(eq(errorQuestions.id, testQuestionId));

    // 验证收藏状态
    const [question] = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, testQuestionId));

    expect(question.isFavorite ? true : false).toBe(true);
  });

  it("应该成功取消收藏错题", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 取消收藏
    await db
      .update(errorQuestions)
      .set({ isFavorite: false })
      .where(eq(errorQuestions.id, testQuestionId));

    // 验证收藏状态
    const [question] = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, testQuestionId));

    expect(question.isFavorite ? true : false).toBe(false);
  });

  it("应该正确统计收藏的错题数量", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 创建多个错题，部分收藏
    const questions = [];
    for (let i = 0; i < 5; i++) {
      const [q] = await db.insert(errorQuestions).values({
        userId: testUserId,
        title: `测试错题${i}`,
        content: `内容${i}`,
        schoolLevel: "junior",
        subject: "math",
        grade: "junior1",
        isAnalyzed: true,
        isFavorite: i % 2 === 0, // 偶数题目收藏
      });
      questions.push(q.insertId);
    }

    // 查询收藏的错题
    const favoriteQuestions = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, testUserId))
      .then(results => results.filter(q => q.isFavorite));

    // 应该有3个收藏的错题（0, 2, 4）
    expect(favoriteQuestions.length).toBe(3);

    // 清理测试数据
    for (const qId of questions) {
      await db.delete(errorQuestions).where(eq(errorQuestions.id, qId));
    }
  });

  it("收藏字段应该有默认值false", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 创建新错题，不指定isFavorite
    const [question] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: "测试默认值",
      content: "测试内容",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      isAnalyzed: false,
    });

    // 查询错题
    const [newQuestion] = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, question.insertId));

    expect(newQuestion.isFavorite ? true : false).toBe(false);

    // 清理
    await db.delete(errorQuestions).where(eq(errorQuestions.id, question.insertId));
  });
});
