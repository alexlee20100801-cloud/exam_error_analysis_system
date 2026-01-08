import { mysqlTable, mysqlEnum, int, varchar, text, timestamp, json, decimal, tinyint, index } from "drizzle-orm/mysql-core";

// 爬虫选择器规则配置表
export const crawlerSelectorRules = mysqlTable("crawler_selector_rules", {
  id: int().autoincrement().primaryKey().notNull(),
  websiteName: varchar("website_name", { length: 255 }).notNull(), // 网站名称
  websiteUrl: varchar("website_url", { length: 500 }).notNull(), // 网站URL
  ruleType: mysqlEnum("rule_type", ["css_selector", "xpath", "regex"]).notNull(), // 规则类型
  targetField: varchar("target_field", { length: 100 }).notNull(), // 目标字段（如：题目、答案、解析等）
  selectorRule: text("selector_rule").notNull(), // 选择器规则
  fallbackRule: text("fallback_rule"), // 备用规则
  priority: int().default(0).notNull(), // 优先级
  isActive: tinyint("is_active").default(1).notNull(), // 是否启用
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default("0.00"), // 成功率
  lastTestedAt: timestamp("last_tested_at", { mode: "string" }), // 最后测试时间
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_website_name").on(table.websiteName),
  index("idx_target_field").on(table.targetField),
  index("idx_is_active").on(table.isActive),
]);

export type CrawlerSelectorRule = typeof crawlerSelectorRules.$inferSelect;
export type NewCrawlerSelectorRule = typeof crawlerSelectorRules.$inferInsert;

// 爬虫效果统计表
export const crawlerPerformanceStats = mysqlTable("crawler_performance_stats", {
  id: int().autoincrement().primaryKey().notNull(),
  ruleId: int("rule_id").notNull(), // 关联规则ID
  websiteName: varchar("website_name", { length: 255 }).notNull(),
  totalAttempts: int("total_attempts").default(0).notNull(), // 总尝试次数
  successfulAttempts: int("successful_attempts").default(0).notNull(), // 成功次数
  failedAttempts: int("failed_attempts").default(0).notNull(), // 失败次数
  averageResponseTime: int("average_response_time").default(0).notNull(), // 平均响应时间(ms)
  dataQualityScore: decimal("data_quality_score", { precision: 5, scale: 2 }).default("0.00"), // 数据质量评分
  errorMessages: json("error_messages"), // 错误信息集合
  lastRunAt: timestamp("last_run_at", { mode: "string" }), // 最后运行时间
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_rule_id").on(table.ruleId),
  index("idx_website_name").on(table.websiteName),
  index("idx_last_run_at").on(table.lastRunAt),
]);

export type CrawlerPerformanceStat = typeof crawlerPerformanceStats.$inferSelect;
export type NewCrawlerPerformanceStat = typeof crawlerPerformanceStats.$inferInsert;

// AI分类测试集表
export const aiClassificationTestSet = mysqlTable("ai_classification_test_set", {
  id: int().autoincrement().primaryKey().notNull(),
  questionContent: text("question_content").notNull(), // 题目内容
  questionImage: varchar("question_image", { length: 500 }), // 题目图片
  expectedSubject: mysqlEnum("expected_subject", ["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]).notNull(), // 预期学科
  expectedGrade: mysqlEnum("expected_grade", ["grade7", "grade8", "grade9", "grade10", "grade11", "grade12"]).notNull(), // 预期年级
  expectedDifficulty: mysqlEnum("expected_difficulty", ["easy", "medium", "hard"]).notNull(), // 预期难度
  expectedKnowledgePoints: json("expected_knowledge_points"), // 预期知识点
  dataSource: mysqlEnum("data_source", ["user_feedback", "manual_annotation", "expert_review"]).notNull(), // 数据来源
  annotatedBy: int("annotated_by"), // 标注人ID
  confidence: decimal({ precision: 5, scale: 2 }).default("1.00"), // 标注置信度
  notes: text(), // 备注
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_expected_subject").on(table.expectedSubject),
  index("idx_data_source").on(table.dataSource),
  index("idx_annotated_by").on(table.annotatedBy),
]);

export type AiClassificationTestSet = typeof aiClassificationTestSet.$inferSelect;
export type NewAiClassificationTestSet = typeof aiClassificationTestSet.$inferInsert;

// AI分类评估历史表
export const aiClassificationEvaluationHistory = mysqlTable("ai_classification_evaluation_history", {
  id: int().autoincrement().primaryKey().notNull(),
  promptVersionId: int("prompt_version_id").notNull(), // 关联prompt版本
  testSetSize: int("test_set_size").notNull(), // 测试集大小
  overallAccuracy: decimal("overall_accuracy", { precision: 5, scale: 2 }).notNull(), // 总体准确率
  subjectAccuracy: json("subject_accuracy"), // 各学科准确率
  gradeAccuracy: json("grade_accuracy"), // 各年级准确率
  difficultyAccuracy: json("difficulty_accuracy"), // 各难度准确率
  confusionMatrix: json("confusion_matrix"), // 混淆矩阵
  errorCases: json("error_cases"), // 错误案例
  evaluatedBy: int("evaluated_by"), // 评估人ID
  evaluatedAt: timestamp("evaluated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_prompt_version_id").on(table.promptVersionId),
  index("idx_evaluated_at").on(table.evaluatedAt),
]);

export type AiClassificationEvaluationHistory = typeof aiClassificationEvaluationHistory.$inferSelect;
export type NewAiClassificationEvaluationHistory = typeof aiClassificationEvaluationHistory.$inferInsert;

// AI prompt版本管理表
export const aiPromptVersions = mysqlTable("ai_prompt_versions", {
  id: int().autoincrement().primaryKey().notNull(),
  versionName: varchar("version_name", { length: 100 }).notNull(), // 版本名称
  promptType: mysqlEnum("prompt_type", ["classification", "analysis", "recommendation"]).notNull(), // prompt类型
  promptContent: text("prompt_content").notNull(), // prompt内容
  systemMessage: text("system_message"), // 系统消息
  temperature: decimal({ precision: 3, scale: 2 }).default("0.70"), // 温度参数
  maxTokens: int("max_tokens").default(2000), // 最大token数
  isActive: tinyint("is_active").default(0).notNull(), // 是否启用
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }), // 性能评分
  notes: text(), // 备注
  createdBy: int("created_by"), // 创建人ID
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_prompt_type").on(table.promptType),
  index("idx_is_active").on(table.isActive),
  index("idx_created_by").on(table.createdBy),
]);

