import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as aiAnnotationService from "../services/aiAnnotationService";

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
});
