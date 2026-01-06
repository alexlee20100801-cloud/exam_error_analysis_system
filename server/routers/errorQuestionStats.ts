import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getSubjectDistribution,
  getDifficultyDistribution,
  getKnowledgePointMastery,
  getErrorQuestionOverview,
} from "../services/errorQuestionStatsService";

/**
 * 错题统计路由
 * 提供错题本数据可视化所需的统计数据
 */
export const errorQuestionStatsRouter = router({
  /**
   * 获取错题学科分布数据（饼图）
   */
  getSubjectDistribution: protectedProcedure.query(async ({ ctx }) => {
    const distribution = await getSubjectDistribution(ctx.user.id);
    return {
      success: true,
      data: distribution,
    };
  }),

  /**
   * 获取错题难度分布数据（柱状图）
   */
  getDifficultyDistribution: protectedProcedure.query(async ({ ctx }) => {
    const distribution = await getDifficultyDistribution(ctx.user.id);
    return {
      success: true,
      data: distribution,
    };
  }),

  /**
   * 获取知识点掌握度数据（雷达图）
   */
  getKnowledgePointMastery: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(8),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 8;
      const mastery = await getKnowledgePointMastery(ctx.user.id, limit);
      return {
        success: true,
        data: mastery,
      };
    }),

  /**
   * 获取错题统计总览
   */
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const overview = await getErrorQuestionOverview(ctx.user.id);
    return {
      success: true,
      data: overview,
    };
  }),
});
