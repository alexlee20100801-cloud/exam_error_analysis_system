import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as recommendationService from '../services/questionRecommendationService';

export const questionRecommendationRouter = router({
  /**
   * 生成推荐题目
   */
  generateRecommendations: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        limit: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await recommendationService.generateRecommendations({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 获取用户的推荐题目列表
   */
  getRecommendations: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await recommendationService.getUserRecommendations({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 标记推荐题目为已点击
   */
  markClicked: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await recommendationService.markRecommendationClicked({
        userId: ctx.user.id,
        questionId: input.questionId,
      });
    }),

  /**
   * 记录练习结果
   */
  recordPracticeResult: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        result: z.enum(['correct', 'incorrect', 'skipped']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await recommendationService.recordPracticeResult({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 获取推荐统计
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return await recommendationService.getRecommendationStats(ctx.user.id);
  }),

  /**
   * 分析薄弱知识点
   */
  analyzeWeakPoints: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await recommendationService.analyzeWeakKnowledgePoints(
        ctx.user.id,
        input.subject
      );
    }),
});
