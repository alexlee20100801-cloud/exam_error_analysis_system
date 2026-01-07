/**
 * 通知服务
 * 集成邮件、短信和平台内通知功能
 */

import { db } from "../db";
import { notificationConfigs, notificationHistory } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * 通知渠道接口
 */
export interface NotificationChannel {
  type: "platform" | "email" | "sms";
  send(recipient: string, title: string, content: string): Promise<boolean>;
}

/**
 * 平台内通知渠道(使用现有的notifyOwner)
 */
class PlatformNotificationChannel implements NotificationChannel {
  type: "platform" = "platform";

  async send(recipient: string, title: string, content: string): Promise<boolean> {
    try {
      const result = await notifyOwner({ title, content });
      return result;
    } catch (error) {
      console.error("[通知服务] 平台通知发送失败:", error);
      return false;
    }
  }
}

/**
 * 邮件通知渠道(使用SMTP)
 * 注意:这是一个示例实现,实际使用时需要配置SMTP服务器
 */
class EmailNotificationChannel implements NotificationChannel {
  type: "email" = "email";

  async send(recipient: string, title: string, content: string): Promise<boolean> {
    try {
      // TODO: 实际项目中需要集成SMTP服务(如nodemailer)
      // 这里提供一个示例框架
      console.log(`[通知服务] 邮件通知(示例): 发送到 ${recipient}`);
      console.log(`标题: ${title}`);
      console.log(`内容: ${content}`);

      // 示例:使用nodemailer发送邮件
      // const transporter = nodemailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: parseInt(process.env.SMTP_PORT || '587'),
      //   secure: false,
      //   auth: {
      //     user: process.env.SMTP_USER,
      //     pass: process.env.SMTP_PASS,
      //   },
      // });
      //
      // await transporter.sendMail({
      //   from: process.env.SMTP_FROM,
      //   to: recipient,
      //   subject: title,
      //   text: content,
      //   html: `<div>${content.replace(/\n/g, '<br>')}</div>`,
      // });

      // 模拟发送成功
      return true;
    } catch (error) {
      console.error("[通知服务] 邮件发送失败:", error);
      return false;
    }
  }
}

/**
 * 短信通知渠道(对接第三方SMS API)
 * 注意:这是一个示例实现,实际使用时需要对接短信服务商API
 */
class SmsNotificationChannel implements NotificationChannel {
  type: "sms" = "sms";

  async send(recipient: string, title: string, content: string): Promise<boolean> {
    try {
      // TODO: 实际项目中需要对接短信服务商API(如阿里云、腾讯云)
      console.log(`[通知服务] 短信通知(示例): 发送到 ${recipient}`);
      console.log(`标题: ${title}`);
      console.log(`内容: ${content}`);

      // 示例:调用短信服务商API
      // const response = await fetch('https://sms-api.example.com/send', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
      //   },
      //   body: JSON.stringify({
      //     phone: recipient,
      //     template_id: process.env.SMS_TEMPLATE_ID,
      //     params: {
      //       title,
      //       content,
      //     },
      //   }),
      // });
      //
      // const result = await response.json();
      // return result.success;

      // 模拟发送成功
      return true;
    } catch (error) {
      console.error("[通知服务] 短信发送失败:", error);
      return false;
    }
  }
}

/**
 * 通知服务类
 */
export class NotificationService {
  private channels: Map<string, NotificationChannel>;

  constructor() {
    this.channels = new Map();
    this.channels.set("platform", new PlatformNotificationChannel());
    this.channels.set("email", new EmailNotificationChannel());
    this.channels.set("sms", new SmsNotificationChannel());
  }

