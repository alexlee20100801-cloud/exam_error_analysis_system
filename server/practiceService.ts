import { getDb } from "./db";
import { practiceRecords, practiceSessions, errorQuestions, type NewPracticeRecord, type NewPracticeSession } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * 练习记录服务
 * 提供练习过程的自动保存、答题统计和错题回顾功能
 */

// 创建新的练习会话
export async function createPracticeSession(data: {
  userId: number;
  practiceMode: 'random' | 'chapter' | 'timed' | 'weakness' | 'review';
  subject?: string;
  grade?: string;
  totalQuestions?: number;
}): Promise<string> {
  const db = getDb();
  const sessionId = uuidv4();

  await db.insert(practiceSessions).values({
    sessionId,
    userId: data.userId,
    practiceMode: data.practiceMode,
    subject: data.subject as any,
    grade: data.grade as any,
    totalQuestions: data.totalQuestions || 0,
    completedQuestions: 0,
    correctCount: 0,
    wrongCount: 0,
    totalTimeSpent: 0,
    status: 'in_progress',
  });

  return sessionId;
}

// 保存单个练习记录（自动保存）
export async function savePracticeRecord(data: {
  userId: number;
  questionId: number;
  questionType: 'error_question' | 'practice_question';
  userAnswer: string;
  isCorrect: boolean;
  timeSpent?: number;
  practiceSessionId?: string;
  practiceMode?: 'random' | 'chapter' | 'timed' | 'weakness' | 'review';
  difficulty?: 'easy' | 'medium' | 'hard';
  confidenceLevel?: number;
  notes?: string;
  knowledgePointIds?: number[];
  subject: string;
  grade: string;
}) {
  const db = getDb();

  await db.insert(practiceRecords as any).values({
    userId: data.userId,
    questionId: data.questionId,
    questionType: data.questionType,
    userAnswer: data.userAnswer,
    isCorrect: data.isCorrect ? 1 : 0,
    timeSpent: data.timeSpent,
    practiceSessionId: data.practiceSessionId,
    practiceMode: data.practiceMode,
    difficulty: data.difficulty,
    confidenceLevel: data.confidenceLevel,
    notes: data.notes,
    knowledgePointIds: data.knowledgePointIds ? JSON.stringify(data.knowledgePointIds) : null,
    subject: data.subject as any,
    grade: data.grade as any,
  });

  // 如果有会话ID，更新会话统计
  if (data.practiceSessionId) {
    await updateSessionStats(data.practiceSessionId, data.isCorrect, data.timeSpent || 0);
  }
}

