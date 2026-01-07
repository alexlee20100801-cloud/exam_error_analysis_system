import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as batchImageService from "../batchImageProcessingService";

export const batchImageProcessingRouter = router({
  // 批量处理已上传的文档
  batchProcess: protectedProcedure
    .input(z.object({
      documentIds: z.array(z.number()),
      operations: z.object({
        ocr: z.boolean().optional(),
        removeHandwriting: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const results = await batchImageService.batchProcessDocuments(
        input.documentIds,
        input.operations
      );
      return results;
    }),

  // 获取批量处理状态
  getStatus: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const status = await batchImageService.getBatchProcessingStatus(
        ctx.user.id,
        input.limit
      );
      return status;
    }),

  // 获取笔迹清除历史
  getRemovalHistory: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const history = await batchImageService.getHandwritingRemovalHistory(
        ctx.user.id,
        input.limit
      );
      return history;
    }),
});
