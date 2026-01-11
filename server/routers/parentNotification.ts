import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as parentNotificationService from '../services/parentNotificationService';

export const parentNotificationRouter = router({
  // ==================== 家长-孩子关系管理 ====================
  
  // 学生创建邀请码
  createInvite: protectedProcedure
    .input(z.object({
      relationType: z.enum(['father', 'mother', 'guardian', 'other']).optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      return await parentNotificationService.createParentInvite(
        ctx.user.id,
        input?.relationType || 'guardian'
      );
    }),
  
  // 家长通过邀请码绑定孩子
  bindChild: protectedProcedure
    .input(z.object({
      inviteCode: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      return await parentNotificationService.bindChildByInviteCode(ctx.user.id, input.inviteCode);
    }),
  
  // 获取家长的所有孩子
  getChildren: protectedProcedure
    .query(async ({ ctx }) => {
      return await parentNotificationService.getParentChildren(ctx.user.id);
    }),
  
  // 获取学生的所有家长
  getParents: protectedProcedure
    .query(async ({ ctx }) => {
      return await parentNotificationService.getChildParents(ctx.user.id);
    }),
  
  // 解除关系
  removeRelation: protectedProcedure
    .input(z.object({
      relationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await parentNotificationService.removeParentChildRelation(input.relationId, ctx.user.id);
    }),
  
  // ==================== 通知配置管理 ====================
  
  // 获取通知配置
  getConfig: protectedProcedure
    .input(z.object({
      relationId: z.number(),
    }))
    .query(async ({ input }) => {
      return await parentNotificationService.getNotificationConfig(input.relationId);
    }),
  
  // 更新通知配置
  updateConfig: protectedProcedure
    .input(z.object({
      relationId: z.number(),
      config: z.object({
        enableWechat: z.boolean().optional(),
        enableSms: z.boolean().optional(),
        enableEmail: z.boolean().optional(),
        enableApp: z.boolean().optional(),
        wechatOpenId: z.string().optional(),
        phoneNumber: z.string().optional(),
        email: z.string().optional(),
        notifyOnGoalComplete: z.boolean().optional(),
        notifyOnAchievement: z.boolean().optional(),
        notifyOnInactive: z.boolean().optional(),
        notifyOnWeeklyReport: z.boolean().optional(),
        notifyOnExamResult: z.boolean().optional(),
        notifyOnErrorIncrease: z.boolean().optional(),
        inactiveThresholdHours: z.number().min(1).max(168).optional(),
        quietHoursStart: z.string().optional(),
        quietHoursEnd: z.string().optional(),
        maxDailyNotifications: z.number().min(1).max(20).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      return await parentNotificationService.updateNotificationConfig(input.relationId, input.config);
    }),
  
  // ==================== 学习目标管理 ====================
  
  // 创建学习目标
  createGoal: protectedProcedure
    .input(z.object({
      goalType: z.enum([
        'daily_questions',
        'daily_study_time',
        'weekly_questions',
        'weekly_study_time',
        'mastery_target',
        'error_reduction',
        'custom'
      ]),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      targetValue: z.number().min(1),
      unit: z.string().max(20).optional(),
      periodType: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
      periodStartDate: z.string().optional(),
      periodEndDate: z.string().optional(),
      notifyParent: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await parentNotificationService.createLearningGoal(ctx.user.id, {
        ...input,
        periodStartDate: input.periodStartDate ? new Date(input.periodStartDate) : undefined,
        periodEndDate: input.periodEndDate ? new Date(input.periodEndDate) : undefined,
      });
    }),
  
  // 更新目标进度
  updateGoalProgress: protectedProcedure
    .input(z.object({
      goalId: z.number(),
      incrementValue: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await parentNotificationService.updateGoalProgress(input.goalId, input.incrementValue);
    }),
  
  // 获取学习目标列表
  getGoals: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'completed', 'failed', 'paused', 'cancelled']).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return await parentNotificationService.getUserLearningGoals(ctx.user.id, input?.status);
    }),
  
  // ==================== 学习活动记录 ====================
  
  // 记录学习活动
  logActivity: protectedProcedure
    .input(z.object({
      activityType: z.enum([
        'login',
        'question_practice',
        'error_review',
        'video_watch',
        'note_create',
        'exam_complete',
        'goal_update',
        'other'
      ]),
      details: z.record(z.string(), z.any()).optional(),
      durationMinutes: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await parentNotificationService.logLearningActivity(
        ctx.user.id,
        input.activityType as any,
        input.details,
        input.durationMinutes
      );
      return { success: true };
    }),
  
  // 获取最后活动时间
  getLastActivity: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const userId = input?.userId || ctx.user.id;
      const lastActivity = await parentNotificationService.getLastActivityTime(userId);
      return lastActivity ? lastActivity.toISOString() : null;
    }),
  
  // ==================== 通知管理 ====================
  
  // 发送通知（手动触发）
  sendNotification: protectedProcedure
    .input(z.object({
      relationId: z.number(),
      notificationType: z.enum([
        'goal_complete',
        'achievement',
        'inactive_warning',
        'weekly_report',
        'exam_result',
        'error_increase',
        'daily_summary',
        'custom'
      ]),
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      relatedData: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      return await parentNotificationService.sendParentNotification(
        input.relationId,
        input.notificationType,
        input.title,
        input.content,
        input.relatedData
      );
    }),
  
  // 获取通知记录
  getNotifications: protectedProcedure
    .input(z.object({
      relationId: z.number(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      return await parentNotificationService.getNotificationRecords(input.relationId, input.limit);
    }),
  
  // 标记通知为已读
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await parentNotificationService.markNotificationAsRead(input.notificationId);
      return { success: true };
    }),
  
  // ==================== 周报管理 ====================
  
  // 生成并发送周报
  generateWeeklyReport: protectedProcedure
    .input(z.object({
      relationId: z.number(),
      childUserId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await parentNotificationService.generateAndSendWeeklyReport(
        input.relationId,
        input.childUserId
      );
    }),
  
  // 获取周报列表
  getWeeklyReports: protectedProcedure
    .input(z.object({
      relationId: z.number(),
      limit: z.number().min(1).max(50).optional(),
    }))
    .query(async ({ input }) => {
      return await parentNotificationService.getParentWeeklyReports(input.relationId, input.limit);
    }),
  
  // ==================== 定时任务 ====================
  
  // 检查不活跃用户（由定时任务调用）
  checkInactiveUsers: protectedProcedure
    .mutation(async () => {
      return await parentNotificationService.checkInactiveUsersAndNotify();
    }),
});
