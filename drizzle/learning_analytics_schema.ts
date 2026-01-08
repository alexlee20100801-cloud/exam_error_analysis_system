import { mysqlTable, mysqlEnum, int, varchar, text, timestamp, json, decimal, tinyint, index } from "drizzle-orm/mysql-core";

/**
 * 学习时长记录表 - 记录每次学习会话的时长
 */
export const studySessions = mysqlTable("study_sessions", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  subject: mysqlEnum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  // 学习时长（秒）
  duration: int().notNull(),
  // 学习类型
  activityType: mysqlEnum("activity_type", ['review', 'practice', 'analysis', 'upload']).notNull(),
  // 关联的错题ID（如果是复习错题）
  errorQuestionId: int("error_question_id"),
  // 开始时间
  startedAt: timestamp("started_at", { mode: 'string' }).notNull(),
  // 结束时间
  endedAt: timestamp("ended_at", { mode: 'string' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index("idx_user_subject").on(table.userId, table.subject),
  index("idx_user_started_at").on(table.userId, table.startedAt),
  index("idx_error_question").on(table.errorQuestionId),
]);

/**
 * 学科掌握度快照表 - 定期记录各学科掌握度
 */
export const subjectMasterySnapshots = mysqlTable("subject_mastery_snapshots", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  subject: mysqlEnum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  // 掌握度百分比 (0-100)
  masteryRate: decimal("mastery_rate", { precision: 5, scale: 2 }).notNull(),
  // 总错题数
  totalQuestions: int("total_questions").default(0).notNull(),
  // 已掌握错题数
  masteredQuestions: int("mastered_questions").default(0).notNull(),
  // 待复习错题数
  pendingQuestions: int("pending_questions").default(0).notNull(),
  // 快照时间
  snapshotDate: timestamp("snapshot_date", { mode: 'string' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index("idx_user_subject_date").on(table.userId, table.subject, table.snapshotDate),
]);

/**
 * 复习提醒配置表 - 用户的复习偏好设置
 */
export const reviewReminderSettings = mysqlTable("review_reminder_settings", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  // 是否启用提醒
  isEnabled: tinyint("is_enabled").default(1).notNull(),
  // 提醒时间（HH:MM格式）
  reminderTime: varchar("reminder_time", { length: 5 }).default('20:00').notNull(),
  // 提醒方式
  reminderMethod: mysqlEnum("reminder_method", ['system', 'email', 'sms']).default('system').notNull(),
  // 每日最大提醒数量
  maxDailyReminders: int("max_daily_reminders").default(10).notNull(),
  // 优先提醒的学科（JSON数组）
  prioritySubjects: json("priority_subjects"),
  // 是否在周末提醒
  remindOnWeekends: tinyint("remind_on_weekends").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_user_id").on(table.userId),
]);

/**
 * 学习报告表 - 周报/月报
 */
export const learningReports = mysqlTable("learning_reports", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  // 报告类型
  reportType: mysqlEnum("report_type", ['weekly', 'monthly']).notNull(),
  // 报告周期开始日期
  periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
  // 报告周期结束日期
  periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
  // 总学习时长（秒）
  totalStudyTime: int("total_study_time").default(0).notNull(),
  // 新增错题数
  newQuestionsCount: int("new_questions_count").default(0).notNull(),
  // 复习错题数
  reviewedQuestionsCount: int("reviewed_questions_count").default(0).notNull(),
  // 掌握错题数
  masteredQuestionsCount: int("mastered_questions_count").default(0).notNull(),
  // 各学科掌握度（JSON对象）
  subjectMastery: json("subject_mastery").notNull(),
  // 薄弱知识点（JSON数组）
  weakKnowledgePoints: json("weak_knowledge_points").notNull(),
  // AI生成的改进建议
  improvementSuggestions: text("improvement_suggestions"),
  // 学习进步评分（0-100）
  progressScore: decimal("progress_score", { precision: 5, scale: 2 }),
  // 报告生成状态
  status: mysqlEnum(['generating', 'completed', 'failed']).default('generating').notNull(),
  // 是否已推送通知
  isNotified: tinyint("is_notified").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_user_period").on(table.userId, table.periodStart, table.periodEnd),
  index("idx_user_type").on(table.userId, table.reportType),
  index("idx_status").on(table.status),
]);

// 类型导出
export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;

export type SubjectMasterySnapshot = typeof subjectMasterySnapshots.$inferSelect;
export type NewSubjectMasterySnapshot = typeof subjectMasterySnapshots.$inferInsert;

export type ReviewReminderSetting = typeof reviewReminderSettings.$inferSelect;
export type NewReviewReminderSetting = typeof reviewReminderSettings.$inferInsert;

export type LearningReport = typeof learningReports.$inferSelect;
export type NewLearningReport = typeof learningReports.$inferInsert;
