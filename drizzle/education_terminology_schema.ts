import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, index } from "drizzle-orm/mysql-core";

/**
 * 教育术语对照表
 * 存储中日韩英四语言的教育领域专业术语对照
 */
export const educationTerminology = mysqlTable("education_terminology", {
  id: int("id").primaryKey().autoincrement(),
  
  // 术语分类
  category: mysqlEnum("category", [
    "general",      // 通用教育术语
    "math",         // 数学
    "physics",      // 物理
    "chemistry",    // 化学
    "biology",      // 生物
    "chinese",      // 语文
    "english",      // 英语
    "history",      // 历史
    "geography",    // 地理
    "politics"      // 政治
  ]).notNull().default("general"),
  
  // 子分类（如数学中的代数、几何等）
  subCategory: varchar("sub_category", { length: 100 }),
  
  // 四语言术语
  termChinese: varchar("term_chinese", { length: 255 }).notNull(),
  termJapanese: varchar("term_japanese", { length: 255 }),
  termKorean: varchar("term_korean", { length: 255 }),
  termEnglish: varchar("term_english", { length: 255 }),
  
  // 术语说明和上下文
  descriptionChinese: text("description_chinese"),
  descriptionJapanese: text("description_japanese"),
  descriptionKorean: text("description_korean"),
  descriptionEnglish: text("description_english"),
  
  // 使用示例
  exampleChinese: text("example_chinese"),
  exampleJapanese: text("example_japanese"),
  exampleKorean: text("example_korean"),
  exampleEnglish: text("example_english"),
  
  // 校对状态
  japaneseReviewStatus: mysqlEnum("japanese_review_status", ["pending", "reviewed", "approved", "rejected"]).default("pending"),
  koreanReviewStatus: mysqlEnum("korean_review_status", ["pending", "reviewed", "approved", "rejected"]).default("pending"),
  
  // 校对者信息
  japaneseReviewerId: int("japanese_reviewer_id"),
  koreanReviewerId: int("korean_reviewer_id"),
  japaneseReviewedAt: timestamp("japanese_reviewed_at"),
  koreanReviewedAt: timestamp("korean_reviewed_at"),
  japaneseReviewNotes: text("japanese_review_notes"),
  koreanReviewNotes: text("korean_review_notes"),
  
  // 元数据
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  categoryIdx: index("category_idx").on(table.category),
  termChineseIdx: index("term_chinese_idx").on(table.termChinese),
  japaneseReviewStatusIdx: index("japanese_review_status_idx").on(table.japaneseReviewStatus),
  koreanReviewStatusIdx: index("korean_review_status_idx").on(table.koreanReviewStatus),
}));

/**
 * 术语校对记录表
 * 记录每次校对的详细信息
 */
export const terminologyReviewHistory = mysqlTable("terminology_review_history", {
  id: int("id").primaryKey().autoincrement(),
  terminologyId: int("terminology_id").notNull(),
  
  // 校对语言
  language: mysqlEnum("language", ["japanese", "korean"]).notNull(),
  
  // 校对前后内容
  previousTerm: varchar("previous_term", { length: 255 }),
  newTerm: varchar("new_term", { length: 255 }),
  previousDescription: text("previous_description"),
  newDescription: text("new_description"),
  
  // 校对结果
  action: mysqlEnum("action", ["approved", "corrected", "rejected"]).notNull(),
  reviewNotes: text("review_notes"),
  
  // 校对者信息
  reviewerId: int("reviewer_id").notNull(),
  reviewerName: varchar("reviewer_name", { length: 100 }),
  isNativeSpeaker: int("is_native_speaker").default(0), // 是否母语者
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  terminologyIdIdx: index("terminology_id_idx").on(table.terminologyId),
  languageIdx: index("language_idx").on(table.language),
  reviewerIdIdx: index("reviewer_id_idx").on(table.reviewerId),
}));

/**
 * 术语验证记录表
 * 记录学科术语验证结果
 */
export const terminologyValidation = mysqlTable("terminology_validation", {
  id: int("id").primaryKey().autoincrement(),
  
  // 验证批次
  batchId: varchar("batch_id", { length: 64 }).notNull(),
  
  // 验证范围
  category: mysqlEnum("category", [
    "math", "physics", "chemistry", "biology",
    "chinese", "english", "history", "geography", "politics"
  ]).notNull(),
  language: mysqlEnum("language", ["japanese", "korean"]).notNull(),
  
  // 验证统计
  totalTerms: int("total_terms").notNull().default(0),
  validatedTerms: int("validated_terms").notNull().default(0),
  correctedTerms: int("corrected_terms").notNull().default(0),
  pendingTerms: int("pending_terms").notNull().default(0),
  
  // 验证结果
  validationScore: int("validation_score"), // 0-100
  issues: text("issues"), // JSON格式的问题列表
  recommendations: text("recommendations"),
  
  // 验证者信息
  validatorId: int("validator_id"),
  validatorName: varchar("validator_name", { length: 100 }),
  
  // 状态
  status: mysqlEnum("status", ["in_progress", "completed", "cancelled"]).default("in_progress"),
  
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  batchIdIdx: index("batch_id_idx").on(table.batchId),
  categoryIdx: index("category_idx").on(table.category),
  languageIdx: index("language_idx").on(table.language),
  statusIdx: index("status_idx").on(table.status),
}));

// 类型导出
export type EducationTerminology = typeof educationTerminology.$inferSelect;
export type NewEducationTerminology = typeof educationTerminology.$inferInsert;

export type TerminologyReviewHistory = typeof terminologyReviewHistory.$inferSelect;
export type NewTerminologyReviewHistory = typeof terminologyReviewHistory.$inferInsert;

export type TerminologyValidation = typeof terminologyValidation.$inferSelect;
export type NewTerminologyValidation = typeof terminologyValidation.$inferInsert;
