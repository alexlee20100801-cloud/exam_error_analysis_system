import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import { analyzeErrorQuestion } from "./services/errorAnalysisService";

describe("AI错题分析功能测试", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let mockUserId: number;
  let testQuestionId: number;

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

    // 创建一个测试错题
    const createResult = await caller.errorQuestions.create({
      title: "一元二次方程求解",
      content: "解方程：x² - 5x + 6 = 0",
      subject: "math",
      grade: "junior3",
      schoolLevel: "junior",
      difficulty: "easy",
      userAnswer: "x = 2",
      userNotes: "只求出了一个解",
    });

    testQuestionId = createResult.questionId;
  });

  it("应该能够分析错题并返回结构化结果", async () => {
    const result = await analyzeErrorQuestion(
      "解方程：x² - 5x + 6 = 0",
      "math",
      "junior3",
      "x = 2"
    );

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();

    if (result.analysis) {
      expect(result.analysis.knowledgePoints).toBeInstanceOf(Array);
      expect(result.analysis.knowledgePoints.length).toBeGreaterThan(0);
      expect(result.analysis.errorReason).toBeTruthy();
      expect(result.analysis.correctAnswer).toBeTruthy();
      expect(result.analysis.detailedExplanation).toBeTruthy();
      expect(result.analysis.studyAdvice).toBeTruthy();
      expect(["easy", "medium", "hard"]).toContain(result.analysis.difficulty);
    }
  });

  it("应该能够通过tRPC接口分析错题", async () => {
    const result = await caller.errorQuestions.analyze({
      questionId: testQuestionId,
    });

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();

    if (result.analysis) {
      expect(result.analysis.knowledgePoints).toBeInstanceOf(Array);
      expect(result.analysis.errorReason).toBeTruthy();
      expect(result.analysis.correctAnswer).toBeTruthy();
    }
  });

  it("应该拒绝分析不存在的错题", async () => {
    await expect(
      caller.errorQuestions.analyze({
        questionId: 999999,
      })
    ).rejects.toThrow();
  });

  it("应该能够处理不同科目的错题", async () => {
    const subjects = ["math", "physics", "chemistry"];

    for (const subject of subjects) {
      const result = await analyzeErrorQuestion(
        "这是一道测试题目",
        subject,
        "junior3"
      );

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
    }
  }, 30000); // 增加超时时间因为要调用多次LLM

  it("AI分析应该识别出知识点", async () => {
    const result = await analyzeErrorQuestion(
      "已知函数 f(x) = 2x + 3，求 f(5) 的值。",
      "math",
      "junior1"
    );

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();

    if (result.analysis) {
      // 应该识别出"函数"或"代入"等相关知识点
      const knowledgePointsStr = result.analysis.knowledgePoints.join(" ");
      expect(
        knowledgePointsStr.includes("函数") ||
          knowledgePointsStr.includes("代入") ||
          knowledgePointsStr.includes("计算")
      ).toBe(true);
    }
  });

  it("AI分析应该根据用户答案给出针对性建议", async () => {
    const result = await analyzeErrorQuestion(
      "计算：3 + 5 × 2 = ?",
      "math",
      "junior1",
      "16" // 错误答案（没有先算乘法）
    );

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();

    if (result.analysis) {
      // 错误原因应该提到运算顺序
      expect(
        result.analysis.errorReason.includes("顺序") ||
          result.analysis.errorReason.includes("优先") ||
          result.analysis.errorReason.includes("先")
      ).toBe(true);

      // 正确答案应该是13
      expect(result.analysis.correctAnswer).toContain("13");
    }
  });
});
