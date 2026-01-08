import { db } from "./db";
import {
  errorQuestions,
  errorReviewRecords,
  reviewReminderSettings,
  type NewReviewReminderSetting,
} from "../drizzle/schema";
import { eq, and, lte, isNull, or, sql } from "drizzle-orm";

/**
 * 艾宾浩斯遗忘曲线复习间隔（天）
 * 第1次复习：1天后
 * 第2次复习：3天后
 * 第3次复习：7天后
 * 第4次复习：15天后
 * 第5次复习：30天后
 */
const EBBINGHAUS_INTERVALS = [1, 3, 7, 15, 30];

/**
 * 计算下次复习时间
 * @param lastReviewedAt 上次复习时间
 * @param reviewRound 复习轮次（0-based）
 * @returns 下次复习时间
 */
export function calculateNextReviewTime(
  lastReviewedAt: Date,
  reviewRound: number
): Date {
  const intervalDays = EBBINGHAUS_INTERVALS[reviewRound] || 30;
  const nextReview = new Date(lastReviewedAt);
  nextReview.setDate(nextReview.getDate() + intervalDays);
  return nextReview;
}

/**
 * 创建或更新复习记录
 */
export async function createOrUpdateReviewRecord(
  userId: number,
  errorQuestionId: number
) {
  // 查找现有复习记录
  const existingRecords = await db
    .select()
    .from(errorReviewRecords)
    .where(
      and(
        eq(errorReviewRecords.userId, userId),
        eq(errorReviewRecords.errorQuestionId, errorQuestionId)
      )
    );

  const now = new Date();
  const nowStr = now.toISOString();

  if (existingRecords.length === 0) {
    // 创建新记录
    const nextReview = calculateNextReviewTime(now, 0);
    await db.insert(errorReviewRecords).values({
      userId,
      errorQuestionId,
      reviewRound: 0,
      lastReviewedAt: nowStr,
      nextReviewAt: nextReview.toISOString(),
      isCompleted: 0,
      isPaused: 0,
    });
  } else {
    // 更新现有记录
    const record = existingRecords[0];
    const newRound = (record.reviewRound || 0) + 1;
    const nextReview = calculateNextReviewTime(now, newRound);

    await db
      .update(errorReviewRecords)
      .set({
        reviewRound: newRound,
        lastReviewedAt: nowStr,
        nextReviewAt: nextReview.toISOString(),
        isCompleted: newRound >= EBBINGHAUS_INTERVALS.length ? 1 : 0,
      })
      .where(eq(errorReviewRecords.id, record.id));
  }
}

/**
 * 获取待复习的错题列表
 */
export async function getDueReviewQuestions(userId: number) {
  const now = new Date().toISOString();

  const dueRecords = await db
    .select({
      recordId: errorReviewRecords.id,
      errorQuestionId: errorReviewRecords.errorQuestionId,
      reviewRound: errorReviewRecords.reviewRound,
      nextReviewAt: errorReviewRecords.nextReviewAt,
      questionTitle: errorQuestions.title,
      questionSubject: errorQuestions.subject,
      questionDifficulty: errorQuestions.difficulty,
    })
    .from(errorReviewRecords)
    .innerJoin(
      errorQuestions,
      eq(errorReviewRecords.errorQuestionId, errorQuestions.id)
    )
    .where(
      and(
        eq(errorReviewRecords.userId, userId),
        eq(errorReviewRecords.isCompleted, 0),
        eq(errorReviewRecords.isPaused, 0),
        lte(errorReviewRecords.nextReviewAt, now)
      )
    )
    .orderBy(errorReviewRecords.nextReviewAt);

  return dueRecords;
}

/**
 * 获取用户的复习提醒设置
 */
export async function getUserReminderSettings(userId: number) {
  const settings = await db
    .select()
    .from(reviewReminderSettings)
    .where(eq(reviewReminderSettings.userId, userId));

  if (settings.length === 0) {
    // 返回默认设置
    return {
      userId,
      isEnabled: 1,
      reminderTime: '20:00',
      reminderMethod: 'system' as const,
      maxDailyReminders: 10,
      prioritySubjects: null,
      remindOnWeekends: 1,
    };
  }

  return settings[0];
}

/**
 * 更新用户的复习提醒设置
 */
export async function updateUserReminderSettings(
  userId: number,
  settings: Partial<NewReviewReminderSetting>
) {
  const existing = await db
    .select()
    .from(reviewReminderSettings)
    .where(eq(reviewReminderSettings.userId, userId));

  if (existing.length === 0) {
    await db.insert(reviewReminderSettings).values({
      userId,
      ...settings,
    });
  } else {
    await db
      .update(reviewReminderSettings)
      .set(settings)
      .where(eq(reviewReminderSettings.userId, userId));
  }

  return getUserReminderSettings(userId);
}

/**
 * 暂停错题的复习提醒
 */
export async function pauseReviewReminder(
  userId: number,
  errorQuestionId: number
) {
  await db
    .update(errorReviewRecords)
    .set({ isPaused: 1 })
    .where(
      and(
        eq(errorReviewRecords.userId, userId),
        eq(errorReviewRecords.errorQuestionId, errorQuestionId)
      )
    );
}

/**
 * 恢复错题的复习提醒
 */
export async function resumeReviewReminder(
  userId: number,
  errorQuestionId: number
) {
  await db
    .update(errorReviewRecords)
    .set({ isPaused: 0 })
    .where(
      and(
        eq(errorReviewRecords.userId, userId),
        eq(errorReviewRecords.errorQuestionId, errorQuestionId)
      )
    );
}

/**
 * 获取复习统计信息
 */
export async function getReviewStatistics(userId: number) {
  const stats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN ${errorReviewRecords.isCompleted} = 1 THEN 1 ELSE 0 END)`,
      paused: sql<number>`SUM(CASE WHEN ${errorReviewRecords.isPaused} = 1 THEN 1 ELSE 0 END)`,
      due: sql<number>`SUM(CASE WHEN ${errorReviewRecords.nextReviewAt} <= NOW() AND ${errorReviewRecords.isCompleted} = 0 AND ${errorReviewRecords.isPaused} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(errorReviewRecords)
    .where(eq(errorReviewRecords.userId, userId));

  return stats[0] || { total: 0, completed: 0, paused: 0, due: 0 };
}
