import { getDb } from "./db";
import { errorReviewRecords, errorQuestions } from "../drizzle/schema";
import { eq, and, lte, isNull } from "drizzle-orm";

/**
 * 艾宾浩斯遗忘曲线复习间隔（天数）
 * 第1次复习：1天后
 * 第2次复习：2天后
 * 第3次复习：4天后
 * 第4次复习：7天后
 * 第5次复习：15天后
 * 完成5轮复习后，认为已掌握
 */
export const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15];

/**
 * 计算下次复习时间
 * @param reviewRound 当前复习轮次（0表示刚加入计划）
 * @param baseTime 基准时间（默认为当前时间）
 * @returns 下次复习时间
 */
export function calculateNextReviewTime(reviewRound: number, baseTime: Date = new Date()): Date {
  if (reviewRound >= EBBINGHAUS_INTERVALS.length) {
    // 已完成所有复习轮次
    return new Date(baseTime.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天后（已掌握）
  }

  const daysToAdd = EBBINGHAUS_INTERVALS[reviewRound];
  const nextReviewTime = new Date(baseTime);
  nextReviewTime.setDate(nextReviewTime.getDate() + daysToAdd);
  return nextReviewTime;
}

/**
 * 将错题加入复习计划
 */
export async function addToReviewPlan(userId: number, errorQuestionId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // 检查是否已存在复习记录
    const existing = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, userId),
          eq(errorReviewRecords.errorQuestionId, errorQuestionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 如果已存在且已暂停，则恢复
      if (existing[0].isPaused) {
        await db
          .update(errorReviewRecords)
          .set({
            // @ts-ignore
            isPaused: false,
            // @ts-ignore
            nextReviewAt: calculateNextReviewTime(existing[0].reviewRound),
            // @ts-ignore
            updatedAt: new Date(),
          })
          .where(eq(errorReviewRecords.id, existing[0].id));
        return true;
      }
      return false; // 已在复习计划中
    }

    // 创建新的复习记录
    const nextReviewAt = calculateNextReviewTime(0); // 第一次复习在1天后
    await db.insert(errorReviewRecords).values({
      // @ts-ignore
      userId,
      errorQuestionId,
      reviewRound: 0,
      nextReviewAt,
      isCompleted: false,
      isPaused: false,
    });

    return true;
  } catch (error) {
    console.error("添加到复习计划失败:", error);
    return false;
  }
}

/**
 * 标记错题已复习
 */
export async function markAsReviewed(userId: number, errorQuestionId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // 获取当前复习记录
    const records = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, userId),
          eq(errorReviewRecords.errorQuestionId, errorQuestionId),
          // @ts-ignore
          eq(errorReviewRecords.isPaused, false)
        )
      )
      .limit(1);

    if (records.length === 0) {
      return false; // 未找到复习记录
    }

    const record = records[0];
    const newReviewRound = record.reviewRound + 1;
    const now = new Date();

    // 检查是否完成所有复习轮次
    const isCompleted = newReviewRound >= EBBINGHAUS_INTERVALS.length;

    // 计算下次复习时间
    const nextReviewAt = calculateNextReviewTime(newReviewRound, now);

    // 更新复习记录
    await db
      .update(errorReviewRecords)
      .set({
        reviewRound: newReviewRound,
        // @ts-ignore
        lastReviewedAt: now,
        // @ts-ignore
        nextReviewAt,
        // @ts-ignore
        isCompleted,
        // @ts-ignore
        updatedAt: now,
      })
      .where(eq(errorReviewRecords.id, record.id));

    // 同时更新错题表的复习信息
    await db
      .update(errorQuestions)
      .set({
        reviewCount: (record.reviewRound + 1),
        // @ts-ignore
        lastReviewedAt: now,
        // @ts-ignore
        isMastered: isCompleted,
        // @ts-ignore
        updatedAt: now,
      })
      .where(eq(errorQuestions.id, errorQuestionId));

    return true;
  } catch (error) {
    console.error("标记复习失败:", error);
    return false;
  }
}

