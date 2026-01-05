import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getKnowledgePointMasteryData,
  getErrorDistributionData,
  getLearningTimeTrendData,
  getLearningOverview,
} from "../learningStatsService";

/**
 * 学习统计路由
 * 提供学习报告所需的各类统计数据
 */
export const learningStatsRouter = router({
  /**
   * 获取知识点掌握度数据（雷达图）
   */
  getKnowledgePointMastery: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        limit: z.number().min(5).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const data = await getKnowledgePointMasteryData(
        ctx.user.id,
        input.subject,
        input.limit
      );
      return data;
    }),

  /**
   * 获取错题分布数据（饼图）
   */
  getErrorDistribution: protectedProcedure.query(async ({ ctx }) => {
    const data = await getErrorDistributionData(ctx.user.id);
    return data;
  }),

  /**
   * 获取学习时长趋势数据（折线图）
   */
  getLearningTimeTrend: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const data = await getLearningTimeTrendData(ctx.user.id, input.days);
      return data;
    }),

  /**
   * 获取学习总览统计
   */
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const data = await getLearningOverview(ctx.user.id);
    return data;
  }),
});
