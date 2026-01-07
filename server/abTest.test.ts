import { describe, it, expect, beforeAll } from "vitest";
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

describe("A/B测试功能测试", () => {
  let testUserId: number;
  let testExperimentId: number;

  beforeAll(async () => {
    // 创建测试用户
    const ctx = createTestContext();
    testUserId = ctx.user!.id;
  });

  it("应该能够创建A/B测试实验", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.abTest.createExperiment({
      experimentName: "推荐算法优化测试",
      experimentDescription: "测试新的推荐算法是否能提高用户点击率",
      controlAlgorithm: "collaborative_filtering_v1",
      treatmentAlgorithm: "collaborative_filtering_v2",
      algorithmConfig: {
        similarityThreshold: 0.7,
        maxRecommendations: 10,
      },
      trafficSplitRatio: 0.5,
    });

    expect(result.success).toBe(true);
    expect(result.experimentId).toBeGreaterThan(0);
    testExperimentId = result.experimentId;
  });

  it("应该能够启动A/B测试实验", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建实验
    const createResult = await caller.abTest.createExperiment({
      experimentName: "测试实验-启动",
      controlAlgorithm: "algorithm_a",
      treatmentAlgorithm: "algorithm_b",
    });

    const result = await caller.abTest.startExperiment({
      experimentId: createResult.experimentId,
    });

    expect(result.success).toBe(true);
  });

  it("应该能够为用户分配实验分组", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建并启动实验
    const createResult = await caller.abTest.createExperiment({
      experimentName: "测试实验-分组",
      controlAlgorithm: "algorithm_a",
      treatmentAlgorithm: "algorithm_b",
    });

    await caller.abTest.startExperiment({
      experimentId: createResult.experimentId,
    });

    const assignResult = await caller.abTest.assignToExperiment({
      experimentId: createResult.experimentId,
    });

    expect(assignResult.success).toBe(true);
    expect(["control", "treatment"]).toContain(assignResult.groupType);
  });

  it("应该能够获取用户的实验分组", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建并启动实验
    const createResult = await caller.abTest.createExperiment({
      experimentName: "测试实验-查询分组",
      controlAlgorithm: "algorithm_a",
      treatmentAlgorithm: "algorithm_b",
    });

    await caller.abTest.startExperiment({
      experimentId: createResult.experimentId,
    });

    // 分配分组
    await caller.abTest.assignToExperiment({
      experimentId: createResult.experimentId,
    });

    // 查询分组
    const groupResult = await caller.abTest.getMyExperimentGroup({
      experimentId: createResult.experimentId,
    });

    expect(groupResult).toHaveProperty("groupType");
    expect(["control", "treatment"]).toContain(groupResult.groupType!);
  });

  it("应该能够记录推荐反馈", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建并启动实验
    const createResult = await caller.abTest.createExperiment({
      experimentName: "测试实验-反馈",
      controlAlgorithm: "algorithm_a",
      treatmentAlgorithm: "algorithm_b",
    });

    await caller.abTest.startExperiment({
      experimentId: createResult.experimentId,
    });

    const feedbackResult = await caller.abTest.recordFeedback({
      experimentId: createResult.experimentId,
      recommendationType: "similar_questions",
      recommendedItemId: 123,
      recommendationAlgorithm: "algorithm_a",
      recommendationRank: 1,
      wasClicked: true,
      wasUsed: true,
      timeSpentSeconds: 120,
      userRating: 4,
    });

    expect(feedbackResult.success).toBe(true);
    expect(feedbackResult.feedbackId).toBeGreaterThan(0);
  });

  it("应该能够获取所有实验列表", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const experiments = await caller.abTest.getAllExperiments({});

    expect(Array.isArray(experiments)).toBe(true);
  });

  it("应该能够按状态筛选实验", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 创建一个草稿实验
    await caller.abTest.createExperiment({
      experimentName: "草稿实验",
      controlAlgorithm: "algorithm_a",
      treatmentAlgorithm: "algorithm_b",
    });

    const draftExperiments = await caller.abTest.getAllExperiments({
      status: "draft",
    });

    expect(Array.isArray(draftExperiments)).toBe(true);
    if (draftExperiments.length > 0) {
      expect(draftExperiments[0].status).toBe("draft");
    }
  });

  it("应该能够获取实验详情", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建实验
    const createResult = await caller.abTest.createExperiment({
      experimentName: "测试实验-详情",
      experimentDescription: "这是一个测试实验",
      controlAlgorithm: "algorithm_a",
      treatmentAlgorithm: "algorithm_b",
      algorithmConfig: {
        param1: "value1",
      },
    });

    const detail = await caller.abTest.getExperimentDetail({
      experimentId: createResult.experimentId,
    });

    expect(detail).toHaveProperty("id");
    expect(detail).toHaveProperty("experimentName");
    expect(detail.experimentName).toBe("测试实验-详情");
    expect(detail).toHaveProperty("algorithmConfig");
  });

  it("应该能够暂停实验", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建并启动实验
    const createResult = await caller.abTest.createExperiment({
      experimentName: "测试实验-暂停",
      controlAlgorithm: "algorithm_a",
      treatmentAlgorithm: "algorithm_b",
    });

    await caller.abTest.startExperiment({
      experimentId: createResult.experimentId,
    });

    const pauseResult = await caller.abTest.pauseExperiment({
      experimentId: createResult.experimentId,
    });

    expect(pauseResult.success).toBe(true);
  });

  it("应该能够完成实验", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建并启动实验
    const createResult = await caller.abTest.createExperiment({
      experimentName: "测试实验-完成",
      controlAlgorithm: "algorithm_a",
      treatmentAlgorithm: "algorithm_b",
    });

    await caller.abTest.startExperiment({
      experimentId: createResult.experimentId,
    });

    const completeResult = await caller.abTest.completeExperiment({
      experimentId: createResult.experimentId,
    });

    expect(completeResult.success).toBe(true);
  });
});
