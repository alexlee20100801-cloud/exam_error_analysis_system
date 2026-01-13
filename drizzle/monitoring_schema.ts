/**
 * 监控和日志 Schema - 错误日志、性能监控
 */

import { mysqlTable, varchar, text, timestamp, int, decimal, json, index } from "drizzle-orm/mysql-core";

/**
 * 错误日志表
 */
export const errorLogs = mysqlTable(
  "error_logs",
  {
    id: int("id").primaryKey().autoincrement(),
    errorType: varchar("error_type", { length: 50 }).notNull(), // 错误类型：API, Database, Service, etc.
    errorCode: varchar("error_code", { length: 20 }), // 错误代码
    message: text("message").notNull(), // 错误信息
    stack: text("stack"), // 错误堆栈
    userId: int("user_id"), // 触发错误的用户ID
    endpoint: varchar("endpoint", { length: 255 }), // API端点
    method: varchar("method", { length: 10 }), // HTTP方法
    statusCode: int("status_code"), // HTTP状态码
    requestData: json("request_data"), // 请求数据
    responseData: json("response_data"), // 响应数据
    severity: varchar("severity", { length: 20 }).default("medium"), // 错误严重程度
    isResolved: int("is_resolved").default(0), // 是否已解决
    resolvedBy: int("resolved_by"), // 解决人ID
    resolvedAt: timestamp("resolved_at"), // 解决时间
    resolutionNotes: text("resolution_notes"), // 解决备注
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    errorTypeIdx: index("error_type_idx").on(table.errorType),
    severityIdx: index("severity_idx").on(table.severity),
    userIdIdx: index("user_id_idx").on(table.userId),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  })
);

export type ErrorLog = typeof errorLogs.$inferSelect;
export type NewErrorLog = typeof errorLogs.$inferInsert;

/**
 * API性能监控表
 */
export const apiPerformanceLogs = mysqlTable(
  "api_performance_logs",
  {
    id: int("id").primaryKey().autoincrement(),
    endpoint: varchar("endpoint", { length: 255 }).notNull(), // API端点
    method: varchar("method", { length: 10 }).notNull(), // HTTP方法
    userId: int("user_id"), // 用户ID
    responseTime: int("response_time").notNull(), // 响应时间（毫秒）
    statusCode: int("status_code"), // HTTP状态码
    requestSize: int("request_size"), // 请求大小（字节）
    responseSize: int("response_size"), // 响应大小（字节）
    isError: int("is_error").default(0), // 是否出错
    errorMessage: text("error_message"), // 错误信息
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    endpointIdx: index("endpoint_idx").on(table.endpoint),
    responseTimeIdx: index("response_time_idx").on(table.responseTime),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  })
);

export type ApiPerformanceLog = typeof apiPerformanceLogs.$inferSelect;
export type NewApiPerformanceLog = typeof apiPerformanceLogs.$inferInsert;

/**
 * 系统资源监控表
 */
export const systemResourceLogs = mysqlTable(
  "system_resource_logs",
  {
    id: int("id").primaryKey().autoincrement(),
    cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }), // CPU使用率（%）
    memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }), // 内存使用率（%）
    diskUsage: decimal("disk_usage", { precision: 5, scale: 2 }), // 磁盘使用率（%）
    activeConnections: int("active_connections"), // 活跃连接数
    requestsPerSecond: decimal("requests_per_second", { precision: 8, scale: 2 }), // 每秒请求数
    averageResponseTime: int("average_response_time"), // 平均响应时间（毫秒）
    errorRate: decimal("error_rate", { precision: 5, scale: 2 }), // 错误率（%）
    notes: text("notes"), // 备注
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  })
);

export type SystemResourceLog = typeof systemResourceLogs.$inferSelect;
export type NewSystemResourceLog = typeof systemResourceLogs.$inferInsert;

/**
 * 监控告警表
 */
export const monitoringAlerts = mysqlTable(
  "monitoring_alerts",
  {
    id: int("id").primaryKey().autoincrement(),
    alertType: varchar("alert_type", { length: 50 }).notNull(), // 告警类型：ErrorThreshold, PerformanceDegradation, ResourceExhaustion
    title: varchar("title", { length: 255 }).notNull(), // 告警标题
    description: text("description"), // 告警描述
    severity: varchar("severity", { length: 20 }).default("medium"), // 告警严重程度
    sourceType: varchar("source_type", { length: 50 }), // 来源类型：ErrorLog, PerformanceLog, ResourceLog
    sourceId: int("source_id"), // 来源ID
    isAcknowledged: int("is_acknowledged").default(0), // 是否已确认
    acknowledgedBy: int("acknowledged_by"), // 确认人ID
    acknowledgedAt: timestamp("acknowledged_at"), // 确认时间
    isResolved: int("is_resolved").default(0), // 是否已解决
    resolvedBy: int("resolved_by"), // 解决人ID
    resolvedAt: timestamp("resolved_at"), // 解决时间
    resolutionNotes: text("resolution_notes"), // 解决备注
    notificationSent: int("notification_sent").default(0), // 是否已发送通知
    notificationDetails: json("notification_details"), // 通知详情
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    alertTypeIdx: index("alert_type_idx").on(table.alertType),
    severityIdx: index("severity_idx").on(table.severity),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
  })
);

export type MonitoringAlert = typeof monitoringAlerts.$inferSelect;
export type NewMonitoringAlert = typeof monitoringAlerts.$inferInsert;

/**
 * 监控规则表
 */
export const monitoringRules = mysqlTable(
  "monitoring_rules",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(), // 规则名称
    description: text("description"), // 规则描述
    ruleType: varchar("rule_type", { length: 50 }).notNull(), // 规则类型：ErrorCount, ResponseTime, ResourceUsage
    condition: varchar("condition", { length: 50 }).notNull(), // 条件：>, <, >=, <=, ==
    threshold: decimal("threshold", { precision: 10, scale: 2 }).notNull(), // 阈值
    timeWindow: int("time_window").notNull(), // 时间窗口（秒）
    alertSeverity: varchar("alert_severity", { length: 20 }).default("medium"), // 告警严重程度
    enableNotification: int("enable_notification").default(1), // 是否启用通知
    notificationChannels: json("notification_channels"), // 通知渠道
    isActive: int("is_active").default(1), // 是否激活
    createdBy: int("created_by"), // 创建人ID
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    ruleTypeIdx: index("rule_type_idx").on(table.ruleType),
    isActiveIdx: index("is_active_idx").on(table.isActive),
  })
);

export type MonitoringRule = typeof monitoringRules.$inferSelect;
export type NewMonitoringRule = typeof monitoringRules.$inferInsert;
