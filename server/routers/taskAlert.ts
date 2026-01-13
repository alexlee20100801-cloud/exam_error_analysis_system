import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as taskAlertService from "../taskAlertService";

export const taskAlertRouter = router({
  // ==================== 告警配置管理 ====================
  
  // 获取告警配置列表
  getAlertConfigs: protectedProcedure
    .input(z.object({
      taskType: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await taskAlertService.getAlertConfigs(input || {});
    }),
  
  // 获取单个告警配置
  getAlertConfigById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await taskAlertService.getAlertConfigById(input.id);
    }),
  
  // 创建告警配置
  createAlertConfig: protectedProcedure
    .input(z.object({
      taskName: z.string().min(1),
      taskType: z.enum([
        "performance_evaluation",
        "weekly_report_generation",
        "alert_check",
        "cache_warmup",
        "ab_test_decision",
        "data_backup",
        "cleanup",
        "custom"
      ]),
      consecutiveFailureThreshold: z.number().min(1).default(3),
      timeoutThreshold: z.number().min(1).default(300),
      alertSeverity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      enableEmailNotification: z.boolean().default(true),
      enableMessageNotification: z.boolean().default(true),
      emailRecipients: z.array(z.string()).optional(),
      messageRecipients: z.array(z.string()).optional(),
      notificationCooldown: z.number().min(60).default(3600),
      maxNotificationsPerDay: z.number().min(1).default(10),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await taskAlertService.createAlertConfig({
        ...input,
        enableEmailNotification: input.enableEmailNotification ? 1 : 0,
        enableMessageNotification: input.enableMessageNotification ? 1 : 0,
        createdBy: ctx.user.id,
      });
    }),
  
  // 更新告警配置
  updateAlertConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        taskName: z.string().optional(),
        consecutiveFailureThreshold: z.number().optional(),
        timeoutThreshold: z.number().optional(),
        alertSeverity: z.enum(["low", "medium", "high", "critical"]).optional(),
        enableEmailNotification: z.boolean().optional(),
        enableMessageNotification: z.boolean().optional(),
        emailRecipients: z.array(z.string()).optional(),
        messageRecipients: z.array(z.string()).optional(),
        notificationCooldown: z.number().optional(),
        maxNotificationsPerDay: z.number().optional(),
        isActive: z.boolean().optional(),
        description: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const updateData: any = { ...input.data };
      if (input.data.enableEmailNotification !== undefined) {
        updateData.enableEmailNotification = input.data.enableEmailNotification ? 1 : 0;
      }
      if (input.data.enableMessageNotification !== undefined) {
        updateData.enableMessageNotification = input.data.enableMessageNotification ? 1 : 0;
      }
      if (input.data.isActive !== undefined) {
        updateData.isActive = input.data.isActive ? 1 : 0;
      }
      await taskAlertService.updateAlertConfig(input.id, updateData);
      return { success: true };
    }),
  
  // 删除告警配置
  deleteAlertConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await taskAlertService.deleteAlertConfig(input.id);
      return { success: true };
    }),
  
  // ==================== 告警记录管理 ====================
  
  // 获取告警列表
  getAlerts: protectedProcedure
    .input(z.object({
      taskName: z.string().optional(),
      alertType: z.string().optional(),
      status: z.string().optional(),
      severity: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      return await taskAlertService.getAlerts(input || {});
    }),
  
  // 获取待处理告警数量
  getPendingAlertsCount: protectedProcedure
    .query(async () => {
      return await taskAlertService.getPendingAlertsCount();
    }),
  
  // 确认告警
  acknowledgeAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await taskAlertService.acknowledgeAlert(input.alertId, ctx.user.id);
      return { success: true };
    }),
  
  // 解决告警
  resolveAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await taskAlertService.resolveAlert(input.alertId, ctx.user.id, input.notes);
      return { success: true };
    }),
  
  // 忽略告警
  ignoreAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await taskAlertService.ignoreAlert(input.alertId, ctx.user.id, input.notes);
      return { success: true };
    }),
  
  // ==================== 任务状态监控 ====================
  
  // 获取所有任务状态
  getAllTaskStatus: protectedProcedure
    .query(async () => {
      return await taskAlertService.getAllTaskStatus();
    }),
  
  // 获取任务状态统计
  getTaskStatusStats: protectedProcedure
    .query(async () => {
      return await taskAlertService.getTaskStatusStats();
    }),
  
  // 获取告警统计
  getAlertStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(7),
    }).optional())
    .query(async ({ input }) => {
      return await taskAlertService.getAlertStats(input?.days || 7);
    }),
});
