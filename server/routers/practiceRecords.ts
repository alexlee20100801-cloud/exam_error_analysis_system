import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as practiceService from "../practiceService";

export const practiceRecordsRouter = router({
  // 创建练习会话
  createSession: protectedProcedure
    .input(z.object({
      practiceMode: z.enum(['random', 'chapter', 'timed', 'weakness', 'review']),
      subject: z.string().optional(),
      grade: z.string().optional(),
      totalQuestions: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sessionId = await practiceService.createPracticeSession({
        userId: ctx.user.id,
        ...input,
      });
      return { sessionId };
    }),

  // 保存练习记录（自动保存）
  saveRecord: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      questionType: z.enum(['error_question', 'practice_question']),
      userAnswer: z.string(),
      isCorrect: z.boolean(),
      timeSpent: z.number().optional(),
      practiceSessionId: z.string().optional(),
      practiceMode: z.enum(['random', 'chapter', 'timed', 'weakness', 'review']).optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      confidenceLevel: z.number().min(1).max(5).optional(),
      notes: z.string().optional(),
      knowledgePointIds: z.array(z.number()).optional(),
      subject: z.string(),
      grade: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await practiceService.savePracticeRecord({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  // 完成练习会话
  completeSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await practiceService.completePracticeSession(input.sessionId);
      return { success: true };
    }),

  // 获取练习历史
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const history = await practiceService.getPracticeHistory(ctx.user.id, input.limit);
      return history;
    }),

  // 获取练习会话详情
  getSessionDetail: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      const detail = await practiceService.getPracticeSessionDetail(input.sessionId);
      return detail;
    }),

  // 获取答题统计
  getStats: protectedProcedure
    .input(z.object({
      days: z.number().optional().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const stats = await practiceService.getUserPracticeStats(ctx.user.id, input.days);
      return stats;
    }),

  // 获取错题回顾列表
  getErrorsForReview: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const errors = await practiceService.getErrorQuestionsForReview(ctx.user.id, input.limit);
      return errors;
    }),

  // 获取学习进度
  getLearningProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const progress = await practiceService.getLearningProgress(ctx.user.id);
      return progress;
    }),
});
