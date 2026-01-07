import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("学习统计功能测试", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let mockUserId: number;

  beforeAll(async () => {
    // 创建模拟用户上下文
    mockUserId = 1;
    const mockContext: Context = {
      user: {
        id: mockUserId,
        openId: "test-open-id",
        name: "测试用户",
        email: "test@example.com",
        role: "user",
      },
      req: {} as any,
      res: {} as any,
    };

    caller = appRouter.createCaller(mockContext);

    // 创建一些测试数据
    await caller.errorQuestions.create({
      title: "测试题1",
      content: "这是第一道测试题",
      subject: "math",
      grade: "junior3",
      schoolLevel: "junior",
      difficulty: "easy",
    });

    await caller.errorQuestions.create({
      title: "测试题2",
      content: "这是第二道测试题",
      subject: "physics",
      grade: "junior3",
      schoolLevel: "junior",
      difficulty: "medium",
    });
  });

  it("应该能够获取学习总览统计", async () => {
    const result = await caller.learningStats.getOverview();

    expect(result).toBeDefined();
    expect(typeof result.totalErrorQuestions).toBe("number");
    expect(typeof result.totalPracticeCount).toBe("number");
    expect(typeof result.averageCorrectRate).toBe("number");
    expect(typeof result.totalStudyTime).toBe("number");
    expect(typeof result.masteredKnowledgePoints).toBe("number");
    expect(typeof result.weakKnowledgePoints).toBe("number");
  });

  it("应该能够按科目筛选统计数据", async () => {
    const result = await caller.learningStats.getOverview({
      subject: "math",
    });

    expect(result).toBeDefined();
    expect(typeof result.totalErrorQuestions).toBe("number");
  });

  it("应该能够获取掌握度趋势数据", async () => {
    const result = await caller.learningStats.getMasteryTrend({
      days: 30,
    });

    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => {
      expect(item).toHaveProperty("date");
      expect(item).toHaveProperty("masteryRate");
      expect(typeof item.masteryRate).toBe("number");
      expect(item.masteryRate).toBeGreaterThanOrEqual(0);
      expect(item.masteryRate).toBeLessThanOrEqual(100);
    });
  });

  it("应该能够获取科目分布数据", async () => {
    const result = await caller.learningStats.getSubjectDistribution();

    expect(Array.isArray(result)).toBe(true);
    result.forEach((item) => {
      expect(item).toHaveProperty("subject");
      expect(item).toHaveProperty("subjectLabel");
      expect(item).toHaveProperty("count");
      expect(typeof item.count).toBe("number");
      expect(item.count).toBeGreaterThan(0);
    });
  });

  it("应该能够获取掌握度分布数据", async () => {
    const result = await caller.learningStats.getMasteryDistribution();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3); // 未开始、学习中、已掌握

    const labels = result.map((item) => item.label);
    expect(labels).toContain("未开始");
    expect(labels).toContain("学习中");
    expect(labels).toContain("已掌握");

    result.forEach((item) => {
      expect(item).toHaveProperty("count");
      expect(typeof item.count).toBe("number");
      expect(item.count).toBeGreaterThanOrEqual(0);
    });
  });

  it("应该能够获取薄弱知识点列表", async () => {
    const result = await caller.learningStats.getWeakKnowledgePoints({
      limit: 5,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);

    result.forEach((item) => {
      expect(item).toHaveProperty("knowledgePoint");
      expect(item).toHaveProperty("errorCount");
      expect(item).toHaveProperty("masteryRate");
      expect(typeof item.errorCount).toBe("number");
      expect(typeof item.masteryRate).toBe("number");
      expect(item.masteryRate).toBeGreaterThanOrEqual(0);
      expect(item.masteryRate).toBeLessThanOrEqual(100);
    });

    // 验证薄弱知识点按掌握率从低到高排序
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].masteryRate).toBeLessThanOrEqual(result[i + 1].masteryRate);
    }
  });

  it("应该能够按科目获取薄弱知识点", async () => {
    const result = await caller.learningStats.getWeakKnowledgePoints({
      limit: 5,
      subject: "math",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("掌握度趋势应该按日期排序", async () => {
    const result = await caller.learningStats.getMasteryTrend({
      days: 7,
    });

    expect(Array.isArray(result)).toBe(true);

    // 验证日期是升序排列的
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].date <= result[i + 1].date).toBe(true);
    }
  });

  it("应该正确计算掌握率百分比", async () => {
    const result = await caller.learningStats.getMasteryTrend({
      days: 30,
    });

    result.forEach((item) => {
      // 掌握率应该在0-100之间
      expect(item.masteryRate).toBeGreaterThanOrEqual(0);
      expect(item.masteryRate).toBeLessThanOrEqual(100);

      // 掌握率应该是有限数字
      expect(Number.isFinite(item.masteryRate)).toBe(true);
    });
  });
});
