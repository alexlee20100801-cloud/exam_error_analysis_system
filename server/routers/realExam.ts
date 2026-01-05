import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as realExamService from "../realExamService";
import * as examPaperService from "../examPaperService";
import * as recommendationService from "../recommendationService";

export const realExamRouter = router({
  // 获取真题列表
  getRealExamQuestions: protectedProcedure
    .input(
      z.object({
        grade: z.string().optional(),
        subject: z.string().optional(),
        region: z.string().optional(),
        school: z.string().optional(),
        year: z.number().optional(),
        difficulty: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await realExamService.getRealExamQuestions(input);
    }),

  // 获取真题详情
  getRealExamQuestionById: protectedProcedure
    .input(z.object({ questionId: z.number() }))
    .query(async ({ input }) => {
      return await realExamService.getRealExamQuestionById(input.questionId);
    }),

  // 记录真题练习
  recordPractice: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        userAnswer: z.string().optional(),
        isCorrect: z.boolean().optional(),
        timeSpent: z.number().optional(),
        score: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await realExamService.recordRealExamPractice({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // 获取练习记录
  getPracticeRecords: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await realExamService.getUserRealExamPracticeRecords(
        ctx.user.id,
        input.limit
      );
    }),

  // 收藏/取消收藏真题
  toggleBookmark: protectedProcedure
    .input(z.object({ questionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await realExamService.toggleRealExamBookmark(
        ctx.user.id,
        input.questionId
      );
    }),

  // 获取收藏的真题
  getBookmarkedQuestions: protectedProcedure.query(async ({ ctx }) => {
    return await realExamService.getUserBookmarkedRealExams(ctx.user.id);
  }),

  // 获取可用的学校列表
  getAvailableSchools: protectedProcedure
    .input(z.object({ region: z.string().optional() }))
    .query(async ({ input }) => {
      return await realExamService.getAvailableSchools(input.region);
    }),

  // 获取可用的年份列表
  getAvailableYears: protectedProcedure.query(async () => {
    return await realExamService.getAvailableYears();
  }),

  // 生成AI试卷
  generateExamPaper: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        subject: z.string(),
        grade: z.string(),
        schoolLevel: z.string(),
        difficulty: z.string(),
        knowledgePointIds: z.array(z.number()).optional(),
        totalQuestions: z.number(),
        questionTypes: z
          .array(
            z.object({
              type: z.string(),
              count: z.number(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await examPaperService.generateExamPaper({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // 获取用户的试卷列表
  getExamPapers: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await examPaperService.getUserExamPapers(ctx.user.id, input.limit);
    }),

  // 获取试卷详情
  getExamPaperDetail: protectedProcedure
    .input(z.object({ paperId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await examPaperService.getExamPaperDetail(
        input.paperId,
        ctx.user.id
      );
    }),

  // 提交试卷答案
  submitExamPaper: protectedProcedure
    .input(
      z.object({
        paperId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            userAnswer: z.string(),
          })
        ),
        timeSpent: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await examPaperService.submitExamPaper({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // 获取智能推荐的真题
  getRecommendedQuestions: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(async ({ ctx, input }) => {
      return await recommendationService.getRecommendedRealExams(
        ctx.user.id,
        input.limit
      );
    }),

  // 获取推荐统计信息
  getRecommendationStats: protectedProcedure.query(async ({ ctx }) => {
    return await recommendationService.getRecommendationStats(ctx.user.id);
  }),

  // 使用AI生成题目
  generateQuestionsWithAI: protectedProcedure
    .input(
      z.object({
        subject: z.string(),
        grade: z.string(),
        knowledgePoints: z.array(z.string()),
        difficulty: z.string(),
        count: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await examPaperService.generateQuestionsWithAI(input);
    }),
});
