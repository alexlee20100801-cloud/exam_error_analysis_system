import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import * as reviewService from '../services/questionReviewService';

/**
 * 管理员权限检查中间件
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '需要管理员权限',
    });
  }
  return next({ ctx });
});

export const questionReviewRouter = router({
  /**
   * 获取待审核题目列表
   */
  getPendingQuestions: adminProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        grade: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await reviewService.getPendingQuestions(input);
    }),

  /**
   * 获取题目详情
   */
  getQuestionDetail: adminProcedure
    .input(
      z.object({
        questionId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const detail = await reviewService.getQuestionDetail(input.questionId);
      if (!detail) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '题目不存在',
        });
      }
      return detail;
    }),

  /**
   * 审核题目
   */
  reviewQuestion: adminProcedure
    .input(
      z.object({
        questionId: z.number(),
        action: z.enum(['approve', 'reject', 'request_revision']),
        notes: z.string().optional(),
        modifiedFields: z
          .array(
            z.object({
              field: z.string(),
              oldValue: z.string(),
              newValue: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await reviewService.reviewQuestion({
        ...input,
        reviewerId: ctx.user.id,
      });
    }),

  /**
   * 修改题目内容
   */
  modifyQuestion: adminProcedure
    .input(
      z.object({
        questionId: z.number(),
        updates: z.object({
          title: z.string().optional(),
          content: z.string().optional(),
          answer: z.string().optional(),
          explanation: z.string().optional(),
          difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
          knowledgePointIds: z.array(z.number()).optional(),
        }),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await reviewService.modifyQuestion({
        ...input,
        reviewerId: ctx.user.id,
      });
    }),

  /**
   * 批量审核题目
   */
  batchReview: adminProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()),
        action: z.enum(['approve', 'reject', 'request_revision']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await reviewService.batchReviewQuestions({
        ...input,
        reviewerId: ctx.user.id,
      });
    }),

  /**
   * 获取审核统计
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    return await reviewService.getReviewStats(ctx.user.id);
  }),

  /**
   * 获取已审核题目列表
   */
  getReviewedQuestions: adminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'needs_revision']).optional(),
        subject: z.string().optional(),
        grade: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await reviewService.getReviewedQuestions({
        ...input,
        reviewerId: ctx.user.id,
      });
    }),
});
