import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getErrorQuestionsByUserId, getErrorQuestionById } from "../db";
import { generateEnhancedWordDocument, generateEnhancedPdfDocument, ExportOptions, PAPER_SIZES } from "../services/enhancedExportService";
import { storagePut } from "../storage";

export const advancedExportRouter = router({
  /**
   * 获取支持的纸张大小列表
   */
  getPaperSizes: protectedProcedure.query(() => {
    return {
      sizes: Object.keys(PAPER_SIZES).map(key => ({
        value: key,
        label: key,
      })),
    };
  }),

  /**
   * 使用高级选项导出Word文档
   */
  exportWordWithOptions: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()).optional(),
        options: z.object({
          header: z.object({
            enabled: z.boolean(),
            leftText: z.string().optional(),
            centerText: z.string().optional(),
            rightText: z.string().optional(),
          }).optional(),
          footer: z.object({
            enabled: z.boolean(),
            leftText: z.string().optional(),
            centerText: z.string().optional(),
            rightText: z.string().optional(),
            showPageNumber: z.boolean().optional(),
          }).optional(),
          watermark: z.object({
            enabled: z.boolean(),
            text: z.string().optional(),
            imageUrl: z.string().optional(),
            opacity: z.number().optional(),
            fontSize: z.number().optional(),
            rotation: z.number().optional(),
          }).optional(),
          paperSize: z.enum(["A4", "A5", "Letter", "Legal"]).optional(),
          margins: z.object({
            top: z.number().optional(),
            bottom: z.number().optional(),
            left: z.number().optional(),
            right: z.number().optional(),
          }).optional(),
          font: z.object({
            name: z.string().optional(),
            size: z.number().optional(),
          }).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let errorQuestions;

      if (input.questionIds && input.questionIds.length > 0) {
        // 导出指定的错题
        errorQuestions = [];
        for (const questionId of input.questionIds) {
          const question = await getErrorQuestionById(questionId);
          if (question && question.userId === ctx.user.id) {
            errorQuestions.push(question);
          }
        }
      } else {
        // 导出所有错题
        errorQuestions = await getErrorQuestionsByUserId(ctx.user.id);
      }

      if (errorQuestions.length === 0) {
        throw new Error("没有可导出的错题");
      }

      // 生成Word文档
      const buffer = await generateEnhancedWordDocument(
        errorQuestions,
        ctx.user.name || "学生",
        input.options as ExportOptions
      );

      // 上传到S3
      const randomSuffix = Math.random().toString(36).substring(2, 15);
      const fileKey = `exports/${ctx.user.id}/${Date.now()}-${randomSuffix}.docx`;

      const { url } = await storagePut(fileKey, buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

      return {
        success: true,
        url,
        filename: `错题本_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.docx`,
      };
    }),

  /**
   * 使用高级选项导出PDF文档
   */
  exportPdfWithOptions: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()).optional(),
        options: z.object({
          header: z.object({
            enabled: z.boolean(),
            leftText: z.string().optional(),
            centerText: z.string().optional(),
            rightText: z.string().optional(),
          }).optional(),
          footer: z.object({
            enabled: z.boolean(),
            leftText: z.string().optional(),
            centerText: z.string().optional(),
            rightText: z.string().optional(),
            showPageNumber: z.boolean().optional(),
          }).optional(),
          watermark: z.object({
            enabled: z.boolean(),
            text: z.string().optional(),
            imageUrl: z.string().optional(),
            opacity: z.number().optional(),
            fontSize: z.number().optional(),
            rotation: z.number().optional(),
          }).optional(),
          paperSize: z.enum(["A4", "A5", "Letter", "Legal"]).optional(),
          margins: z.object({
            top: z.number().optional(),
            bottom: z.number().optional(),
            left: z.number().optional(),
            right: z.number().optional(),
          }).optional(),
          font: z.object({
            name: z.string().optional(),
            size: z.number().optional(),
          }).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let errorQuestions;

      if (input.questionIds && input.questionIds.length > 0) {
        // 导出指定的错题
        errorQuestions = [];
        for (const questionId of input.questionIds) {
          const question = await getErrorQuestionById(questionId);
          if (question && question.userId === ctx.user.id) {
            errorQuestions.push(question);
          }
        }
      } else {
        // 导出所有错题
        errorQuestions = await getErrorQuestionsByUserId(ctx.user.id);
      }

      if (errorQuestions.length === 0) {
        throw new Error("没有可导出的错题");
      }

      // 生成PDF文档
      const buffer = await generateEnhancedPdfDocument(
        errorQuestions,
        ctx.user.name || "学生",
        input.options as ExportOptions
      );

      // 上传到S3
      const randomSuffix = Math.random().toString(36).substring(2, 15);
      const fileKey = `exports/${ctx.user.id}/${Date.now()}-${randomSuffix}.pdf`;

      const { url } = await storagePut(fileKey, buffer, "application/pdf");

      return {
        success: true,
        url,
        filename: `错题本_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.pdf`,
      };
    }),
});
