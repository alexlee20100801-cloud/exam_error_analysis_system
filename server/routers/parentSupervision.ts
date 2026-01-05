import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as parentService from "../parentSupervisionService";
import * as reminderService from "../goalReminderService";
import { notifyOwner } from "../_core/notification";

export const parentSupervisionRouter = router({
  // 学生生成邀请码
  generateInviteCode: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await parentService.createParentInvite(ctx.user.id);
    return result;
  }),

  // 家长接受邀请绑定学生
  acceptInvite: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await parentService.acceptInvite(ctx.user.id, input.inviteCode);
      
      // 通知系统所有者
      await notifyOwner({
        title: "家长绑定学生",
        content: `家长 ${ctx.user.name} 成功绑定学生ID ${result.studentId}`,
      });
      
      return result;
    }),

  // 获取家长绑定的所有学生
  getMyStudents: protectedProcedure.query(async ({ ctx }) => {
    const students = await parentService.getParentStudents(ctx.user.id);
    return students;
  }),

  // 获取学生的学习统计
  getStudentStats: protectedProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      const stats = await parentService.getStudentStats(input.studentId);
      return stats;
    }),

  // 创建学习目标
  createGoal: protectedProcedure
    .input(
      z.object({
        studentId: z.number(),
        goalType: z.enum(["error_count", "mastery_rate", "review_count", "study_time"]),
        targetValue: z.number(),
        period: z.enum(["daily", "weekly", "monthly"]),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await parentService.createLearningGoal({
        studentId: input.studentId,
        parentId: ctx.user.id,
        goalType: input.goalType,
        targetValue: input.targetValue,
        period: input.period,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
      return result;
    }),

  // 获取学生的学习目标
  getStudentGoals: protectedProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      const goals = await parentService.getStudentGoals(input.studentId);
      return goals;
    }),

  // 更新目标进度
  updateGoalProgress: protectedProcedure
    .input(z.object({ goalId: z.number(), currentValue: z.number() }))
    .mutation(async ({ input }) => {
      const result = await parentService.updateGoalProgress(input.goalId, input.currentValue);
      return result;
    }),

  // 获取家长的所有提醒
  getMyReminders: protectedProcedure.query(async ({ ctx }) => {
    const reminders = await reminderService.getParentReminders(ctx.user.id);
    return reminders;
  }),

  // 标记提醒为已读
  markReminderRead: protectedProcedure
    .input(z.object({ reminderId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await reminderService.markReminderAsRead(input.reminderId);
      return result;
    }),

  // 手动触发检查提醒（仅用于测试）
  triggerReminderCheck: protectedProcedure.mutation(async () => {
    await reminderService.checkAndSendReminders();
    return { success: true };
  }),
});
