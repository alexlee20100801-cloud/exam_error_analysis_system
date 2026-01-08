import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createOrUpdateReviewRecord,
  getDueReviewQuestions,
  getUserReminderSettings,
  updateUserReminderSettings,
  pauseReviewReminder,
  resumeReviewReminder,
  getReviewStatistics,
} from "../reviewReminderService";

export const smartReviewReminderRouter = router({
  /**
   * 标记错题已复习（更新复习记录）
   */
  markAsReviewed: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createOrUpdateReviewRecord(ctx.user.id, input.errorQuestionId);
      return { success: true };
    }),

  /**
   * 获取待复习的错题列表
   */
  getDueQuestions: protectedProcedure.query(async ({ ctx }) => {
    const questions = await getDueReviewQuestions(ctx.user.id);
    return questions;
  }),

  /**
   * 获取用户的复习提醒设置
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getUserReminderSettings(ctx.user.id);
    return settings;
  }),

  /**
   * 更新用户的复习提醒设置
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        isEnabled: z.number().min(0).max(1).optional(),
        reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        reminderMethod: z.enum(['system', 'email', 'sms']).optional(),
        maxDailyReminders: z.number().min(1).max(50).optional(),
        prioritySubjects: z.array(z.string()).optional(),
        remindOnWeekends: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await updateUserReminderSettings(ctx.user.id, {
        ...input,
        prioritySubjects: input.prioritySubjects ? JSON.stringify(input.prioritySubjects) : undefined,
      });
      return settings;
    }),

  /**
   * 暂停错题的复习提醒
   */
  pauseReminder: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await pauseReviewReminder(ctx.user.id, input.errorQuestionId);
      return { success: true };
    }),

  /**
   * 恢复错题的复习提醒
   */
  resumeReminder: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await resumeReviewReminder(ctx.user.id, input.errorQuestionId);
      return { success: true };
    }),

  /**
   * 获取复习统计信息
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getReviewStatistics(ctx.user.id);
    return stats;
  }),
});
