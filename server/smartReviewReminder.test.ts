import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { db } from './db';
import { errorQuestions, errorReviewRecords, reviewReminderSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Smart Review Reminder', () => {
  const testUserId = 999998;
  const testUser = {
    id: testUserId,
    openId: 'test-review-reminder-user',
    name: 'Test Review Reminder User',
    email: 'test-review-reminder@example.com',
    role: 'user' as const,
  };

  let caller: ReturnType<typeof appRouter.createCaller>;
  let testQuestionId: number;

  beforeAll(async () => {
    caller = appRouter.createCaller({ user: testUser, req: {} as any, res: {} as any });

    // 清理测试数据
    await db.delete(errorReviewRecords).where(eq(errorReviewRecords.userId, testUserId));
    await db.delete(reviewReminderSettings).where(eq(reviewReminderSettings.userId, testUserId));
    await db.delete(errorQuestions).where(eq(errorQuestions.userId, testUserId));

    // 创建测试错题
    const [question] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: '测试错题 - 复习提醒',
      content: '这是一道需要复习的题目',
      subject: 'physics',
      grade: 'senior1',
      schoolLevel: 'senior',
      isMastered: 0,
    }).$returningId();

    testQuestionId = question.id;
  });

  it('应该能够标记错题为已复习', async () => {
    const result = await caller.smartReviewReminder.markAsReviewed({
      errorQuestionId: testQuestionId,
    });

    expect(result.success).toBe(true);
  });

  it('应该能够获取待复习的错题列表', async () => {
    const questions = await caller.smartReviewReminder.getDueQuestions();

    expect(Array.isArray(questions)).toBe(true);
  });

  it('应该能够获取复习提醒设置', async () => {
    const settings = await caller.smartReviewReminder.getSettings();

    expect(settings).toBeDefined();
    expect(settings.userId).toBe(testUserId);
    expect(settings).toHaveProperty('isEnabled');
    expect(settings).toHaveProperty('reminderTime');
    expect(settings).toHaveProperty('reminderMethod');
  });

  it('应该能够更新复习提醒设置', async () => {
    const settings = await caller.smartReviewReminder.updateSettings({
      isEnabled: 1,
      reminderTime: '21:00',
      maxDailyReminders: 15,
      remindOnWeekends: 1,
    });

    expect(settings).toBeDefined();
    expect(settings.reminderTime).toBe('21:00');
    expect(settings.maxDailyReminders).toBe(15);
  });

  it('应该能够暂停错题的复习提醒', async () => {
    const result = await caller.smartReviewReminder.pauseReminder({
      errorQuestionId: testQuestionId,
    });

    expect(result.success).toBe(true);
  });

  it('应该能够恢复错题的复习提醒', async () => {
    const result = await caller.smartReviewReminder.resumeReminder({
      errorQuestionId: testQuestionId,
    });

    expect(result.success).toBe(true);
  });

  it('应该能够获取复习统计信息', async () => {
    const stats = await caller.smartReviewReminder.getStatistics();

    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('completed');
    expect(stats).toHaveProperty('paused');
    expect(stats).toHaveProperty('due');
    expect(typeof stats.total).toBe('number');
  });

  it('应该正确计算艾宾浩斯遗忘曲线的复习间隔', async () => {
    // 第一次复习
    await caller.smartReviewReminder.markAsReviewed({
      errorQuestionId: testQuestionId,
    });

    // 验证创建了复习记录
    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(eq(errorReviewRecords.errorQuestionId, testQuestionId));

    expect(records.length).toBeGreaterThan(0);
    expect(records[0].reviewRound).toBeGreaterThanOrEqual(0);
    expect(records[0].nextReviewAt).toBeDefined();
  });
});
