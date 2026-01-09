import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addToFavorites,
  removeFromFavorites,
  isFavorited,
  checkFavoritesStatus,
  getFavorites,
  getFavoriteStats,
} from "../services/favoriteService";
import { exportFavorites } from "../services/favoriteExportService";

/**
 * 收藏路由
 */
export const favoritesRouter = router({
  /**
   * 添加收藏
   */
  add: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        questionType: z.enum(["error_question", "practice_question", "question"]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await addToFavorites(
        // @ts-ignore
        ctx.user.id,
        input.questionId,
        input.questionType,
        input.note
      );
      return result;
    }),

  /**
   * 取消收藏
   */
  remove: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        questionType: z.enum(["error_question", "practice_question", "question"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await removeFromFavorites(
        // @ts-ignore
        ctx.user.id,
        input.questionId,
        input.questionType
      );
      return result;
    }),

  /**
   * 检查是否已收藏
   */
  isFavorited: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        questionType: z.enum(["error_question", "practice_question", "question"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const favorited = await isFavorited(
        // @ts-ignore
        ctx.user.id,
        input.questionId,
        input.questionType
      );
      return {
        success: true,
        favorited,
      };
    }),

  /**
   * 批量检查收藏状态
   */
  checkStatus: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            questionId: z.number(),
            questionType: z.enum(["error_question", "practice_question", "question"]),
          })
        ),
      })
    )
    .query(async ({ ctx, input }) => {
      // @ts-ignore
      const status = await checkFavoritesStatus(ctx.user.id, input.items);
      return {
        success: true,
        status,
      };
    }),

  /**
   * 获取收藏列表
   */
  list: protectedProcedure
    .input(
      z.object({
        questionType: z.enum(["error_question", "practice_question", "question"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // @ts-ignore
      const favorites = await getFavorites(ctx.user.id, input.questionType);
      return {
        success: true,
        favorites,
      };
    }),

  /**
   * 获取收藏统计
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getFavoriteStats(ctx.user.id);
    return {
      success: true,
      stats,
    };
  }),

  /**
   * 导出收藏题目
   */
  export: protectedProcedure
    .input(
      z.object({
        format: z.enum(["pdf", "word"]),
        questionType: z.enum(["error_question", "practice_question", "question"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = await exportFavorites({
        // @ts-ignore
        userId: ctx.user.id,
        format: input.format,
        questionType: input.questionType,
      });

      // 返回base64编码的文件数据
      return {
        success: true,
        data: buffer.toString("base64"),
        filename: `我的题库_${new Date().toISOString().split("T")[0]}.${input.format === "pdf" ? "pdf" : "docx"}`,
      };
    }),
});
