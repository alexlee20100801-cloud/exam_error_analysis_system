import { describe, it, expect, beforeAll } from "vitest";
import {
  getKnowledgePointInfo,
  getKnowledgePointErrors,
  getKnowledgePointPractices,
  getKnowledgePointProgress,
  getKnowledgePointFullDetail,
  analyzeCommonMistakes,
} from "./knowledgePointDetailService";
import { getDb } from "./db";
import { users, errorQuestions, knowledgePoints, learningProgress, practiceRecords } from "../drizzle/schema";

describe("知识点详情功能测试", () => {
  let testUserId: number;
  let testKnowledgePointId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户
    const [user] = await db
      .insert(users)
      .values({
        openId: `test_kp_detail_${Date.now()}`,
        name: "知识点详情测试用户",
        role: "user",
      })
      .$returningId();

    testUserId = user.id;

    // 插入测试知识点
    const [kp] = await db
      .insert(knowledgePoints)
      .values({
        name: "二次函数",
        subject: "math",
        grade: "junior3",
        level: "chapter",
        parentId: null,
        description: "二次函数的图像和性质",
        difficulty: "medium",
      })
      .$returningId();

    testKnowledgePointId = kp.id;

    // 插入学习进度
    await db.insert(learningProgress).values({
      userId: testUserId,
      knowledgePointId: testKnowledgePointId,
      masteryLevel: 0.65,
      practiceCount: 10,
      correctCount: 7,
      lastPracticeAt: new Date(),
    });

    // 插入错题
    await db.insert(errorQuestions).values([
      {
        userId: testUserId,
        title: "二次函数顶点坐标问题",
        content: "求二次函数y=x²-2x+3的顶点坐标",
        subject: "math",
        schoolLevel: "junior",
        grade: "junior3",
        correctAnswer: "(1, 2)",
        userAnswer: "(2, 3)",
        knowledgePointIds: [testKnowledgePointId],
        difficulty: "medium",
        errorAnalysis: "对顶点公式理解不准确",
      },
      {
        userId: testUserId,
        title: "二次函数对称轴问题",
        content: "求二次函数y=2x²+4x+1的对称轴",
        subject: "math",
        schoolLevel: "junior",
        grade: "junior3",
        correctAnswer: "x=-1",
        userAnswer: "x=1",
        knowledgePointIds: [testKnowledgePointId],
        difficulty: "easy",
        errorAnalysis: "对称轴公式符号错误",
      },
    ]);

    // 插入练习记录
    await db.insert(practiceRecords).values([
      {
        userId: testUserId,
        questionId: 1,
        questionType: "practice_question",
        userAnswer: "正确答案",
        isCorrect: true,
        knowledgePointIds: [testKnowledgePointId],
        subject: "math",
        grade: "junior3",
      },
      {
        userId: testUserId,
        questionId: 2,
        questionType: "practice_question",
        userAnswer: "错误答案",
        isCorrect: false,
        knowledgePointIds: [testKnowledgePointId],
        subject: "math",
        grade: "junior3",
      },
    ]);
  });

  it("应该能够获取知识点的基本信息", async () => {
    const info = await getKnowledgePointInfo(testKnowledgePointId);

    expect(info).toBeDefined();
    expect(info?.name).toBe("二次函数");
    expect(info?.subject).toBe("math");
    expect(info?.difficulty).toBe("medium");
  });

  it("应该能够获取知识点相关的错题", async () => {
    const errors = await getKnowledgePointErrors(testUserId, testKnowledgePointId);

    expect(errors).toBeDefined();
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBeGreaterThanOrEqual(2);

    // 验证错题包含知识点ID
    errors.forEach((error) => {
      expect(error.knowledgePointIds).toContain(testKnowledgePointId);
    });
  });

  it("应该能够获取知识点的练习记录", async () => {
    const practices = await getKnowledgePointPractices(testUserId, testKnowledgePointId);

    expect(practices).toBeDefined();
    expect(Array.isArray(practices)).toBe(true);
    expect(practices.length).toBeGreaterThanOrEqual(2);
  });

  it("应该能够获取知识点的学习进度", async () => {
    const progress = await getKnowledgePointProgress(testUserId, testKnowledgePointId);

    expect(progress).toBeDefined();
    expect(progress?.masteryLevel).toBe(0.65);
    expect(progress?.practiceCount).toBe(10);
    expect(progress?.correctCount).toBe(7);
  });

  it("应该能够获取知识点的完整详情数据", async () => {
    const detail = await getKnowledgePointFullDetail(testUserId, testKnowledgePointId);

    expect(detail).toBeDefined();
    expect(detail.info).toBeDefined();
    expect(detail.errors).toBeDefined();
    expect(detail.practices).toBeDefined();
    expect(detail.progress).toBeDefined();
    expect(detail.masteryTrend).toBeDefined();
    expect(detail.aiAnalysis).toBeDefined();
    expect(detail.stats).toBeDefined();

    // 验证统计数据
    expect(detail.stats.errorCount).toBeGreaterThanOrEqual(2);
    expect(detail.stats.practiceCount).toBeGreaterThanOrEqual(2);
    expect(detail.stats.masteryLevel).toBe(65);
  }, { timeout: 30000 });

  it("应该能够使用AI分析易错原因", { timeout: 30000 }, async () => {
    const analysis = await analyzeCommonMistakes(testUserId, testKnowledgePointId);

    expect(analysis).toBeDefined();
    expect(analysis).toHaveProperty("summary");
    expect(analysis).toHaveProperty("commonPatterns");
    expect(analysis).toHaveProperty("suggestions");

    // 验证数据格式
    expect(typeof analysis.summary).toBe("string");
    expect(Array.isArray(analysis.commonPatterns)).toBe(true);
    expect(Array.isArray(analysis.suggestions)).toBe(true);

    // 验证内容不为空
    expect(analysis.summary.length).toBeGreaterThan(0);
  });

  it("对于没有错题的知识点应该返回提示信息", { timeout: 10000 }, async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建一个没有错题的知识点
    const [newKp] = await db
      .insert(knowledgePoints)
      .values({
        name: "测试空知识点",
        subject: "math",
        grade: "junior3",
        level: "section",
        parentId: null,
        difficulty: "easy",
      })
      .$returningId();

    const analysis = await analyzeCommonMistakes(testUserId, newKp.id);

    expect(analysis).toBeDefined();
    expect(analysis.summary).toContain("暂无错题数据");
  });
});
