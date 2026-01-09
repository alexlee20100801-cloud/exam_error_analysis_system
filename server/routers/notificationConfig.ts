import { z } from "zod";
import { protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { db } from "../db";
import { notificationConfigs, notificationHistory } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { sendNotification } from "../notification";

/**
 * 通知配置管理路由
 * 提供通知规则的可视化配置和管理功能
 */
export const notificationConfigRouter = router({
  /**
   * 获取所有通知配置
   */
  list: adminProcedure.query(async () => {
    const configs = await db
      .select()
      .from(notificationConfigs)
      .orderBy(desc(notificationConfigs.createdAt));

    return configs;
  }),

  /**
   * 获取单个通知配置详情
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [config] = await db
        .select()
        .from(notificationConfigs)
        .where(eq(notificationConfigs.id, input.id));

      if (!config) {
        throw new Error("通知配置不存在");
      }

      return config;
    }),

  /**
   * 创建通知配置
   */
  create: adminProcedure
    .input(
      z.object({
        notificationType: z.enum([
          "ab_test_decision",
          "warmup_task_completed",
          "batch_operation_completed",
          "system_alert",
          "custom",
        ]),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        enablePlatformNotification: z.boolean().default(true),
        enableEmailNotification: z.boolean().default(false),
        enableSmsNotification: z.boolean().default(false),
        recipients: z.object({
          emails: z.array(z.string().email()).optional(),
          phones: z.array(z.string()).optional(),
          userIds: z.array(z.number()).optional(),
        }),
        emailTemplate: z.string().optional(),
        smsTemplate: z.string().optional(),
        isActive: z.boolean().default(true),
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
          recipients: input.recipients,
          emailTemplate: input.emailTemplate,
          smsTemplate: input.smsTemplate,
          isActive: input.isActive ? 1 : 0,
        })
        // @ts-ignore
        .returning();

      return config;
    }),

  /**
   * 更新通知配置
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        notificationType: z
          .enum([
            "ab_test_decision",
            "warmup_task_completed",
            "batch_operation_completed",
            "system_alert",
            "custom",
          ])
          .optional(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        enablePlatformNotification: z.boolean().optional(),
        enableEmailNotification: z.boolean().optional(),
        enableSmsNotification: z.boolean().optional(),
        recipients: z
          .object({
            emails: z.array(z.string().email()).optional(),
            phones: z.array(z.string()).optional(),
            userIds: z.array(z.number()).optional(),
          })
          .optional(),
        emailTemplate: z.string().optional(),
        smsTemplate: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const updateValues: any = {};
      if (updateData.notificationType !== undefined) {
        updateValues.notificationType = updateData.notificationType;
      }
      if (updateData.title !== undefined) {
        updateValues.title = updateData.title;
      }
      if (updateData.description !== undefined) {
        updateValues.description = updateData.description;
      }
      if (updateData.enablePlatformNotification !== undefined) {
        updateValues.enablePlatformNotification = updateData.enablePlatformNotification ? 1 : 0;
      }
      if (updateData.enableEmailNotification !== undefined) {
        updateValues.enableEmailNotification = updateData.enableEmailNotification ? 1 : 0;
      }
      if (updateData.enableSmsNotification !== undefined) {
        updateValues.enableSmsNotification = updateData.enableSmsNotification ? 1 : 0;
      }
      if (updateData.recipients !== undefined) {
        updateValues.recipients = updateData.recipients;
      }
      if (updateData.emailTemplate !== undefined) {
        updateValues.emailTemplate = updateData.emailTemplate;
      }
      if (updateData.smsTemplate !== undefined) {
        updateValues.smsTemplate = updateData.smsTemplate;
      }
      if (updateData.isActive !== undefined) {
        updateValues.isActive = updateData.isActive ? 1 : 0;
      }

      const [config] = await db
        .update(notificationConfigs)
        .set(updateValues)
        .where(eq(notificationConfigs.id, id))
        // @ts-ignore
        .returning();

      if (!config) {
        throw new Error("通知配置不存在");
      }

      return config;
    }),

  /**
   * 删除通知配置
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(notificationConfigs).where(eq(notificationConfigs.id, input.id));

      return { success: true };
    }),

  /**
   * 测试通知配置
   */
  test: adminProcedure
    .input(
      z.object({
        id: z.number(),
        testRecipient: z.object({
          email: z.string().email().optional(),
          phone: z.string().optional(),
          userId: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [config] = await db
        .select()
        .from(notificationConfigs)
        .where(eq(notificationConfigs.id, input.id));

      if (!config) {
        throw new Error("通知配置不存在");
      }

      const results: any[] = [];

      // 测试平台通知
      if (config.enablePlatformNotification && input.testRecipient.userId) {
        const result = await sendNotification({
          userId: input.testRecipient.userId,
          type: config.notificationType,
          channel: "in_app",
          content: `[测试] ${config.title}`,
        });
        results.push({ channel: "platform", ...result });
      }

      // 测试邮件通知
      if (config.enableEmailNotification && input.testRecipient.email) {
        const content = config.emailTemplate || `[测试] ${config.title}\n\n${config.description || ""}`;
        const result = await sendNotification({
          userId: ctx.user.id,
          type: config.notificationType,
          channel: "email",
          content,
          recipientEmail: input.testRecipient.email,
          isHtml: true,
        });
        results.push({ channel: "email", ...result });
      }

      // 测试短信通知
      if (config.enableSmsNotification && input.testRecipient.phone) {
        const content = config.smsTemplate || `[测试] ${config.title}`;
        const result = await sendNotification({
          userId: ctx.user.id,
          type: config.notificationType,
          channel: "sms",
          content,
          recipientPhone: input.testRecipient.phone,
        });
        results.push({ channel: "sms", ...result });
      }

      return {
        success: results.every((r) => r.success),
        results,
      };
    }),

  /**
   * 获取通知发送历史
   */
  getHistory: adminProcedure
    .input(
      z.object({
        configId: z.number().optional(),
        notificationType: z
          .enum([
            "ab_test_decision",
            "warmup_task_completed",
            "batch_operation_completed",
            "system_alert",
            "custom",
          ])
          .optional(),
        channel: z.enum(["platform", "email", "sms"]).optional(),
        status: z.enum(["pending", "sent", "failed", "delivered"]).optional(),
        days: z.number().min(1).max(90).default(30),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.configId) {
        conditions.push(eq(notificationHistory.configId, input.configId));
      }

      if (input.notificationType) {
        conditions.push(eq(notificationHistory.notificationType, input.notificationType));
      }

      if (input.channel) {
        conditions.push(eq(notificationHistory.channel, input.channel));
      }

      if (input.status) {
        conditions.push(eq(notificationHistory.status, input.status));
      }

      // 时间范围过滤
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      conditions.push(gte(notificationHistory.createdAt, startDate));

      const history = await db
        .select()
        .from(notificationHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notificationHistory.createdAt))
        .limit(input.limit);

      return history;
    }),

  /**
   * 获取通知统计数据
   */
  getStats: adminProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // 总发送量
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notificationHistory)
        .where(gte(notificationHistory.createdAt, startDate));

      // 按状态统计
      const statusStats = await db
        .select({
          status: notificationHistory.status,
          count: sql<number>`count(*)`,
        })
        .from(notificationHistory)
        .where(gte(notificationHistory.createdAt, startDate))
        .groupBy(notificationHistory.status);

      // 按渠道统计
      const channelStats = await db
        .select({
          channel: notificationHistory.channel,
          count: sql<number>`count(*)`,
        })
        .from(notificationHistory)
        .where(gte(notificationHistory.createdAt, startDate))
        .groupBy(notificationHistory.channel);

      // 按类型统计
      const typeStats = await db
        .select({
          notificationType: notificationHistory.notificationType,
          count: sql<number>`count(*)`,
        })
        .from(notificationHistory)
        .where(gte(notificationHistory.createdAt, startDate))
        .groupBy(notificationHistory.notificationType);

      return {
        total: totalResult?.count || 0,
        byStatus: statusStats,
        byChannel: channelStats,
        byType: typeStats,
      };
    }),
});
