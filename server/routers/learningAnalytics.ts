import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  recordStudySession,
  getStudyTimeTrend,
  getTotalStudyTime,
  calculateSubjectMastery,
  saveSubjectMasterySnapshot,
  getLatestSubjectMasterySnapshots,
  getStudyActivityStats,
} from "../learningAnalyticsService";

export const learningAnalyticsRouter = router({
  /**
   * 记录学习会话
   */
  recordSession: protectedProcedure
    .input(
      z.object({
        subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
        duration: z.number().min(1),
        activityType: z.enum(['review', 'practice', 'analysis', 'upload']),
        errorQuestionId: z.number().optional(),
        startedAt: z.string(),
        endedAt: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await recordStudySession({
        userId: ctx.user.id,
        ...input,
      });
      return session;
    }),

  /**
   * 获取学习时长趋势数据（用于趋势图）
   */
  getStudyTimeTrend: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const trend = await getStudyTimeTrend(
        ctx.user.id,
        input.startDate,
        input.endDate
      );
      return trend;
    }),

  /**
   * 获取总学习时长统计
   */
  getTotalStudyTime: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const stats = await getTotalStudyTime(
        ctx.user.id,
        input.startDate,
        input.endDate
      );
      return stats;
    }),

  /**
   * 获取各学科掌握度（用于雷达图）
   */
  getSubjectMastery: protectedProcedure.query(async ({ ctx }) => {
    const mastery = await calculateSubjectMastery(ctx.user.id);
    return mastery;
  }),

  /**
   * 保存学科掌握度快照
   */
  saveSnapshot: protectedProcedure
    .input(
      z.object({
        snapshotDate: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const snapshots = await saveSubjectMasterySnapshot(
        ctx.user.id,
        input.snapshotDate
      );
      return snapshots;
    }),

  /**
   * 获取最新的学科掌握度快照
   */
  getLatestSnapshots: protectedProcedure.query(async ({ ctx }) => {
    const snapshots = await getLatestSubjectMasterySnapshots(ctx.user.id);
    return snapshots;
  }),

  /**
   * 获取学习活动统计
   */
  getActivityStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const stats = await getStudyActivityStats(
        ctx.user.id,
        input.startDate,
        input.endDate
      );
      return stats;
    }),
});
