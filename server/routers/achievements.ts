/**
 * 成就系统路由
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUserAchievements,
  getCurrentStreak,
  recordCheckIn,
  getUserTotalPoints,
  checkAndUnlockAchievements,
} from "../achievementService";
import { getDb } from "../db";
import { checkInRecords, achievements } from "../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const achievementsRouter = router({
  /**
   * 获取用户所有成就及进度
   */
  getUserAchievements: protectedProcedure.query(async ({ ctx }) => {
    const result = await getUserAchievements(ctx.user.id);
    return result;
  }),

  /**
   * 获取用户当前连续打卡天数
   */
  getCurrentStreak: protectedProcedure.query(async ({ ctx }) => {
    const streak = await getCurrentStreak(ctx.user.id);
    return { streak };
  }),

  /**
   * 记录打卡
   */
  checkIn: protectedProcedure
    .input(
      z.object({
        activityType: z.enum(["error_question", "practice", "review", "video"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await recordCheckIn(ctx.user.id, input.activityType);
      const streak = await getCurrentStreak(ctx.user.id);
      return { success: true, streak };
    }),

  /**
   * 获取打卡日历（最近30天）
   */
  getCheckInCalendar: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await db
      .select()
      .from(checkInRecords)
      .where(
        and(
          eq(checkInRecords.userId, ctx.user.id),
          sql`${checkInRecords.checkInDate} >= ${thirtyDaysAgo}`
        )
      )
      .orderBy(desc(checkInRecords.checkInDate));

    // 按日期分组
    const calendar: Record<string, boolean> = {};
    records.forEach((record) => {
      const dateStr = new Date(record.checkInDate).toISOString().split("T")[0];
      calendar[dateStr] = true;
    });

    return { calendar };
  }),

  /**
   * 获取用户总积分
   */
  getTotalPoints: protectedProcedure.query(async ({ ctx }) => {
    const totalPoints = await getUserTotalPoints(ctx.user.id);
    return { totalPoints };
  }),

  /**
   * 获取用户统计信息
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const allAchievements = await getUserAchievements(ctx.user.id);
    const unlockedCount = allAchievements.filter((a) => a.unlocked).length;
    const totalCount = allAchievements.length;
    const totalPoints = await getUserTotalPoints(ctx.user.id);
    const streak = await getCurrentStreak(ctx.user.id);

    return {
      unlockedCount,
      totalCount,
      totalPoints,
      streak,
      completionRate: Math.floor((unlockedCount / totalCount) * 100),
    };
  }),

  /**
   * 手动触发成就检查（用于测试）
   */
  checkAchievements: protectedProcedure.mutation(async ({ ctx }) => {
    const newlyUnlocked = await checkAndUnlockAchievements(ctx.user.id);
    return {
      success: true,
      newlyUnlocked: newlyUnlocked.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        color: a.color,
        points: a.points,
      })),
    };
  }),

  /**
   * 获取所有成就定义
   */
  getAllAchievements: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allAchievements = await db.select().from(achievements);
    return allAchievements;
  }),
});
