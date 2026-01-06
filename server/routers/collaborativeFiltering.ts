import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as collaborativeFilteringService from '../services/collaborativeFilteringService';

export const collaborativeFilteringRouter = router({
  // 记录练习行为
  recordBehavior: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      behaviorType: z.enum(['view', 'practice', 'correct', 'incorrect', 'favorite', 'export']),
      timeSpent: z.number().optional(),
      score: z.number().optional(),
      difficulty: z.string().optional(),
      knowledgePoints: z.array(z.string()).optional(),
      userAnswer: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { questionId, behaviorType, ...metadata } = input;
      return await collaborativeFilteringService.recordPracticeBehavior(
        ctx.user.id,
        questionId,
        behaviorType,
        metadata
      );
    }),

  // 获取相似用户
  getSimilarUsers: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ input, ctx }) => {
      return await collaborativeFilteringService.getSimilarUsers(ctx.user.id, input.limit);
    }),

  // 基于用户的协同过滤推荐
  getUserBasedRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ input, ctx }) => {
      return await collaborativeFilteringService.getUserBasedRecommendations(ctx.user.id, input.limit);
    }),

  // 基于物品的协同过滤推荐
  getItemBasedRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ input, ctx }) => {
      return await collaborativeFilteringService.getItemBasedRecommendations(ctx.user.id, input.limit);
    }),

  // 混合推荐算法
  getHybridRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ input, ctx }) => {
      return await collaborativeFilteringService.getHybridRecommendations(ctx.user.id, input.limit);
    }),
});
