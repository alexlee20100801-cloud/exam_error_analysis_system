import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as collaborativeService from "../services/collaborativeLearningService";

export const collaborativeLearningRouter = router({
  // 分享标注
  shareAnnotation: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        imageUrl: z.string(),
        annotations: z.array(z.any()),
        subject: z.string(),
        grade: z.string(),
        isPublic: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await collaborativeService.shareAnnotation({
        ...input,
        userId: ctx.user.id,
      });
    }),

  // 获取分享的标注列表
  getSharedAnnotations: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        grade: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await collaborativeService.getSharedAnnotations(input);
    }),

  // 获取单个分享标注详情
  getSharedAnnotationById: protectedProcedure
    .input(z.object({ annotationId: z.number() }))
    .query(async ({ input }) => {
      return await collaborativeService.getSharedAnnotationById(
        input.annotationId
      );
    }),

  // 点赞标注
  likeAnnotation: protectedProcedure
    .input(z.object({ annotationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await collaborativeService.likeAnnotation(
        input.annotationId,
        ctx.user.id
      );
    }),

  // 取消点赞
  unlikeAnnotation: protectedProcedure
    .input(z.object({ annotationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await collaborativeService.unlikeAnnotation(
        input.annotationId,
        ctx.user.id
      );
    }),

  // 检查是否已点赞
  checkUserLike: protectedProcedure
    .input(z.object({ annotationId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await collaborativeService.checkUserLike(
        input.annotationId,
        ctx.user.id
      );
    }),

  // 添加评论
  addComment: protectedProcedure
    .input(
      z.object({
        sharedAnnotationId: z.number(),
        content: z.string(),
        parentCommentId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await collaborativeService.addComment({
        ...input,
        userId: ctx.user.id,
      });
    }),

  // 获取评论列表
  getComments: protectedProcedure
    .input(z.object({ annotationId: z.number() }))
    .query(async ({ input }) => {
      return await collaborativeService.getComments(input.annotationId);
    }),

  // 删除评论
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await collaborativeService.deleteComment(
        input.commentId,
        ctx.user.id
      );
    }),

  // 获取用户标注统计
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    return await collaborativeService.getUserAnnotationStats(ctx.user.id);
  }),
});
