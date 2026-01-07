import { mysqlTable, int, varchar, timestamp, text, tinyint, index, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * 教师-班级关联表
 * 记录教师管理的班级
 */
export const teacherClasses = mysqlTable("teacher_classes", {
  id: int().autoincrement().primaryKey().notNull(),
  teacherId: int("teacher_id").notNull(), // 教师用户ID
  className: varchar("class_name", { length: 100 }).notNull(), // 班级名称
  grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
  subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']), // 任教科目
  schoolYear: varchar("school_year", { length: 20 }), // 学年,如"2024-2025"
  semester: mysqlEnum(['first','second']),
  isActive: tinyint("is_active").default(1).notNull(), // 是否活跃
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_teacher_id").on(table.teacherId),
  index("idx_grade_subject").on(table.grade, table.subject),
]);

export type TeacherClass = typeof teacherClasses.$inferSelect;
export type NewTeacherClass = typeof teacherClasses.$inferInsert;

/**
 * 学生-班级关联表
 * 记录学生所属班级
 */
export const studentClasses = mysqlTable("student_classes", {
  id: int().autoincrement().primaryKey().notNull(),
  studentId: int("student_id").notNull(), // 学生用户ID
  classId: int("class_id").notNull(), // 关联teacher_classes表
  joinedAt: timestamp("joined_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  leftAt: timestamp("left_at", { mode: 'string' }), // 离开班级时间
  isActive: tinyint("is_active").default(1).notNull(),
},
(table) => [
  index("idx_student_id").on(table.studentId),
  index("idx_class_id").on(table.classId),
]);

export type StudentClass = typeof studentClasses.$inferSelect;
export type NewStudentClass = typeof studentClasses.$inferInsert;

/**
 * 班级学习报告表
 * 教师查看班级整体学习情况
 */
export const classReports = mysqlTable("class_reports", {
  id: int().autoincrement().primaryKey().notNull(),
  classId: int("class_id").notNull(),
  reportType: mysqlEnum("report_type", ['weekly','monthly','semester']).notNull(),
  reportPeriod: varchar("report_period", { length: 50 }).notNull(), // 如"2024-W10"或"2024-03"
  // 统计数据
  totalStudents: int("total_students").default(0).notNull(),
  activeStudents: int("active_students").default(0).notNull(), // 活跃学生数
  totalErrorQuestions: int("total_error_questions").default(0).notNull(),
  averageMasteryRate: int("average_mastery_rate").default(0).notNull(), // 平均掌握率(0-100)
  // 薄弱知识点(JSON格式)
  weakKnowledgePoints: text("weak_knowledge_points"), // [{id, name, errorCount}]
  // 学生排名(JSON格式,仅供教师查看)
  studentRankings: text("student_rankings"), // [{studentId, name, masteryRate, errorCount}]
  generatedAt: timestamp("generated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_class_id").on(table.classId),
  index("idx_report_period").on(table.reportPeriod),
]);

export type ClassReport = typeof classReports.$inferSelect;
export type NewClassReport = typeof classReports.$inferInsert;

/**
 * 家长查看权限表
 * 家长查看孩子学习报告的权限记录
 */
export const parentViewLogs = mysqlTable("parent_view_logs", {
  id: int().autoincrement().primaryKey().notNull(),
  parentId: int("parent_id").notNull(), // 家长用户ID
  studentId: int("student_id").notNull(), // 学生用户ID(通过parent_student_relations关联)
  viewType: mysqlEnum("view_type", ['dashboard','error_question','report','progress']).notNull(),
  viewedAt: timestamp("viewed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_parent_student").on(table.parentId, table.studentId),
  index("idx_viewed_at").on(table.viewedAt),
]);

export type ParentViewLog = typeof parentViewLogs.$inferSelect;
export type NewParentViewLog = typeof parentViewLogs.$inferInsert;
