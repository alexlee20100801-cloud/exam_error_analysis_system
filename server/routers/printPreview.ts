import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createPrintTemplate,
  getUserPrintTemplates,
  getDefaultPrintTemplate,
  getPrintTemplateById,
  updatePrintTemplate,
  deletePrintTemplate,
  getPrintPreviewData,
  recordPrintHistory,
  getUserPrintHistory,
  getPrintHistoryStats,
} from "../printPreviewService";

/**
 * 打印预览路由
 * 提供打印模板管理、打印预览和打印历史功能
 */
export const printPreviewRouter = router({
  /**
   * 创建打印模板
   */
  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      layout: z.enum(['single', 'double']).optional(),
      fontSize: z.number().int().min(8).max(24).optional(),
      marginTop: z.number().int().min(0).max(50).optional(),
      marginBottom: z.number().int().min(0).max(50).optional(),
      marginLeft: z.number().int().min(0).max(50).optional(),
      marginRight: z.number().int().min(0).max(50).optional(),
      includeAiAnalysis: z.boolean().optional(),
      includeAnswer: z.boolean().optional(),
      includeExplanation: z.boolean().optional(),
      includeKnowledgePoints: z.boolean().optional(),
      includeImage: z.boolean().optional(),
      headerText: z.string().optional(),
      footerText: z.string().optional(),
      showPageNumber: z.boolean().optional(),
      paperSize: z.enum(['A4', 'A5', 'Letter']).optional(),
      orientation: z.enum(['portrait', 'landscape']).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createPrintTemplate(ctx.user.id, input);
    }),

  /**
   * 获取用户的打印模板列表
   */
  getTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      return getUserPrintTemplates(ctx.user.id);
    }),

  /**
   * 获取默认打印模板
   */
  getDefaultTemplate: protectedProcedure
    .query(async ({ ctx }) => {
      return getDefaultPrintTemplate(ctx.user.id);
    }),

  /**
   * 获取打印模板详情
   */
  getTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      return getPrintTemplateById(input.templateId, ctx.user.id);
    }),

  /**
   * 更新打印模板
   */
  updateTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number().int().positive(),
      name: z.string().min(1).max(255).optional(),
      layout: z.enum(['single', 'double']).optional(),
      fontSize: z.number().int().min(8).max(24).optional(),
      marginTop: z.number().int().min(0).max(50).optional(),
      marginBottom: z.number().int().min(0).max(50).optional(),
      marginLeft: z.number().int().min(0).max(50).optional(),
      marginRight: z.number().int().min(0).max(50).optional(),
      includeAiAnalysis: z.boolean().optional(),
      includeAnswer: z.boolean().optional(),
      includeExplanation: z.boolean().optional(),
      includeKnowledgePoints: z.boolean().optional(),
      includeImage: z.boolean().optional(),
      headerText: z.string().nullable().optional(),
      footerText: z.string().nullable().optional(),
      showPageNumber: z.boolean().optional(),
      paperSize: z.enum(['A4', 'A5', 'Letter']).optional(),
      orientation: z.enum(['portrait', 'landscape']).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { templateId, ...updates } = input;
      await updatePrintTemplate(templateId, ctx.user.id, updates);
      return { success: true };
    }),

  /**
   * 删除打印模板
   */
  deleteTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      await deletePrintTemplate(input.templateId, ctx.user.id);
      return { success: true };
    }),

  /**
   * 获取打印预览数据
   */
  getPreviewData: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number().int().positive()).min(1),
      templateId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return getPrintPreviewData(ctx.user.id, input.questionIds, input.templateId);
    }),

  /**
   * 记录打印历史
   */
  recordHistory: protectedProcedure
    .input(z.object({
      templateId: z.number().int().positive().optional(),
      questionIds: z.array(z.number().int().positive()).min(1),
      exportType: z.enum(['print', 'pdf', 'word']),
      fileUrl: z.string().url().optional(),
      fileSize: z.number().int().positive().optional(),
      configSnapshot: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      return recordPrintHistory(ctx.user.id, input);
    }),

  /**
   * 获取打印历史
   */
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().int().positive().max(100).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      return getUserPrintHistory(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * 获取打印历史统计
   */
  getHistoryStats: protectedProcedure
    .query(async ({ ctx }) => {
      return getPrintHistoryStats(ctx.user.id);
    }),
});
