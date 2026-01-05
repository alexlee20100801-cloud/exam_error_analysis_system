import { describe, it, expect, beforeAll } from "vitest";
import { analyzeAndClassifyErrors } from "./errorComparisonService";
import { getDb } from "./db";
import { users, errorQuestions, knowledgePoints } from "../drizzle/schema";

describe("错题对比分析功能测试", () => {
  let testUserId: number;
  let testKnowledgePointId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户
    const [user] = await db
      .insert(users)
      .values({
        openId: `test_error_comparison_${Date.now()}`,
        name: "错题对比测试用户",
        role: "user",
      })
      .$returningId();

    testUserId = user.id;

    // 插入测试知识点
    const [kp] = await db
      .insert(knowledgePoints)
      .values({
        name: "一元二次方程",
        subject: "math",
        grade: "junior3",
        level: "chapter",
        parentId: null,
        description: "一元二次方程的解法",
        difficulty: "medium",
      })
      .$returningId();

    testKnowledgePointId = kp.id;

    // 插入多道错题（模拟不同错误类型）
    await db.insert(errorQuestions).values([
      {
        userId: testUserId,
        title: "一元二次方程求根公式问题1",
        content: "解方程x²-5x+6=0",
        subject: "math",
        schoolLevel: "junior",
        grade: "junior3",
        correctAnswer: "x=2或x=3",
        userAnswer: "x=1或x=6",
        knowledgePointIds: [testKnowledgePointId],
        difficulty: "easy",
        errorAnalysis: "求根公式应用错误，判别式计算有误",
      },
      {
        userId: testUserId,
        title: "一元二次方程求根公式问题2",
        content: "解方程2x²+3x-2=0",
        subject: "math",
        schoolLevel: "junior",
        grade: "junior3",
        correctAnswer: "x=0.5或x=-2",
        userAnswer: "x=1或x=-1",
        knowledgePointIds: [testKnowledgePointId],
        difficulty: "medium",
        errorAnalysis: "求根公式中a、b、c系数代入错误",
      },
      {
        userId: testUserId,
        title: "一元二次方程配方法问题",
        content: "用配方法解方程x²+4x+3=0",
        subject: "math",
        schoolLevel: "junior",
        grade: "junior3",
        correctAnswer: "x=-1或x=-3",
        userAnswer: "x=1或x=3",
        knowledgePointIds: [testKnowledgePointId],
        difficulty: "medium",
        errorAnalysis: "配方过程中符号处理错误",
      },
    ]);
  });

  it("应该能够对多道错题进行对比分析", { timeout: 30000 }, async () => {
    const result = await analyzeAndClassifyErrors(testUserId, testKnowledgePointId);

    expect(result).toBeDefined();
    expect(result.totalErrors).toBeGreaterThanOrEqual(3);
    expect(result).toHaveProperty("errorGroups");
    expect(result).toHaveProperty("overallPattern");
    expect(result).toHaveProperty("targetedSuggestions");
  });

  it("应该能够将错题按错误类型分组", { timeout: 30000 }, async () => {
    const result = await analyzeAndClassifyErrors(testUserId, testKnowledgePointId);

    expect(result.errorGroups).toBeDefined();
    expect(Array.isArray(result.errorGroups)).toBe(true);

    // 验证每个分组的数据格式
    result.errorGroups.forEach((group) => {
      expect(group).toHaveProperty("errorType");
      expect(group).toHaveProperty("errorTypeName");
      expect(group).toHaveProperty("errors");
      expect(group).toHaveProperty("commonPattern");
      expect(group).toHaveProperty("count");

      // 验证错误类型是有效的
      expect(typeof group.errorType).toBe("string");
      expect(typeof group.errorTypeName).toBe("string");
      expect(Array.isArray(group.errors)).toBe(true);
      expect(group.count).toBeGreaterThan(0);
    });
  });

  it("应该能够生成整体错误模式总结", { timeout: 30000 }, async () => {
    const result = await analyzeAndClassifyErrors(testUserId, testKnowledgePointId);

    expect(result.overallPattern).toBeDefined();
    expect(typeof result.overallPattern).toBe("string");
    expect(result.overallPattern.length).toBeGreaterThan(0);
  });

  it("应该能够生成举一反三的专项练习建议", { timeout: 30000 }, async () => {
    const result = await analyzeAndClassifyErrors(testUserId, testKnowledgePointId);

    expect(result.targetedSuggestions).toBeDefined();
    expect(Array.isArray(result.targetedSuggestions)).toBe(true);
    expect(result.targetedSuggestions.length).toBeGreaterThan(0);

    // 验证建议内容不为空
    result.targetedSuggestions.forEach((suggestion) => {
      expect(typeof suggestion).toBe("string");
      expect(suggestion.length).toBeGreaterThan(0);
    });
  });

  it("对于没有错题的知识点应该返回提示信息", async () => {
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

    const result = await analyzeAndClassifyErrors(testUserId, newKp.id);

    expect(result).toBeDefined();
    expect(result.totalErrors).toBe(0);
    expect(result.errorGroups).toEqual([]);
    expect(result.overallPattern).toContain("暂无错题数据");
  });

  it("对于只有1道错题的知识点应该提示无法对比", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建一个只有1道错题的知识点
    const [newKp] = await db
      .insert(knowledgePoints)
      .values({
        name: "测试单错题知识点",
        subject: "math",
        grade: "junior3",
        level: "section",
        parentId: null,
        difficulty: "easy",
      })
      .$returningId();

    await db.insert(errorQuestions).values({
      userId: testUserId,
      title: "单独的错题",
      content: "测试内容",
      subject: "math",
      schoolLevel: "junior",
      grade: "junior3",
      correctAnswer: "答案",
      userAnswer: "错误答案",
      knowledgePointIds: [newKp.id],
      difficulty: "easy",
    });

    const result = await analyzeAndClassifyErrors(testUserId, newKp.id);

    expect(result).toBeDefined();
    expect(result.totalErrors).toBe(1);
    expect(result.errorGroups).toEqual([]);
    expect(result.overallPattern).toContain("错题数量较少");
  });
});
