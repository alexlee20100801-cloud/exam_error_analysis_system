import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { recommendSimilarQuestions } from '../similarQuestionService';
import { getErrorQuestionById, getPracticePoolById, getRealExamQuestionById } from '../db';

export const comparisonLearningRouter = router({
  // 获取相似错题用于对比学习
  getSimilarErrorQuestions: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      limit: z.number().optional().default(5),
    }))
    .query(async ({ ctx, input }) => {
      const sourceQuestion = await getErrorQuestionById(input.questionId);
      if (!sourceQuestion) {
        return [];
      }

      const similarQuestions = await recommendSimilarQuestions(
        input.questionId,
        ctx.user.id as any,
        input.limit
      );

      return similarQuestions.map(q => ({
        id: q.id,
        title: q.title,
        content: q.content,
        subject: q.subject,
        difficulty: q.difficulty,
        knowledgePoints: [], // 可以从knowledgePointIds获取
        similarityScore: q.similarity,
        similarityReason: q.reason,
      }));
    }),

  // 获取批量题目用于对比学习
  getBatchQuestionsForComparison: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
      type: z.enum(['error_question', 'practice_pool', 'real_exam']),
    }))
    .query(async ({ ctx, input }) => {
      const questions = await Promise.all(
        input.questionIds.map(async (id) => {
          switch (input.type) {
            case 'error_question':
              return await getErrorQuestionById(id);
            case 'practice_pool':
              return await getPracticePoolById(id);
            case 'real_exam':
              return await getRealExamQuestionById(id);
            default:
              return null;
          }
        })
      );

      return questions.filter(q => q !== null).map(q => ({
        id: q!.id,
        title: q!.title,
        content: q!.content,
        subject: q!.subject,
        difficulty: q!.difficulty,
        knowledgePoints: [], // 可以从knowledgePointIds获取
        imageUrl: (q as any).imageUrl,
      }));
    }),
});
