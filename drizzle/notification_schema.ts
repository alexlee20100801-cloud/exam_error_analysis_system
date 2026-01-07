import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, index, json } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * 通知配置表
 * 管理不同类型通知的配置和接收人
 */
export const notificationConfigs = mysqlTable("notification_configs", {
  id: int().autoincrement().primaryKey(),
  
  // 通知类型
  notificationType: mysqlEnum("notification_type", [
    "ab_test_decision",
    "warmup_task_completed",
    "batch_operation_completed",
    "system_alert",
    "custom"
  ]).notNull(),
  
  // 通知标题和描述
  title: varchar({ length: 200 }).notNull(),
  description: text(),
  
  // 通知渠道配置
  enablePlatformNotification: int("enable_platform_notification").notNull().default(1), // 平台内通知
  enableEmailNotification: int("enable_email_notification").notNull().default(0), // 邮件通知
  enableSmsNotification: int("enable_sms_notification").notNull().default(0), // 短信通知
  
  // 接收人配置
  recipients: json().notNull(), // 接收人列表 { emails: string[], phones: string[], userIds: number[] }
  
  // 通知模板
  emailTemplate: text("email_template"), // 邮件模板
  smsTemplate: text("sms_template"), // 短信模板
  
  // 状态
  isActive: int("is_active").notNull().default(1), // 是否启用
  
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => ({
  notificationTypeIdx: index("notification_type_idx").on(table.notificationType),
  isActiveIdx: index("is_active_idx").on(table.isActive),
}));

export type NotificationConfig = typeof notificationConfigs.$inferSelect;
export type NewNotificationConfig = typeof notificationConfigs.$inferInsert;

/**
 * 通知发送历史表
 * 记录所有通知的发送历史和状态
 */
export const notificationHistory = mysqlTable("notification_history", {
  id: int().autoincrement().primaryKey(),
  
  // 关联配置
  configId: int("config_id"),
  notificationType: mysqlEnum("notification_type", [
    "ab_test_decision",
    "warmup_task_completed",
    "batch_operation_completed",
    "system_alert",
    "custom"
  ]).notNull(),
  
  // 通知内容
  title: varchar({ length: 200 }).notNull(),
  content: text().notNull(),
  
  // 发送渠道
  channel: mysqlEnum("channel", ["platform", "email", "sms"]).notNull(),
  
  // 接收人
  recipient: varchar({ length: 255 }).notNull(), // 邮箱、手机号或用户ID
  
  // 发送状态
  status: mysqlEnum("status", ["pending", "sent", "failed", "delivered"]).notNull().default("pending"),
  errorMessage: text("error_message"), // 失败原因
  
  // 发送时间
  sentAt: timestamp("sent_at", { mode: "date" }),
  deliveredAt: timestamp("delivered_at", { mode: "date" }),
  
  // 额外数据
  metadata: json(), // 额外的元数据
  
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => ({
  configIdIdx: index("config_id_idx").on(table.configId),
  notificationTypeIdx: index("notification_type_idx").on(table.notificationType),
  statusIdx: index("status_idx").on(table.status),
  channelIdx: index("channel_idx").on(table.channel),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type NewNotificationHistory = typeof notificationHistory.$inferInsert;
