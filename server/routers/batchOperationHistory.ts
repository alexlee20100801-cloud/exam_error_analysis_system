import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  recordBatchOperation,
  getUserBatchOperationHistory,
  getBatchOperationDetail,
  undoBatchOperation,
  getBatchOperationStatistics,
  cleanupOldBatchOperationHistory,
} from "../services/batchOperationHistoryService";

export const batchOperationHistoryRouter = router({
  /**
   * 记录批量操作历史
   */
  recordOperation: protectedProcedure
    .input(
      z.object({
        operationType: z.enum([
          "batch_delete",
          "batch_mark_mastered",
          "batch_export",
          "batch_update_difficulty",
          "batch_add_tags",
          "batch_update_subject",
          "batch_update_grade",
        ]),
        operationDescription: z.string(),
        affectedIds: z.array(z.number()),
        beforeSnapshot: z.any().optional(),
        afterSnapshot: z.any().optional(),
        changeDetails: z.any().optional(),
        canUndo: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const operationId = await recordBatchOperation({
        userId: ctx.user.id,
        ...input,
      });

      return {
        success: true,
        operationId,
        message: "操作已记录",
      };
    }),

  /**
   * 获取用户的批量操作历史
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        operationType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const history = await getUserBatchOperationHistory(ctx.user.id, {
        operationType: input.operationType,
        limit: input.limit,
        offset: input.offset,
      });

      return history;
    }),

  /**
   * 获取批量操作详情
   */
  getDetail: protectedProcedure
    .input(
      z.object({
        operationId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const detail = await getBatchOperationDetail(input.operationId, ctx.user.id);
      return detail;
    }),

  /**
   * 撤销批量操作
   */
  undoOperation: protectedProcedure
    .input(
      z.object({
        operationId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await undoBatchOperation(input.operationId, ctx.user.id);
      return result;
    }),

  /**
   * 获取批量操作统计数据
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getBatchOperationStatistics(ctx.user.id);
    return stats;
  }),

  /**
   * 清理过期的批量操作历史
   * (仅管理员可用)
   */
  cleanup: protectedProcedure
    .input(
      z.object({
        daysToKeep: z.number().min(30).max(365).default(90),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查管理员权限
      if (ctx.user.role !== "admin") {
        throw new Error("仅管理员可以执行清理操作");
      }

      const result = await cleanupOldBatchOperationHistory(input.daysToKeep);
      return result;
    }),
});
