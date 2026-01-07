import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}
import { db } from "./db";
import { errorQuestions, knowledgePoints } from "../drizzle/schema";

describe("缓存预热功能测试", () => {
  let testUserId: number;
  let testKnowledgePointId: number;
  let testErrorQuestionId: number;

  beforeAll(async () => {
    // 创建测试用户
    const ctx = createTestContext();
    testUserId = ctx.user!.id;

    // 创建测试知识点
    const [knowledgePoint] = await db
      .insert(knowledgePoints)
      .values({
        name: "测试知识点-二次函数",
        subject: "math",
        grade: "junior3",
        level: "point",
        description: "二次函数的基本概念",
        difficulty: "medium",
        parentId: null,
      })
      .$returningId();
    testKnowledgePointId = knowledgePoint.id;

    // 创建测试错题
    const [errorQuestion] = await db
      .insert(errorQuestions)
      .values({
        userId: testUserId,
        title: "二次函数顶点",
        content: "求解二次函数 y = x^2 + 2x + 1 的顶点坐标",
        subject: "math",
        grade: "junior3",
        schoolLevel: "junior",
        difficulty: "medium",
        isMastered: 0,
        reviewCount: 0,
        knowledgePointIds: JSON.stringify([testKnowledgePointId]),
        createdAt: new Date(),
      })
      .$returningId();
    testErrorQuestionId = errorQuestion.id;
  });

  afterAll(async () => {
    // 清理测试数据
    // 注意:实际生产环境中不应该删除所有数据
    // await db.delete(errorQuestions).where();
    // await db.delete(knowledgePoints).where();
  });

  it("应该能够更新知识点热度统计", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cacheWarmup.updateKnowledgePointHotness();

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBeGreaterThanOrEqual(0);
  });

  it("应该能够更新题目类型热度统计", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cacheWarmup.updateQuestionTypeHotness();

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBeGreaterThanOrEqual(0);
  });

  it("应该能够获取热门知识点列表", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先更新统计
    await caller.cacheWarmup.updateKnowledgePointHotness();

    const hotPoints = await caller.cacheWarmup.getHotKnowledgePoints({ limit: 10 });

    expect(Array.isArray(hotPoints)).toBe(true);
  });

  it("应该能够创建预热任务", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cacheWarmup.createWarmupTask({
      taskName: "测试预热任务",
      taskType: "knowledge_point",
      targetConfig: {
        knowledgePointIds: [testKnowledgePointId],
      },
      priority: 5,
    });

    expect(result.success).toBe(true);
    expect(result.taskId).toBeGreaterThan(0);
  });

  it("应该能够获取预热任务列表", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const tasks = await caller.cacheWarmup.getWarmupTasks({ limit: 10 });

    expect(Array.isArray(tasks)).toBe(true);
  });

  it("应该能够获取缓存预热统计数据", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.cacheWarmup.getWarmupStatistics();

    expect(stats).toHaveProperty("knowledgePointCount");
    expect(stats).toHaveProperty("questionTypeCount");
    expect(stats).toHaveProperty("totalTasks");
    expect(stats).toHaveProperty("completedTasks");
  });
});