export type AiPromptVersion = typeof aiPromptVersions.$inferSelect;
export type NewAiPromptVersion = typeof aiPromptVersions.$inferInsert;

// 组卷反馈表
export const paperGenerationFeedback = mysqlTable("paper_generation_feedback", {
  id: int().autoincrement().primaryKey().notNull(),
  paperId: int("paper_id").notNull(), // 试卷ID
  userId: int("user_id").notNull(), // 用户ID
  difficultyRating: int("difficulty_rating").notNull(), // 难度评分(1-5)
  knowledgeCoverageRating: int("knowledge_coverage_rating").notNull(), // 知识点覆盖评分(1-5)
  questionQualityRating: int("question_quality_rating").notNull(), // 题目质量评分(1-5)
  overallSatisfaction: int("overall_satisfaction").notNull(), // 总体满意度(1-5)
  comments: text(), // 评论
  completionTime: int("completion_time"), // 完成时间(分钟)
  correctRate: decimal("correct_rate", { precision: 5, scale: 2 }), // 正确率
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_paper_id").on(table.paperId),
  index("idx_user_id").on(table.userId),
  index("idx_created_at").on(table.createdAt),
]);

export type PaperGenerationFeedback = typeof paperGenerationFeedback.$inferSelect;
export type NewPaperGenerationFeedback = typeof paperGenerationFeedback.$inferInsert;

// 组卷算法参数配置表
export const paperAlgorithmConfig = mysqlTable("paper_algorithm_config", {
  id: int().autoincrement().primaryKey().notNull(),
  configName: varchar("config_name", { length: 100 }).notNull(), // 配置名称
  algorithmVersion: varchar("algorithm_version", { length: 50 }).notNull(), // 算法版本
  errorFrequencyWeight: decimal("error_frequency_weight", { precision: 5, scale: 2 }).default("0.30"), // 错题频率权重
  knowledgeCoverageWeight: decimal("knowledge_coverage_weight", { precision: 5, scale: 2 }).default("0.25"), // 知识点覆盖权重
  difficultyBalanceWeight: decimal("difficulty_balance_weight", { precision: 5, scale: 2 }).default("0.20"), // 难度平衡权重
  masteryLevelWeight: decimal("mastery_level_weight", { precision: 5, scale: 2 }).default("0.15"), // 掌握度权重
  recencyWeight: decimal("recency_weight", { precision: 5, scale: 2 }).default("0.10"), // 时间新近度权重
  minQualityScore: decimal("min_quality_score", { precision: 5, scale: 2 }).default("0.60"), // 最低质量评分
  isActive: tinyint("is_active").default(0).notNull(), // 是否启用
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }), // 性能评分
  notes: text(), // 备注
  createdBy: int("created_by"), // 创建人ID
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_is_active").on(table.isActive),
  index("idx_algorithm_version").on(table.algorithmVersion),
]);

export type PaperAlgorithmConfig = typeof paperAlgorithmConfig.$inferSelect;
export type NewPaperAlgorithmConfig = typeof paperAlgorithmConfig.$inferInsert;

// 组卷质量评估历史表
export const paperQualityEvaluationHistory = mysqlTable("paper_quality_evaluation_history", {
  id: int().autoincrement().primaryKey().notNull(),
  configId: int("config_id").notNull(), // 关联配置ID
  evaluationPeriod: varchar("evaluation_period", { length: 50 }).notNull(), // 评估周期（如：2024-01）
  totalPapers: int("total_papers").notNull(), // 总试卷数
  averageSatisfaction: decimal("average_satisfaction", { precision: 5, scale: 2 }).notNull(), // 平均满意度
  averageDifficultyRating: decimal("average_difficulty_rating", { precision: 5, scale: 2 }).notNull(), // 平均难度评分
  averageKnowledgeCoverage: decimal("average_knowledge_coverage", { precision: 5, scale: 2 }).notNull(), // 平均知识点覆盖
  averageQuestionQuality: decimal("average_question_quality", { precision: 5, scale: 2 }).notNull(), // 平均题目质量
  averageCorrectRate: decimal("average_correct_rate", { precision: 5, scale: 2 }), // 平均正确率
  improvementSuggestions: json("improvement_suggestions"), // 改进建议
  evaluatedAt: timestamp("evaluated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_config_id").on(table.configId),
  index("idx_evaluation_period").on(table.evaluationPeriod),
  index("idx_evaluated_at").on(table.evaluatedAt),
]);

export type PaperQualityEvaluationHistory = typeof paperQualityEvaluationHistory.$inferSelect;
export type NewPaperQualityEvaluationHistory = typeof paperQualityEvaluationHistory.$inferInsert;
