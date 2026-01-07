import { mysqlTable, int, varchar, timestamp, decimal, index, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * 上传历史记录表
 * 记录每次批量上传的统计信息,便于追踪和改进
 */
export const uploadHistory = mysqlTable("upload_history", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  sessionId: int("session_id"), // 关联到upload_sessions
  uploadType: mysqlEnum("upload_type", ['single', 'batch']).default('batch').notNull(),
  // 统计信息
  totalCount: int("total_count").default(0).notNull(), // 上传总数
  successCount: int("success_count").default(0).notNull(), // 成功识别数
  failedCount: int("failed_count").default(0).notNull(), // 识别失败数
  averageConfidence: decimal("average_confidence", { precision: 5, scale: 2 }), // 平均识别置信度
  // 科目分布(JSON格式存储各科目数量)
  subjectDistribution: varchar("subject_distribution", { length: 500 }), // 例如: {"math":5,"physics":3}
  // 年级分布
  gradeDistribution: varchar("grade_distribution", { length: 500 }),
  // 处理时长(秒)
  processingDuration: int("processing_duration"),
  // 时间戳
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_user_id").on(table.userId),
  index("idx_session_id").on(table.sessionId),
  index("idx_created_at").on(table.createdAt),
]);

export type UploadHistory = typeof uploadHistory.$inferSelect;
export type NewUploadHistory = typeof uploadHistory.$inferInsert;
