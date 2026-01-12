import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  startReviewReminderScheduler,
  stopReviewReminderScheduler,
  getSchedulerStatus,
  triggerReminderCheck,
} from "../services/reviewReminderScheduler";

export const reviewReminderSchedulerRouter = router({
  // 获取调度器状态
  getStatus: protectedProcedure.query(async () => {
    return getSchedulerStatus();
  }),

  // 启动调度器（仅管理员）
  start: adminProcedure.mutation(async () => {
    startReviewReminderScheduler();
    return { success: true, message: "调度器已启动" };
  }),

  // 停止调度器（仅管理员）
  stop: adminProcedure.mutation(async () => {
    stopReviewReminderScheduler();
    return { success: true, message: "调度器已停止" };
  }),

  // 手动触发检查（仅管理员）
  triggerCheck: adminProcedure.mutation(async () => {
    const result = await triggerReminderCheck();
    return {
      success: true,
      message: "已发送 " + result.notified + " 条提醒，" + result.errors + " 个错误",
      ...result,
    };
  }),
});
