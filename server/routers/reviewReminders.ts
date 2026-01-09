import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createReviewReminder,
  getPendingReviews,
  getAllReminders,
  markAsReviewed,
  skipReminder,
  deleteReminder,
  getReviewHistory,
  getReminderStats,
} from "../services/reviewReminderService";

/**
 * 学习提醒路由
 */
export const reviewRemindersRouter = router({
  /**
   * 创建学习提醒
   */
  create: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        questionType: z.enum(["error_question", "practice_question"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createReviewReminder(
        // @ts-ignore
        ctx.user.id,
        input.questionId,
        input.questionType
      );
      return result;
    }),

  /**
   * 获取待复习列表（已到期）
   */
  getPending: protectedProcedure.query(async ({ ctx }) => {
    const reminders = await getPendingReviews(ctx.user.id);
    return {
      success: true,
      reminders,
    };
  }),

  /**
   * 获取所有提醒列表
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "completed", "skipped", "deleted"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // @ts-ignore
      const reminders = await getAllReminders(ctx.user.id, input.status);
      return {
        success: true,
        reminders,
      };
    }),

  /**
   * 标记为已复习
   */
  markReviewed: protectedProcedure
    .input(
      z.object({
        reminderId: z.number(),
        masteryLevel: z.number().min(0).max(100).optional(),
        timeSpent: z.number().optional(), // 秒
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await markAsReviewed(
        input.reminderId,
        // @ts-ignore
        ctx.user.id,
        input.masteryLevel,
        input.timeSpent,
        input.notes
      );
      return result;
    }),

  /**
   * 跳过提醒（延后1天）
   */
  skip: protectedProcedure
    .input(
      z.object({
        reminderId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // @ts-ignore
      const result = await skipReminder(input.reminderId, ctx.user.id);
      return result;
    }),

  /**
   * 删除提醒
   */
  delete: protectedProcedure
    .input(
      z.object({
        reminderId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // @ts-ignore
      const result = await deleteReminder(input.reminderId, ctx.user.id);
      return result;
    }),

  /**
   * 获取复习历史
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        reminderId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const history = await getReviewHistory(ctx.user.id, input.reminderId);
      return {
        success: true,
        history,
      };
    }),

  /**
   * 获取提醒统计
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getReminderStats(ctx.user.id);
    return {
      success: true,
      stats,
    };
  }),
});
