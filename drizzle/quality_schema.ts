import { mysqlTable, int, decimal, text, timestamp, mysqlEnum, index, varchar } from "drizzle-orm/mysql-core";

// 质量评分表
export const qualityScores = mysqlTable("quality_scores", {
  id: int().autoincrement().primaryKey().notNull(),
  questionId: int("question_id").notNull(),
  
  // 总体评分
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  
  // 各维度评分
  completenessScore: decimal("completeness_score", { precision: 5, scale: 2 }).notNull(), // 完整性 (30分)
  accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }).notNull(), // 准确性 (30分)
  clarityScore: decimal("clarity_score", { precision: 5, scale: 2 }).notNull(), // 清晰度 (20分)
  difficultyScore: decimal("difficulty_score", { precision: 5, scale: 2 }).notNull(), // 难度适中 (10分)
  knowledgeTagScore: decimal("knowledge_tag_score", { precision: 5, scale: 2 }).notNull(), // 知识点标注 (10分)
  
  // 发现的问题
  issuesFound: text("issues_found"), // 问题描述
  
  // 评分方法
  scoringMethod: mysqlEnum("scoring_method", ['auto', 'manual', 'hybrid']).default('auto').notNull(),
  
  // 审核信息
  reviewedBy: int("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("question_idx").on(table.questionId),
  index("overall_score_idx").on(table.overallScore),
  index("scoring_method_idx").on(table.scoringMethod),
]);

export type QualityScore = typeof qualityScores.$inferSelect;
export type NewQualityScore = typeof qualityScores.$inferInsert;

// 质量评分规则表
export const qualityRules = mysqlTable("quality_rules", {
  id: int().autoincrement().primaryKey().notNull(),
  ruleName: varchar("rule_name", { length: 200 }).notNull(),
  ruleCategory: mysqlEnum("rule_category", [
    'completeness', // 完整性
    'accuracy', // 准确性
    'clarity', // 清晰度
    'difficulty', // 难度
    'knowledge_tag' // 知识点标注
  ]).notNull(),
  ruleDescription: text("rule_description"),
  weight: decimal("weight", { precision: 5, scale: 2 }).default('1.00').notNull(), // 权重
  threshold: decimal("threshold", { precision: 5, scale: 2 }), // 阈值
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("category_idx").on(table.ruleCategory),
  index("active_idx").on(table.isActive),
]);

export type QualityRule = typeof qualityRules.$inferSelect;
export type NewQualityRule = typeof qualityRules.$inferInsert;

// 质量改进建议表
export const qualityImprovements = mysqlTable("quality_improvements", {
  id: int().autoincrement().primaryKey().notNull(),
  questionId: int("question_id").notNull(),
  scoreId: int("score_id").notNull(),
  issueCategory: mysqlEnum("issue_category", [
    'completeness',
    'accuracy',
    'clarity',
    'difficulty',
    'knowledge_tag'
  ]).notNull(),
  issueDescription: text("issue_description").notNull(),
  suggestedFix: text("suggested_fix"), // 建议的修复方案
  priority: mysqlEnum("priority", ['low', 'medium', 'high', 'critical']).default('medium').notNull(),
  status: mysqlEnum("status", ['pending', 'in_progress', 'resolved', 'dismissed']).default('pending').notNull(),
  resolvedBy: int("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("question_idx").on(table.questionId),
  index("score_idx").on(table.scoreId),
  index("category_idx").on(table.issueCategory),
  index("priority_idx").on(table.priority),
  index("status_idx").on(table.status),
]);

export type QualityImprovement = typeof qualityImprovements.$inferSelect;
export type NewQualityImprovement = typeof qualityImprovements.$inferInsert;
