import { mysqlTable, int, varchar, text, timestamp, json, tinyint, index, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * 批量上传会话表
 * 用于暂存批量上传的错题,支持批量编辑后再统一保存
 */
export const uploadSessions = mysqlTable("upload_sessions", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  sessionKey: varchar("session_key", { length: 64 }).notNull(), // 唯一会话标识
  status: mysqlEnum(['pending', 'editing', 'completed', 'cancelled']).default('pending').notNull(),
  totalCount: int("total_count").default(0).notNull(), // 本次上传总数
  processedCount: int("processed_count").default(0).notNull(), // 已处理数量
  // 批量编辑的公共属性(可选,用户可统一设置)
  commonSubject: mysqlEnum("common_subject", ['chinese','math','english','physics','chemistry','biology','politics','history','geography']),
  commonGrade: mysqlEnum("common_grade", ['junior1','junior2','junior3','senior1','senior2','senior3']),
  commonDifficulty: mysqlEnum("common_difficulty", ['easy','medium','hard']),
  commonSemester: mysqlEnum("common_semester", ['first','second']),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completed_at", { mode: 'string' }),
},
(table) => [
  index("idx_user_session").on(table.userId, table.sessionKey),
  index("idx_status").on(table.status),
]);

export type UploadSession = typeof uploadSessions.$inferSelect;
export type NewUploadSession = typeof uploadSessions.$inferInsert;

/**
 * 批量上传暂存项表
 * 存储每个待处理的错题项,关联到上传会话
 */
export const uploadSessionItems = mysqlTable("upload_session_items", {
  id: int().autoincrement().primaryKey().notNull(),
  sessionId: int("session_id").notNull(),
  imageUrl: text("image_url").notNull(),
  imageKey: varchar("image_key", { length: 500 }),
  ocrContent: text("ocr_content"), // OCR识别的原始内容
  ocrConfidence: int("ocr_confidence"), // OCR置信度(0-100)
  // 可单独编辑的属性
  title: varchar({ length: 500 }),
  subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']),
  grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']),
  difficulty: mysqlEnum(['easy','medium','hard']),
  semester: mysqlEnum(['first','second']),
  userNotes: text("user_notes"),
  status: mysqlEnum(['pending', 'processed', 'skipped', 'error']).default('pending').notNull(),
  errorMessage: text("error_message"), // 处理错误信息
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_session_id").on(table.sessionId),
  index("idx_status").on(table.status),
]);

export type UploadSessionItem = typeof uploadSessionItems.$inferSelect;
export type NewUploadSessionItem = typeof uploadSessionItems.$inferInsert;

/**
 * AI分析缓存表
 * 存储题目的AI分析结果,避免重复分析相同题目
 */
export const questionAnalysisCache = mysqlTable("question_analysis_cache", {
  id: int().autoincrement().primaryKey().notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(), // 题目内容的SHA256哈希
  imageHash: varchar("image_hash", { length: 64 }), // 题目图片的感知哈希(可选)
  subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
  grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
  // 缓存的AI分析结果
  errorAnalysis: text("error_analysis"),
  correctAnswer: text("correct_answer"),
  detailedExplanation: text("detailed_explanation"),
  detailedAnalysis: text("detailed_analysis"),
  knowledgePointIds: json("knowledge_point_ids"),
  difficulty: mysqlEnum(['easy','medium','hard']),
  // 缓存元数据
  hitCount: int("hit_count").default(0).notNull(), // 缓存命中次数
  lastHitAt: timestamp("last_hit_at", { mode: 'string' }), // 最后命中时间
  analysisVersion: varchar("analysis_version", { length: 32 }).default('v1').notNull(), // 分析模型版本
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_content_hash").on(table.contentHash),
  index("idx_image_hash").on(table.imageHash),
  index("idx_subject_grade").on(table.subject, table.grade),
  index("idx_hit_count").on(table.hitCount),
]);

export type QuestionAnalysisCache = typeof questionAnalysisCache.$inferSelect;
export type NewQuestionAnalysisCache = typeof questionAnalysisCache.$inferInsert;
