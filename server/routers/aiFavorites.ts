import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as aiFavoriteService from '../services/aiFavoriteService';

export const aiFavoritesRouter = router({
  // 添加收藏
  add: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      folderId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await aiFavoriteService.addAiFavorite(
        ctx.user.id,
        input.questionId,
        input.folderId,
        input.notes
      );
    }),

  // 取消收藏
  remove: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await aiFavoriteService.removeAiFavorite(ctx.user.id, input.questionId);
    }),

  // 检查是否已收藏
  check: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      return await aiFavoriteService.checkAiFavorite(ctx.user.id, input.questionId);
    }),

  // 批量检查收藏状态
  batchCheck: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
    }))
    .query(async ({ input, ctx }) => {
      return await aiFavoriteService.batchCheckAiFavorites(ctx.user.id, input.questionIds);
    }),

  // 获取收藏列表
  list: protectedProcedure
    .input(z.object({
      folderId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return await aiFavoriteService.getUserAiFavorites(ctx.user.id, input.folderId);
    }),

  // 更新收藏备注
  updateNotes: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      notes: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await aiFavoriteService.updateAiFavoriteNotes(
        ctx.user.id,
        input.questionId,
        input.notes
      );
    }),

  // 移动收藏到文件夹
  moveToFolder: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      targetFolderId: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await aiFavoriteService.moveAiFavoriteToFolder(
        ctx.user.id,
        input.questionId,
        input.targetFolderId
      );
    }),

  // 批量收藏
  batchAdd: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
      folderId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await aiFavoriteService.batchAddAiFavorites(
        ctx.user.id,
        input.questionIds,
        input.folderId
      );
    }),

  // 获取收藏统计
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      return await aiFavoriteService.getAiFavoriteStats(ctx.user.id);
    }),

  // 文件夹管理
  folders: router({
    // 创建文件夹
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await aiFavoriteService.createFavoriteFolder(
          ctx.user.id,
          input.name,
          input.description,
          input.color
        );
      }),

    // 更新文件夹
    update: protectedProcedure
      .input(z.object({
        folderId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { folderId, ...data } = input;
        return await aiFavoriteService.updateFavoriteFolder(ctx.user.id, folderId, data);
      }),

    // 删除文件夹
    delete: protectedProcedure
      .input(z.object({
        folderId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await aiFavoriteService.deleteFavoriteFolder(ctx.user.id, input.folderId);
      }),

    // 获取文件夹列表
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await aiFavoriteService.getUserFavoriteFolders(ctx.user.id);
      }),
  }),
});
