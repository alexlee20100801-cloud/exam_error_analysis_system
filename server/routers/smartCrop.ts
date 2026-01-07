/**
 * 智能框选路由
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { detectQuestionAreas, optimizeCropAreas, recommendCropStrategy } from '../smartCropService';

export const smartCropRouter = router({
  /**
   * AI智能检测题目区域
   */
  detectAreas: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        optimize: z.boolean().optional().default(true), // 是否优化框选区域
      })
    )
    .mutation(async ({ input }) => {
      const result = await detectQuestionAreas(input.imageUrl);

      // 如果需要优化，合并重叠区域
      if (input.optimize && result.areas.length > 0) {
        result.areas = optimizeCropAreas(result.areas);
      }

      // 添加框选策略建议
      if (result.questionType) {
        result.suggestions = recommendCropStrategy(result.questionType);
      }

      return result;
    }),

  /**
   * 优化框选区域
   */
  optimizeAreas: protectedProcedure
    .input(
      z.object({
        areas: z.array(
          z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
            label: z.string(),
            confidence: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const optimized = optimizeCropAreas(input.areas);
      return { areas: optimized };
    }),

  /**
   * 获取框选策略建议
   */
  getStrategy: protectedProcedure
    .input(
      z.object({
        questionType: z.enum(['choice', 'fill', 'answer', 'mixed']),
      })
    )
    .query(({ input }) => {
      const strategy = recommendCropStrategy(input.questionType);
      return { strategy };
    }),
});
