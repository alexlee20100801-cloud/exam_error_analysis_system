/**
 * 成就系统服务
 * 负责成就解锁、进度计算和徽章管理
 */

import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  achievements,
  userAchievements,
  errorQuestions,
  practiceRecords,
  learningProgress,
  checkInRecords,
  type Achievement,
} from "../drizzle/schema";

/**
 * 检查并解锁用户成就
 */
export async function checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  const newlyUnlocked: Achievement[] = [];

  // 获取所有成就定义
  const allAchievements = await db.select().from(achievements);

  // 获取用户已解锁的成就
  const unlockedRecords = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, parseInt(userId)));

  const unlockedAchievementIds = new Set(
    unlockedRecords.map(r => r.achievementId)
  );

  // 检查每个成就是否满足解锁条件
  for (const achievement of allAchievements) {
    if (unlockedAchievementIds.has(achievement.id)) continue;

    const isMet = await checkAchievementRequirement(userId, achievement);
    if (isMet) {
      // 解锁成就
      await db.insert(userAchievements).values({
        userId: parseInt(userId),
        achievementId: achievement.id,
        unlockedAt: new Date().toISOString(),
        progress: achievement.requirement
      });
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

/**
 * 检查单个成就的解锁条件
 */
async function checkAchievementRequirement(
  userId: string,
  achievement: Achievement
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const userIdNum = parseInt(userId);

  switch (achievement.code) {
    // 学习类成就
    case "first_error_question": {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(errorQuestions)
        .where(eq(errorQuestions.userId, userIdNum));
      return (count[0]?.count ?? 0) >= 1;
    }

    case "error_collector_10":
    case "error_collector_50":
    case "error_collector_100": {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(errorQuestions)
        .where(eq(errorQuestions.userId, userIdNum));
      return (count[0]?.count ?? 0) >= achievement.requirement;
    }

    // 练习类成就
    case "first_practice": {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(practiceRecords)
        .where(eq(practiceRecords.userId, userIdNum));
      return (count[0]?.count ?? 0) >= 1;
    }

    case "practice_master_10":
    case "practice_master_50": {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(practiceRecords)
        .where(eq(practiceRecords.userId, userIdNum));
      return (count[0]?.count ?? 0) >= achievement.requirement;
    }

    case "perfect_score": {
      // 检查是否有一次练习全部答对（暂时简化为检查是否有正确答案）
      const records = await db
        .select()
        .from(practiceRecords)
        .where(
          and(
            eq(practiceRecords.userId, userIdNum),
            eq(practiceRecords.isCorrect, true)
          )
        );
      return records.length >= 5; // 连续5题正确视为满分
    }

    // 连续打卡类成就
    case "streak_3":
    case "streak_7":
    case "streak_14":
    case "streak_30":
    case "streak_100": {
      const currentStreak = await getCurrentStreak(userId);
      return currentStreak >= achievement.requirement;
    }

    // 掌握类成就
    case "master_first_point": {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(learningProgress)
        .where(
          and(
            eq(learningProgress.userId, userIdNum),
            sql`${learningProgress.masteryLevel} >= 90`
          )
        );
      return (count[0]?.count ?? 0) >= 1;
    }

    case "master_10_points":
    case "master_30_points": {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(learningProgress)
        .where(
          and(
            eq(learningProgress.userId, userIdNum),
            sql`${learningProgress.masteryLevel} >= 90`
          )
        );
      return (count[0]?.count ?? 0) >= achievement.requirement;
    }

    case "master_all_errors": {
      const totalErrors = await db
        .select({ count: sql<number>`count(*)` })
        .from(errorQuestions)
        .where(eq(errorQuestions.userId, userIdNum));
      const masteredErrors = await db
        .select({ count: sql<number>`count(*)` })
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, userIdNum),
            eq(errorQuestions.isMastered, true)
          )
        );
      const total = totalErrors[0]?.count ?? 0;
      const mastered = masteredErrors[0]?.count ?? 0;
      return total > 0 && mastered === total;
    }

    default:
      return false;
  }
}

/**
 * 获取用户当前连续打卡天数
 */
