import { protectedProcedure, router } from "../_core/trpc";
import { generateLearningAdvice } from "../services/aiLearningAdviceService";
import { generateICalFromReviewPlan, generateICalFileName } from "../services/icalGeneratorService";

/**
 * AI学习建议路由
 */
export const aiLearningAdviceRouter = router({
  /**
   * 生成个性化学习建议
   */
  generate: protectedProcedure.query(async ({ ctx }) => {
    const advice = await generateLearningAdvice(ctx.user.id);
    return {
      success: true,
      data: advice,
    };
  }),

  /**
   * 导出复习计划为iCal格式
   */
  exportCalendar: protectedProcedure.mutation(async ({ ctx }) => {
    const advice = await generateLearningAdvice(ctx.user.id);
    const icalContent = generateICalFromReviewPlan(advice.reviewPlan, ctx.user.name || undefined);
    const fileName = generateICalFileName(ctx.user.name || undefined);
    
    return {
      success: true,
      data: {
        content: icalContent,
        fileName: fileName,
      },
    };
  }),
});
