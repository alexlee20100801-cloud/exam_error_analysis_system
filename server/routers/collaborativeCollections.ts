import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as collaborativeCollectionService from "../collaborativeCollectionService";

export const collaborativeCollectionsRouter = router({
  /**
   * 创建协作错题集
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        visibility: z.enum(["private", "public", "link"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const collectionId = await collaborativeCollectionService.createCollection({
        name: input.name,
        description: input.description,
        ownerId: ctx.user.id,
        visibility: input.visibility,
      });
      return { collectionId };
    }),

  /**
   * 获取用户的协作错题集列表
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await collaborativeCollectionService.getUserCollections(ctx.user.id);
  }),

  /**
   * 获取协作错题集详情
   */
  detail: protectedProcedure
    .input(z.object({ collectionId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await collaborativeCollectionService.getCollectionDetail(
        input.collectionId,
        ctx.user.id
      );
    }),

  /**
   * 更新协作错题集信息
   */
  update: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        visibility: z.enum(["private", "public", "link"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.updateCollection({
        collectionId: input.collectionId,
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        visibility: input.visibility,
      });
    }),

  /**
   * 邀请成员
   */
  inviteMember: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        inviteeId: z.number(),
        role: z.enum(["editor", "viewer"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.inviteMember({
        collectionId: input.collectionId,
        inviterId: ctx.user.id,
        inviteeId: input.inviteeId,
        role: input.role,
      });
    }),

  /**
   * 更新成员角色
   */
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        memberId: z.number(),
        newRole: z.enum(["editor", "viewer"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.updateMemberRole({
        collectionId: input.collectionId,
        operatorId: ctx.user.id,
        memberId: input.memberId,
        newRole: input.newRole,
      });
    }),

  /**
   * 移除成员
   */
  removeMember: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.removeMember({
        collectionId: input.collectionId,
        operatorId: ctx.user.id,
        memberId: input.memberId,
      });
    }),

  /**
   * 添加错题到协作错题集
   */
  addQuestion: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        questionId: z.number(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.addQuestionToCollection({
        collectionId: input.collectionId,
        questionId: input.questionId,
        userId: ctx.user.id,
        note: input.note,
      });
    }),

  /**
   * 从协作错题集移除错题
   */
  removeQuestion: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        questionId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.removeQuestionFromCollection({
        collectionId: input.collectionId,
        questionId: input.questionId,
        userId: ctx.user.id,
      });
    }),

  /**
   * 获取评论列表
   */
  getComments: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        questionId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await collaborativeCollectionService.getComments({
        collectionId: input.collectionId,
        questionId: input.questionId,
        userId: ctx.user.id,
      });
    }),

  /**
   * 添加评论
   */
  addComment: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        content: z.string().min(1),
        questionId: z.number().optional(),
        parentId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.addComment({
        collectionId: input.collectionId,
        userId: ctx.user.id,
        content: input.content,
        questionId: input.questionId,
        parentId: input.parentId,
      });
    }),

  /**
   * 删除评论
   */
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.deleteComment({
        commentId: input.commentId,
        userId: ctx.user.id,
      });
    }),

  /**
   * 点赞评论
   */
  likeComment: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await collaborativeCollectionService.likeComment({
        commentId: input.commentId,
        userId: ctx.user.id,
      });
    }),

  /**
   * 获取活动日志
   */
  getActivities: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await collaborativeCollectionService.getActivities({
        collectionId: input.collectionId,
        userId: ctx.user.id,
        limit: input.limit,
      });
    }),
});
