import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  submitAnnotationFeedback,
  getFeedbackStats,
  getChartTypeAccuracyStats,
  getUserFeedbackHistory,
  getAnnotationFeedback,
  getImprovementSuggestions,
  getFeedbackTrend,
} from '../services/aiAnnotationFeedbackService';
import {
  exportFeedbackDataToCSV,
  exportDetailedFeedbackDataToCSV,
  getExportStats,
} from '../services/csvExportService';
import {
  initializePresetTemplates,
  getAllTemplates,
  getTemplateByType,
  getTemplatesByCategory,
} from '../services/chartTypeTemplateService';

/**
 * AI标注反馈路由
 * 提供反馈收集、统计分析和模板管理功能
 */
export const aiAnnotationFeedbackRouter = router({
  /**
   * 提交AI标注反馈
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        annotationId: z.number(),
        imageUrl: z.string(),
        chartType: z.string().optional(),
        rating: z.number().min(1).max(5),
        feedbackType: z.enum(['accurate', 'partially_accurate', 'inaccurate', 'missing_features']),
        improvementSuggestion: z.string().optional(),
        aiAnnotations: z.array(z.any()).optional(),
        userCorrectedAnnotations: z.array(z.any()).optional(),
        confidence: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return submitAnnotationFeedback({
        // @ts-ignore
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * 获取整体反馈统计
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    return getFeedbackStats(ctx.user.id);
  }),

  /**
   * 获取全局反馈统计（管理员）
   */
  getGlobalStats: protectedProcedure.query(async () => {
    return getFeedbackStats();
  }),

  /**
   * 获取按图表类型分组的准确率统计
   */
  getChartTypeAccuracy: protectedProcedure.query(async () => {
    return getChartTypeAccuracyStats();
  }),

  /**
   * 获取用户的反馈历史
   */
  getUserHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return getUserFeedbackHistory(ctx.user.id, input.limit);
    }),

  /**
   * 获取特定标注的反馈
   */
  getAnnotationFeedback: protectedProcedure
    .input(
      z.object({
        annotationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return getAnnotationFeedback(input.annotationId);
    }),

  /**
   * 获取改进建议汇总
   */
  getImprovementSuggestions: protectedProcedure
    .input(
      z.object({
        chartType: z.string().optional(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return getImprovementSuggestions(input.chartType, input.limit);
    }),

  /**
   * 获取反馈趋势（按天统计）
   */
  getFeedbackTrend: protectedProcedure
    .input(
      z.object({
        days: z.number().optional().default(30),
      })
    )
    .query(async ({ input }) => {
      return getFeedbackTrend(input.days);
    }),

  /**
   * 初始化预设图表类型模板
   */
  initializeTemplates: protectedProcedure.mutation(async () => {
    await initializePresetTemplates();
    return { success: true };
  }),

  /**
   * 获取所有图表类型模板
   */
  getAllTemplates: protectedProcedure.query(async () => {
    return getAllTemplates();
  }),

  /**
   * 获取特定图表类型的模板
   */
  getTemplateByType: protectedProcedure
    .input(
      z.object({
        chartType: z.string(),
      })
    )
    .query(async ({ input }) => {
      return getTemplateByType(input.chartType);
    }),

  /**
   * 根据类别获取模板
   */
  getTemplatesByCategory: protectedProcedure
    .input(
      z.object({
        category: z.enum(['math_function', 'geometry', 'physics', 'chemistry', 'data_visualization']),
      })
    )
    .query(async ({ input }) => {
      return getTemplatesByCategory(input.category);
    }),

  /**
   * 导出反馈数据为CSV（管理员）
   */
  exportFeedbackCSV: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        chartTypes: z.array(z.string()).optional(),
        feedbackTypes: z.array(z.string()).optional(),
        minRating: z.number().optional(),
        maxRating: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const filter = {
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        chartTypes: input.chartTypes,
        feedbackTypes: input.feedbackTypes,
        minRating: input.minRating,
        maxRating: input.maxRating,
      };
      const csvContent = await exportFeedbackDataToCSV(filter);
      return { csvContent };
    }),

  /**
   * 导出详细反馈数据为CSV（包含JSON字段，管理员）
   */
  exportDetailedFeedbackCSV: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        chartTypes: z.array(z.string()).optional(),
        feedbackTypes: z.array(z.string()).optional(),
        minRating: z.number().optional(),
        maxRating: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const filter = {
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        chartTypes: input.chartTypes,
        feedbackTypes: input.feedbackTypes,
        minRating: input.minRating,
        maxRating: input.maxRating,
      };
      const csvContent = await exportDetailedFeedbackDataToCSV(filter);
      return { csvContent };
    }),

  /**
   * 获取导出统计信息
   */
  getExportStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        chartTypes: z.array(z.string()).optional(),
        feedbackTypes: z.array(z.string()).optional(),
        minRating: z.number().optional(),
        maxRating: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const filter = {
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        chartTypes: input.chartTypes,
        feedbackTypes: input.feedbackTypes,
        minRating: input.minRating,
        maxRating: input.maxRating,
      };
      return getExportStats(filter);
    }),
});
