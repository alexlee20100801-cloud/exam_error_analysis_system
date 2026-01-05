import { describe, it, expect, beforeAll } from "vitest";
import { getSubjectFullStats, getSubjectKnowledgeMastery, getSubjectWeakChapters } from "./subjectStatsService";
import { getDb } from "./db";
import { users, errorQuestions, knowledgePoints, learningProgress } from "../drizzle/schema";

describe("学科学习报告功能测试", () => {
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户
    const [user] = await db
      .insert(users)
      .values({
        openId: `test_subject_report_${Date.now()}`,
        name: "学科报告测试用户",
        role: "user",
      })
      .$returningId();

    testUserId = user.id;

    // 插入测试知识点（数学学科）
    const [kp1] = await db
      .insert(knowledgePoints)
      .values({
        name: "函数与方程",
        subject: "math",
        grade: "junior3",
        level: "chapter",
        parentId: null,
        description: "函数与方程章节",
        difficulty: "medium",
      })
      .$returningId();

    const [kp2] = await db
      .insert(knowledgePoints)
      .values({
        name: "几何图形",
        subject: "math",
        grade: "junior3",
        level: "chapter",
        parentId: null,
        description: "几何图形章节",
        difficulty: "hard",
      })
      .$returningId();

    // 插入学习进度（模拟不同掌握度）
    await db.insert(learningProgress).values([
      {
        userId: testUserId,
        knowledgePointId: kp1.id,
        masteryLevel: 0.8, // 80%掌握度
        practiceCount: 10,
        correctCount: 8,
        lastPracticeAt: new Date(),
      },
      {
        userId: testUserId,
        knowledgePointId: kp2.id,
        masteryLevel: 0.4, // 40%掌握度（薄弱章节）
        practiceCount: 5,
        correctCount: 2,
        lastPracticeAt: new Date(),
      },
    ]);

    // 插入错题（模拟错题趋势）
    await db.insert(errorQuestions).values([
      {
        userId: testUserId,
        title: "测试错题1",
        content: "测试错题内容1",
        subject: "math",
        schoolLevel: "junior",
        grade: "junior3",
        correctAnswer: "答案1",
        userAnswer: "错误答案1",
        knowledgePointIds: [kp1.id],
        difficulty: "medium",
      },
      {
        userId: testUserId,
        title: "测试错题2",
        content: "测试错题内容2",
        subject: "math",
        schoolLevel: "junior",
        grade: "junior3",
        correctAnswer: "答案2",
        userAnswer: "错误答案2",
        knowledgePointIds: [kp2.id],
        difficulty: "hard",
      },
    ]);
  });

  it("应该能够获取学科的知识点掌握度数据", async () => {
    const mastery = await getSubjectKnowledgeMastery(testUserId, "math");

    expect(mastery).toBeDefined();
    expect(Array.isArray(mastery)).toBe(true);
    expect(mastery.length).toBeGreaterThan(0);

    // 验证数据格式
    mastery.forEach((item) => {
      expect(item).toHaveProperty("chapter");
      expect(item).toHaveProperty("mastery");
      expect(typeof item.mastery).toBe("number");
      expect(item.mastery).toBeGreaterThanOrEqual(0);
      expect(item.mastery).toBeLessThanOrEqual(100);
    });
  });

  it("应该能够识别薄弱章节（掌握度<60%）", async () => {
    const weakChapters = await getSubjectWeakChapters(testUserId, "math");

    expect(weakChapters).toBeDefined();
    expect(Array.isArray(weakChapters)).toBe(true);

    // 应该包含掌握度40%的"几何图形"章节
    const weakChapter = weakChapters.find((c) => c.chapter === "几何图形");
    expect(weakChapter).toBeDefined();
    expect(weakChapter?.mastery).toBeLessThan(60);
  });

  it("应该能够获取完整的学科统计数据", async () => {
    const stats = await getSubjectFullStats(testUserId, "math");

    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("mastery");
    expect(stats).toHaveProperty("errorTrend");
    expect(stats).toHaveProperty("accuracyTrend");
    expect(stats).toHaveProperty("weakChapters");
    expect(stats).toHaveProperty("advice");

    // 验证知识点掌握度
    expect(Array.isArray(stats.mastery)).toBe(true);

    // 验证错题趋势
    expect(Array.isArray(stats.errorTrend)).toBe(true);

    // 验证练习正确率趋势
    expect(Array.isArray(stats.accuracyTrend)).toBe(true);

    // 验证薄弱章节
    expect(Array.isArray(stats.weakChapters)).toBe(true);

    // 验证学习建议
    expect(Array.isArray(stats.advice)).toBe(true);
    expect(stats.advice.length).toBeGreaterThan(0);
  });

  it("应该根据掌握度生成合适的学习建议", async () => {
    const stats = await getSubjectFullStats(testUserId, "math");

    expect(stats.advice).toBeDefined();
    expect(stats.advice.length).toBeGreaterThan(0);

    // 验证建议内容包含关键信息
    const adviceText = stats.advice.join(" ");
    expect(adviceText.length).toBeGreaterThan(0);
  });

  it("对于没有数据的学科应该返回空数据或零值", async () => {
    const stats = await getSubjectFullStats(testUserId, "physics");

    expect(stats).toBeDefined();
    // 允许返回空数组或包含0掌握度的数据（因为可能有预置知识点）
    expect(Array.isArray(stats.mastery)).toBe(true);
    expect(Array.isArray(stats.errorTrend)).toBe(true);
    expect(Array.isArray(stats.accuracyTrend)).toBe(true);
    expect(Array.isArray(stats.weakChapters)).toBe(true);
    
    // 错题趋势和练习正确率应该为空（没有错题和练习记录）
    expect(stats.errorTrend).toEqual([]);
    expect(stats.accuracyTrend).toEqual([]);
  });
});
