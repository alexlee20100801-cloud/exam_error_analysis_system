import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as exportTemplateEnhancedService from '../services/exportTemplateEnhancedService';

// 筛选配置Schema
const filterConfigSchema = z.object({
  subjects: z.array(z.string()).optional(),
  grades: z.array(z.string()).optional(),
  difficulties: z.array(z.string()).optional(),
  masteryLevels: z.array(z.string()).optional(),
  dateRange: z.object({
    type: z.enum(['all', 'week', 'month', 'quarter', 'year', 'custom']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  knowledgePointIds: z.array(z.number()).optional(),
}).optional();

// 排序配置Schema
const sortConfigSchema = z.object({
  field: z.enum(['createdAt', 'updatedAt', 'difficulty', 'masteryLevel', 'subject']),
  order: z.enum(['asc', 'desc']),
}).optional();

// 内容配置Schema
const contentConfigSchema = z.object({
  showQuestionNumber: z.boolean().optional(),
  showDifficulty: z.boolean().optional(),
  showKnowledgePoints: z.boolean().optional(),
  showAnswer: z.boolean().optional(),
  showExplanation: z.boolean().optional(),
  showErrorAnalysis: z.boolean().optional(),
  showSimilarQuestions: z.boolean().optional(),
  showStudyNotes: z.boolean().optional(),
  showReviewHistory: z.boolean().optional(),
  groupBySubject: z.boolean().optional(),
  groupByKnowledgePoint: z.boolean().optional(),
}).optional();

// 样式配置Schema
const styleConfigSchema = z.object({
  paperSize: z.enum(['A4', 'A5', 'Letter']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  marginTop: z.number().optional(),
  marginBottom: z.number().optional(),
  marginLeft: z.number().optional(),
  marginRight: z.number().optional(),
  fontSize: z.number().optional(),
  lineSpacing: z.number().optional(),
  fontFamily: z.string().optional(),
  headerText: z.string().optional(),
  headerAlign: z.enum(['left', 'center', 'right']).optional(),
  headerFontSize: z.number().optional(),
  footerText: z.string().optional(),
  footerAlign: z.enum(['left', 'center', 'right']).optional(),
  footerFontSize: z.number().optional(),
  showPageNumber: z.boolean().optional(),
  logoUrl: z.string().optional(),
  logoPosition: z.enum(['top-left', 'top-center', 'top-right']).optional(),
  logoWidth: z.number().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
}).optional();

// 模板数据Schema
const templateDataSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(100, '模板名称不能超过100个字符'),
  description: z.string().optional(),
  templateType: z.enum(['error_book', 'review_card', 'exam_paper', 'analysis_report', 'custom']).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  filterConfig: filterConfigSchema,
  sortConfig: sortConfigSchema,
  contentConfig: contentConfigSchema,
  styleConfig: styleConfigSchema,
  exportFormat: z.enum(['pdf', 'word', 'markdown', 'html']).optional(),
});

export const exportTemplatesEnhancedRouter = router({
  // ==================== 模板管理 ====================
  
  // 创建模板
  create: protectedProcedure
    .input(templateDataSchema)
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.createExportTemplateEnhanced(ctx.user.id, input);
    }),

  // 更新模板
  update: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      data: templateDataSchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.updateExportTemplateEnhanced(
        ctx.user.id, 
        input.templateId, 
        input.data
      );
    }),

  // 删除模板
  delete: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.deleteExportTemplateEnhanced(ctx.user.id, input.templateId);
    }),

  // 获取用户模板列表
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await exportTemplateEnhancedService.getUserExportTemplatesEnhanced(ctx.user.id);
    }),

  // 获取公开模板列表
  publicList: protectedProcedure
    .query(async () => {
      return await exportTemplateEnhancedService.getPublicExportTemplatesEnhanced();
    }),

  // 获取系统预设模板
  systemPresets: protectedProcedure
    .query(async () => {
      return await exportTemplateEnhancedService.getSystemPresetTemplates();
    }),

  // 获取模板详情
  get: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.getExportTemplateEnhancedById(ctx.user.id, input.templateId);
    }),

  // 获取默认模板
  getDefault: protectedProcedure
    .query(async ({ ctx }) => {
      return await exportTemplateEnhancedService.getDefaultExportTemplateEnhanced(ctx.user.id);
    }),

  // 设置默认模板
  setDefault: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.setDefaultExportTemplateEnhanced(ctx.user.id, input.templateId);
    }),

  // 复制模板
  copy: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      newName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.copyExportTemplateEnhanced(
        ctx.user.id, 
        input.templateId, 
        input.newName
      );
    }),

  // ==================== 快速导出配置 ====================

  // 创建快速导出配置
  createQuickConfig: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      name: z.string().min(1).max(100),
      shortcutKey: z.string().max(20).optional(),
      displayOrder: z.number().optional(),
      showInToolbar: z.boolean().optional(),
      icon: z.string().max(50).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.createQuickExportConfig(ctx.user.id, input);
    }),

  // 获取快速导出配置列表
  listQuickConfigs: protectedProcedure
    .query(async ({ ctx }) => {
      return await exportTemplateEnhancedService.getUserQuickExportConfigs(ctx.user.id);
    }),

  // 更新快速导出配置
  updateQuickConfig: protectedProcedure
    .input(z.object({
      configId: z.number(),
      data: z.object({
        name: z.string().min(1).max(100).optional(),
        shortcutKey: z.string().max(20).optional(),
        displayOrder: z.number().optional(),
        showInToolbar: z.boolean().optional(),
        icon: z.string().max(50).optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.updateQuickExportConfig(
        ctx.user.id, 
        input.configId, 
        input.data
      );
    }),

  // 删除快速导出配置
  deleteQuickConfig: protectedProcedure
    .input(z.object({
      configId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.deleteQuickExportConfig(ctx.user.id, input.configId);
    }),

  // ==================== 一键导出 ====================

  // 使用模板一键导出
  quickExport: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      questionIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.quickExportWithTemplate(
        ctx.user.id,
        input.templateId,
        input.questionIds
      );
    }),

  // 使用默认模板导出
  quickExportDefault: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const defaultTemplate = await exportTemplateEnhancedService.getDefaultExportTemplateEnhanced(ctx.user.id);
      if (!defaultTemplate) {
        return { success: false, error: '未设置默认模板' };
      }
      return await exportTemplateEnhancedService.quickExportWithTemplate(
        ctx.user.id,
        defaultTemplate.id,
        input.questionIds
      );
    }),

  // ==================== 导出历史和统计 ====================

  // 获取导出历史
  history: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return await exportTemplateEnhancedService.getUserExportHistory(ctx.user.id, input?.limit);
    }),

  // 获取导出统计
  statistics: protectedProcedure
    .query(async ({ ctx }) => {
      return await exportTemplateEnhancedService.getExportStatistics(ctx.user.id);
    }),

  // ==================== 系统管理 ====================

  // 初始化系统预设模板（管理员功能）
  initSystemPresets: protectedProcedure
    .mutation(async () => {
      await exportTemplateEnhancedService.initializeSystemPresetTemplates();
      return { success: true };
    }),
});
