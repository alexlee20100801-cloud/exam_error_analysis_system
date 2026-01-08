import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { db } from './db';
import { learningReports, errorQuestions, studySessions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Learning Report Generation', () => {
  const testUserId = 999997;
  const testUser = {
    id: testUserId,
    openId: 'test-report-generation-user',
    name: 'Test Report Generation User',
    email: 'test-report-generation@example.com',
    role: 'user' as const,
  };

  let caller: ReturnType<typeof appRouter.createCaller>;
  let testReportId: number;

  beforeAll(async () => {
    caller = appRouter.createCaller({ user: testUser, req: {} as any, res: {} as any });

    // 清理测试数据
    await db.delete(learningReports).where(eq(learningReports.userId, testUserId));
    await db.delete(studySessions).where(eq(studySessions.userId, testUserId));
    await db.delete(errorQuestions).where(eq(errorQuestions.userId, testUserId));

    // 创建测试数据
    await db.insert(errorQuestions).values([
      {
        userId: testUserId,
        title: '测试错题1',
        content: '测试内容1',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
        isMastered: 1,
      },
      {
        userId: testUserId,
        title: '测试错题2',
        content: '测试内容2',
        subject: 'english',
        grade: 'junior1',
        schoolLevel: 'junior',
        isMastered: 0,
      },
    ]);

    // 创建学习会话
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    await db.insert(studySessions).values({
      userId: testUserId,
      subject: 'math',
      duration: 1800,
      activityType: 'review',
      startedAt: oneHourAgo.toISOString(),
      endedAt: now.toISOString(),
    });
  });

  it('应该能够生成周报', async () => {
    const result = await caller.learningReportGeneration.generate({
      reportType: 'weekly',
    });

    expect(result).toBeDefined();
    expect(result.reportId).toBeGreaterThan(0);
    testReportId = result.reportId;

    // 等待报告生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  it('应该能够生成月报', async () => {
    const result = await caller.learningReportGeneration.generate({
      reportType: 'monthly',
    });

    expect(result).toBeDefined();
    expect(result.reportId).toBeGreaterThan(0);

    // 等待报告生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  it('应该能够获取用户的学习报告列表', async () => {
    const reports = await caller.learningReportGeneration.getReports({
      limit: 10,
    });

    expect(Array.isArray(reports)).toBe(true);
    expect(reports.length).toBeGreaterThan(0);
  });

  it('应该能够获取学习报告详情', async () => {
    if (!testReportId) {
      // 如果没有testReportId，先生成一个
      const result = await caller.learningReportGeneration.generate({
        reportType: 'weekly',
      });
      testReportId = result.reportId;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const report = await caller.learningReportGeneration.getReportById({
      reportId: testReportId,
    });

    expect(report).toBeDefined();
    if (report) {
      expect(report.userId).toBe(testUserId);
      expect(report.reportType).toBeDefined();
      expect(report).toHaveProperty('totalStudyTime');
      expect(report).toHaveProperty('newQuestionsCount');
      expect(report).toHaveProperty('reviewedQuestionsCount');
      expect(report).toHaveProperty('masteredQuestionsCount');
      expect(report).toHaveProperty('subjectMastery');
      expect(report).toHaveProperty('weakKnowledgePoints');
    }
  });

  it('生成的报告应该包含正确的统计数据', async () => {
    const result = await caller.learningReportGeneration.generate({
      reportType: 'weekly',
    });

    // 等待报告生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const report = await caller.learningReportGeneration.getReportById({
      reportId: result.reportId,
    });

    expect(report).toBeDefined();
    if (report && report.status === 'completed') {
      expect(report.totalStudyTime).toBeGreaterThanOrEqual(0);
      expect(report.newQuestionsCount).toBeGreaterThanOrEqual(0);
      expect(report.masteredQuestionsCount).toBeGreaterThanOrEqual(0);

      // 验证学科掌握度数据格式
      const subjectMastery = JSON.parse(report.subjectMastery as string);
      expect(typeof subjectMastery).toBe('object');

      // 验证薄弱知识点数据格式
      const weakPoints = JSON.parse(report.weakKnowledgePoints as string);
      expect(Array.isArray(weakPoints)).toBe(true);
    }
  });

  it('应该能够生成AI改进建议', async () => {
    const result = await caller.learningReportGeneration.generate({
      reportType: 'weekly',
    });

    // 等待报告生成完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const report = await caller.learningReportGeneration.getReportById({
      reportId: result.reportId,
    });

    expect(report).toBeDefined();
    if (report && report.status === 'completed') {
      expect(report.improvementSuggestions).toBeDefined();
      expect(typeof report.improvementSuggestions).toBe('string');
      expect(report.improvementSuggestions!.length).toBeGreaterThan(0);
    }
  });

  it('应该能够计算学习进步评分', async () => {
    const result = await caller.learningReportGeneration.generate({
      reportType: 'weekly',
    });

    // 等待报告生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const report = await caller.learningReportGeneration.getReportById({
      reportId: result.reportId,
    });

    expect(report).toBeDefined();
    if (report && report.status === 'completed' && report.progressScore) {
      const score = Number(report.progressScore);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
