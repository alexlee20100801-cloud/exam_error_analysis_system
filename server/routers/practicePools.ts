import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  generatePracticeFromError,
  getUserPracticePool,
  getPracticeByErrorQuestion,
  completePractice,
  batchGeneratePracticeForUser,
  getPracticeStats,
} from "../services/errorToPracticeService";
import { getSimilarPractices } from "../services/similarPracticeService";

/**
 * 专项练习池路由
 */
export const practicePoolsRouter = router({
  /**
   * 为错题生成专项练习题
   */
  generateFromError: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
        count: z.number().min(1).max(5).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await generatePracticeFromError(
        ctx.user.id,
        input.errorQuestionId,
        input.count
      );
      return result;
    }),

  /**
   * 获取相似题推荐
   */
  getSimilarPractices: protectedProcedure
    .input(
      z.object({
        practicePoolId: z.number(),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const recommendations = await getSimilarPractices(
        ctx.user.id,
        input.practicePoolId,
        input.limit
      );
      return {
        success: true,
        recommendations,
      };
    }),

  /**
   * 获取用户的专项练习池
   */
  getMyPracticePool: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "completed", "skipped"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const practices = await getUserPracticePool(ctx.user.id, input.status);
      return {
        success: true,
        practices,
      };
    }),

  /**
   * 获取单个错题的专项练习题
   */
  getByErrorQuestion: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const practices = await getPracticeByErrorQuestion(
        ctx.user.id,
        input.errorQuestionId
      );
      return {
        success: true,
        practices,
      };
    }),

  /**
   * 完成专项练习题
   */
  completePractice: protectedProcedure
    .input(
      z.object({
        practicePoolId: z.number(),
        score: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await completePractice(
        ctx.user.id,
        input.practicePoolId,
        input.score
      );
      return result;
    }),

  /**
   * 批量为用户生成专项练习
   */
  batchGenerate: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await batchGeneratePracticeForUser(ctx.user.id, input.limit);
      return result;
    }),

  /**
   * 获取专项练习统计
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getPracticeStats(ctx.user.id);
    return {
      success: true,
      stats,
    };
  }),
});
