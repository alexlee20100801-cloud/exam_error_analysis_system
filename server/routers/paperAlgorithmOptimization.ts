import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as paperAlgorithmOptimizationService from "../services/paperAlgorithmOptimizationService";

export const paperAlgorithmOptimizationRouter = router({
  // 提交组卷反馈
  submitFeedback: protectedProcedure
    .input(
      z.object({
        paperId: z.number(),
        difficultyRating: z.number().min(1).max(5),
        knowledgeCoverageRating: z.number().min(1).max(5),
        questionQualityRating: z.number().min(1).max(5),
        overallSatisfaction: z.number().min(1).max(5),
        comments: z.string().optional(),
        completionTime: z.number().optional(),
        correctRate: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await paperAlgorithmOptimizationService.submitPaperFeedback({
        ...input,
        userId: ctx.user!.id,
        correctRate: input.correctRate?.toFixed(2),
      });
    }),

  // 获取组卷反馈
  getFeedback: protectedProcedure
    .input(
      z.object({
        paperId: z.number().optional(),
        userId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await paperAlgorithmOptimizationService.getPaperFeedback(input);
    }),

  // 创建算法配置
  createConfig: protectedProcedure
    .input(
      z.object({
        configName: z.string(),
        algorithmVersion: z.string(),
        errorFrequencyWeight: z.number().min(0).max(1).default(0.3),
        knowledgeCoverageWeight: z.number().min(0).max(1).default(0.25),
        difficultyBalanceWeight: z.number().min(0).max(1).default(0.2),
        masteryLevelWeight: z.number().min(0).max(1).default(0.15),
        recencyWeight: z.number().min(0).max(1).default(0.1),
        minQualityScore: z.number().min(0).max(1).default(0.6),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await paperAlgorithmOptimizationService.createAlgorithmConfig({
        ...input,
        errorFrequencyWeight: input.errorFrequencyWeight.toFixed(2),
        knowledgeCoverageWeight: input.knowledgeCoverageWeight.toFixed(2),
        difficultyBalanceWeight: input.difficultyBalanceWeight.toFixed(2),
        masteryLevelWeight: input.masteryLevelWeight.toFixed(2),
        recencyWeight: input.recencyWeight.toFixed(2),
        minQualityScore: input.minQualityScore.toFixed(2),
        createdBy: ctx.user?.id,
      });
    }),

  // 获取所有算法配置
  getAllConfigs: protectedProcedure.query(async () => {
    return await paperAlgorithmOptimizationService.getAllAlgorithmConfigs();
  }),

  // 获取激活的算法配置
  getActiveConfig: protectedProcedure.query(async () => {
    return await paperAlgorithmOptimizationService.getActiveAlgorithmConfig();
  }),

  // 激活算法配置
  activateConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await paperAlgorithmOptimizationService.activateAlgorithmConfig(input.id);
    }),

  // 更新算法配置
  updateConfig: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        configName: z.string().optional(),
        errorFrequencyWeight: z.number().min(0).max(1).optional(),
        knowledgeCoverageWeight: z.number().min(0).max(1).optional(),
        difficultyBalanceWeight: z.number().min(0).max(1).optional(),
        masteryLevelWeight: z.number().min(0).max(1).optional(),
        recencyWeight: z.number().min(0).max(1).optional(),
        minQualityScore: z.number().min(0).max(1).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const formattedUpdates: any = { ...updates };

      if (updates.errorFrequencyWeight !== undefined) {
        formattedUpdates.errorFrequencyWeight = updates.errorFrequencyWeight.toFixed(2);
      }
      if (updates.knowledgeCoverageWeight !== undefined) {
        formattedUpdates.knowledgeCoverageWeight = updates.knowledgeCoverageWeight.toFixed(2);
      }
      if (updates.difficultyBalanceWeight !== undefined) {
        formattedUpdates.difficultyBalanceWeight = updates.difficultyBalanceWeight.toFixed(2);
      }
      if (updates.masteryLevelWeight !== undefined) {
        formattedUpdates.masteryLevelWeight = updates.masteryLevelWeight.toFixed(2);
      }
      if (updates.recencyWeight !== undefined) {
        formattedUpdates.recencyWeight = updates.recencyWeight.toFixed(2);
      }
      if (updates.minQualityScore !== undefined) {
        formattedUpdates.minQualityScore = updates.minQualityScore.toFixed(2);
      }

      return await paperAlgorithmOptimizationService.updateAlgorithmConfig(
        id,
        formattedUpdates
      );
    }),

  // 评估算法配置
  evaluateConfig: protectedProcedure
    .input(
      z.object({
        configId: z.number(),
        evaluationPeriod: z.string(), // 格式：YYYY-MM
      })
    )
    .mutation(async ({ input }) => {
      return await paperAlgorithmOptimizationService.evaluateAlgorithmConfig(
        input.configId,
        input.evaluationPeriod
      );
    }),

  // 获取评估历史
  getEvaluationHistory: protectedProcedure
    .input(
      z.object({
        configId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await paperAlgorithmOptimizationService.getEvaluationHistory(
        input.configId
      );
    }),

  // 自动调优
  autoTune: protectedProcedure
    .input(
      z.object({
        configId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await paperAlgorithmOptimizationService.autoTuneAlgorithmWeights(
        input.configId
      );
    }),
});
