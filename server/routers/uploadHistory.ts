import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createUploadHistory,
  createHistoryFromSession,
  getUserUploadHistory,
  getUserUploadStats,
} from "../uploadHistoryService";

export const uploadHistoryRouter = router({
  /**
   * 创建上传历史记录
   */
  create: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      uploadType: z.enum(['single', 'batch']),
      totalCount: z.number(),
      successCount: z.number(),
      failedCount: z.number(),
      averageConfidence: z.number().optional(),
      subjectDistribution: z.record(z.number()).optional(),
      gradeDistribution: z.record(z.number()).optional(),
      processingDuration: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const history = await createUploadHistory({
        userId: ctx.user.id,
        ...input,
      });
      return history;
    }),

  /**
   * 从会话生成上传历史记录
   */
  createFromSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const history = await createHistoryFromSession(input.sessionId, ctx.user.id);
      return history;
    }),

  /**
   * 获取用户的上传历史列表
   */
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const history = await getUserUploadHistory(ctx.user.id, input);
      return history;
    }),

  /**
   * 获取用户的上传统计摘要
   */
  getStats: protectedProcedure
    .input(z.object({
      days: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const stats = await getUserUploadStats(ctx.user.id, input.days);
      return stats;
    }),
});
