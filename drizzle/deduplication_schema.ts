import { mysqlTable, int, varchar, text, decimal, timestamp, mysqlEnum, index, json } from "drizzle-orm/mysql-core";

// 试题相似度记录表
export const questionSimilarities = mysqlTable("question_similarities", {
  id: int().autoincrement().primaryKey().notNull(),
  question1Id: int("question_1_id").notNull(),
  question2Id: int("question_2_id").notNull(),
  textSimilarity: decimal("text_similarity", { precision: 5, scale: 2 }).notNull(), // 文本相似度 0-100
  imageSimilarity: decimal("image_similarity", { precision: 5, scale: 2 }), // 图片相似度 0-100
  overallSimilarity: decimal("overall_similarity", { precision: 5, scale: 2 }).notNull(), // 综合相似度
  similarityMethod: varchar("similarity_method", { length: 50 }).notNull(), // 算法：cosine, jaccard, levenshtein
  comparisonDetails: json("comparison_details"), // 详细对比数据
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("q1_q2_idx").on(table.question1Id, table.question2Id),
  index("similarity_idx").on(table.overallSimilarity),
]);

export type QuestionSimilarity = typeof questionSimilarities.$inferSelect;
export type NewQuestionSimilarity = typeof questionSimilarities.$inferInsert;

// 去重处理记录表
export const deduplicationRecords = mysqlTable("deduplication_records", {
  id: int().autoincrement().primaryKey().notNull(),
  batchId: varchar("batch_id", { length: 100 }).notNull(), // 批次ID
  questionId: int("question_id").notNull(),
  action: mysqlEnum("action", ['keep', 'merge', 'discard']).notNull(),
  reason: text("reason"), // 处理原因
  duplicateGroupId: varchar("duplicate_group_id", { length: 100 }), // 重复组ID
  similarQuestionIds: json("similar_question_ids"), // 相似试题ID列表
  processedBy: varchar("processed_by", { length: 100 }), // 处理人（系统/用户ID）
  processedAt: timestamp("processed_at").defaultNow().notNull(),
}, (table) => [
  index("batch_idx").on(table.batchId),
  index("question_idx").on(table.questionId),
  index("group_idx").on(table.duplicateGroupId),
]);

export type DeduplicationRecord = typeof deduplicationRecords.$inferSelect;
export type NewDeduplicationRecord = typeof deduplicationRecords.$inferInsert;

// 噪声检测记录表
export const noiseDetectionRecords = mysqlTable("noise_detection_records", {
  id: int().autoincrement().primaryKey().notNull(),
  questionId: int("question_id").notNull(),
  noiseType: mysqlEnum("noise_type", [
    'incomplete', // 不完整
    'garbled', // 乱码
    'low_quality_image', // 低质量图片
    'missing_answer', // 缺少答案
    'invalid_format', // 格式错误
    'spam' // 垃圾内容
  ]).notNull(),
  noiseScore: decimal("noise_score", { precision: 5, scale: 2 }).notNull(), // 噪声分数 0-100
  detectionDetails: json("detection_details"), // 检测详情
  isFiltered: int("is_filtered").default(0).notNull(), // 是否已过滤
  reviewStatus: mysqlEnum("review_status", ['pending', 'confirmed', 'false_positive']).default('pending').notNull(),
  reviewedBy: int("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("question_idx").on(table.questionId),
  index("noise_type_idx").on(table.noiseType),
  index("review_status_idx").on(table.reviewStatus),
]);

export type NoiseDetectionRecord = typeof noiseDetectionRecords.$inferSelect;
export type NewNoiseDetectionRecord = typeof noiseDetectionRecords.$inferInsert;

// 查重配置表
export const deduplicationConfig = mysqlTable("deduplication_config", {
  id: int().autoincrement().primaryKey().notNull(),
  configName: varchar("config_name", { length: 100 }).notNull(),
  textSimilarityThreshold: decimal("text_similarity_threshold", { precision: 5, scale: 2 }).default('90.00').notNull(),
  imageSimilarityThreshold: decimal("image_similarity_threshold", { precision: 5, scale: 2 }).default('85.00').notNull(),
  overallSimilarityThreshold: decimal("overall_similarity_threshold", { precision: 5, scale: 2 }).default('90.00').notNull(),
  enableImageComparison: int("enable_image_comparison").default(1).notNull(),
  enableSemanticComparison: int("enable_semantic_comparison").default(1).notNull(),
  autoMergeThreshold: decimal("auto_merge_threshold", { precision: 5, scale: 2 }).default('95.00').notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("active_idx").on(table.isActive),
]);

export type DeduplicationConfig = typeof deduplicationConfig.$inferSelect;
export type NewDeduplicationConfig = typeof deduplicationConfig.$inferInsert;
