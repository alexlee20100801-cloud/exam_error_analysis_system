import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as exportTemplateService from '../services/exportTemplateService';

const templateDataSchema = z.object({
  name: z.string(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  logoUrl: z.string().optional(),
  logoPosition: z.enum(['top-left', 'top-center', 'top-right']).optional(),
  logoWidth: z.number().optional(),
  headerText: z.string().optional(),
  headerAlign: z.enum(['left', 'center', 'right']).optional(),
  headerFontSize: z.number().optional(),
  footerText: z.string().optional(),
  footerAlign: z.enum(['left', 'center', 'right']).optional(),
  footerFontSize: z.number().optional(),
  showPageNumber: z.boolean().optional(),
  fontSize: z.number().optional(),
  lineSpacing: z.number().optional(),
  marginTop: z.number().optional(),
  marginBottom: z.number().optional(),
  marginLeft: z.number().optional(),
  marginRight: z.number().optional(),
  showQuestionNumber: z.boolean().optional(),
  showDifficulty: z.boolean().optional(),
  showKnowledgePoints: z.boolean().optional(),
  showAnswer: z.boolean().optional(),
  showExplanation: z.boolean().optional(),
  paperSize: z.enum(['A4', 'A5', 'Letter']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
});

export const exportTemplatesRouter = router({
  // 创建模板
  create: protectedProcedure
    .input(templateDataSchema)
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateService.createExportTemplate(ctx.user.id, input);
    }),

  // 更新模板
  update: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      data: templateDataSchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateService.updateExportTemplate(ctx.user.id, input.templateId, input.data);
    }),

  // 删除模板
  delete: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateService.deleteExportTemplate(ctx.user.id, input.templateId);
    }),

  // 获取用户模板列表
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await exportTemplateService.getUserExportTemplates(ctx.user.id);
    }),

  // 获取公开模板列表
  publicList: protectedProcedure
    .query(async () => {
      return await exportTemplateService.getPublicExportTemplates();
    }),

  // 获取模板详情
  get: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      return await exportTemplateService.getExportTemplate(ctx.user.id, input.templateId);
    }),

  // 获取默认模板
  getDefault: protectedProcedure
    .query(async ({ ctx }) => {
      return await exportTemplateService.getDefaultExportTemplate(ctx.user.id);
    }),

  // 设置默认模板
  setDefault: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateService.setDefaultExportTemplate(ctx.user.id, input.templateId);
    }),

  // 复制公开模板
  copyPublic: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateService.copyPublicTemplate(ctx.user.id, input.templateId);
    }),

  // 创建系统预设模板
  createSystemTemplates: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await exportTemplateService.createSystemTemplates(ctx.user.id);
    }),
});
