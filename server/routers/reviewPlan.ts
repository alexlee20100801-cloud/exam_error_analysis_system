import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addToReviewPlan,
  markAsReviewed,
  getDueReviews,
  getAllReviewPlans,
  pauseReviewPlan,
  getReviewStats,
  EBBINGHAUS_INTERVALS,
} from "../reviewPlanService";
import { getReviewReminderSummary, sendReviewReminder } from "../reviewNotificationService";

export const reviewPlanRouter = router({
  /**
   * 将错题加入复习计划
   */
  addToReviewPlan: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = await addToReviewPlan(ctx.user.id, input.errorQuestionId);
      return { success };
    }),

  /**
   * 标记错题已复习
   */
  markAsReviewed: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = await markAsReviewed(ctx.user.id, input.errorQuestionId);
      return { success };
    }),

  /**
   * 获取待复习的错题列表
   */
  getDueReviews: protectedProcedure.query(async ({ ctx }) => {
    const reviews = await getDueReviews(ctx.user.id);
    return reviews;
  }),

  /**
   * 获取所有复习计划
   */
  getAllReviewPlans: protectedProcedure.query(async ({ ctx }) => {
    const plans = await getAllReviewPlans(ctx.user.id);
    return plans;
  }),

  /**
   * 暂停复习计划
   */
  pauseReviewPlan: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = await pauseReviewPlan(ctx.user.id, input.errorQuestionId);
      return { success };
    }),

  /**
   * 获取复习统计信息
   */
  getReviewStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getReviewStats(ctx.user.id);
    return stats;
  }),

  /**
   * 获取复习提醒摘要
   */
  getReviewReminderSummary: protectedProcedure.query(async ({ ctx }) => {
    const summary = await getReviewReminderSummary(ctx.user.id);
    return summary;
  }),

  /**
   * 手动触发复习提醒通知
   */
  sendReviewReminder: protectedProcedure.mutation(async ({ ctx }) => {
    const success = await sendReviewReminder(ctx.user.id);
    return { success };
  }),

  /**
   * 获取艾宾浩斯复习间隔配置
   */
  getReviewIntervals: protectedProcedure.query(() => {
    return {
      intervals: EBBINGHAUS_INTERVALS,
      description: "艾宾浩斯遗忘曲线复习间隔（天数）",
    };
  }),

  /**
   * 批量加入复习计划
   */
  batchAddToReviewPlan: protectedProcedure
    .input(
      z.object({
        errorQuestionIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let successCount = 0;
      let failCount = 0;

      // 逐个添加到复习计划
      for (const errorQuestionId of input.errorQuestionIds) {
        try {
          const success = await addToReviewPlan(ctx.user.id, errorQuestionId);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      return {
        success: true,
        successCount,
        failCount,
      };
    }),
});
