import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAbTestExperiment,
  startAbTestExperiment,
  pauseAbTestExperiment,
  completeAbTestExperiment,
  assignUserToExperiment,
  getUserExperimentGroup,
  recordRecommendationFeedback,
  calculateAbTestStatistics,
  getAbTestStatistics,
  getAllExperiments,
  getExperimentDetail,
} from "../services/abTestService";

export const abTestRouter = router({
  /**
   * 创建A/B测试实验
   */
  createExperiment: protectedProcedure
    .input(
      z.object({
        experimentName: z.string().min(1).max(200),
        experimentDescription: z.string().optional(),
        controlAlgorithm: z.string().min(1).max(100),
        treatmentAlgorithm: z.string().min(1).max(100),
        algorithmConfig: z.any().optional(),
        trafficSplitRatio: z.number().min(0).max(1).default(0.5),
        targetUserSegment: z.any().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const experimentId = await createAbTestExperiment(input);
      return {
        success: true,
        experimentId,
        message: "实验已创建",
      };
    }),

  /**
   * 启动实验
   */
  startExperiment: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await startAbTestExperiment(input.experimentId);
      return result;
    }),

  /**
   * 暂停实验
   */
  pauseExperiment: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await pauseAbTestExperiment(input.experimentId);
      return result;
    }),

  /**
   * 完成实验
   */
  completeExperiment: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await completeAbTestExperiment(input.experimentId);
      return result;
    }),

  /**
   * 为当前用户分配实验分组
   */
  assignToExperiment: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const groupType = await assignUserToExperiment(input.experimentId, ctx.user.id);
      return {
        success: true,
        groupType,
        message: `已分配到${groupType === "control" ? "对照组" : "实验组"}`,
      };
    }),

  /**
   * 获取当前用户的实验分组
   */
  getMyExperimentGroup: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const groupType = await getUserExperimentGroup(input.experimentId, ctx.user.id);
      return { groupType };
    }),

  /**
   * 记录推荐反馈
   */
  recordFeedback: protectedProcedure
    .input(
      z.object({
        experimentId: z.number().optional(),
        recommendationType: z.string(),
        recommendedItemId: z.number(),
        recommendationAlgorithm: z.string(),
        recommendationRank: z.number().optional(),
        wasClicked: z.boolean().optional(),
        wasUsed: z.boolean().optional(),
        timeSpentSeconds: z.number().optional(),
        userRating: z.number().min(1).max(5).optional(),
        userComment: z.string().optional(),
        wasMarkedMastered: z.boolean().optional(),
        wasAddedToFavorites: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const feedbackId = await recordRecommendationFeedback({
        ...input,
        userId: ctx.user.id,
      });

      return {
        success: true,
        feedbackId,
        message: "反馈已记录",
      };
    }),

  /**
   * 计算实验统计结果
   */
  calculateStatistics: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const statistics = await calculateAbTestStatistics(input.experimentId);
      return {
        success: true,
        statistics,
        message: "统计计算完成",
      };
    }),

  /**
   * 获取实验统计结果
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const statistics = await getAbTestStatistics(input.experimentId);
      return statistics;
    }),

  /**
   * 获取所有实验列表
   */
  getAllExperiments: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "running", "paused", "completed", "archived"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const experiments = await getAllExperiments(input.status);
      return experiments;
    }),

  /**
   * 获取实验详情
   */
  getExperimentDetail: protectedProcedure
    .input(
      z.object({
        experimentId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const experiment = await getExperimentDetail(input.experimentId);
      return experiment;
    }),
});
