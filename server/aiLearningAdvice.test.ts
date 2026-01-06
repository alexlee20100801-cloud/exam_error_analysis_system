import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users, errorQuestions, knowledgePoints } from "../drizzle/schema";
import { generateLearningAdvice } from "./services/aiLearningAdviceService";

describe("AI学习建议功能测试", () => {
  let cachedAdvice: Awaited<ReturnType<typeof generateLearningAdvice>> | null = null;
  let testUserId: number;
  let testKnowledgePointIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建测试用户
    const [user] = await db.insert(users).values({
      openId: `test_ai_advice_${Date.now()}`,
      name: "AI建议测试用户",
      role: "user",
      userType: "student",
      grade: "junior3",
      schoolLevel: "junior",
    });
    testUserId = Number(user.insertId);

    // 创建测试知识点
    const kp1 = await db.insert(knowledgePoints).values({
      name: "二次函数",
      subject: "math",
      grade: "junior3",
      schoolLevel: "junior",
      chapter: "第一章",
      semester: "first",
    });
    testKnowledgePointIds.push(Number(kp1[0].insertId));

    const kp2 = await db.insert(knowledgePoints).values({
      name: "一元二次方程",
      subject: "math",
      grade: "junior3",
      schoolLevel: "junior",
      chapter: "第二章",
      semester: "first",
    });
    testKnowledgePointIds.push(Number(kp2[0].insertId));

    // 创建测试错题
    await db.insert(errorQuestions).values([
      {
        userId: testUserId,
        title: "数学错题1",
        content: "测试内容",
        subject: "math",
        grade: "junior3",
        schoolLevel: "junior",
        difficulty: "easy",
        isAnalyzed: true,
        isMastered: true,
        knowledgePointIds: [testKnowledgePointIds[0]],
      },
      {
        userId: testUserId,
        title: "数学错题2",
        content: "测试内容",
        subject: "math",
        grade: "junior3",
        schoolLevel: "junior",
        difficulty: "medium",
        isAnalyzed: true,
        isMastered: false,
        knowledgePointIds: [testKnowledgePointIds[0]],
      },
      {
        userId: testUserId,
        title: "物理错题1",
        content: "测试内容",
        subject: "physics",
        grade: "junior3",
        schoolLevel: "junior",
        difficulty: "hard",
        isAnalyzed: true,
        isMastered: false,
        knowledgePointIds: [testKnowledgePointIds[1]],
      },
      {
        userId: testUserId,
        title: "英语错题1",
        content: "测试内容",
        subject: "english",
        grade: "junior3",
        schoolLevel: "junior",
        difficulty: "easy",
        isAnalyzed: true,
        isMastered: true,
        knowledgePointIds: [testKnowledgePointIds[1]],
      },
    ]);
  });

  it("应该成功生成AI学习建议", async () => {
    // 生成一次并缓存结果，后续测试复用
    cachedAdvice = await generateLearningAdvice(testUserId);

    expect(cachedAdvice).toBeDefined();
    expect(cachedAdvice.overallAssessment).toBeDefined();
    expect(typeof cachedAdvice.overallAssessment).toBe("string");
    expect(cachedAdvice.overallAssessment.length).toBeGreaterThan(0);
  }, 30000); // 30秒超时

  it("应该包含学习建议列表", async () => {
    if (!cachedAdvice) throw new Error("缓存的建议不存在");

    expect(cachedAdvice.learningTips).toBeDefined();
    expect(Array.isArray(cachedAdvice.learningTips)).toBe(true);
    expect(cachedAdvice.learningTips.length).toBeGreaterThan(0);

    // 验证每条建议的结构
    cachedAdvice.learningTips.forEach((tip) => {
      expect(tip.title).toBeDefined();
      expect(tip.content).toBeDefined();
      expect(tip.priority).toBeDefined();
      expect(["high", "medium", "low"]).toContain(tip.priority);
    });
  });

  it("应该包含复习计划", async () => {
    if (!cachedAdvice) throw new Error("缓存的建议不存在");

    expect(cachedAdvice.reviewPlan).toBeDefined();
    expect(Array.isArray(cachedAdvice.reviewPlan)).toBe(true);

    if (cachedAdvice.reviewPlan.length > 0) {
      // 验证复习计划的结构
      cachedAdvice.reviewPlan.forEach((plan) => {
        expect(plan.subject).toBeDefined();
        expect(plan.reason).toBeDefined();
        expect(plan.suggestedTime).toBeDefined();
        expect(plan.priority).toBeDefined();
        expect(typeof plan.priority).toBe("number");
        expect(plan.priority).toBeGreaterThan(0);
      });

      // 验证优先级排序
      for (let i = 1; i < cachedAdvice.reviewPlan.length; i++) {
        expect(cachedAdvice.reviewPlan[i].priority).toBeGreaterThanOrEqual(
          cachedAdvice.reviewPlan[i - 1].priority
        );
      }
    }
  });

  it("应该包含薄弱点诊断", async () => {
    if (!cachedAdvice) throw new Error("缓存的建议不存在");

    expect(cachedAdvice.weaknesses).toBeDefined();
    expect(Array.isArray(cachedAdvice.weaknesses)).toBe(true);

    if (cachedAdvice.weaknesses.length > 0) {
      // 验证薄弱点的结构
      cachedAdvice.weaknesses.forEach((weakness) => {
        expect(weakness.area).toBeDefined();
        expect(weakness.severity).toBeDefined();
        expect(["critical", "moderate", "minor"]).toContain(weakness.severity);
        expect(weakness.recommendation).toBeDefined();
      });
    }
  });

  it("应该包含激励语", async () => {
    if (!cachedAdvice) throw new Error("缓存的建议不存在");

    expect(cachedAdvice.encouragement).toBeDefined();
    expect(typeof cachedAdvice.encouragement).toBe("string");
    expect(cachedAdvice.encouragement.length).toBeGreaterThan(0);
  });

  it("对于没有错题的用户应该返回默认建议", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建一个没有错题的新用户
    const [newUser] = await db.insert(users).values({
      openId: `test_empty_advice_${Date.now()}`,
      name: "空数据用户",
      role: "user",
      userType: "student",
      grade: "junior3",
      schoolLevel: "junior",
    });
    const newUserId = Number(newUser.insertId);

    const advice = await generateLearningAdvice(newUserId);

    expect(advice).toBeDefined();
    expect(advice.overallAssessment).toContain("没有错题记录");
    expect(advice.learningTips.length).toBeGreaterThan(0);
    expect(advice.reviewPlan.length).toBe(0);
    expect(advice.weaknesses.length).toBe(0);
  });
});
