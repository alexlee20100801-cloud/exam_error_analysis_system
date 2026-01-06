import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllTasksStatus,
  getTaskLogs,
  triggerTask,
  upsertScheduledTask,
} from "../services/scheduledTaskService";

/**
 * 定时任务管理路由
 */
export const scheduledTasksRouter = router({
  /**
   * 获取所有定时任务状态
   */
  getAllTasks: protectedProcedure.query(async ({ ctx }) => {
    // 只有管理员可以查看
    if (ctx.user.role !== "admin") {
      throw new Error("无权访问");
    }

    const tasks = await getAllTasksStatus();
    return {
      success: true,
      tasks,
    };
  }),

  /**
   * 获取任务执行日志
   */
  getTaskLogs: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // 只有管理员可以查看
      if (ctx.user.role !== "admin") {
        throw new Error("无权访问");
      }

      const logs = await getTaskLogs(input.taskId, input.limit);
      return {
        success: true,
        logs,
      };
    }),

  /**
   * 手动触发任务执行
   */
  triggerTask: protectedProcedure
    .input(
      z.object({
        taskName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 只有管理员可以触发
      if (ctx.user.role !== "admin") {
        throw new Error("无权访问");
      }

      const result = await triggerTask(input.taskName);
      return result;
    }),

  /**
   * 创建或更新定时任务
   */
  upsertTask: protectedProcedure
    .input(
      z.object({
        taskName: z.string(),
        taskType: z.enum(["generate_questions", "send_reminders", "cleanup"]),
        cronExpression: z.string(),
        isEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 只有管理员可以管理
      if (ctx.user.role !== "admin") {
        throw new Error("无权访问");
      }

      const task = await upsertScheduledTask(input);
      return {
        success: true,
        task,
      };
    }),
});
