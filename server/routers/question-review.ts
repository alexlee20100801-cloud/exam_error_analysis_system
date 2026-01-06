import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as reviewService from "../services/questionReviewService";

/**
 * 题目审核路由
 */

// 管理员权限验证
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有管理员可以访问此功能",
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
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        subject: z.string().optional(),
        grade: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await reviewService.getPendingQuestions(input);
    }),

  /**
   * 获取题目详情（包含审核历史）
   */
  getQuestionWithHistory: adminProcedure
    .input(
      z.object({
        questionId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await reviewService.getQuestionWithReviewHistory(
        input.questionId
      );
    }),

  /**
   * 提交审核
   */
  submitReview: adminProcedure
    .input(
      z.object({
        questionId: z.number(),
        status: z.enum(["approved", "rejected", "needs_revision"]),
        scores: z
          .object({
            accuracy: z.number().min(1).max(5).optional(),
            difficulty: z.number().min(1).max(5).optional(),
            clarity: z.number().min(1).max(5).optional(),
            discrimination: z.number().min(1).max(5).optional(),
          })
          .optional(),
        notes: z.string().optional(),
        suggestions: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await reviewService.submitReview({
        questionId: input.questionId,
        reviewerId: ctx.user.id,
        reviewerName: ctx.user.name || "",
        status: input.status,
        scores: input.scores,
        notes: input.notes,
        suggestions: input.suggestions,
      });
    }),

  /**
   * 批量审核
   */
  batchReview: adminProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()).min(1).max(100),
        status: z.enum(["approved", "rejected"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await reviewService.batchReview({
        questionIds: input.questionIds,
        reviewerId: ctx.user.id,
        reviewerName: ctx.user.name || "",
        status: input.status,
        notes: input.notes,
      });
    }),

  /**
   * 获取审核统计
   */
  getStats: adminProcedure.query(async () => {
    return await reviewService.getReviewStats();
  }),

  /**
   * 获取审核历史
   */
  getReviewHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        reviewerId: z.number().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await reviewService.getReviewHistory(input);
    }),

  /**
   * 撤销审核
   */
  revokeReview: adminProcedure
    .input(
      z.object({
        questionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await reviewService.revokeReview(input.questionId);
    }),
});
