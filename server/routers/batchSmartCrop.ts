import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createBatchCropTask,
  executeBatchCropTask,
  getUserBatchCropTasks,
  getBatchCropTaskById,
  deleteBatchCropTask,
} from "../batchSmartCropService";

export const batchSmartCropRouter = router({
  /**
   * 创建批量智能框选任务
   */
  create: protectedProcedure
    .input(
      z.object({
        taskName: z.string().min(1).max(255),
        fileUrls: z.array(z.string().url()).min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await createBatchCropTask({
        userId: ctx.user.id,
        taskName: input.taskName,
        fileUrls: input.fileUrls,
      });
      
      // 异步执行任务（不等待完成）
      executeBatchCropTask(task.id).catch(error => {
        console.error(`批量框选任务 ${task.id} 执行失败:`, error);
      });
      
      return task;
    }),

  /**
   * 获取任务列表
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserBatchCropTasks(ctx.user.id);
  }),

  /**
   * 获取任务详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getBatchCropTaskById(input.id, ctx.user.id);
    }),

  /**
   * 删除任务
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteBatchCropTask(input.id, ctx.user.id);
      return { success };
    }),

  /**
   * 重新执行任务
   */
  retry: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await getBatchCropTaskById(input.id, ctx.user.id);
      if (!task) {
        throw new Error('任务不存在');
      }
      
      // 异步重新执行任务
      executeBatchCropTask(task.id).catch(error => {
        console.error(`批量框选任务 ${task.id} 重试失败:`, error);
      });
      
      return { success: true };
    }),
});
