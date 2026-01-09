import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { recommendSimilarQuestions } from "../similarQuestionService";

export const similarQuestionsRouter = router({
  /**
   * 获取相似题目推荐
   */
  getSimilar: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const similarQuestions = await recommendSimilarQuestions(
        input.questionId,
        // @ts-ignore
        ctx.user.id,
        input.limit
      );

      return {
        success: true,
        questions: similarQuestions,
      };
    }),
});
