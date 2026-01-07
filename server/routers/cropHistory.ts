import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  saveCropHistory,
  getUserCropHistory,
  getCropHistoryByQuestionType,
  recommendCropRegions,
  updateCropFeedback,
  deleteCropHistory,
  getCropStatistics,
} from "../cropHistoryService";

export const cropHistoryRouter = router({
  /**
   * 保存框选历史记录
   */
  save: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        regions: z.array(
          z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
            label: z.string().optional(),
          })
        ),
        questionType: z.enum(['choice', 'blank', 'short_answer', 'calculation', 'essay', 'mixed']).optional(),
        subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).optional(),
        grade: z.enum(['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await saveCropHistory({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 获取用户的历史记录
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return await getUserCropHistory(ctx.user.id, input?.limit);
    }),

  /**
   * 按题型获取历史记录
   */
  listByQuestionType: protectedProcedure
    .input(
      z.object({
        questionType: z.enum(['choice', 'blank', 'short_answer', 'calculation', 'essay', 'mixed']),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getCropHistoryByQuestionType(ctx.user.id, input.questionType);
    }),

  /**
   * 获取智能推荐
   */
  recommend: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        questionType: z.enum(['choice', 'blank', 'short_answer', 'calculation', 'essay', 'mixed']).optional(),
        subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await recommendCropRegions({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 更新用户反馈
   */
  updateFeedback: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        feedback: z.enum(['accepted', 'rejected', 'modified']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await updateCropFeedback(input.id, ctx.user.id, input.feedback);
    }),

  /**
   * 删除历史记录
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteCropHistory(input.id, ctx.user.id);
      return { success };
    }),

  /**
   * 获取统计信息
   */
  statistics: protectedProcedure.query(async ({ ctx }) => {
    return await getCropStatistics(ctx.user.id);
  }),
});
