import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, json, index } from "drizzle-orm/mysql-core";

/**
 * 定时任务告警配置表
 * 配置任务失败时的告警规则
 */
export const taskAlertConfigs = mysqlTable("task_alert_configs", {
  id: int("id").primaryKey().autoincrement(),
  
  // 关联任务
  taskName: varchar("task_name", { length: 255 }).notNull(),
  taskType: mysqlEnum("task_type", [
    "performance_evaluation",
    "weekly_report_generation",
    "alert_check",
    "cache_warmup",
    "ab_test_decision",
    "data_backup",
    "cleanup",
    "custom"
  ]).notNull(),
  
  // 告警阈值配置
  consecutiveFailureThreshold: int("consecutive_failure_threshold").notNull().default(3), // 连续失败次数阈值
  timeoutThreshold: int("timeout_threshold").notNull().default(300), // 超时阈值(秒)
  
  // 告警级别
  alertSeverity: mysqlEnum("alert_severity", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  
  // 通知渠道配置
  enableEmailNotification: int("enable_email_notification").notNull().default(1),
  enableMessageNotification: int("enable_message_notification").notNull().default(1),
  
  // 通知接收者
  emailRecipients: json("email_recipients"), // 邮件接收者列表
  messageRecipients: json("message_recipients"), // 消息接收者列表
  
  // 通知频率控制
  notificationCooldown: int("notification_cooldown").notNull().default(3600), // 通知冷却时间(秒)
  maxNotificationsPerDay: int("max_notifications_per_day").notNull().default(10), // 每天最大通知次数
  
  // 状态
  isActive: int("is_active").notNull().default(1),
  
  // 元数据
  description: text("description"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  taskNameIdx: index("task_name_idx").on(table.taskName),
  taskTypeIdx: index("task_type_idx").on(table.taskType),
  isActiveIdx: index("is_active_idx").on(table.isActive),
}));

/**
 * 定时任务告警记录表
 * 记录所有触发的告警
 */
export const taskAlerts = mysqlTable("task_alerts", {
  id: int("id").primaryKey().autoincrement(),
  
  // 关联配置
  configId: int("config_id").notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  
  // 告警类型
  alertType: mysqlEnum("alert_type", [
    "consecutive_failure",  // 连续失败
    "timeout",              // 超时
    "error",                // 执行错误
    "partial_failure"       // 部分失败
  ]).notNull(),
  
  // 告警详情
  alertMessage: text("alert_message").notNull(),
  errorDetails: text("error_details"),
  
  // 触发条件
  consecutiveFailures: int("consecutive_failures").default(0),
  executionDuration: int("execution_duration"), // 执行时长(ms)
  
  // 告警级别
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  
  // 通知状态
  emailSent: int("email_sent").notNull().default(0),
  emailSentAt: timestamp("email_sent_at"),
  emailError: text("email_error"),
  
  messageSent: int("message_sent").notNull().default(0),
  messageSentAt: timestamp("message_sent_at"),
  messageError: text("message_error"),
  
  // 处理状态
  status: mysqlEnum("status", ["pending", "acknowledged", "resolved", "ignored"]).notNull().default("pending"),
  acknowledgedBy: int("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: int("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  
  // 时间戳
  alertTime: timestamp("alert_time").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  configIdIdx: index("config_id_idx").on(table.configId),
  taskNameIdx: index("task_name_idx").on(table.taskName),
  alertTypeIdx: index("alert_type_idx").on(table.alertType),
  statusIdx: index("status_idx").on(table.status),
  alertTimeIdx: index("alert_time_idx").on(table.alertTime),
}));

/**
 * 定时任务执行状态表
 * 用于监控仪表盘展示
 */
export const taskExecutionStatus = mysqlTable("task_execution_status", {
  id: int("id").primaryKey().autoincrement(),
  
  // 任务信息
  taskName: varchar("task_name", { length: 255 }).notNull(),
  taskType: mysqlEnum("task_type", [
    "performance_evaluation",
    "weekly_report_generation",
    "alert_check",
    "cache_warmup",
    "ab_test_decision",
    "data_backup",
    "cleanup",
    "custom"
  ]).notNull(),
  
  // 执行状态
  lastExecutionTime: timestamp("last_execution_time"),
  lastExecutionStatus: mysqlEnum("last_execution_status", ["success", "failed", "partial", "running"]),
  lastExecutionDuration: int("last_execution_duration"), // 毫秒
  lastErrorMessage: text("last_error_message"),
  
  // 下次执行
  nextScheduledTime: timestamp("next_scheduled_time"),
  cronExpression: varchar("cron_expression", { length: 100 }),
  
  // 统计信息
  totalExecutions: int("total_executions").notNull().default(0),
  successfulExecutions: int("successful_executions").notNull().default(0),
  failedExecutions: int("failed_executions").notNull().default(0),
  consecutiveFailures: int("consecutive_failures").notNull().default(0),
  
  // 平均执行时间
  avgExecutionDuration: int("avg_execution_duration"), // 毫秒
  
  // 健康状态
  healthStatus: mysqlEnum("health_status", ["healthy", "warning", "critical", "unknown"]).notNull().default("unknown"),
  
  // 状态
  isEnabled: int("is_enabled").notNull().default(1),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  taskNameIdx: index("task_name_unique_idx").on(table.taskName),
  taskTypeIdx: index("task_type_idx").on(table.taskType),
  healthStatusIdx: index("health_status_idx").on(table.healthStatus),
  isEnabledIdx: index("is_enabled_idx").on(table.isEnabled),
}));

/**
 * 告警通知日志表
 * 记录所有发送的告警通知
 */
export const alertNotificationLogs = mysqlTable("alert_notification_logs", {
  id: int("id").primaryKey().autoincrement(),
  
  // 关联告警
  alertId: int("alert_id").notNull(),
  
  // 通知类型
  notificationType: mysqlEnum("notification_type", ["email", "message", "webhook"]).notNull(),
  
  // 接收者
  recipient: varchar("recipient", { length: 255 }).notNull(),
  
  // 通知内容
  subject: varchar("subject", { length: 500 }),
  content: text("content").notNull(),
  
  // 发送状态
  status: mysqlEnum("status", ["pending", "sent", "failed"]).notNull().default("pending"),
  errorMessage: text("error_message"),
  
  // 重试信息
  retryCount: int("retry_count").notNull().default(0),
  maxRetries: int("max_retries").notNull().default(3),
  nextRetryAt: timestamp("next_retry_at"),
  
  // 时间戳
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  alertIdIdx: index("alert_id_idx").on(table.alertId),
  notificationTypeIdx: index("notification_type_idx").on(table.notificationType),
  statusIdx: index("status_idx").on(table.status),
}));

// 类型导出
export type TaskAlertConfig = typeof taskAlertConfigs.$inferSelect;
export type NewTaskAlertConfig = typeof taskAlertConfigs.$inferInsert;

export type TaskAlert = typeof taskAlerts.$inferSelect;
export type NewTaskAlert = typeof taskAlerts.$inferInsert;

export type TaskExecutionStatus = typeof taskExecutionStatus.$inferSelect;
export type NewTaskExecutionStatus = typeof taskExecutionStatus.$inferInsert;

export type AlertNotificationLog = typeof alertNotificationLogs.$inferSelect;
export type NewAlertNotificationLog = typeof alertNotificationLogs.$inferInsert;
