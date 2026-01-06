import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { errorQuestions, knowledgePoints, users } from "../drizzle/schema";
import {
  getSubjectDistribution,
  getDifficultyDistribution,
  getKnowledgePointMastery,
  getErrorQuestionOverview,
} from "./services/errorQuestionStatsService";

describe("错题统计功能测试", () => {
  let testUserId: number;
  let testKnowledgePointIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建测试用户
    const [user] = await db.insert(users).values({
      openId: `test_stats_${Date.now()}`,
      name: "统计测试用户",
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
        semester: "first",
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
        semester: "first",
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
        semester: "first",
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
        knowledgePointIds: [],
        semester: "first",
      },
    ]);
  });

  it("应该正确统计学科分布", async () => {
    const distribution = await getSubjectDistribution(testUserId);

    expect(distribution).toBeDefined();
    expect(distribution.length).toBeGreaterThan(0);

    // 验证数学学科有2道错题
    const mathStat = distribution.find((d) => d.subject === "math");
    expect(mathStat).toBeDefined();
    expect(mathStat?.count).toBe(2);

    // 验证物理学科有1道错题
    const physicsStat = distribution.find((d) => d.subject === "physics");
    expect(physicsStat).toBeDefined();
    expect(physicsStat?.count).toBe(1);

    // 验证英语学科有1道错题
    const englishStat = distribution.find((d) => d.subject === "english");
    expect(englishStat).toBeDefined();
    expect(englishStat?.count).toBe(1);
  });

  it("应该正确统计难度分布", async () => {
    const distribution = await getDifficultyDistribution(testUserId);

    expect(distribution).toBeDefined();
    expect(distribution.length).toBeGreaterThan(0);

    // 验证简单难度有2道错题
    const easyStat = distribution.find((d) => d.difficulty === "easy");
    expect(easyStat).toBeDefined();
    expect(easyStat?.count).toBe(2);

    // 验证中等难度有1道错题
    const mediumStat = distribution.find((d) => d.difficulty === "medium");
    expect(mediumStat).toBeDefined();
    expect(mediumStat?.count).toBe(1);

    // 验证困难难度有1道错题
    const hardStat = distribution.find((d) => d.difficulty === "hard");
    expect(hardStat).toBeDefined();
    expect(hardStat?.count).toBe(1);
  });

  it("应该正确计算知识点掌握度", async () => {
    const mastery = await getKnowledgePointMastery(testUserId, 10);

    expect(mastery).toBeDefined();
    expect(mastery.length).toBeGreaterThan(0);

    // 验证第一个知识点（二次函数）有2道错题，1道已掌握
    const kp1Mastery = mastery.find(
      (m) => m.knowledgePointId === testKnowledgePointIds[0]
    );
    expect(kp1Mastery).toBeDefined();
    expect(kp1Mastery?.totalErrors).toBe(2);
    expect(kp1Mastery?.masteredErrors).toBe(1);
    expect(kp1Mastery?.masteryLevel).toBe(50); // 1/2 * 100 = 50%

    // 验证第二个知识点（一元二次方程）有1道错题，0道已掌握
    const kp2Mastery = mastery.find(
      (m) => m.knowledgePointId === testKnowledgePointIds[1]
    );
    expect(kp2Mastery).toBeDefined();
    expect(kp2Mastery?.totalErrors).toBe(1);
    expect(kp2Mastery?.masteredErrors).toBe(0);
    expect(kp2Mastery?.masteryLevel).toBe(0); // 0/1 * 100 = 0%
  });

  it("应该正确获取错题统计总览", async () => {
    const overview = await getErrorQuestionOverview(testUserId);

    expect(overview).toBeDefined();
    expect(overview.totalErrors).toBe(4); // 总共4道错题
    expect(overview.analyzedErrors).toBe(4); // 4道已分析
    expect(overview.masteredErrors).toBe(2); // 2道已掌握
    expect(overview.masteryRate).toBe(50); // 2/4 * 100 = 50%

    // 验证难度统计
    expect(overview.difficultyStats).toBeDefined();
    expect(overview.difficultyStats.length).toBeGreaterThan(0);

    // 验证学科统计
    expect(overview.subjectStats).toBeDefined();
    expect(overview.subjectStats.length).toBeGreaterThan(0);
  });

  it("应该支持限制知识点掌握度返回数量", async () => {
    const mastery = await getKnowledgePointMastery(testUserId, 1);

    expect(mastery).toBeDefined();
    expect(mastery.length).toBeLessThanOrEqual(1);
  });

  it("对于没有错题的用户应该返回空数据", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建一个新用户（没有错题）
    const [newUser] = await db.insert(users).values({
      openId: `test_empty_${Date.now()}`,
      name: "空数据用户",
      role: "user",
      userType: "student",
      grade: "junior3",
      schoolLevel: "junior",
    });

    const newUserId = Number(newUser.insertId);
    
    const distribution = await getSubjectDistribution(newUserId);
    expect(distribution).toBeDefined();
    expect(distribution.length).toBe(0);

    const mastery = await getKnowledgePointMastery(newUserId, 10);
    expect(mastery).toBeDefined();
    expect(mastery.length).toBe(0);

    const overview = await getErrorQuestionOverview(newUserId);
    expect(overview.totalErrors).toBe(0);
    expect(overview.masteryRate).toBe(0);
  });
});
