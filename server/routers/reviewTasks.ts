import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getUserReviewTasks,
  getLatestAdviceWithTasks,
  toggleTaskCompletion,
  getReviewCompletionStats,
  getReviewTaskHistory,
} from "../services/reviewTaskService";

/**
 * 复习任务路由
 */
export const reviewTasksRouter = router({
  /**
   * 获取用户的所有复习任务
   */
  list: protectedProcedure
    .input(
      z.object({
        includeCompleted: z.boolean().optional().default(true),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const tasks = await getUserReviewTasks(ctx.user.id, input?.includeCompleted);
      return {
        success: true,
        data: tasks,
      };
    }),

  /**
   * 获取最新的AI建议及其任务
   */
  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const result = await getLatestAdviceWithTasks(ctx.user.id);
    return {
      success: true,
      data: result,
    };
  }),

  /**
   * 标记任务完成/未完成
   */
  toggle: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await toggleTaskCompletion(input.taskId, ctx.user.id);
      return {
        success: true,
        data: result,
      };
    }),

  /**
   * 获取复习完成率统计
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getReviewCompletionStats(ctx.user.id);
    return {
      success: true,
      data: stats,
    };
  }),

  /**
   * 获取复习任务历史
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const history = await getReviewTaskHistory(ctx.user.id, input?.limit);
      return {
        success: true,
        data: history,
      };
    }),
});
