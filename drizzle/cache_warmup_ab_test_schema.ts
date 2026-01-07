import { mysqlTable, int, varchar, text, timestamp, float, json, index, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ==================== 缓存预热相关表 ====================

/**
 * 热门知识点统计表
 * 记录知识点的访问频率和热度,用于缓存预热决策
 */
export const knowledgePointHotness = mysqlTable("knowledge_point_hotness", {
  id: int().autoincrement().primaryKey(),
  knowledgePointId: int("knowledge_point_id").notNull(),
  knowledgePointName: varchar("knowledge_point_name", { length: 200 }).notNull(),
  subject: varchar({ length: 50 }).notNull(),
  schoolLevel: mysqlEnum("school_level", ["junior", "senior"]).notNull(),
  
  // 统计数据
  accessCount: int("access_count").notNull().default(0), // 访问次数
  analysisCount: int("analysis_count").notNull().default(0), // AI分析次数
  questionCount: int("question_count").notNull().default(0), // 关联错题数量
  hotnessScore: float("hotness_score").notNull().default(0), // 热度分数(综合计算)
  
  // 时间窗口
  lastAccessAt: timestamp("last_access_at", { mode: "date" }),
  statisticsDate: timestamp("statistics_date", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => ({
  knowledgePointIdx: index("knowledge_point_idx").on(table.knowledgePointId),
  hotnessScoreIdx: index("hotness_score_idx").on(table.hotnessScore),
  subjectLevelIdx: index("subject_level_idx").on(table.subject, table.schoolLevel),
}));

export type KnowledgePointHotness = typeof knowledgePointHotness.$inferSelect;
export type NewKnowledgePointHotness = typeof knowledgePointHotness.$inferInsert;

/**
 * 题目类型热度统计表
 * 记录不同题目类型(选择题、填空题等)的热度分布
 */
export const questionTypeHotness = mysqlTable("question_type_hotness", {
  id: int().autoincrement().primaryKey(),
  subject: varchar({ length: 50 }).notNull(),
  schoolLevel: mysqlEnum("school_level", ["junior", "senior"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  
  // 题目特征
  questionTypePattern: text("question_type_pattern").notNull(), // 题目类型特征(JSON格式)
  
  // 统计数据
  occurrenceCount: int("occurrence_count").notNull().default(0), // 出现次数
  analysisCount: int("analysis_count").notNull().default(0), // 被分析次数
  hotnessScore: float("hotness_score").notNull().default(0), // 热度分数
  
  statisticsDate: timestamp("statistics_date", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => ({
  subjectLevelDifficultyIdx: index("subject_level_difficulty_idx").on(table.subject, table.schoolLevel, table.difficulty),
  hotnessScoreIdx: index("hotness_score_idx").on(table.hotnessScore),
}));

export type QuestionTypeHotness = typeof questionTypeHotness.$inferSelect;
export type NewQuestionTypeHotness = typeof questionTypeHotness.$inferInsert;

/**
 * 预热缓存任务表
 * 管理缓存预热任务的执行和状态
 */
export const warmupTasks = mysqlTable("warmup_tasks", {
  id: int().autoincrement().primaryKey(),
  taskName: varchar("task_name", { length: 200 }).notNull(),
  taskType: mysqlEnum("task_type", ["knowledge_point", "question_type", "recommendation"]).notNull(),
  
  // 任务配置
  targetConfig: json("target_config").notNull(), // 预热目标配置(JSON格式)
  priority: int().notNull().default(5), // 优先级(1-10)
  
  // 执行状态
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).notNull().default("pending"),
  progress: float().notNull().default(0), // 进度百分比(0-100)
  
  // 执行结果
  cacheGeneratedCount: int("cache_generated_count").notNull().default(0), // 生成的缓存数量
  executionTimeMs: int("execution_time_ms"), // 执行耗时(毫秒)
  errorMessage: text("error_message"), // 错误信息
  
  // 智能优化相关字段
  recommendedByAi: int("recommended_by_ai").notNull().default(0), // 是否由AI推荐(1=是, 0=否)
  aiRecommendationScore: float("ai_recommendation_score"), // AI推荐分数(0-100)
  aiRecommendationReason: text("ai_recommendation_reason"), // AI推荐理由
  
  // 效果跟踪字段
  beforeCacheHitRate: float("before_cache_hit_rate"), // 预热前缓存命中率
  afterCacheHitRate: float("after_cache_hit_rate"), // 预热后缓存命中率
  hitRateImprovement: float("hit_rate_improvement"), // 命中率提升百分比
  beforeAvgResponseTime: int("before_avg_response_time"), // 预热前平均响应时间(毫秒)
  afterAvgResponseTime: int("after_avg_response_time"), // 预热后平均响应时间(毫秒)
  responseTimeImprovement: float("response_time_improvement"), // 响应时间改善百分比
  effectivenessScore: float("effectiveness_score"), // 效果评分(0-100)
  
  scheduledAt: timestamp("scheduled_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: timestamp("started_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => ({
  statusIdx: index("status_idx").on(table.status),
  scheduledAtIdx: index("scheduled_at_idx").on(table.scheduledAt),
}));

export type WarmupTask = typeof warmupTasks.$inferSelect;
export type NewWarmupTask = typeof warmupTasks.$inferInsert;

// ==================== 批量操作历史相关表 ====================

/**
 * 批量操作历史表
 * 记录所有批量操作的详细信息,支持撤销功能
 */
export const batchOperationHistory = mysqlTable("batch_operation_history", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  
  // 操作信息
  operationType: mysqlEnum("operation_type", [
    "batch_delete",
    "batch_mark_mastered",
    "batch_export",
    "batch_update_difficulty",
    "batch_add_tags",
    "batch_update_subject",
    "batch_update_grade"
  ]).notNull(),
  operationDescription: text("operation_description").notNull(), // 操作描述
  
  // 影响范围
  affectedCount: int("affected_count").notNull(), // 影响的记录数量
  affectedIds: json("affected_ids").notNull(), // 受影响的记录ID列表(JSON数组)
  
  // 操作内容快照
  beforeSnapshot: json("before_snapshot"), // 操作前的数据快照(JSON格式)
  afterSnapshot: json("after_snapshot"), // 操作后的数据快照(JSON格式)
  changeDetails: json("change_details"), // 变更详情(JSON格式)
  
  // 撤销状态
  canUndo: int("can_undo").notNull().default(1), // 是否可撤销(1=可以, 0=不可以)
  undoStatus: mysqlEnum("undo_status", ["none", "undone", "redo"]).notNull().default("none"),
  undoAt: timestamp("undo_at", { mode: "date" }), // 撤销时间
  undoByUserId: int("undo_by_user_id"), // 撤销操作的用户ID
  
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
  operationTypeIdx: index("operation_type_idx").on(table.operationType),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
  undoStatusIdx: index("undo_status_idx").on(table.undoStatus),
}));

export type BatchOperationHistory = typeof batchOperationHistory.$inferSelect;
export type NewBatchOperationHistory = typeof batchOperationHistory.$inferInsert;

// ==================== A/B测试相关表 ====================

/**
 * A/B测试实验配置表
 * 管理推荐算法的A/B测试实验
 */
export const abTestExperiments = mysqlTable("ab_test_experiments", {
  id: int().autoincrement().primaryKey(),
  experimentName: varchar("experiment_name", { length: 200 }).notNull(),
  experimentDescription: text("experiment_description"),
  
  // 实验配置
  controlAlgorithm: varchar("control_algorithm", { length: 100 }).notNull(), // 对照组算法名称
  treatmentAlgorithm: varchar("treatment_algorithm", { length: 100 }).notNull(), // 实验组算法名称
  algorithmConfig: json("algorithm_config"), // 算法配置参数(JSON格式)
  
  // 分组策略
  trafficSplitRatio: float("traffic_split_ratio").notNull().default(0.5), // 流量分配比例(0-1, 0.5表示50%对照50%实验)
  targetUserSegment: json("target_user_segment"), // 目标用户群体(JSON格式)
  
  // 实验状态
  status: mysqlEnum("status", ["draft", "running", "paused", "completed", "archived"]).notNull().default("draft"),
  
  // 自动决策相关字段
  autoDecisionEnabled: int("auto_decision_enabled").notNull().default(0), // 是否启用自动决策(1=是, 0=否)
  decisionStatus: mysqlEnum("decision_status", ["pending", "ready_for_decision", "decided", "notified"]).notNull().default("pending"),
  decisionMadeAt: timestamp("decision_made_at", { mode: "date" }), // 决策时间
  decisionRecommendation: mysqlEnum("decision_recommendation", ["rollout_treatment", "keep_control", "needs_review", "inconclusive"]), // 决策建议
  decisionReason: text("decision_reason"), // 决策理由
  decisionConfidence: float("decision_confidence"), // 决策置信度(0-1)
  notificationSentAt: timestamp("notification_sent_at", { mode: "date" }), // 通知发送时间
  notificationRecipients: json("notification_recipients"), // 通知接收人列表(JSON数组)
  
  // 自动决策阈值配置
  minSampleSize: int("min_sample_size").notNull().default(100), // 最小样本量
  significanceLevel: float("significance_level").notNull().default(0.05), // 显著性水平(默认0.05)
  minEffectSize: float("min_effect_size").notNull().default(0.05), // 最小效应量(默认5%提升)
  
  // 时间范围
  startDate: timestamp("start_date", { mode: "date" }),
  endDate: timestamp("end_date", { mode: "date" }),
  
  // 统计数据
  controlGroupSize: int("control_group_size").notNull().default(0), // 对照组用户数
  treatmentGroupSize: int("treatment_group_size").notNull().default(0), // 实验组用户数
  
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => ({
  statusIdx: index("status_idx").on(table.status),
  startDateIdx: index("start_date_idx").on(table.startDate),
}));

export type AbTestExperiment = typeof abTestExperiments.$inferSelect;
export type NewAbTestExperiment = typeof abTestExperiments.$inferInsert;

/**
 * A/B测试用户分组表
 * 记录用户所属的实验分组
 */
export const abTestUserGroups = mysqlTable("ab_test_user_groups", {
  id: int().autoincrement().primaryKey(),
  experimentId: int("experiment_id").notNull(),
  userId: int("user_id").notNull(),
  
  // 分组信息
  groupType: mysqlEnum("group_type", ["control", "treatment"]).notNull(), // 对照组或实验组
  assignedAt: timestamp("assigned_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  
  // 用户特征(用于后续分析)
  userFeatures: json("user_features"), // 用户特征数据(JSON格式)
  
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  experimentUserIdx: index("experiment_user_idx").on(table.experimentId, table.userId),
  userIdIdx: index("user_id_idx").on(table.userId),
}));

export type AbTestUserGroup = typeof abTestUserGroups.$inferSelect;
export type NewAbTestUserGroup = typeof abTestUserGroups.$inferInsert;

/**
 * 推荐反馈数据表
 * 收集用户对推荐结果的反馈数据
 */
export const recommendationFeedback = mysqlTable("recommendation_feedback", {
  id: int().autoincrement().primaryKey(),
  experimentId: int("experiment_id"), // 关联的A/B测试实验ID(可为空,表示非实验期间的反馈)
  userId: int("user_id").notNull(),
  
  // 推荐信息
  recommendationType: varchar("recommendation_type", { length: 100 }).notNull(), // 推荐类型
  recommendedItemId: int("recommended_item_id").notNull(), // 推荐的题目ID
  recommendationAlgorithm: varchar("recommendation_algorithm", { length: 100 }).notNull(), // 使用的算法
  recommendationRank: int("recommendation_rank"), // 推荐位置(排名)
  
  // 用户行为
  wasClicked: int("was_clicked").notNull().default(0), // 是否点击(1=是, 0=否)
  wasUsed: int("was_used").notNull().default(0), // 是否使用(1=是, 0=否)
  timeSpentSeconds: int("time_spent_seconds"), // 使用时长(秒)
  
  // 显式反馈
  userRating: int("user_rating"), // 用户评分(1-5)
  userComment: text("user_comment"), // 用户评论
  
  // 隐式反馈
  wasMarkedMastered: int("was_marked_mastered").default(0), // 是否标记为已掌握
  wasAddedToFavorites: int("was_added_to_favorites").default(0), // 是否收藏
  
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  experimentUserIdx: index("experiment_user_idx").on(table.experimentId, table.userId),
  userIdIdx: index("user_id_idx").on(table.userId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type RecommendationFeedback = typeof recommendationFeedback.$inferSelect;
export type NewRecommendationFeedback = typeof recommendationFeedback.$inferInsert;

/**
 * A/B测试统计结果表
 * 存储实验的统计分析结果
 */
export const abTestStatistics = mysqlTable("ab_test_statistics", {
  id: int().autoincrement().primaryKey(),
  experimentId: int("experiment_id").notNull(),
  
  // 统计指标
  metricName: varchar("metric_name", { length: 100 }).notNull(), // 指标名称(如CTR、使用率、满意度)
  
  // 对照组数据
  controlMean: float("control_mean").notNull(), // 对照组均值
  controlStdDev: float("control_std_dev"), // 对照组标准差
  controlSampleSize: int("control_sample_size").notNull(), // 对照组样本量
  
  // 实验组数据
  treatmentMean: float("treatment_mean").notNull(), // 实验组均值
  treatmentStdDev: float("treatment_std_dev"), // 实验组标准差
  treatmentSampleSize: int("treatment_sample_size").notNull(), // 实验组样本量
  
  // 统计检验结果
  pValue: float("p_value"), // p值
  confidenceInterval: json("confidence_interval"), // 置信区间(JSON格式: {lower, upper})
  isSignificant: int("is_significant").notNull().default(0), // 是否显著(1=是, 0=否)
  effectSize: float("effect_size"), // 效应量
  
  // 结论
  recommendation: text("recommendation"), // 推荐结论
  
  calculatedAt: timestamp("calculated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  experimentMetricIdx: index("experiment_metric_idx").on(table.experimentId, table.metricName),
}));

export type AbTestStatistic = typeof abTestStatistics.$inferSelect;
export type NewAbTestStatistic = typeof abTestStatistics.$inferInsert;
