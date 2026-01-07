import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as exportTemplateService from '../services/exportTemplateService';
import {
  getQuestionsWithDetails,
  generateErrorBookTemplate,
  generateReviewCardTemplate,
  generateDetailedAnalysisTemplate
} from '../exportTemplateService';

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

  // 批量导出（使用自定义模板）
  batchExport: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()),
        templateId: z.number(),
        format: z.enum(['word', 'pdf', 'markdown']).default('word'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const questions = await getQuestionsWithDetails(input.questionIds);

        if (questions.length === 0) {
          return {
            success: false,
            error: '没有找到题目'
          };
        }

        // 获取模板
        const template = await exportTemplateService.getExportTemplate(ctx.user.id, input.templateId);
        if (!template) {
          return {
            success: false,
            error: '模板不存在'
          };
        }

        // 生成内容（使用错题本模板格式作为基础）
        const content = generateErrorBookTemplate(questions);
        const timestamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
        const filename = `${template.name}_${timestamp}.${input.format === 'word' ? 'docx' : input.format}`;

        // 这里返回markdown内容，前端可以根据format进行转换
        // 实际生产环境中，应该在服务端完成格式转换
        return {
          success: true,
          content,
          filename,
          format: input.format,
          downloadUrl: `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`
        };
      } catch (error: any) {
        console.error('批量导出失败:', error);
        return {
          success: false,
          error: error.message || '导出失败'
        };
      }
    }),

  // 使用快捷模板导出
  exportWithTemplate: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()),
        template: z.enum(['error_book', 'review_card', 'detailed_analysis'])
      })
    )
    .mutation(async ({ input }) => {
      try {
        const questions = await getQuestionsWithDetails(input.questionIds);

        if (questions.length === 0) {
          return {
            success: false,
            error: '没有找到题目'
          };
        }

        let content: string;
        let filename: string;

        switch (input.template) {
          case 'error_book':
            content = generateErrorBookTemplate(questions);
            filename = `错题本_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.md`;
            break;
          case 'review_card':
            content = generateReviewCardTemplate(questions);
            filename = `复习卡片_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.md`;
            break;
          case 'detailed_analysis':
            content = generateDetailedAnalysisTemplate(questions);
            filename = `详细分析_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.md`;
            break;
          default:
            return {
              success: false,
              error: '未知的模板类型'
            };
        }

        return {
          success: true,
          content,
          filename,
          format: 'markdown'
        };
      } catch (error: any) {
        console.error('导出失败:', error);
        return {
          success: false,
          error: error.message || '导出失败'
        };
      }
    }),
});
