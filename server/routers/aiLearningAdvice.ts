import { protectedProcedure, router } from "../_core/trpc";
import { generateLearningAdvice } from "../services/aiLearningAdviceService";

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
});
