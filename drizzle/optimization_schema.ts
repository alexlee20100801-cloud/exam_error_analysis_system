import { mysqlTable, int, varchar, text, timestamp, decimal, json, mysqlEnum } from "drizzle-orm/mysql-core";

// AI分类性能指标表
export const aiClassificationMetrics = mysqlTable("ai_classification_metrics", {
  id: int("id").primaryKey().autoincrement(),
  promptVersionId: int("prompt_version_id").notNull(), // 关联prompt版本
  evaluationDate: timestamp("evaluation_date").notNull().defaultNow(),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }).notNull(), // 准确率 0-1
  precision: decimal("precision", { precision: 5, scale: 4 }), // 精确率
  recall: decimal("recall", { precision: 5, scale: 4 }), // 召回率
  f1Score: decimal("f1_score", { precision: 5, scale: 4 }), // F1分数
  testSampleCount: int("test_sample_count").notNull(), // 测试样本数量
  confusionMatrix: json("confusion_matrix"), // 混淆矩阵数据
  errorCases: json("error_cases"), // 错误案例列表
  avgResponseTime: int("avg_response_time"), // 平均响应时间(ms)
  notes: text("notes"), // 备注
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 组卷算法性能指标表
export const paperAlgorithmMetrics = mysqlTable("paper_algorithm_metrics", {
  id: int("id").primaryKey().autoincrement(),
  configId: int("config_id").notNull(), // 关联算法配置
  evaluationDate: timestamp("evaluation_date").notNull().defaultNow(),
  avgSatisfactionScore: decimal("avg_satisfaction_score", { precision: 3, scale: 2 }), // 平均满意度 1-5
  knowledgeCoverageScore: decimal("knowledge_coverage_score", { precision: 3, scale: 2 }), // 知识点覆盖度评分
  difficultyDistributionScore: decimal("difficulty_distribution_score", { precision: 3, scale: 2 }), // 难度分布评分
  questionTypeVarietyScore: decimal("question_type_variety_score", { precision: 3, scale: 2 }), // 题型多样性评分
  generationSuccessRate: decimal("generation_success_rate", { precision: 5, scale: 4 }), // 生成成功率
  avgGenerationTime: int("avg_generation_time"), // 平均生成时间(ms)
  feedbackCount: int("feedback_count").notNull(), // 反馈数量
  feedbackDistribution: json("feedback_distribution"), // 反馈分布(满意/一般/不满意)
  weightParameters: json("weight_parameters"), // 当前权重参数快照
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 爬虫性能指标表
export const crawlerPerformanceMetrics = mysqlTable("crawler_performance_metrics", {
  id: int("id").primaryKey().autoincrement(),
  selectorRuleId: int("selector_rule_id").notNull(), // 关联选择器规则
  evaluationDate: timestamp("evaluation_date").notNull().defaultNow(),
  successRate: decimal("success_rate", { precision: 5, scale: 4 }).notNull(), // 成功率
  avgDataQualityScore: decimal("avg_data_quality_score", { precision: 3, scale: 2 }), // 平均数据质量评分
  totalAttempts: int("total_attempts").notNull(), // 总尝试次数
  successfulAttempts: int("successful_attempts").notNull(), // 成功次数
  failedAttempts: int("failed_attempts").notNull(), // 失败次数
  avgResponseTime: int("avg_response_time"), // 平均响应时间(ms)
  errorTypes: json("error_types"), // 错误类型统计
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 性能告警规则表
export const performanceAlertRules = mysqlTable("performance_alert_rules", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(), // 规则名称
  metricType: mysqlEnum("metric_type", [
    "ai_classification",
    "paper_algorithm",
    "crawler_performance"
  ]).notNull(), // 指标类型
  metricName: varchar("metric_name", { length: 100 }).notNull(), // 指标名称(如accuracy, satisfaction_score)
  operator: mysqlEnum("operator", ["<", "<=", ">", ">=", "=="]).notNull(), // 比较运算符
  threshold: decimal("threshold", { precision: 10, scale: 4 }).notNull(), // 阈值
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("medium"), // 严重程度
  notificationChannels: json("notification_channels").notNull(), // 通知渠道配置
  isActive: int("is_active").notNull().default(1), // 是否启用
  description: text("description"), // 规则描述
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// 性能告警记录表
export const performanceAlerts = mysqlTable("performance_alerts", {
  id: int("id").primaryKey().autoincrement(),
  ruleId: int("rule_id").notNull(), // 关联告警规则
  metricType: mysqlEnum("metric_type", [
    "ai_classification",
    "paper_algorithm",
    "crawler_performance"
  ]).notNull(),
  metricId: int("metric_id").notNull(), // 关联具体指标记录ID
  alertTime: timestamp("alert_time").notNull().defaultNow(),
  metricValue: decimal("metric_value", { precision: 10, scale: 4 }).notNull(), // 触发告警的指标值
  threshold: decimal("threshold", { precision: 10, scale: 4 }).notNull(), // 阈值
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  status: mysqlEnum("status", ["pending", "acknowledged", "resolved", "ignored"]).notNull().default("pending"),
  notificationSent: int("notification_sent").notNull().default(0), // 是否已发送通知
  notificationDetails: json("notification_details"), // 通知发送详情
  acknowledgedBy: int("acknowledged_by"), // 确认人
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: int("resolved_by"), // 解决人
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"), // 解决说明
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 周报生成记录表
export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").primaryKey().autoincrement(),
  reportType: mysqlEnum("report_type", [
    "ai_classification",
    "paper_algorithm",
    "crawler_performance",
    "comprehensive"
  ]).notNull(), // 报告类型
  weekStartDate: timestamp("week_start_date").notNull(), // 周开始日期
  weekEndDate: timestamp("week_end_date").notNull(), // 周结束日期
  reportData: json("report_data").notNull(), // 报告数据(JSON格式)
  summary: text("summary"), // 摘要
  highlights: json("highlights"), // 亮点
  issues: json("issues"), // 问题
  recommendations: json("recommendations"), // 建议
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  generatedBy: int("generated_by"), // 生成人(null表示自动生成)
});

// 定时任务执行日志表
export const scheduledTaskLogs = mysqlTable("scheduled_task_logs", {
  id: int("id").primaryKey().autoincrement(),
  taskName: varchar("task_name", { length: 255 }).notNull(), // 任务名称
  taskType: mysqlEnum("task_type", [
    "performance_evaluation",
    "weekly_report_generation",
    "alert_check",
    "cache_warmup",
    "ab_test_decision"
  ]).notNull(), // 任务类型
  executionTime: timestamp("execution_time").notNull().defaultNow(), // 执行时间
  status: mysqlEnum("status", ["success", "failed", "partial"]).notNull(), // 执行状态
  duration: int("duration"), // 执行时长(ms)
  details: json("details"), // 执行详情
  errorMessage: text("error_message"), // 错误信息
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 类型导出
export type AiClassificationMetric = typeof aiClassificationMetrics.$inferSelect;
export type NewAiClassificationMetric = typeof aiClassificationMetrics.$inferInsert;

export type PaperAlgorithmMetric = typeof paperAlgorithmMetrics.$inferSelect;
export type NewPaperAlgorithmMetric = typeof paperAlgorithmMetrics.$inferInsert;

export type CrawlerPerformanceMetric = typeof crawlerPerformanceMetrics.$inferSelect;
export type NewCrawlerPerformanceMetric = typeof crawlerPerformanceMetrics.$inferInsert;

export type PerformanceAlertRule = typeof performanceAlertRules.$inferSelect;
export type NewPerformanceAlertRule = typeof performanceAlertRules.$inferInsert;

export type PerformanceAlert = typeof performanceAlerts.$inferSelect;
export type NewPerformanceAlert = typeof performanceAlerts.$inferInsert;

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type NewWeeklyReport = typeof weeklyReports.$inferInsert;

export type ScheduledTaskLog = typeof scheduledTaskLogs.$inferSelect;
export type NewScheduledTaskLog = typeof scheduledTaskLogs.$inferInsert;