  /**
   * 发送通知
   */
  async sendNotification(params: {
    notificationType: "ab_test_decision" | "warmup_task_completed" | "batch_operation_completed" | "system_alert" | "custom";
    title: string;
    content: string;
    channels?: ("platform" | "email" | "sms")[];
    recipients?: {
      emails?: string[];
      phones?: string[];
      userIds?: number[];
    };
    configId?: number;
  }): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    details: Array<{ channel: string; recipient: string; success: boolean; error?: string }>;
  }> {
    const { notificationType, title, content, channels: requestedChannels, recipients, configId } = params;

    let sentCount = 0;
    let failedCount = 0;
    const details: Array<{ channel: string; recipient: string; success: boolean; error?: string }> = [];

    // 1. 如果没有指定渠道和接收人,从配置中读取
    let finalChannels: ("platform" | "email" | "sms")[] = requestedChannels || [];
    let finalRecipients = recipients || { emails: [], phones: [], userIds: [] };

    if (configId) {
      const config = await db.select().from(notificationConfigs).where(eq(notificationConfigs.id, configId)).limit(1);
      if (config.length > 0 && config[0].isActive) {
        const c = config[0];
        if (c.enablePlatformNotification) finalChannels.push("platform");
        if (c.enableEmailNotification) finalChannels.push("email");
        if (c.enableSmsNotification) finalChannels.push("sms");
        finalRecipients = c.recipients as any;
      }
    }

    // 2. 如果没有配置,查找默认配置
    if (finalChannels.length === 0) {
      const defaultConfig = await db
        .select()
        .from(notificationConfigs)
        .where(and(eq(notificationConfigs.notificationType, notificationType), eq(notificationConfigs.isActive, 1)))
        .limit(1);

      if (defaultConfig.length > 0) {
        const c = defaultConfig[0];
        if (c.enablePlatformNotification) finalChannels.push("platform");
        if (c.enableEmailNotification) finalChannels.push("email");
        if (c.enableSmsNotification) finalChannels.push("sms");
        finalRecipients = c.recipients as any;
      } else {
        // 默认使用平台通知
        finalChannels = ["platform"];
      }
    }

    // 3. 发送通知到各个渠道
    for (const channelType of finalChannels) {
      const channel = this.channels.get(channelType);
      if (!channel) {
        console.warn(`[通知服务] 未知的通知渠道: ${channelType}`);
        continue;
      }

      let recipientList: string[] = [];
      if (channelType === "platform") {
        recipientList = ["owner"]; // 平台通知发送给系统所有者
      } else if (channelType === "email") {
        recipientList = finalRecipients.emails || [];
      } else if (channelType === "sms") {
        recipientList = finalRecipients.phones || [];
      }

      for (const recipient of recipientList) {
        try {
          const success = await channel.send(recipient, title, content);

          // 记录到历史
          await db.insert(notificationHistory).values({
            configId: configId || null,
            notificationType,
            title,
            content,
            channel: channelType,
            recipient,
            status: success ? "sent" : "failed",
            sentAt: success ? new Date() : undefined,
            errorMessage: success ? undefined : "发送失败",
          });

          if (success) {
            sentCount++;
          } else {
            failedCount++;
          }

          details.push({
            channel: channelType,
            recipient,
            success,
          });
        } catch (error: any) {
          failedCount++;
          details.push({
            channel: channelType,
            recipient,
            success: false,
            error: error.message,
          });

          // 记录失败到历史
          await db.insert(notificationHistory).values({
            configId: configId || null,
            notificationType,
            title,
            content,
            channel: channelType,
            recipient,
            status: "failed",
            errorMessage: error.message,
          });
        }
      }
    }

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      details,
    };
  }

  /**
   * 获取通知历史
   */
  async getNotificationHistory(params: {
    limit?: number;
    notificationType?: string;
    channel?: string;
    status?: string;
  }) {
    const { limit = 50, notificationType, channel, status } = params;

    let query = db.select().from(notificationHistory);

    // 添加过滤条件
    const conditions = [];
    if (notificationType) {
      conditions.push(eq(notificationHistory.notificationType, notificationType as any));
    }
    if (channel) {
      conditions.push(eq(notificationHistory.channel, channel as any));
    }
    if (status) {
      conditions.push(eq(notificationHistory.status, status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const history = await query.orderBy(desc(notificationHistory.createdAt)).limit(limit);

    return history;
  }

  /**
   * 获取通知统计
   */
  async getNotificationStats() {
    const allHistory = await db.select().from(notificationHistory).limit(1000);

    const totalSent = allHistory.filter((h) => h.status === "sent" || h.status === "delivered").length;
    const totalFailed = allHistory.filter((h) => h.status === "failed").length;

    const byChannel = {
      platform: allHistory.filter((h) => h.channel === "platform").length,
      email: allHistory.filter((h) => h.channel === "email").length,
      sms: allHistory.filter((h) => h.channel === "sms").length,
    };

    const byType = {
      ab_test_decision: allHistory.filter((h) => h.notificationType === "ab_test_decision").length,
      warmup_task_completed: allHistory.filter((h) => h.notificationType === "warmup_task_completed").length,
      batch_operation_completed: allHistory.filter((h) => h.notificationType === "batch_operation_completed").length,
      system_alert: allHistory.filter((h) => h.notificationType === "system_alert").length,
      custom: allHistory.filter((h) => h.notificationType === "custom").length,
    };

    return {
      total: allHistory.length,
      totalSent,
      totalFailed,
      successRate: allHistory.length > 0 ? (totalSent / allHistory.length) * 100 : 0,
      byChannel,
      byType,
    };
  }
}

// 导出单例
export const notificationService = new NotificationService();
