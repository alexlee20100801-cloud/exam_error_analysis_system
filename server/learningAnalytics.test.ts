import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { db } from './db';
import { studySessions, errorQuestions, subjectMasterySnapshots } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Learning Analytics', () => {
  const testUserId = 999999;
  const testUser = {
    id: testUserId,
    openId: 'test-learning-analytics-user',
    name: 'Test Learning Analytics User',
    email: 'test-learning-analytics@example.com',
    role: 'user' as const,
  };

  let caller: ReturnType<typeof appRouter.createCaller>;
  let testQuestionId: number;

  beforeAll(async () => {
    caller = appRouter.createCaller({ user: testUser, req: {} as any, res: {} as any });

    // 清理测试数据
    await db.delete(studySessions).where(eq(studySessions.userId, testUserId));
    await db.delete(subjectMasterySnapshots).where(eq(subjectMasterySnapshots.userId, testUserId));
    await db.delete(errorQuestions).where(eq(errorQuestions.userId, testUserId));

    // 创建测试错题
    const [question] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: '测试错题 - 学习分析',
      content: '这是一道测试题目',
      subject: 'math',
      grade: 'junior1',
      schoolLevel: 'junior',
      isMastered: 0,
    }).$returningId();

    testQuestionId = question.id;
  });

  it('应该能够记录学习会话', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const result = await caller.learningAnalytics.recordSession({
      subject: 'math',
      duration: 3600,
      activityType: 'review',
      errorQuestionId: testQuestionId,
      startedAt: oneHourAgo.toISOString(),
      endedAt: now.toISOString(),
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it('应该能够获取学习时长统计', async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stats = await caller.learningAnalytics.getTotalStudyTime({
      startDate,
      endDate,
    });

    expect(stats).toBeDefined();
    expect(stats.totalDuration).toBeGreaterThanOrEqual(0);
    expect(stats.sessionCount).toBeGreaterThanOrEqual(0);
  });

  it('应该能够获取学习时长趋势', async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const trend = await caller.learningAnalytics.getStudyTimeTrend({
      startDate,
      endDate,
    });

    expect(Array.isArray(trend)).toBe(true);
  });

  it('应该能够获取各学科掌握度', async () => {
    const mastery = await caller.learningAnalytics.getSubjectMastery();

    expect(Array.isArray(mastery)).toBe(true);
    if (mastery.length > 0) {
      expect(mastery[0]).toHaveProperty('subject');
      expect(mastery[0]).toHaveProperty('masteryRate');
      expect(mastery[0]).toHaveProperty('totalQuestions');
      expect(mastery[0]).toHaveProperty('masteredQuestions');
    }
  });

  it('应该能够保存学科掌握度快照', async () => {
    const snapshotDate = new Date().toISOString();

    const snapshots = await caller.learningAnalytics.saveSnapshot({
      snapshotDate,
    });

    expect(Array.isArray(snapshots)).toBe(true);
  });

  it('应该能够获取最新的学科掌握度快照', async () => {
    const snapshots = await caller.learningAnalytics.getLatestSnapshots();

    expect(Array.isArray(snapshots)).toBe(true);
  });

  it('应该能够获取学习活动统计', async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stats = await caller.learningAnalytics.getActivityStats({
      startDate,
      endDate,
    });

    expect(Array.isArray(stats)).toBe(true);
  });
});
