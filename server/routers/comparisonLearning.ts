import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { invokeLLM } from '../_core/llm';
import { recommendSimilarQuestions } from '../similarQuestionService';
import { getErrorQuestionById, getPracticePoolById, getRealExamQuestionById } from '../db';

export const comparisonLearningRouter = router({
  // 生成对比分析
  analyze: protectedProcedure
    .input(z.object({
      chartIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 获取所有图表题目
      const questions = await Promise.all(
        input.chartIds.map(id => getErrorQuestionById(id))
      );

      const validQuestions = questions.filter(q => q !== null);

      if (validQuestions.length < 2) {
        throw new Error('至少需要2个题目才能进行对比分析');
      }

      // 构建对比分析提示词
      const prompt = `你是一个专业的教育分析师。请对以下${validQuestions.length}个题目进行深入的对比分析：

${validQuestions.map((q, i) => `
### 题目 ${i + 1}
**标题**: ${q!.title}
**内容**: ${q!.content}
**科目**: ${q!.subject}
**难度**: ${q!.difficulty}
`).join('\n')}

请从以下角度进行对比分析：
1. **知识点对比**: 分析每个题目涉及的知识点的异同
2. **难度对比**: 分析难度差异及原因
3. **解题思路对比**: 分析不同的解题方法和技巧
4. **常见错误对比**: 分析学生可能犯的不同错误
5. **学习建议**: 给出针对性的学习建议

请用Markdown格式输出，内容详实、深入、易于理解。`;

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: '你是一个专业的教育分析师，擅长对比分析不同题目的异同点和共同点。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const analysis = response.choices[0]?.message?.content || '分析失败';

      return { analysis };
    }),

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
