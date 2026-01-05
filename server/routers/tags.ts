import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createTag,
  getUserTags,
  updateTag,
  deleteTag,
  addTagToErrorQuestion,
  removeTagFromErrorQuestion,
  getErrorQuestionTags,
  batchAddTags,
  batchRemoveTags,
  getErrorQuestionsByTags,
} from "../tagService";
import { getUserByOpenId } from "../db";

export const tagsRouter = router({
  // 创建标签
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        color: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user) throw new Error("User not found");

      await createTag(user.id, input);
      return { success: true };
    }),

  // 获取用户的所有标签
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserByOpenId(ctx.user.openId);
    if (!user) throw new Error("User not found");

    const tags = await getUserTags(user.id);
    return tags;
  }),

  // 更新标签
  update: protectedProcedure
    .input(
      z.object({
        tagId: z.number(),
        name: z.string().min(1).max(50).optional(),
        color: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user) throw new Error("User not found");

      await updateTag(input.tagId, user.id, {
        name: input.name,
        color: input.color,
        description: input.description,
      });
      return { success: true };
    }),

  // 删除标签
  delete: protectedProcedure
    .input(
      z.object({
        tagId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user) throw new Error("User not found");

      await deleteTag(input.tagId, user.id);
      return { success: true };
    }),

  // 为错题添加标签
  addToErrorQuestion: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
        tagId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await addTagToErrorQuestion(input.errorQuestionId, input.tagId);
      return { success: true };
    }),

  // 从错题移除标签
  removeFromErrorQuestion: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
        tagId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await removeTagFromErrorQuestion(input.errorQuestionId, input.tagId);
      return { success: true };
    }),

  // 获取错题的所有标签
  getErrorQuestionTags: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const tags = await getErrorQuestionTags(input.errorQuestionId);
      return tags;
    }),

  // 批量为错题添加标签
  batchAdd: protectedProcedure
    .input(
      z.object({
        errorQuestionIds: z.array(z.number()),
        tagIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      await batchAddTags(input.errorQuestionIds, input.tagIds);
      return { success: true };
    }),

  // 批量移除错题的标签
  batchRemove: protectedProcedure
    .input(
      z.object({
        errorQuestionIds: z.array(z.number()),
        tagIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      await batchRemoveTags(input.errorQuestionIds, input.tagIds);
      return { success: true };
    }),

  // 按标签筛选错题
  filterByTags: protectedProcedure
    .input(
      z.object({
        tagIds: z.array(z.number()),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user) throw new Error("User not found");

      const questions = await getErrorQuestionsByTags(user.id, input.tagIds);
      return questions;
    }),
});
