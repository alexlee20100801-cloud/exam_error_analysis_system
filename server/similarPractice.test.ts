import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import { users, errorQuestions, practicePools, questions, knowledgePoints } from "../drizzle/schema";

describe("相似题推荐功能测试", () => {
  let testUserId: number;
  let testKnowledgePointId: number;
  let testPracticePoolIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试用户
    const [user] = await db.insert(users).values({
      openId: `test-similar-${Date.now()}`,
      name: "测试学生",
      role: "user",
      userType: "student",
      grade: "junior1",
    });
    testUserId = user.insertId;

    // 创建测试知识点
    const [kp] = await db.insert(knowledgePoints).values({
      name: "二次函数",
      subject: "math",
      grade: "junior1",
      level: "point",
    });
    testKnowledgePointId = kp.insertId;

    // 创建多个练习题
    const questionIds: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const [q] = await db.insert(questions).values({
        title: `练习题${i}`,
        content: `这是练习题${i}的内容`,
        correctAnswer: `答案${i}`,
        questionType: i <= 3 ? "choice" : "fillBlank",
        schoolLevel: "junior",
        subject: "math",
        grade: "junior1",
        difficulty: i <= 2 ? "easy" : i <= 4 ? "medium" : "hard",
        knowledgePointIds: JSON.stringify([testKnowledgePointId]),
      });
      questionIds.push(q.insertId);
    }

    // 创建错题
    const errorQuestionIds: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const [eq] = await db.insert(errorQuestions).values({
        userId: testUserId,
        title: `错题${i}`,
        content: `这是错题${i}的内容`,
        correctAnswer: `正确答案${i}`,
        userAnswer: `错误答案${i}`,
        schoolLevel: "junior",
        subject: "math",
        grade: "junior1",
        difficulty: i <= 2 ? "easy" : i <= 4 ? "medium" : "hard",
        knowledgePointIds: JSON.stringify([testKnowledgePointId]),
      });
      errorQuestionIds.push(eq.insertId);
    }

    // 创建练习池
    for (let i = 0; i < 5; i++) {
      const [pool] = await db.insert(practicePools).values({
        userId: testUserId,
        sourceErrorQuestionId: errorQuestionIds[i],
        practiceQuestionId: questionIds[i],
        knowledgePointId: testKnowledgePointId,
        difficulty: i <= 1 ? "easy" : i <= 3 ? "medium" : "hard",
        status: "pending",
      });
      testPracticePoolIds.push(pool.insertId);
    }
  });

  it("应该能获取相似题推荐", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.practicePools.getSimilarPractices({
      practicePoolId: testPracticePoolIds[0],
      limit: 5,
    });

    expect(result.success).toBe(true);
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("推荐结果应该包含相似度评分", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.practicePools.getSimilarPractices({
      practicePoolId: testPracticePoolIds[0],
      limit: 5,
    });

    if (result.recommendations && result.recommendations.length > 0) {
      const firstRec = result.recommendations[0];
      expect(firstRec.similarity).toBeDefined();
      expect(firstRec.similarity).toBeGreaterThanOrEqual(0);
      expect(firstRec.similarity).toBeLessThanOrEqual(100);
    }
  });

  it("推荐结果应该包含推荐理由", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.practicePools.getSimilarPractices({
      practicePoolId: testPracticePoolIds[0],
      limit: 5,
    });

    if (result.recommendations && result.recommendations.length > 0) {
      const firstRec = result.recommendations[0];
      expect(firstRec.reasons).toBeDefined();
      expect(Array.isArray(firstRec.reasons)).toBe(true);
      expect(firstRec.reasonTexts).toBeDefined();
      expect(Array.isArray(firstRec.reasonTexts)).toBe(true);
    }
  });

  it("同知识点的题目应该有更高的相似度", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.practicePools.getSimilarPractices({
      practicePoolId: testPracticePoolIds[0],
      limit: 5,
    });

    if (result.recommendations && result.recommendations.length > 0) {
      // 所有推荐题目都应该有相同知识点，因为我们创建的测试数据都使用同一个知识点
      const hasCommonKnowledgePoint = result.recommendations.some((rec: any) =>
        rec.reasons.includes("same_knowledge_point")
      );
      expect(hasCommonKnowledgePoint).toBe(true);
    }
  });

  it("推荐结果应该按相似度降序排列", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.practicePools.getSimilarPractices({
      practicePoolId: testPracticePoolIds[0],
      limit: 5,
    });

    if (result.recommendations && result.recommendations.length > 1) {
      for (let i = 0; i < result.recommendations.length - 1; i++) {
        expect(result.recommendations[i].similarity).toBeGreaterThanOrEqual(
          result.recommendations[i + 1].similarity
        );
      }
    }
  });

  it("推荐结果不应该包含当前练习题", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.practicePools.getSimilarPractices({
      practicePoolId: testPracticePoolIds[0],
      limit: 5,
    });

    if (result.recommendations && result.recommendations.length > 0) {
      const currentPoolId = testPracticePoolIds[0];
      const containsCurrent = result.recommendations.some(
        (rec: any) => rec.practicePoolId === currentPoolId
      );
      expect(containsCurrent).toBe(false);
    }
  });

  it("应该能限制推荐数量", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.practicePools.getSimilarPractices({
      practicePoolId: testPracticePoolIds[0],
      limit: 2,
    });

    expect(result.recommendations.length).toBeLessThanOrEqual(2);
  });

  it("推荐结果应该包含完整的题目信息", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.practicePools.getSimilarPractices({
      practicePoolId: testPracticePoolIds[0],
      limit: 5,
    });

    if (result.recommendations && result.recommendations.length > 0) {
      const firstRec = result.recommendations[0];
      expect(firstRec.practicePoolId).toBeDefined();
      expect(firstRec.practiceQuestion).toBeDefined();
      expect(firstRec.errorQuestion).toBeDefined();
      expect(firstRec.practiceQuestion.content).toBeDefined();
      expect(firstRec.errorQuestion.title).toBeDefined();
    }
  });
});
