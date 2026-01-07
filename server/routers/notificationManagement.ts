/**
 * 通知管理路由器
 * 提供通知配置、发送历史查询和统计功能
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { notificationConfigs, notificationHistory } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { notificationService } from "../services/notificationService";

export const notificationManagementRouter = router({
  /**
   * 获取通知配置列表
   */
  listConfigs: protectedProcedure.query(async () => {
    const configs = await db.select().from(notificationConfigs).orderBy(desc(notificationConfigs.createdAt));
    return configs;
  }),

  /**
   * 创建通知配置
   */
  createConfig: protectedProcedure
    .input(
      z.object({
        notificationType: z.enum([
          "ab_test_decision",
          "warmup_task_completed",
          "batch_operation_completed",
          "system_alert",
          "custom",
        ]),
        title: z.string(),
        description: z.string().optional(),
        enablePlatformNotification: z.boolean().default(true),
        enableEmailNotification: z.boolean().default(false),
        enableSmsNotification: z.boolean().default(false),
        recipients: z.object({
          emails: z.array(z.string()).optional(),
          phones: z.array(z.string()).optional(),
          userIds: z.array(z.number()).optional(),
        }),
        emailTemplate: z.string().optional(),
        smsTemplate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [config] = await db
        .insert(notificationConfigs)
        .values({
          notificationType: input.notificationType,
          title: input.title,
          description: input.description,
          enablePlatformNotification: input.enablePlatformNotification ? 1 : 0,
          enableEmailNotification: input.enableEmailNotification ? 1 : 0,
          enableSmsNotification: input.enableSmsNotification ? 1 : 0,
          recipients: input.recipients as any,
          emailTemplate: input.emailTemplate,
          smsTemplate: input.smsTemplate,
        })
        .$returningId();

      return { success: true, configId: config.id };
    }),

  /**
   * 更新通知配置
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        configId: z.number(),
        enablePlatformNotification: z.boolean().optional(),
        enableEmailNotification: z.boolean().optional(),
        enableSmsNotification: z.boolean().optional(),
        recipients: z
          .object({
            emails: z.array(z.string()).optional(),
            phones: z.array(z.string()).optional(),
            userIds: z.array(z.number()).optional(),
          })
          .optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: any = {};
      if (input.enablePlatformNotification !== undefined)
        updateData.enablePlatformNotification = input.enablePlatformNotification ? 1 : 0;
      if (input.enableEmailNotification !== undefined)
        updateData.enableEmailNotification = input.enableEmailNotification ? 1 : 0;
      if (input.enableSmsNotification !== undefined)
        updateData.enableSmsNotification = input.enableSmsNotification ? 1 : 0;
      if (input.recipients) updateData.recipients = input.recipients;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

      await db.update(notificationConfigs).set(updateData).where(eq(notificationConfigs.id, input.configId));

      return { success: true };
    }),

  /**
   * 发送自定义通知
   */
  sendCustomNotification: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        channels: z.array(z.enum(["platform", "email", "sms"])).optional(),
        recipients: z
          .object({
            emails: z.array(z.string()).optional(),
            phones: z.array(z.string()).optional(),
            userIds: z.array(z.number()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await notificationService.sendNotification({
        notificationType: "custom",
        title: input.title,
        content: input.content,
        channels: input.channels,
        recipients: input.recipients,
      });

      return result;
    }),

  /**
   * 获取通知发送历史
   */
  getNotificationHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        notificationType: z.string().optional(),
        channel: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const history = await notificationService.getNotificationHistory(input);
      return history;
    }),

  /**
   * 获取通知统计
   */
  getNotificationStats: protectedProcedure.query(async () => {
    const stats = await notificationService.getNotificationStats();
    return stats;
  }),
});