/**
 * 获取用户待复习的错题列表
 */
export async function getDueReviews(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const now = new Date();

    // 查询到期的复习记录
    const dueRecords = await db
      .select({
        reviewRecord: errorReviewRecords,
        errorQuestion: errorQuestions,
      })
      .from(errorReviewRecords)
      .innerJoin(errorQuestions, eq(errorReviewRecords.errorQuestionId, errorQuestions.id))
      .where(
        and(
          eq(errorReviewRecords.userId, userId),
          // @ts-ignore
          eq(errorReviewRecords.isCompleted, false),
          // @ts-ignore
          eq(errorReviewRecords.isPaused, false),
          // @ts-ignore
          lte(errorReviewRecords.nextReviewAt, now)
        )
      )
      .orderBy(errorReviewRecords.nextReviewAt);

    return dueRecords.map((record: any) => ({
      ...record.errorQuestion,
      reviewRound: record.reviewRecord.reviewRound,
      nextReviewAt: record.reviewRecord.nextReviewAt,
      lastReviewedAt: record.reviewRecord.lastReviewedAt,
    }));
  } catch (error) {
    console.error("获取待复习错题失败:", error);
    return [];
  }
}

/**
 * 获取用户的所有复习计划（包括未到期的）
 */
export async function getAllReviewPlans(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const records = await db
      .select({
        reviewRecord: errorReviewRecords,
        errorQuestion: errorQuestions,
      })
      .from(errorReviewRecords)
      .innerJoin(errorQuestions, eq(errorReviewRecords.errorQuestionId, errorQuestions.id))
      .where(
        and(
          eq(errorReviewRecords.userId, userId),
          // @ts-ignore
          eq(errorReviewRecords.isCompleted, false),
          // @ts-ignore
          eq(errorReviewRecords.isPaused, false)
        )
      )
      .orderBy(errorReviewRecords.nextReviewAt);

    return records.map((record: any) => ({
      ...record.errorQuestion,
      reviewRound: record.reviewRecord.reviewRound,
      nextReviewAt: record.reviewRecord.nextReviewAt,
      lastReviewedAt: record.reviewRecord.lastReviewedAt,
      isDue: new Date(record.reviewRecord.nextReviewAt) <= new Date(),
    }));
  } catch (error) {
    console.error("获取复习计划失败:", error);
    return [];
  }
}

/**
 * 暂停复习计划
 */
export async function pauseReviewPlan(userId: number, errorQuestionId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(errorReviewRecords)
      .set({
        // @ts-ignore
        isPaused: true,
        // @ts-ignore
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(errorReviewRecords.userId, userId),
          eq(errorReviewRecords.errorQuestionId, errorQuestionId)
        )
      );

    return true;
  } catch (error) {
    console.error("暂停复习计划失败:", error);
    return false;
  }
}

/**
 * 获取复习统计信息
 */
export async function getReviewStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = new Date();

    // 获取所有未完成的复习记录
    const allRecords = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, userId),
          // @ts-ignore
          eq(errorReviewRecords.isCompleted, false),
          // @ts-ignore
          eq(errorReviewRecords.isPaused, false)
        )
      );

    // 统计待复习数量
    const dueCount = allRecords.filter((r) => new Date(r.nextReviewAt) <= now).length;

    // 统计总复习计划数
    const totalCount = allRecords.length;

    // 统计已完成的复习记录
    const completedRecords = await db
      .select()
      .from(errorReviewRecords)
      .where(
        and(
          eq(errorReviewRecords.userId, userId),
          // @ts-ignore
          eq(errorReviewRecords.isCompleted, true)
        )
      );

    const completedCount = completedRecords.length;

    return {
      dueCount,
      totalCount,
      completedCount,
    };
  } catch (error) {
    console.error("获取复习统计失败:", error);
    return null;
  }
}
