import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { exportErrorQuestionsEnhanced } from "../enhancedExportService";
import { readFile, unlink } from "fs/promises";

/**
 * 增强导出路由 - 支持Word/PDF双格式、A4布局、AI美化
 */
export const enhancedExportRouter = router({
  /**
   * 导出错题（增强版）
   */
  exportErrorQuestions: protectedProcedure
    .input(
      z.object({
        format: z.enum(['word', 'pdf']),
        errorQuestionIds: z.array(z.number()).optional(),
        subjects: z.array(z.string()).optional(),
        grades: z.array(z.string()).optional(),
        knowledgePointIds: z.array(z.number()).optional(),
        difficulties: z.array(z.string()).optional(),
        isMastered: z.boolean().optional(),
        includeAnswer: z.boolean().default(true),
        includeExplanation: z.boolean().default(true),
        includeAnalysis: z.boolean().default(true),
        includeNotes: z.boolean().default(true),
        includeImage: z.boolean().default(true),
        pageSize: z.enum(['A4', 'Letter']).default('A4'),
        enableAILayout: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const filePath = await exportErrorQuestionsEnhanced(
          {
            // @ts-ignore
            userId: ctx.user.id,
            errorQuestionIds: input.errorQuestionIds,
            subjects: input.subjects,
            grades: input.grades,
            knowledgePointIds: input.knowledgePointIds,
            difficulties: input.difficulties,
            isMastered: input.isMastered,
          },
          {
            format: input.format,
            includeAnswer: input.includeAnswer,
            includeExplanation: input.includeExplanation,
            includeAnalysis: input.includeAnalysis,
            includeNotes: input.includeNotes,
            includeImage: input.includeImage,
            pageSize: input.pageSize,
            enableAILayout: input.enableAILayout,
          }
        );

        // 读取文件内容
        const fileBuffer = await readFile(filePath);
        const base64 = fileBuffer.toString('base64');

        // 删除临时文件
        await unlink(filePath);

        return {
          success: true,
          fileData: base64,
          fileName: `错题集_${new Date().toLocaleDateString('zh-CN')}.${input.format === 'pdf' ? 'pdf' : 'docx'}`,
          mimeType: input.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
      } catch (error) {
        console.error('[EnhancedExport] 导出失败:', error);
        throw new Error(error instanceof Error ? error.message : '导出失败');
      }
    }),
});
