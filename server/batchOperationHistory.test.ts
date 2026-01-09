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
import { errorQuestions } from "../drizzle/schema";

describe("批量操作历史功能测试", () => {
  let testUserId: number;
  let testErrorQuestionIds: number[] = [];

  beforeAll(async () => {
    // 创建测试用户
    const ctx = createTestContext();
    testUserId = ctx.user!.id;

    // 创建多个测试错题
    for (let i = 0; i < 3; i++) {
      const [errorQuestion] = await db
        .insert(errorQuestions)
        .values({
          userId: testUserId,
          questionText: `测试错题 ${i + 1}`,
          subject: "数学",
          schoolLevel: "junior",
          difficulty: "medium",
          masteryLevel: 0,
          reviewCount: 0,
          imageUrls: JSON.stringify([]),
          tags: JSON.stringify([]),
          contentHash: `test_hash_${Date.now()}_${i}`,
          createdAt: new Date(),
        })
        .$returningId();
      testErrorQuestionIds.push(errorQuestion.id);
    }
  });

  afterAll(async () => {
    // 清理测试数据
    await db.delete(errorQuestions).where();
  });

  it("应该能够记录批量操作历史", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.batchOperationHistory.recordOperation({
      operationType: "batch_mark_mastered",
      operationDescription: "批量标记为已掌握",
      affectedIds: testErrorQuestionIds,
      beforeSnapshot: testErrorQuestionIds.map((id: any) => ({
        id,
        masteryLevel: 0,
      })),
      afterSnapshot: testErrorQuestionIds.map((id: any) => ({
        id,
        masteryLevel: 3,
      })),
      canUndo: true,
    });

    expect(result.success).toBe(true);
    expect(result.operationId).toBeGreaterThan(0);
  });

  it("应该能够获取用户的批量操作历史", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先记录一个操作
    await caller.batchOperationHistory.recordOperation({
      operationType: "batch_update_difficulty",
      operationDescription: "批量更新难度",
      affectedIds: testErrorQuestionIds,
      beforeSnapshot: [],
      afterSnapshot: [],
      canUndo: true,
    });

    const history = await caller.batchOperationHistory.getHistory({
      limit: 10,
      offset: 0,
    });

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
  });

  it("应该能够获取批量操作详情", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先记录一个操作
    const recordResult = await caller.batchOperationHistory.recordOperation({
      operationType: "batch_add_tags",
      operationDescription: "批量添加标签",
      affectedIds: testErrorQuestionIds,
      beforeSnapshot: [],
      afterSnapshot: [],
      canUndo: true,
    });

    const detail = await caller.batchOperationHistory.getDetail({
      operationId: recordResult.operationId,
    });

    expect(detail).toHaveProperty("id");
    expect(detail).toHaveProperty("operationType");
    expect(detail).toHaveProperty("affectedIds");
    expect(Array.isArray(detail.affectedIds)).toBe(true);
  });

  it("应该能够获取批量操作统计数据", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.batchOperationHistory.getStatistics();

    expect(stats).toHaveProperty("totalOperations");
    expect(stats).toHaveProperty("byType");
    expect(stats).toHaveProperty("totalAffectedRecords");
    expect(stats).toHaveProperty("undoneOperations");
  });

  it("应该能够按操作类型筛选历史记录", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 记录不同类型的操作
    await caller.batchOperationHistory.recordOperation({
      operationType: "batch_delete",
      operationDescription: "批量删除",
      affectedIds: [testErrorQuestionIds[0]],
      beforeSnapshot: [],
      canUndo: false,
    });

    const history = await caller.batchOperationHistory.getHistory({
      operationType: "batch_delete",
      limit: 10,
      offset: 0,
    });

    expect(Array.isArray(history)).toBe(true);
    if (history.length > 0) {
      expect(history[0].operationType).toBe("batch_delete");
    }
  });
});
