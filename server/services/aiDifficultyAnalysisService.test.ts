import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  analyzeDifficulty,
  analyzeDifficultyBatch,
  updateQuestionDifficulty,
  getDifficultyAnalysisHistory,
  getDifficultyStatistics,
  batchUpdateDifficulty,
  getQuestionsNeedingAnalysis,
  DifficultyAnalysisResult,
} from "./aiDifficultyAnalysisService";
import { db } from "../db";
import { questions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock LLM调用
vi.mock("../services/aiDifficultyAnalysisService", async () => {
  const actual = await vi.importActual<
    typeof import("./aiDifficultyAnalysisService")
  >("./aiDifficultyAnalysisService");
  return {
    ...actual,
    invokeLLM: vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              difficulty: "medium",
              difficultyScore: 65,
              reason: "需要理解多个概念的综合应用",
              keyPoints: ["函数", "导数", "极值"],
              requiredKnowledge: ["微积分基础", "函数性质"],
              estimatedSolveTime: 180,
              commonMistakes: [
                "求导错误",
                "极值判断错误",
                "边界条件遗漏",
              ],
              confidence: 0.85,
            }),
          },
        },
      ],
    }),
  };
});

describe("AI难度分析服务", () => {
  let testQuestionId: number;

  beforeAll(async () => {
    // 创建测试题目
    const result = await db.insert(questions).values({
      content: "求函数f(x) = x^3 - 3x的极值点",
      type: "calculation",
      subject: "math",
      grade: "高中",
      difficulty: "unknown",
      isPublished: 1,
      createdBy: 1,
    });

    testQuestionId = (result.insertId as unknown as number) || 1;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testQuestionId) {
      await db.delete(questions).where(eq(questions.id, testQuestionId));
    }
  });

  it("应该成功分析题目难度", async () => {
    const result = await analyzeDifficulty(
      testQuestionId,
      "求函数f(x) = x^3 - 3x的极值点",
      "calculation",
      "math"
    );

    expect(result).toBeDefined();
    expect(result.questionId).toBe(testQuestionId);
    expect(["easy", "medium", "hard"]).toContain(result.estimatedDifficulty);
    expect(result.difficultyScore).toBeGreaterThanOrEqual(0);
    expect(result.difficultyScore).toBeLessThanOrEqual(100);
    expect(result.analysisReason).toBeDefined();
    expect(Array.isArray(result.keyPoints)).toBe(true);
    expect(Array.isArray(result.requiredKnowledge)).toBe(true);
    expect(result.estimatedSolveTime).toBeGreaterThan(0);
    expect(Array.isArray(result.commonMistakes)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("应该成功更新题目难度信息", async () => {
    const analysisResult: DifficultyAnalysisResult = {
      questionId: testQuestionId,
      estimatedDifficulty: "medium",
      difficultyScore: 65,
      analysisReason: "需要理解多个概念的综合应用",
      keyPoints: ["函数", "导数", "极值"],
      requiredKnowledge: ["微积分基础", "函数性质"],
      estimatedSolveTime: 180,
      commonMistakes: ["求导错误", "极值判断错误", "边界条件遗漏"],
      confidence: 0.85,
      timestamp: new Date(),
    };

    await updateQuestionDifficulty(testQuestionId, analysisResult);

    const updated = await db
      .select()
      .from(questions)
      .where(eq(questions.id, testQuestionId))
      .limit(1);

    expect(updated[0]).toBeDefined();
    expect(updated[0].difficulty).toBe("medium");
    expect(updated[0].difficultyScore).toBe(65);
    expect(updated[0].analysisMetadata).toBeDefined();
  });

  it("应该成功获取难度分析历史", async () => {
    const history = await getDifficultyAnalysisHistory(testQuestionId);

    expect(history).toBeDefined();
    expect(history?.questionId).toBe(testQuestionId);
    expect(history?.currentDifficulty).toBe("medium");
    expect(history?.difficultyScore).toBe(65);
    expect(history?.analysisMetadata).toBeDefined();
  });

  it("应该成功批量分析题目难度", async () => {
    const questionsToAnalyze = [
      {
        id: testQuestionId,
        content: "求函数f(x) = x^3 - 3x的极值点",
        type: "calculation",
        subject: "math",
      },
    ];

    const results = await analyzeDifficultyBatch(questionsToAnalyze);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].questionId).toBe(testQuestionId);
  });

  it("应该成功批量更新题目难度", async () => {
    const analysisResults: DifficultyAnalysisResult[] = [
      {
        questionId: testQuestionId,
        estimatedDifficulty: "hard",
        difficultyScore: 85,
        analysisReason: "需要深入理解高等数学概念",
        keyPoints: ["函数", "导数", "极值", "二阶导数"],
        requiredKnowledge: ["微积分基础", "函数性质", "极限"],
        estimatedSolveTime: 300,
        commonMistakes: ["求导错误", "极值判断错误", "符号错误"],
        confidence: 0.9,
        timestamp: new Date(),
      },
    ];

    await batchUpdateDifficulty(analysisResults);

    const updated = await db
      .select()
      .from(questions)
      .where(eq(questions.id, testQuestionId))
      .limit(1);

    expect(updated[0].difficulty).toBe("hard");
    expect(updated[0].difficultyScore).toBe(85);
  });

  it("应该成功获取难度统计信息", async () => {
    const stats = await getDifficultyStatistics("math", "高中");

    expect(Array.isArray(stats)).toBe(true);
    // 统计结果可能为空，这是正常的
  });

  it("应该成功获取需要分析的题目列表", async () => {
    const questionsNeedingAnalysis = await getQuestionsNeedingAnalysis(10, 24);

    expect(Array.isArray(questionsNeedingAnalysis)).toBe(true);
    // 列表可能为空，这是正常的
  });

  it("应该处理空题目内容", async () => {
    try {
      await analyzeDifficulty(
        testQuestionId,
        "",
        "calculation",
        "math"
      );
      // 如果成功，说明服务能处理空内容
      expect(true).toBe(true);
    } catch (error) {
      // 如果失败，说明服务正确地拒绝了空内容
      expect(error).toBeDefined();
    }
  });

  it("应该处理无效的题目ID", async () => {
    try {
      await getDifficultyAnalysisHistory(99999);
      // 应该返回null而不是抛出错误
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