export async function getCurrentStreak(userId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const userIdNum = parseInt(userId);

  // 获取所有打卡记录，按日期降序
  const records = await db
    .select()
    .from(checkInRecords)
    .where(eq(checkInRecords.userId, userIdNum))
    .orderBy(desc(checkInRecords.checkInDate));

  if (records.length === 0) return 0;

  // 检查今天或昨天是否有打卡
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const latestCheckIn = new Date(records[0].checkInDate);
  latestCheckIn.setHours(0, 0, 0, 0);

  if (latestCheckIn < yesterday) {
    // 连续打卡已中断
    return 0;
  }

  // 计算连续天数
  let streak = 1;
  let currentDate = new Date(latestCheckIn);

  for (let i = 1; i < records.length; i++) {
    const prevDate = new Date(records[i].checkInDate);
    prevDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - 1);

    if (prevDate.getTime() === expectedDate.getTime()) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 记录打卡
 */
export async function recordCheckIn(
  userId: string,
  activityType: "error_question" | "practice" | "review" | "video"
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  const userIdNum = parseInt(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 检查今天是否已经打卡
  const existingCheckIn = await db
    .select()
    .from(checkInRecords)
    .where(
      and(
        eq(checkInRecords.userId, userIdNum),
        sql`DATE(${checkInRecords.checkInDate}) = DATE(${today.toISOString()})`
      )
    )
    .limit(1);

  if (existingCheckIn.length === 0) {
    // 今天还没打卡，记录打卡
    await db.insert(checkInRecords).values({
      userId: userIdNum,
      checkInDate: today.toISOString(),
    });

    // 检查是否解锁新成就
    await checkAndUnlockAchievements(userId);
  }
}

/**
 * 获取用户所有成就及进度
 */
export async function getUserAchievements(userId: string): Promise<
  Array<{
    achievement: Achievement;
    unlocked: boolean;
    unlockedAt?: string;
    progress: number;
  }>
> {
  const db = getDb();
  if (!db) return [];

  const userIdNum = parseInt(userId);

  const allAchievements = await db.select().from(achievements);
  const userUnlockedRecords = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userIdNum));

  const unlockedMap = new Map<number, typeof userUnlockedRecords[0]>();
  userUnlockedRecords.forEach((record) => {
    unlockedMap.set(record.achievementId, record);
  });

  const result = await Promise.all(
    allAchievements.map(async (achievement) => {
      const userRecord = unlockedMap.get(achievement.id);
      const progress = userRecord
        ? achievement.requirement
        : await getAchievementProgress(userId, achievement);

      return {
        achievement,
        unlocked: !!userRecord,
        unlockedAt: userRecord?.unlockedAt,
        progress,
      };
    })
  );

  return result;
}

/**
 * 获取单个成就的当前进度
 */
async function getAchievementProgress(
  userId: string,
  achievement: Achievement
): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const userIdNum = parseInt(userId);

  switch (achievement.category) {
    case "learning": {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(errorQuestions)
        .where(eq(errorQuestions.userId, userIdNum));
      return Math.min(count[0]?.count ?? 0, achievement.requirement);
    }

    case "practice": {
      if (achievement.code === "perfect_score") {
        const records = await db
          .select()
          .from(practiceRecords)
          .where(
            and(
              eq(practiceRecords.userId, userIdNum),
              eq(practiceRecords.isCorrect, true)
            )
          );
        return records.length >= 5 ? 1 : 0;
      }
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(practiceRecords)
        .where(eq(practiceRecords.userId, userIdNum));
      return Math.min(count[0]?.count ?? 0, achievement.requirement);
    }

    case "streak": {
      const currentStreak = await getCurrentStreak(userId);
      return Math.min(currentStreak, achievement.requirement);
    }

    case "mastery": {
      if (achievement.code === "master_all_errors") {
        const totalErrors = await db
          .select({ count: sql<number>`count(*)` })
          .from(errorQuestions)
          .where(eq(errorQuestions.userId, userIdNum));
        const masteredErrors = await db
          .select({ count: sql<number>`count(*)` })
          .from(errorQuestions)
          .where(
            and(
              eq(errorQuestions.userId, userIdNum),
              eq(errorQuestions.isMastered, true)
            )
          );
        const total = totalErrors[0]?.count ?? 0;
        const mastered = masteredErrors[0]?.count ?? 0;
        return total > 0 ? Math.floor((mastered / total) * 100) : 0;
      }
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(learningProgress)
        .where(
          and(
            eq(learningProgress.userId, userIdNum),
            sql`${learningProgress.masteryLevel} >= 90`
          )
        );
      return Math.min(count[0]?.count ?? 0, achievement.requirement);
    }

    default:
      return 0;
  }
}

/**
 * 获取用户总积分
 */
export async function getUserTotalPoints(userId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const userIdNum = parseInt(userId);

  const userUnlockedRecords = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userIdNum));

  if (userUnlockedRecords.length === 0) return 0;

  // 获取所有解锁成就的详细信息
  const achievementIds = userUnlockedRecords.map(r => r.achievementId);
  const achievementDetails = await db
    .select()
    .from(achievements)
    .where(inArray(achievements.id, achievementIds));

  let totalPoints = 0;
  for (const achievement of achievementDetails) {
    totalPoints += achievement.points || 0;
  }

  return totalPoints;
}