// 更新练习会话统计
export async function updateSessionStats(sessionId: string, isCorrect: boolean, timeSpent: number) {
  const db = getDb();

  const session = await db.select().from(practiceSessions).where(eq(practiceSessions.sessionId, sessionId)).limit(1);
  
  if (session.length === 0) return;

  const current = session[0];
  const newCompleted = current.completedQuestions + 1;
  const newCorrect = current.correctCount + (isCorrect ? 1 : 0);
  const newWrong = current.wrongCount + (isCorrect ? 0 : 1);
  const newTotalTime = current.totalTimeSpent + timeSpent;
  const accuracyRate = newCompleted > 0 ? (newCorrect / newCompleted) * 100 : 0;

  await db.update(practiceSessions)
    .set({
      completedQuestions: newCompleted,
      correctCount: newCorrect,
      wrongCount: newWrong,
      totalTimeSpent: newTotalTime,
      accuracyRate: accuracyRate.toFixed(2),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(practiceSessions.sessionId, sessionId));
}

// 完成练习会话
export async function completePracticeSession(sessionId: string) {
  const db = getDb();

  await db.update(practiceSessions)
    .set({
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(practiceSessions.sessionId, sessionId));
}

// 获取用户的练习历史
export async function getPracticeHistory(userId: number, limit: number = 20) {
  const db = getDb();

  const sessions = await db.select()
    .from(practiceSessions)
    .where(eq(practiceSessions.userId, userId))
    .orderBy(desc(practiceSessions.createdAt))
    .limit(limit);

  return sessions;
}

// 获取练习会话详情（包括所有练习记录）
export async function getPracticeSessionDetail(sessionId: string) {
  const db = getDb();

  const session = await db.select()
    .from(practiceSessions)
    .where(eq(practiceSessions.sessionId, sessionId))
    .limit(1);

  if (session.length === 0) {
    throw new Error('Practice session not found');
  }

  const records = await db.select()
    .from(practiceRecords)
    // @ts-ignore
    .where(eq(practiceRecords.practiceSessionId, sessionId))
    .orderBy(desc(practiceRecords.createdAt));

  return {
    session: session[0],
    records,
  };
}

// 获取用户的答题统计
export async function getUserPracticeStats(userId: number, days: number = 30) {
  const db = getDb();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 总体统计
  const totalStats = await db.select({
    totalPractices: sql<number>`count(*)`,
    correctCount: sql<number>`sum(case when ${practiceRecords.isCorrect} = 1 then 1 else 0 end)`,
    wrongCount: sql<number>`sum(case when ${practiceRecords.isCorrect} = 0 then 1 else 0 end)`,
    avgTimeSpent: sql<number>`avg(${practiceRecords.timeSpent})`,
  })
  .from(practiceRecords)
  .where(
    and(
      eq(practiceRecords.userId, userId),
      sql`${practiceRecords.createdAt} >= ${startDate.toISOString()}`
    )
  );

  // 按学科统计
  const subjectStats = await db.select({
    subject: practiceRecords.subject,
    totalCount: sql<number>`count(*)`,
    correctCount: sql<number>`sum(case when ${practiceRecords.isCorrect} = 1 then 1 else 0 end)`,
    accuracyRate: sql<number>`round(sum(case when ${practiceRecords.isCorrect} = 1 then 1 else 0 end) * 100.0 / count(*), 2)`,
  })
  .from(practiceRecords)
  .where(
    and(
      eq(practiceRecords.userId, userId),
      sql`${practiceRecords.createdAt} >= ${startDate.toISOString()}`
    )
  )
  .groupBy(practiceRecords.subject);

  // 按练习模式统计
  const modeStats = await db.select({
    // @ts-ignore
    practiceMode: practiceRecords.practiceMode,
    totalCount: sql<number>`count(*)`,
    correctCount: sql<number>`sum(case when ${practiceRecords.isCorrect} = 1 then 1 else 0 end)`,
    accuracyRate: sql<number>`round(sum(case when ${practiceRecords.isCorrect} = 1 then 1 else 0 end) * 100.0 / count(*), 2)`,
  })
  .from(practiceRecords)
  .where(
    and(
      eq(practiceRecords.userId, userId),
      sql`${practiceRecords.createdAt} >= ${startDate.toISOString()}`
    )
  )
  // @ts-ignore
  .groupBy(practiceRecords.practiceMode);

  // 每日练习趋势
  const dailyTrend = await db.select({
    date: sql<string>`DATE(${practiceRecords.createdAt})`,
    totalCount: sql<number>`count(*)`,
    correctCount: sql<number>`sum(case when ${practiceRecords.isCorrect} = 1 then 1 else 0 end)`,
    accuracyRate: sql<number>`round(sum(case when ${practiceRecords.isCorrect} = 1 then 1 else 0 end) * 100.0 / count(*), 2)`,
  })
  .from(practiceRecords)
  .where(
    and(
      eq(practiceRecords.userId, userId),
      sql`${practiceRecords.createdAt} >= ${startDate.toISOString()}`
    )
  )
  .groupBy(sql`DATE(${practiceRecords.createdAt})`)
  .orderBy(sql`DATE(${practiceRecords.createdAt})`);

  return {
    totalStats: totalStats[0] || {
      totalPractices: 0,
      correctCount: 0,
      wrongCount: 0,
      avgTimeSpent: 0,
    },
    subjectStats,
    modeStats,
    dailyTrend,
  };
}

// 获取错题回顾列表（需要重新练习的错题）
export async function getErrorQuestionsForReview(userId: number, limit: number = 20) {
  const db = getDb();

  // 查找最近做错的题目，且还未掌握
  const errorRecords = await db.select({
    questionId: practiceRecords.questionId,
    subject: practiceRecords.subject,
    grade: practiceRecords.grade,
    lastAttemptDate: sql<string>`MAX(${practiceRecords.createdAt})`,
    wrongCount: sql<number>`SUM(CASE WHEN ${practiceRecords.isCorrect} = 0 THEN 1 ELSE 0 END)`,
    totalAttempts: sql<number>`COUNT(*)`,
  })
  .from(practiceRecords)
  .where(
    and(
      eq(practiceRecords.userId, userId),
      eq(practiceRecords.questionType, 'error_question')
    )
  )
  .groupBy(practiceRecords.questionId, practiceRecords.subject, practiceRecords.grade)
  .having(sql`SUM(CASE WHEN ${practiceRecords.isCorrect} = 0 THEN 1 ELSE 0 END) > 0`)
  .orderBy(sql`MAX(${practiceRecords.createdAt}) DESC`)
  .limit(limit);

  // 获取题目详情
  const questionIds = errorRecords.map(r => r.questionId);
  if (questionIds.length === 0) return [];

  const questions = await db.select()
    .from(errorQuestions)
    .where(sql`${errorQuestions.id} IN (${sql.join(questionIds.map(id => sql`${id}`), sql`, `)})`);

  // 合并数据
  return errorRecords.map(record => {
    const question = questions.find(q => q.id === record.questionId);
    return {
      ...record,
      question,
    };
  });
}

// 获取学习进度追踪数据
export async function getLearningProgress(userId: number) {
  const db = getDb();

  // 最近7天的练习情况
  const last7Days = await db.select({
    date: sql<string>`DATE(${practiceRecords.createdAt})`,
    count: sql<number>`count(*)`,
  })
  .from(practiceRecords)
  .where(
    and(
      eq(practiceRecords.userId, userId),
      sql`${practiceRecords.createdAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    )
  )
  .groupBy(sql`DATE(${practiceRecords.createdAt})`);

  // 最近完成的会话
  const recentSessions = await db.select()
    .from(practiceSessions)
    .where(
      and(
        eq(practiceSessions.userId, userId),
        eq(practiceSessions.status, 'completed')
      )
    )
    .orderBy(desc(practiceSessions.completedAt))
    .limit(5);

  // 总体进度
  const overallProgress = await db.select({
    totalSessions: sql<number>`count(*)`,
    totalQuestions: sql<number>`sum(${practiceSessions.completedQuestions})`,
    avgAccuracy: sql<number>`avg(${practiceSessions.accuracyRate})`,
    totalTimeSpent: sql<number>`sum(${practiceSessions.totalTimeSpent})`,
  })
  .from(practiceSessions)
  .where(eq(practiceSessions.userId, userId));

  return {
    last7Days,
    recentSessions,
    overallProgress: overallProgress[0] || {
      totalSessions: 0,
      totalQuestions: 0,
      avgAccuracy: 0,
      totalTimeSpent: 0,
    },
  };
}
