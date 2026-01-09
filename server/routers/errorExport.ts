import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  exportErrorQuestionsToPdf,
  getFilteredErrorQuestions,
} from "../errorExportService";
import { readFile } from "fs/promises";

export const errorExportRouter = router({
  /**
   * 预览筛选结果（返回符合条件的错题数量和前几道题目）
   */
  previewExport: protectedProcedure
    .input(
      z.object({
        subjects: z.array(z.string()).optional(),
        grades: z.array(z.string()).optional(),
        knowledgePointIds: z.array(z.number()).optional(),
        difficulties: z.array(z.string()).optional(),
        isMastered: z.boolean().optional(),
        errorQuestionIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const questions = await getFilteredErrorQuestions({
        // @ts-ignore
        userId: ctx.user.id,
        ...input,
      });

      return {
        totalCount: questions.length,
        preview: questions.slice(0, 5).map((q: any) => ({
          id: q.id,
          title: q.title,
          subject: q.subject,
          grade: q.grade,
        })),
      };
    }),

  /**
   * 导出错题为PDF
   */
  exportToPdf: protectedProcedure
    .input(
      z.object({
        // 筛选条件
        subjects: z.array(z.string()).optional(),
        grades: z.array(z.string()).optional(),
        knowledgePointIds: z.array(z.number()).optional(),
        difficulties: z.array(z.string()).optional(),
        isMastered: z.boolean().optional(),
        errorQuestionIds: z.array(z.number()).optional(),
        // 导出选项
        includeAnswer: z.boolean().default(true),
        includeExplanation: z.boolean().default(true),
        includeAnalysis: z.boolean().default(true),
        includeNotes: z.boolean().default(true),
        includeImage: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const {
          subjects,
          grades,
          knowledgePointIds,
          difficulties,
          isMastered,
          errorQuestionIds,
          includeAnswer,
          includeExplanation,
          includeAnalysis,
          includeNotes,
          includeImage,
        } = input;

        // 生成PDF
        const pdfPath = await exportErrorQuestionsToPdf(
          {
            // @ts-ignore
            userId: ctx.user.id,
            subjects,
            grades,
            knowledgePointIds,
            difficulties,
            isMastered,
            errorQuestionIds,
          },
          {
            includeAnswer,
            includeExplanation,
            includeAnalysis,
            includeNotes,
            includeImage,
          }
        );

        // 读取PDF文件内容
        const pdfBuffer = await readFile(pdfPath);
        const base64Pdf = pdfBuffer.toString("base64");

        // 返回base64编码的PDF
        return {
          success: true,
          pdfData: base64Pdf,
          filename: `错题集_${new Date().toLocaleDateString("zh-CN")}.pdf`,
        };
      } catch (error: any) {
        console.error("导出PDF失败:", error);
        return {
          success: false,
          error: error.message || "导出失败",
        };
      }
    }),
});
