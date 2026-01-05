import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getExplanationScript, generateVoiceExplanation } from "../voiceExplanationService";

export const voiceExplanationRouter = router({
  /**
   * 获取错题的AI语音讲解稿
   */
  getScript: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { errorQuestionId } = input;

      try {
        const script = await getExplanationScript(errorQuestionId);

        if (!script) {
          throw new Error("获取讲解稿失败");
        }

        return {
          success: true,
          script,
        };
      } catch (error) {
        console.error("获取语音讲解稿失败:", error);
        throw new Error("获取讲解稿失败");
      }
    }),

  /**
   * 生成错题的AI语音讲解
   */
  generate: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { errorQuestionId } = input;

      try {
        const result = await generateVoiceExplanation(errorQuestionId);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        console.error("生成语音讲解失败:", error);
        throw new Error("生成讲解失败");
      }
    }),
});
