import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import { users, errorQuestions, questions } from "../drizzle/schema";

describe("收藏功能测试", () => {
  let testUserId: number;
  let testErrorQuestionId: number;
  let testPracticeQuestionId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试用户
    const [user] = await db.insert(users).values({
      openId: `test-favorite-${Date.now()}`,
      name: "测试学生",
      role: "user",
      userType: "student",
      grade: "junior1",
    });
    testUserId = user.insertId;

    // 创建测试错题
    const [eq] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: "测试错题",
      content: "这是一道测试错题",
      correctAnswer: "正确答案",
      userAnswer: "错误答案",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      difficulty: "medium",
    });
    testErrorQuestionId = eq.insertId;

    // 创建测试练习题
    const [q] = await db.insert(questions).values({
      title: "测试练习题",
      content: "这是一道测试练习题",
      correctAnswer: "答案",
      questionType: "choice",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      difficulty: "medium",
    });
    testPracticeQuestionId = q.insertId;
  });

  it("应该能添加收藏", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.add({
      questionId: testErrorQuestionId,
      questionType: "error_question",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("收藏成功");
    expect(result.favoriteId).toBeDefined();
  });

  it("不应该重复收藏同一题目", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.add({
      questionId: testErrorQuestionId,
      questionType: "error_question",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("该题目已在收藏夹中");
  });

  it("应该能检查收藏状态", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.isFavorited({
      questionId: testErrorQuestionId,
      questionType: "error_question",
    });

    expect(result.success).toBe(true);
    expect(result.favorited).toBe(true);
  });

  it("应该能获取收藏列表", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.list({});

    expect(result.success).toBe(true);
    expect(result.favorites).toBeDefined();
    expect(Array.isArray(result.favorites)).toBe(true);
    expect(result.favorites.length).toBeGreaterThan(0);
  });

  it("应该能按题目类型筛选收藏", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    // 添加练习题收藏
    await caller.favorites.add({
      questionId: testPracticeQuestionId,
      questionType: "practice_question",
    });

    // 筛选错题
    const errorResult = await caller.favorites.list({
      questionType: "error_question",
    });

    expect(errorResult.success).toBe(true);
    expect(errorResult.favorites.every((f: any) => f.favorite.questionType === "error_question")).toBe(true);

    // 筛选练习题
    const practiceResult = await caller.favorites.list({
      questionType: "practice_question",
    });

    expect(practiceResult.success).toBe(true);
    expect(practiceResult.favorites.every((f: any) => f.favorite.questionType === "practice_question")).toBe(true);
  });

  it("应该能获取收藏统计", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.stats();

    expect(result.success).toBe(true);
    expect(result.stats).toBeDefined();
    expect(result.stats.total).toBeGreaterThanOrEqual(2);
    expect(result.stats.errorQuestions).toBeGreaterThanOrEqual(1);
    expect(result.stats.practiceQuestions).toBeGreaterThanOrEqual(1);
  });

  it("应该能取消收藏", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.remove({
      questionId: testErrorQuestionId,
      questionType: "error_question",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("取消收藏成功");

    // 验证已取消
    const checkResult = await caller.favorites.isFavorited({
      questionId: testErrorQuestionId,
      questionType: "error_question",
    });

    expect(checkResult.favorited).toBe(false);
  });

  it("收藏列表应该包含完整的题目信息", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.list({});

    if (result.favorites.length > 0) {
      const firstFavorite = result.favorites[0];
      expect(firstFavorite.favorite).toBeDefined();
      expect(firstFavorite.question).toBeDefined();
      expect(firstFavorite.favorite.questionId).toBeDefined();
      expect(firstFavorite.favorite.questionType).toBeDefined();
      expect(firstFavorite.favorite.createdAt).toBeDefined();
    }
  });

  it("应该能批量检查收藏状态", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    // 重新添加一个收藏
    await caller.favorites.add({
      questionId: testErrorQuestionId,
      questionType: "error_question",
    });

    const result = await caller.favorites.checkStatus({
      items: [
        { questionId: testErrorQuestionId, questionType: "error_question" },
        { questionId: testPracticeQuestionId, questionType: "practice_question" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.status).toBeDefined();
    expect(typeof result.status).toBe("object");
  });
});
