import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, index, json } from "drizzle-orm/mysql-core";

// 合规规则表
export const complianceRules = mysqlTable("compliance_rules", {
  id: int().autoincrement().primaryKey().notNull(),
  ruleName: varchar("rule_name", { length: 200 }).notNull(),
  ruleType: mysqlEnum("rule_type", [
    'sensitive_word', // 敏感词
    'format_check', // 格式检查
    'content_policy', // 内容政策
    'copyright', // 版权检查
    'out_of_scope', // 超纲检测
    'age_appropriate' // 年龄适宜性
  ]).notNull(),
  ruleContent: json("rule_content").notNull(), // 规则内容（如敏感词列表、正则表达式等）
  severity: mysqlEnum("severity", ['low', 'medium', 'high', 'critical']).default('medium').notNull(),
  isActive: int("is_active").default(1).notNull(),
  description: text("description"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("rule_type_idx").on(table.ruleType),
  index("active_idx").on(table.isActive),
]);

export type ComplianceRule = typeof complianceRules.$inferSelect;
export type NewComplianceRule = typeof complianceRules.$inferInsert;

// 合规检测记录表
export const complianceChecks = mysqlTable("compliance_checks", {
  id: int().autoincrement().primaryKey().notNull(),
  questionId: int("question_id").notNull(),
  checkBatchId: varchar("check_batch_id", { length: 100 }), // 批次ID
  overallStatus: mysqlEnum("overall_status", ['pass', 'warning', 'fail']).default('pass').notNull(),
  violationCount: int("violation_count").default(0).notNull(),
  checkDetails: json("check_details"), // 详细检测结果
  autoReviewPassed: int("auto_review_passed").default(0).notNull(),
  needsManualReview: int("needs_manual_review").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("question_idx").on(table.questionId),
  index("batch_idx").on(table.checkBatchId),
  index("status_idx").on(table.overallStatus),
  index("manual_review_idx").on(table.needsManualReview),
]);

export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type NewComplianceCheck = typeof complianceChecks.$inferInsert;

// 合规违规记录表
export const complianceViolations = mysqlTable("compliance_violations", {
  id: int().autoincrement().primaryKey().notNull(),
  checkId: int("check_id").notNull(),
  questionId: int("question_id").notNull(),
  ruleId: int("rule_id").notNull(),
  violationType: varchar("violation_type", { length: 100 }).notNull(),
  violationContent: text("violation_content"), // 违规内容
  violationContext: text("violation_context"), // 违规上下文
  severity: mysqlEnum("severity", ['low', 'medium', 'high', 'critical']).notNull(),
  suggestedAction: text("suggested_action"), // 建议处理方式
  isResolved: int("is_resolved").default(0).notNull(),
  resolvedBy: int("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("check_idx").on(table.checkId),
  index("question_idx").on(table.questionId),
  index("rule_idx").on(table.ruleId),
  index("severity_idx").on(table.severity),
  index("resolved_idx").on(table.isResolved),
]);

export type ComplianceViolation = typeof complianceViolations.$inferSelect;
export type NewComplianceViolation = typeof complianceViolations.$inferInsert;

// 人工审核记录表
export const manualReviews = mysqlTable("manual_reviews", {
  id: int().autoincrement().primaryKey().notNull(),
  questionId: int("question_id").notNull(),
  checkId: int("check_id"),
  reviewerId: int("reviewer_id").notNull(),
  reviewStatus: mysqlEnum("review_status", ['approved', 'rejected', 'needs_revision', 'escalated']).notNull(),
  reviewNotes: text("review_notes"),
  violationsConfirmed: json("violations_confirmed"), // 确认的违规项
  violationsDismissed: json("violations_dismissed"), // 驳回的违规项
  revisionsRequired: json("revisions_required"), // 需要修改的内容
  reviewDuration: int("review_duration"), // 审核耗时（秒）
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("question_idx").on(table.questionId),
  index("reviewer_idx").on(table.reviewerId),
  index("status_idx").on(table.reviewStatus),
  index("created_idx").on(table.createdAt),
]);

export type ManualReview = typeof manualReviews.$inferSelect;
export type NewManualReview = typeof manualReviews.$inferInsert;

// 审核工作流表
export const reviewWorkflows = mysqlTable("review_workflows", {
  id: int().autoincrement().primaryKey().notNull(),
  workflowName: varchar("workflow_name", { length: 200 }).notNull(),
  triggerConditions: json("trigger_conditions"), // 触发条件
  reviewSteps: json("review_steps"), // 审核步骤
  autoApprovalRules: json("auto_approval_rules"), // 自动通过规则
  escalationRules: json("escalation_rules"), // 升级规则
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("active_idx").on(table.isActive),
]);

export type ReviewWorkflow = typeof reviewWorkflows.$inferSelect;
export type NewReviewWorkflow = typeof reviewWorkflows.$inferInsert;

// 审核统计表
export const reviewStats = mysqlTable("review_stats", {
  id: int().autoincrement().primaryKey().notNull(),
  reviewerId: int("reviewer_id").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  totalReviewed: int("total_reviewed").default(0).notNull(),
  approved: int("approved").default(0).notNull(),
  rejected: int("rejected").default(0).notNull(),
  needsRevision: int("needs_revision").default(0).notNull(),
  escalated: int("escalated").default(0).notNull(),
  avgReviewTime: int("avg_review_time").default(0).notNull(), // 平均审核时间（秒）
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("reviewer_date_idx").on(table.reviewerId, table.date),
]);

export type ReviewStat = typeof reviewStats.$inferSelect;
export type NewReviewStat = typeof reviewStats.$inferInsert;
