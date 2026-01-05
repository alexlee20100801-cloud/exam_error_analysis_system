import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { createInnerContext } from "./_core/context";
import type { IncomingMessage, ServerResponse } from "http";
import { getDb, upsertUser, createErrorQuestion, createPracticeRecord } from "./db";
import type { InsertErrorQuestion, InsertPracticeRecord } from "../drizzle/schema";

describe("学习报告导出功能", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  const testUserOpenId = `test-user-${Date.now()}`;
  let testUserId: number;

  beforeAll(async () => {
    // 创建测试用户
    await upsertUser({
      openId: testUserOpenId,
      name: "测试用户",
      avatar: null,
    });
    
    // 获取用户ID
    const { getUserByOpenId } = await import("./db");
    const user = await getUserByOpenId(testUserOpenId);
    if (!user) throw new Error("User not found");
    testUserId = user.id;

    // 创建一些测试数据
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 创建错题
    for (let i = 0; i < 5; i++) {
      const question: InsertErrorQuestion = {
        userId: testUserId,
        subject: i % 2 === 0 ? "math" : "physics",
        grade: "junior1",
        title: `测试错题${i + 1}`,
        content: `这是测试错题${i + 1}的内容`,
        correctAnswer: "A",
        userAnswer: "B",
        analysis: "这是解析",
        difficulty: "medium",
        knowledgePoints: JSON.stringify(["知识点1", "知识点2"]),
        isMastered: i < 2, // 前两道标记为已掌握
        isAnalyzed: true,
      };
      await createErrorQuestion(question);
    }

    // 创建练习记录
    for (let i = 0; i < 3; i++) {
      const practice: InsertPracticeRecord = {
        userId: testUserId,
        knowledgePointId: 1,
        questionContent: `练习题${i + 1}`,
        userAnswer: "A",
        correctAnswer: i === 0 ? "A" : "B", // 第一道正确
        isCorrect: i === 0,
      };
      await createPracticeRecord(practice);
    }

    // 创建测试上下文
    const ctx = await createInnerContext({
      req: {} as IncomingMessage,
      res: {} as ServerResponse,
    });

    // 模拟已登录用户
    ctx.user = {
      openId: testUserOpenId,
      name: "测试用户",
      avatar: null,
    };

    caller = appRouter.createCaller(ctx);
  }, 30000);

  it("应该能获取报告预览数据", async () => {
    const preview = await caller.learningReportExport.getReportPreview({});

    expect(preview).toBeDefined();
    expect(preview.summary).toBeDefined();
    expect(preview.summary.totalErrors).toBeGreaterThanOrEqual(5);
    expect(preview.summary.masteredErrors).toBeGreaterThanOrEqual(2);
    expect(preview.summary.totalPractices).toBeGreaterThanOrEqual(3);
  });

  it("应该能按时间范围筛选数据", async () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const preview = await caller.learningReportExport.getReportPreview({
      startDate: yesterday.toISOString(),
      endDate: tomorrow.toISOString(),
    });

    expect(preview).toBeDefined();
    expect(preview.summary.totalErrors).toBeGreaterThanOrEqual(0);
  });

  it("应该能生成学科统计数据", async () => {
    const preview = await caller.learningReportExport.getReportPreview({});

    expect(preview.bySubject).toBeDefined();
    expect(Object.keys(preview.bySubject).length).toBeGreaterThan(0);
    
    // 检查数学学科数据
    if (preview.bySubject.math) {
      expect(preview.bySubject.math.count).toBeGreaterThan(0);
      expect(preview.bySubject.math.masteryRate).toBeGreaterThanOrEqual(0);
      expect(preview.bySubject.math.masteryRate).toBeLessThanOrEqual(100);
    }
  });

  it("应该能生成年级分布数据", async () => {
    const preview = await caller.learningReportExport.getReportPreview({});

    expect(preview.byLevel).toBeDefined();
    expect(preview.byLevel.junior).toBeGreaterThanOrEqual(0);
    expect(preview.byLevel.senior).toBeGreaterThanOrEqual(0);
  });

  it("应该能生成知识点掌握度数据", async () => {
    const preview = await caller.learningReportExport.getReportPreview({});

    expect(preview.knowledgePoints).toBeDefined();
    expect(Array.isArray(preview.knowledgePoints)).toBe(true);
    
    if (preview.knowledgePoints.length > 0) {
      const kp = preview.knowledgePoints[0];
      expect(kp.name).toBeDefined();
      expect(kp.mastery).toBeGreaterThanOrEqual(0);
      expect(kp.mastery).toBeLessThanOrEqual(100);
    }
  });

  it("应该能生成学习趋势数据", async () => {
    const preview = await caller.learningReportExport.getReportPreview({});

    expect(preview.learningTrend).toBeDefined();
    expect(Array.isArray(preview.learningTrend)).toBe(true);
    expect(preview.learningTrend.length).toBe(30); // 最近30天
    
    const trend = preview.learningTrend[0];
    expect(trend.date).toBeDefined();
    expect(trend.errorCount).toBeGreaterThanOrEqual(0);
    expect(trend.practiceCount).toBeGreaterThanOrEqual(0);
  });

  it("应该能导出PDF报告", async () => {
    const result = await caller.learningReportExport.exportReport({
      includeCharts: true,
      includeDetails: true,
    });

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.fileName).toBeDefined();
    expect(result.fileName).toMatch(/learning-report-.*\.pdf/);
    expect(result.url).toMatch(/\.pdf$/);
  }, 60000); // PDF生成可能需要较长时间
});
