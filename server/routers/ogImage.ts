import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateQuestionOGImage, generateReportOGImage } from "../ogImageService";
import { db } from "../db";
import { errorQuestions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * OG图片生成路由器
 * 为错题和学习报告生成Open Graph预览图片
 */
export const ogImageRouter = router({
  /**
   * 生成错题OG图片
   */
  generateQuestionImage: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 获取错题数据
      const question = await db.query.errorQuestions.findFirst({
        where: eq(errorQuestions.id, input.questionId),
        with: {
          knowledgePoints: true,
        },
      });

      if (!question) {
        throw new Error('错题不存在');
      }

      // 生成OG图片
      const imageUrl = await generateQuestionOGImage({
        id: question.id,
        subject: question.subject,
        difficulty: question.difficulty || 'medium',
        content: question.content || undefined,
        knowledgePoints: question.knowledgePoints?.map((kp: any) => kp.name) || [],
      });

      return {
        imageUrl,
      };
    }),

  /**
   * 生成学习报告OG图片
   */
  generateReportImage: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;

      // 获取学习统计数据
      const questions = await db.query.errorQuestions.findMany({
        where: eq(errorQuestions.userId, userId),
      });

      const totalQuestions = questions.length;
      const masteredCount = questions.filter((q: any) => q.masteryLevel === 'mastered').length;
      const weaknessCount = questions.filter((q: any) => q.masteryLevel === 'not_started' || q.masteryLevel === 'struggling').length;

      // 计算学习时长（简化版，实际应从学习记录表获取）
      const studyTime = totalQuestions * 10; // 假设每题平均10分钟

      // 生成OG图片
      const imageUrl = await generateReportOGImage({
        userId,
        totalQuestions,
        masteredCount,
        weaknessCount,
        studyTime,
      });

      return {
        imageUrl,
      };
    }),
});
