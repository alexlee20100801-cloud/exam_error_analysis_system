import { describe, it, expect } from 'vitest';
import * as practiceService from './practiceService';
import { getDb } from './db';
import { practiceSessions, practiceRecords } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Practice Service', () => {
  // 使用mock用户ID，假设用户已存在
  const testUserId = 1;
  let testSessionId: string;

  it('should create a practice session', async () => {
    const sessionId = await practiceService.createPracticeSession({
      userId: testUserId,
      practiceMode: 'random',
      subject: 'math',
      grade: 'junior1',
      totalQuestions: 10,
    });

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    
    testSessionId = sessionId;

    // 验证会话已创建
    const db = getDb();
    const sessions = await db.select()
      .from(practiceSessions)
      .where(eq(practiceSessions.sessionId, sessionId))
      .limit(1);

    expect(sessions.length).toBe(1);
    expect(sessions[0].userId).toBe(testUserId);
    expect(sessions[0].practiceMode).toBe('random');
    expect(sessions[0].status).toBe('in_progress');
  });

  it('should save a practice record', async () => {
    await practiceService.savePracticeRecord({
      userId: testUserId,
      questionId: 1,
      questionType: 'error_question',
      userAnswer: 'A',
      isCorrect: true,
      timeSpent: 30,
      practiceSessionId: testSessionId,
      practiceMode: 'random',
      subject: 'math',
      grade: 'junior1',
    });

    // 验证记录已保存
    const db = getDb();
    const records = await db.select()
      .from(practiceRecords)
      .where(eq(practiceRecords.practiceSessionId, testSessionId))
      .limit(1);

    expect(records.length).toBe(1);
    expect(records[0].userId).toBe(testUserId);
    expect(records[0].isCorrect).toBe(1);
  });

  it('should update session stats when saving records', async () => {
    // 保存第二条记录（错误）
    await practiceService.savePracticeRecord({
      userId: testUserId,
      questionId: 2,
      questionType: 'error_question',
      userAnswer: 'B',
      isCorrect: false,
      timeSpent: 45,
      practiceSessionId: testSessionId,
      practiceMode: 'random',
      subject: 'math',
      grade: 'junior1',
    });

    // 检查会话统计
    const db = getDb();
    const sessions = await db.select()
      .from(practiceSessions)
      .where(eq(practiceSessions.sessionId, testSessionId))
      .limit(1);

    expect(sessions[0].completedQuestions).toBe(2);
    expect(sessions[0].correctCount).toBe(1);
    expect(sessions[0].wrongCount).toBe(1);
    expect(sessions[0].totalTimeSpent).toBe(75);
  });

  it('should complete a practice session', async () => {
    await practiceService.completePracticeSession(testSessionId);

    const db = getDb();
    const sessions = await db.select()
      .from(practiceSessions)
      .where(eq(practiceSessions.sessionId, testSessionId))
      .limit(1);

    expect(sessions[0].status).toBe('completed');
    expect(sessions[0].completedAt).toBeDefined();
  });

  it('should get practice history', async () => {
    const history = await practiceService.getPracticeHistory(testUserId, 10);

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].userId).toBe(testUserId);
  });

  it('should get practice session detail', async () => {
    const detail = await practiceService.getPracticeSessionDetail(testSessionId);

    expect(detail).toBeDefined();
    expect(detail.session).toBeDefined();
    expect(detail.records).toBeDefined();
    expect(Array.isArray(detail.records)).toBe(true);
    expect(detail.records.length).toBe(2);
  });

  it('should get user practice stats', async () => {
    const stats = await practiceService.getUserPracticeStats(testUserId, 30);

    expect(stats).toBeDefined();
    expect(stats.totalStats).toBeDefined();
    expect(stats.totalStats.totalPractices).toBeGreaterThan(0);
    expect(Array.isArray(stats.subjectStats)).toBe(true);
    expect(Array.isArray(stats.modeStats)).toBe(true);
  });

  it('should get learning progress', async () => {
    const progress = await practiceService.getLearningProgress(testUserId);

    expect(progress).toBeDefined();
    expect(progress.overallProgress).toBeDefined();
    expect(progress.overallProgress.totalSessions).toBeGreaterThan(0);
    expect(Array.isArray(progress.recentSessions)).toBe(true);
  });
});
