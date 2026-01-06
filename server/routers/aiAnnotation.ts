import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as aiAnnotationService from "../services/aiAnnotationService";
import * as enhancedAiAnnotationService from "../services/enhancedAiAnnotationService";

export const aiAnnotationRouter = router({
  // 生成AI标注建议
  generateSuggestions: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
        subject: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await aiAnnotationService.generateAnnotationSuggestions(
        input.imageUrl,
        input.subject
      );
    }),

  // 识别关键点
  detectKeyPoints: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
        chartType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const keyPoints = await aiAnnotationService.detectKeyPoints(
        input.imageUrl,
        input.chartType
      );
      const annotations = aiAnnotationService.convertKeyPointsToAnnotations(keyPoints);
      return {
        keyPoints,
        annotations,
      };
    }),

  // 生成增强的AI标注建议（集成图表类型识别）
  generateEnhancedSuggestions: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
        subject: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await enhancedAiAnnotationService.generateEnhancedAnnotationSuggestions(
        input.imageUrl,
        input.subject
      );
    }),

  // 生成二次函数专用标注
  generateQuadraticAnnotations: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await enhancedAiAnnotationService.generateQuadraticFunctionAnnotations(
        input.imageUrl
      );
    }),

  // 生成三角函数专用标注
  generateTrigonometricAnnotations: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await enhancedAiAnnotationService.generateTrigonometricFunctionAnnotations(
        input.imageUrl
      );
    }),
});
