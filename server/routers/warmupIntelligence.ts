/**
 * 预热任务智能优化路由
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  generateIntelligentWarmupRecommendations,
  analyzeOptimalWarmupTiming,
  recordWarmupEffectiveness,
  analyzeHistoricalWarmupEffectiveness,
  analyzeCacheCoverage,
} from "../services/warmupIntelligenceService";
import { db } from "../db";
import { warmupTasks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const warmupIntelligenceRouter = router({
  /**
   * 获取智能预热推荐
   */
  getRecommendations: protectedProcedure.query(async () => {
    const recommendations = await generateIntelligentWarmupRecommendations();
    return recommendations;
  }),

  /**
   * 分析最佳预热时机
   */
  getOptimalTiming: protectedProcedure.query(async () => {
    const timing = await analyzeOptimalWarmupTiming();
    return timing;
  }),

  /**
   * 获取历史预热效果分析
   */
  getHistoricalEffectiveness: protectedProcedure.query(async () => {
    const effectiveness = await analyzeHistoricalWarmupEffectiveness();
    return effectiveness;
  }),

  /**
   * 获取缓存覆盖率分析
   */
  getCacheCoverage: protectedProcedure.query(async () => {
    const coverage = await analyzeCacheCoverage();
    return coverage;
  }),

  /**
   * 创建AI推荐的预热任务
   */
  createRecommendedTask: protectedProcedure
    .input(
      z.object({
        taskName: z.string(),
        taskType: z.enum(["knowledge_point", "question_type", "recommendation"]),
        targetConfig: z.any(),
        priority: z.number().min(1).max(10),
        aiRecommendationScore: z.number(),
        aiRecommendationReason: z.string(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [task] = await db.insert(warmupTasks).values({
        taskName: input.taskName,
        taskType: input.taskType,
        targetConfig: input.targetConfig,
        priority: input.priority,
        recommendedByAi: 1,
        aiRecommendationScore: input.aiRecommendationScore,
        aiRecommendationReason: input.aiRecommendationReason,
        scheduledAt: input.scheduledAt || new Date(),
        status: "pending",
      });

      return { success: true, taskId: task.insertId };
    }),

  /**
   * 记录预热任务效果
   */
  recordEffectiveness: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        beforeMetrics: z.object({
          cacheHitRate: z.number(),
          avgResponseTime: z.number(),
        }),
        afterMetrics: z.object({
          cacheHitRate: z.number(),
          avgResponseTime: z.number(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const result = await recordWarmupEffectiveness(
        input.taskId,
        input.beforeMetrics,
        input.afterMetrics
      );

      return {
        success: true,
        ...result,
      };
    }),

  /**
   * 获取预热任务效果对比
   */
  getEffectivenessComparison: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const [task] = await db
        .select()
        .from(warmupTasks)
        .where(eq(warmupTasks.id, input.taskId))
        .limit(1);

      if (!task) {
        throw new Error("预热任务不存在");
      }

      return {
        taskName: task.taskName,
        status: task.status,
        beforeMetrics: {
          cacheHitRate: task.beforeCacheHitRate,
          avgResponseTime: task.beforeAvgResponseTime,
        },
        afterMetrics: {
          cacheHitRate: task.afterCacheHitRate,
          avgResponseTime: task.afterAvgResponseTime,
        },
        improvements: {
          hitRateImprovement: task.hitRateImprovement,
          responseTimeImprovement: task.responseTimeImprovement,
          effectivenessScore: task.effectivenessScore,
        },
        aiRecommendation: {
          recommendedByAi: task.recommendedByAi === 1,
          score: task.aiRecommendationScore,
          reason: task.aiRecommendationReason,
        },
      };
    }),
});
