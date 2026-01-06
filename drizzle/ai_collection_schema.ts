import { mysqlTable, varchar, text, int, timestamp, boolean, json, mysqlEnum, index } from 'drizzle-orm/mysql-core';

/**
 * AI网络收集题目来源表
 * 记录从网络搜索到的题目参考信息（不存储完整题目内容，避免版权问题）
 */
export const questionSources = mysqlTable('question_sources', {
  id: int('id').primaryKey().autoincrement(),
  // 来源信息
  sourceType: mysqlEnum('source_type', ['search_result', 'reference_material', 'exam_outline']).notNull(),
  sourceUrl: varchar('source_url', { length: 500 }),
  sourceName: varchar('source_name', { length: 255 }).notNull(), // 例如：深圳中学2023年期中考试
  sourceSchool: varchar('source_school', { length: 255 }), // 学校名称
  sourceRegion: varchar('source_region', { length: 100 }).default('深圳').notNull(),
  examYear: int('exam_year'), // 考试年份
  examSemester: mysqlEnum('exam_semester', ['first', 'second']),
  examType: varchar('exam_type', { length: 100 }), // 期中、期末、月考、模拟考
  
  // 学科信息
  subject: mysqlEnum('subject', ['math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  schoolLevel: mysqlEnum('school_level', ['junior', 'senior']).notNull(),
  
  // 参考摘要（不是完整题目）
  topicSummary: text('topic_summary'), // 题目主题摘要
  knowledgePoints: json('knowledge_points').$type<string[]>(), // 涉及的知识点
  difficulty: mysqlEnum('difficulty', ['easy', 'medium', 'hard']),
  
  // 搜索元数据
  searchQuery: varchar('search_query', { length: 500 }), // 搜索关键词
  searchTimestamp: timestamp('search_timestamp').defaultNow().notNull(),
  relevanceScore: int('relevance_score'), // 相关性评分 0-100
  
  // 状态
  isVerified: boolean('is_verified').default(false), // 是否已验证
  isUsed: boolean('is_used').default(false), // 是否已用于生成题目
  usageCount: int('usage_count').default(0).notNull(), // 使用次数
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  schoolIdx: index('school_idx').on(table.sourceSchool),
  subjectGradeIdx: index('subject_grade_idx').on(table.subject, table.grade),
  yearIdx: index('year_idx').on(table.examYear),
}));

/**
 * AI生成题目记录表
 * 记录基于网络搜索结果生成的原创题目
 */
export const aiGeneratedQuestions = mysqlTable('ai_generated_questions', {
  id: int('id').primaryKey().autoincrement(),
  // 关联到题库
  questionBankId: int('question_bank_id'), // 关联到question_bank表
  
  // 生成来源
  sourceId: int('source_id'), // 关联到question_sources表
  generationMethod: mysqlEnum('generation_method', ['ai_inspired', 'ai_similar', 'ai_original']).notNull(),
  // ai_inspired: 受启发生成（参考主题）
  // ai_similar: 相似题目（参考结构）
  // ai_original: 完全原创（仅参考知识点）
  
  // 生成参数
  prompt: text('prompt'), // 生成时使用的提示词
  referenceCount: int('reference_count').default(1), // 参考了多少个来源
  
  // 质量评估
  qualityScore: int('quality_score'), // AI自评质量分 0-100
  originalityScore: int('originality_score'), // 原创性评分 0-100
  difficultyAccuracy: int('difficulty_accuracy'), // 难度准确性 0-100
  
  // 审核状态
  reviewStatus: mysqlEnum('review_status', ['pending', 'approved', 'rejected', 'needs_revision']).default('pending').notNull(),
  reviewedBy: int('reviewed_by'), // 审核人ID
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  
  // 使用统计
  practiceCount: int('practice_count').default(0).notNull(), // 被练习次数
  averageScore: int('average_score'), // 平均得分率
  feedbackCount: int('feedback_count').default(0).notNull(), // 反馈数量
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sourceIdx: index('source_idx').on(table.sourceId),
  statusIdx: index('status_idx').on(table.reviewStatus),
  questionBankIdx: index('question_bank_idx').on(table.questionBankId),
}));

/**
 * AI收集任务表
 * 记录批量收集任务的执行情况
 */
export const collectionTasks = mysqlTable('collection_tasks', {
  id: int('id').primaryKey().autoincrement(),
  // 任务信息
  taskName: varchar('task_name', { length: 255 }).notNull(),
  taskType: mysqlEnum('task_type', ['manual', 'scheduled', 'auto']).notNull(),
  
  // 收集参数
  targetSchools: json('target_schools').$type<string[]>(), // 目标学校列表
  targetSubjects: json('target_subjects').$type<string[]>(),
  targetGrades: json('target_grades').$type<string[]>(),
  targetYears: json('target_years').$type<number[]>(),
  targetCount: int('target_count').default(10), // 目标收集数量
  
  // 执行状态
  status: mysqlEnum('status', ['pending', 'running', 'completed', 'failed', 'cancelled']).default('pending').notNull(),
  progress: int('progress').default(0), // 进度百分比
  
  // 执行结果
  sourcesFound: int('sources_found').default(0), // 找到的来源数
  questionsGenerated: int('questions_generated').default(0), // 生成的题目数
  errorCount: int('error_count').default(0),
  errorMessage: text('error_message'),
  
  // 执行时间
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // 创建人
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index('status_idx').on(table.status),
  createdByIdx: index('created_by_idx').on(table.createdBy),
}));

/**
 * 深圳名校列表配置
 */
export const shenzhenSchools = mysqlTable('shenzhen_schools', {
  id: int('id').primaryKey().autoincrement(),
  schoolName: varchar('school_name', { length: 255 }).notNull().unique(),
  schoolType: mysqlEnum('school_type', ['junior', 'senior', 'both']).notNull(),
  district: varchar('district', { length: 100 }), // 区域：福田、南山、罗湖等
  schoolLevel: mysqlEnum('school_level', ['top', 'key', 'regular']).notNull(), // 学校等级
  isActive: boolean('is_active').default(true).notNull(),
  searchKeywords: json('search_keywords').$type<string[]>(), // 搜索关键词
  officialWebsite: varchar('official_website', { length: 500 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
