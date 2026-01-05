import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("考试和复习计划功能测试", () => {
  const mockContext: Context = {
    user: {
      id: 1,
      name: "测试用户",
      openId: "test-open-id",
      email: null,
      avatar: null,
      role: "user",
      schoolLevel: "junior",
      grade: "junior2",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const caller = appRouter.createCaller(mockContext);

  let examId: number;

  it("应该能创建考试", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30天后

    const result = await caller.examAndPlan.createExam({
      name: "期中考试",
      examDate: futureDate.toISOString(),
      subject: "math",
      section: "junior",
      grade: "junior2",
      scope: "第1-3章",
      description: "期中考试数学",
    });

    expect(result.examId).toBeDefined();
    examId = result.examId;
  });

  it("应该能获取所有考试", async () => {
    const exams = await caller.examAndPlan.getAllExams();
    expect(Array.isArray(exams)).toBe(true);
    expect(exams.length).toBeGreaterThan(0);
  });

  it("应该能获取即将到来的考试", async () => {
    const exams = await caller.examAndPlan.getUpcomingExams();
    expect(Array.isArray(exams)).toBe(true);
  });

  it("应该能生成复习计划", async () => {
    const result = await caller.examAndPlan.generatePlan({ examId });
    expect(result.planCount).toBeGreaterThanOrEqual(0);
  });

  it("应该能获取指定日期的复习计划", async () => {
    const today = new Date();
    const plans = await caller.examAndPlan.getPlansByDate({ date: today.toISOString() });
    expect(Array.isArray(plans)).toBe(true);
  });

  it("应该能获取日期范围内的复习计划", async () => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const plans = await caller.examAndPlan.getPlansByDateRange({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(Array.isArray(plans)).toBe(true);
  });

  it("应该能获取复习计划统计", async () => {
    const stats = await caller.examAndPlan.getPlanStats({ examId });
    expect(stats).toHaveProperty("totalPlans");
    expect(stats).toHaveProperty("completedPlans");
    expect(stats).toHaveProperty("completionRate");
  });

  it("应该能更新考试", async () => {
    const result = await caller.examAndPlan.updateExam({
      examId,
      name: "期中考试（更新）",
      description: "更新后的描述",
    });

    expect(result.success).toBe(true);
  });

  it("应该能删除考试", async () => {
    const result = await caller.examAndPlan.deleteExam({ examId });
    expect(result.success).toBe(true);
  });
});
