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

/**
 * 用户通知表 - 存储用户接收的实时通知
 */
export const userNotifications = mysqlTable("user_notifications", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull(), // 接收通知的用户ID
  type: varchar({ length: 50 }).notNull(), // 通知类型：member_joined, new_comment, new_question, etc.
  title: varchar({ length: 255 }).notNull(), // 通知标题
  content: text().notNull(), // 通知内容
  relatedId: int("related_id"), // 关联ID（如错题集ID、评论ID等）
  relatedType: varchar("related_type", { length: 50 }), // 关联类型：collection, comment, question
  isRead: int("is_read").notNull().default(0), // 是否已读：0-未读，1-已读
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  readAt: timestamp("read_at", { mode: "date" }), // 阅读时间
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
  typeIdx: index("type_idx").on(table.type),
  isReadIdx: index("is_read_idx").on(table.isRead),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type UserNotification = typeof userNotifications.$inferSelect;
export type NewUserNotification = typeof userNotifications.$inferInsert;

/**
 * 通知设置表 - 用户通知偏好设置
 */
export const notificationSettings = mysqlTable("notification_settings", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(), // 用户ID
  memberJoined: int("member_joined").notNull().default(1), // 新成员加入通知：0-关闭，1-开启
  newComment: int("new_comment").notNull().default(1), // 新评论通知
  newQuestion: int("new_question").notNull().default(1), // 新错题通知
  reviewReminder: int("review_reminder").notNull().default(1), // 复习提醒通知
  systemNotice: int("system_notice").notNull().default(1), // 系统通知
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
}));

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type NewNotificationSetting = typeof notificationSettings.$inferInsert;
