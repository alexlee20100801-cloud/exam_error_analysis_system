import { mysqlTable, varchar, text, int, timestamp, boolean, json, mysqlEnum, decimal, bigint, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// 用户表
export const users = mysqlTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  openId: varchar('open_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: varchar('avatar', { length: 500 }),
  role: mysqlEnum('role', ['admin', 'user']).default('user').notNull(),
  userType: mysqlEnum('user_type', ['student', 'parent']).default('student').notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']),
  school: varchar('school', { length: 255 }),
  region: varchar('region', { length: 100 }),
  currentSemester: mysqlEnum('current_semester', ['first', 'second']),
  disabledMenuItems: json('disabled_menu_items').$type<string[]>(),
  emailVerified: boolean('email_verified').default(false),
  wechatOpenId: varchar('wechat_open_id', { length: 255 }),
  wechatNickname: varchar('wechat_nickname', { length: 255 }),
  themePreference: mysqlEnum('theme_preference', ['light', 'dark', 'system']).default('system'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 知识点表
export const knowledgePoints = mysqlTable('knowledge_points', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  schoolLevel: mysqlEnum('school_level', ['junior', 'senior']).notNull(),
  semester: mysqlEnum('semester', ['first', 'second']),
  chapter: varchar('chapter', { length: 255 }),
  description: text('description'),
  level: int('level').default(1),
  difficulty: mysqlEnum('difficulty', ['easy', 'medium', 'hard']).default('medium'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  subjectGradeIdx: index('subject_grade_idx').on(table.subject, table.grade),
}));

// 错题表
export const errorQuestions = mysqlTable('error_questions', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  schoolLevel: mysqlEnum('school_level', ['junior', 'senior']).notNull(),
  semester: mysqlEnum('semester', ['first', 'second']),
  difficulty: mysqlEnum('difficulty', ['easy', 'medium', 'hard']).default('medium'),
  imageUrl: varchar('image_url', { length: 500 }),
  userAnswer: text('user_answer'),
  correctAnswer: text('correct_answer'),
  explanation: text('explanation'),
  voiceExplanation: varchar('voice_explanation', { length: 500 }),
  detailedExplanation: text('detailed_explanation'),
  errorAnalysis: text('error_analysis'),
  knowledgePointIds: json('knowledge_point_ids').$type<number[]>(),
  detailedAnalysis: json('detailed_analysis').$type<{
    keyPointsExplanation?: string;
    mistakesAnalysis?: string;
    solvingStrategy?: string;
    studyAdvice?: string;
    practiceDirection?: string;
  }>(),
  masteryLevel: mysqlEnum('mastery_level', ['not_started', 'learning', 'practicing', 'mastered']).default('not_started'),
  reviewCount: int('review_count').default(0),
  lastReviewedAt: timestamp('last_reviewed_at'),
  notes: text('notes'),
  isMastered: boolean('is_mastered').default(false),
  isAnalyzed: boolean('is_analyzed').default(false),
  noteImages: json('note_images').$type<string[]>(),
  isFavorite: boolean('is_favorite').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  subjectGradeIdx: index('subject_grade_idx').on(table.subject, table.grade),
}));

// 练习记录表
export const practiceRecords = mysqlTable('practice_records', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  errorQuestionId: int('error_question_id').notNull(),
  knowledgePointId: int('knowledge_point_id'),
  isCorrect: boolean('is_correct').notNull(),
  timeSpent: int('time_spent'),
  score: decimal('score', { precision: 5, scale: 2 }),
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  errorQuestionIdIdx: index('error_question_id_idx').on(table.errorQuestionId),
}));

// 学习进度表
export const learningProgress = mysqlTable('learning_progress', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  knowledgePointId: int('knowledge_point_id').notNull(),
  masteryLevel: decimal('mastery_level', { precision: 5, scale: 2 }).default('0').notNull(),
  practiceCount: int('practice_count').default(0),
  correctCount: int('correct_count').default(0),
  lastPracticedAt: timestamp('last_practiced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userKnowledgeIdx: uniqueIndex('user_knowledge_idx').on(table.userId, table.knowledgePointId),
}));

// 题库表
export const questionBank = mysqlTable('question_bank', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  questionType: mysqlEnum('question_type', ['choice', 'blank', 'short_answer', 'essay', 'calculation']).notNull(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  schoolLevel: mysqlEnum('school_level', ['junior', 'senior']).notNull(),
  semester: mysqlEnum('semester', ['first', 'second']),
  difficulty: mysqlEnum('difficulty', ['easy', 'medium', 'hard']).default('medium'),
  knowledgePointIds: json('knowledge_point_ids').$type<number[]>(),
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  imageUrl: varchar('image_url', { length: 500 }),
  source: varchar('source', { length: 255 }),
  qualityScore: decimal('quality_score', { precision: 3, scale: 2 }),
  reviewStatus: mysqlEnum('review_status', ['pending', 'approved', 'rejected', 'needs_revision']).default('pending'),
  reviewedBy: varchar('reviewed_by', { length: 255 }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  subjectGradeIdx: index('subject_grade_idx').on(table.subject, table.grade),
}));

// 视频资源表
export const videoResources = mysqlTable('video_resources', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 500 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  platform: mysqlEnum('platform', ['bilibili', 'youtube']).notNull(),
  knowledgePointIds: json('knowledge_point_ids').$type<number[]>(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  duration: int('duration'),
  thumbnail: varchar('thumbnail', { length: 500 }),
  description: text('description'),
  relevanceScore: decimal('relevance_score', { precision: 3, scale: 2 }),
  viewCount: int('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  subjectGradeIdx: index('subject_grade_idx').on(table.subject, table.grade),
}));

// 复习计划表
export const reviewPlans = mysqlTable('review_plans', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  errorQuestionId: int('error_question_id').notNull(),
  scheduledDate: timestamp('scheduled_date').notNull(),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  scheduledDateIdx: index('scheduled_date_idx').on(table.scheduledDate),
}));

// 成就表
export const achievements = mysqlTable('achievements', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 255 }),
  requirement: json('requirement').$type<any>(),
  progress: int('progress').default(0),
  target: int('target').notNull(),
  color: varchar('color', { length: 50 }),
  points: int('points').default(0),
  isUnlocked: boolean('is_unlocked').default(false),
  unlockedAt: timestamp('unlocked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 打卡记录表
export const checkInRecords = mysqlTable('check_in_records', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  checkInDate: timestamp('check_in_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex('user_date_idx').on(table.userId, table.checkInDate),
}));

// 家长-学生关联表
export const parentStudentRelations = mysqlTable('parent_student_relations', {
  id: int('id').primaryKey().autoincrement(),
  parentId: varchar('parent_id', { length: 255 }).notNull(),
  studentId: varchar('student_id', { length: 255 }).notNull(),
  inviteCode: varchar('invite_code', { length: 20 }).notNull().unique(),
  status: mysqlEnum('status', ['pending', 'active', 'rejected']).default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  parentIdIdx: index('parent_id_idx').on(table.parentId),
  studentIdIdx: index('student_id_idx').on(table.studentId),
}));

// 学习目标表
export const learningGoals = mysqlTable('learning_goals', {
  id: int('id').primaryKey().autoincrement(),
  studentId: varchar('student_id', { length: 255 }).notNull(),
  parentId: varchar('parent_id', { length: 255 }).notNull(),
  goalType: mysqlEnum('goal_type', ['error_count', 'mastery_rate', 'review_count', 'study_time']).notNull(),
  targetValue: int('target_value').notNull(),
  currentValue: int('current_value').default(0),
  deadline: timestamp('deadline').notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  completed: boolean('completed').default(false),
  status: mysqlEnum('status', ['in_progress', 'completed', 'failed']).default('in_progress'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  studentIdIdx: index('student_id_idx').on(table.studentId),
  parentIdIdx: index('parent_id_idx').on(table.parentId),
}));

// 目标提醒表
export const goalReminders = mysqlTable('goal_reminders', {
  id: int('id').primaryKey().autoincrement(),
  goalId: int('goal_id').notNull(),
  parentId: varchar('parent_id', { length: 255 }).notNull(),
  studentId: varchar('student_id', { length: 255 }).notNull(),
  reminderType: mysqlEnum('reminder_type', ['deadline_approaching', 'progress_behind', 'goal_achieved', 'goal_failed']).notNull(),
  message: text('message').notNull(),
  isSent: boolean('is_sent').default(false),
  isRead: boolean('is_read').default(false),
  sentAt: timestamp('sent_at'),
  read: boolean('read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  goalIdIdx: index('goal_id_idx').on(table.goalId),
  parentIdIdx: index('parent_id_idx').on(table.parentId),
}));

// 真题管理表
export const realExamQuestions = mysqlTable('real_exam_questions', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  questionType: mysqlEnum('question_type', ['choice', 'blank', 'short_answer', 'calculation', 'essay']).notNull(),
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  schoolLevel: mysqlEnum('school_level', ['junior', 'senior']).notNull(),
  semester: mysqlEnum('semester', ['first', 'second']),
  difficulty: mysqlEnum('difficulty', ['easy', 'medium', 'hard']).default('medium'),
  knowledgePointIds: json('knowledge_point_ids').$type<number[]>(),
  sourceSchool: varchar('source_school', { length: 255 }),
  sourceRegion: varchar('source_region', { length: 100 }),
  examYear: int('exam_year'),
  examSemester: mysqlEnum('exam_semester', ['first', 'second']),
  examType: varchar('exam_type', { length: 100 }),
  usageCount: int('usage_count').default(0),
  averageScore: decimal('average_score', { precision: 5, scale: 2 }),
  isVerified: boolean('is_verified').default(false),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  subjectGradeIdx: index('subject_grade_idx').on(table.subject, table.grade),
  sourceSchoolIdx: index('source_school_idx').on(table.sourceSchool),
}));

// 真题练习记录表
export const realExamPracticeRecords = mysqlTable('real_exam_practice_records', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  questionId: int('question_id').notNull(),
  userAnswer: text('user_answer'),
  isCorrect: boolean('is_correct'),
  timeSpent: int('time_spent'),
  score: decimal('score', { precision: 5, scale: 2 }),
  isBookmarked: boolean('is_bookmarked').default(false),
  practiceDate: timestamp('practice_date').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  questionIdIdx: index('question_id_idx').on(table.questionId),
}));

// AI生成试卷表
export const generatedExamPapers = mysqlTable('generated_exam_papers', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  schoolLevel: mysqlEnum('school_level', ['junior', 'senior']).notNull(),
  totalQuestions: int('total_questions').notNull(),
  totalScore: int('total_score').notNull(),
  difficulty: mysqlEnum('difficulty', ['easy', 'medium', 'hard']).default('medium'),
  knowledgePointIds: json('knowledge_point_ids').$type<number[]>(),
  questionTypes: json('question_types').$type<{ type: string; count: number; score: number }[]>(),
  questions: json('questions').$type<{ questionId: number; score: number }[]>(),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  totalTimeSpent: int('total_time_spent'),
  userScore: decimal('user_score', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// AI真题表
export const questions = mysqlTable('questions', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  difficulty: mysqlEnum('difficulty', ['easy', 'medium', 'hard']).default('medium'),
  knowledgePointIds: json('knowledge_point_ids').$type<number[]>(),
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 定时任务表
export const scheduledTasks = mysqlTable('scheduled_tasks', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  taskType: mysqlEnum('task_type', ['generate_questions', 'send_reminders', 'execute_push_tasks']).notNull(),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
  isEnabled: boolean('is_enabled').default(true),
  lastExecutedAt: timestamp('last_executed_at'),
  nextExecutionAt: timestamp('next_execution_at'),
  executionCount: int('execution_count').default(0),
  lastStatus: mysqlEnum('last_status', ['success', 'failed', 'running']),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 任务执行日志表
export const taskExecutionLogs = mysqlTable('task_execution_logs', {
  id: int('id').primaryKey().autoincrement(),
  taskId: int('task_id').notNull(),
  status: mysqlEnum('status', ['success', 'failed', 'running']).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: int('duration'),
  itemsProcessed: int('items_processed').default(0),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  taskIdIdx: index('task_id_idx').on(table.taskId),
}));

// 专项练习池表
export const practicePools = mysqlTable('practice_pools', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  errorQuestionId: int('error_question_id').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  difficulty: mysqlEnum('difficulty', ['easy', 'medium', 'hard']).default('medium'),
  knowledgePointIds: json('knowledge_point_ids').$type<number[]>(),
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  userAnswer: text('user_answer'),
  isCorrect: boolean('is_correct'),
  score: decimal('score', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  errorQuestionIdIdx: index('error_question_id_idx').on(table.errorQuestionId),
}));

// 收藏表
export const favorites = mysqlTable('favorites', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  itemType: mysqlEnum('item_type', ['error_question', 'practice_pool', 'question_bank']).notNull(),
  itemId: int('item_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userItemIdx: uniqueIndex('user_item_idx').on(table.userId, table.itemType, table.itemId),
}));

// 学习提醒表
export const reviewReminders = mysqlTable('review_reminders', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  itemType: mysqlEnum('item_type', ['error_question', 'practice_pool']).notNull(),
  itemId: int('item_id').notNull(),
  scheduledDate: timestamp('scheduled_date').notNull(),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  reviewRound: int('review_round').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  scheduledDateIdx: index('scheduled_date_idx').on(table.scheduledDate),
}));

// 复习历史表
export const reviewHistory = mysqlTable('review_history', {
  id: int('id').primaryKey().autoincrement(),
  reminderId: int('reminder_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  reviewedAt: timestamp('reviewed_at').notNull(),
  reviewRound: int('review_round').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  reminderIdIdx: index('reminder_id_idx').on(table.reminderId),
}));

// 错题复习记录表
export const errorReviewRecords = mysqlTable('error_review_records', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  errorQuestionId: int('error_question_id').notNull(),
  reviewRound: int('review_round').default(1),
  lastReviewedAt: timestamp('last_reviewed_at'),
  nextReviewDate: timestamp('next_review_date'),
  isCompleted: boolean('is_completed').default(false),
  isPaused: boolean('is_paused').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userErrorIdx: uniqueIndex('user_error_idx').on(table.userId, table.errorQuestionId),
}));

// 学习路径表
export const learningPaths = mysqlTable('learning_paths', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).notNull(),
  grade: mysqlEnum('grade', ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']).notNull(),
  nodes: json('nodes').$type<{
    id: string;
    knowledgePointId: number;
    knowledgePointName: string;
    difficulty: string;
    questionIds: number[];
    isCompleted: boolean;
    isLocked: boolean;
    order: number;
  }[]>(),
  currentNodeId: varchar('current_node_id', { length: 100 }),
  description: text('description'),
  pathData: json('path_data').$type<any>(),
  totalNodes: int('total_nodes').default(0),
  completedNodes: int('completed_nodes').default(0),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 学习路径进度表
export const learningPathProgress = mysqlTable('learning_path_progress', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  pathId: int('path_id').notNull(),
  nodeId: varchar('node_id', { length: 100 }).notNull(),
  isCompleted: boolean('is_completed').default(false),
  status: mysqlEnum('status', ['in_progress', 'completed', 'failed']).default('in_progress'),
  completedAt: timestamp('completed_at'),
  score: decimal('score', { precision: 5, scale: 2 }),
  timeSpent: int('time_spent'),
  answers: json('answers').$type<{ questionId: number; userAnswer: string; isCorrect: boolean }[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userPathNodeIdx: uniqueIndex('user_path_node_idx').on(table.userId, table.pathId, table.nodeId),
}));

// 考试日历表
export const examCalendar = mysqlTable('exam_calendar', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  examName: varchar('exam_name', { length: 255 }).notNull(),
  examDate: timestamp('exam_date').notNull(),
  subject: mysqlEnum('subject', ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
  description: text('description'),
  reviewPlanGenerated: boolean('review_plan_generated').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 智能复习任务表
export const smartReviewTasks = mysqlTable('smart_review_tasks', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  examId: int('exam_id').notNull(),
  taskDate: timestamp('task_date').notNull(),
  knowledgePointIds: json('knowledge_point_ids').$type<number[]>(),
  errorQuestionIds: json('error_question_ids').$type<number[]>(),
  priority: mysqlEnum('priority', ['high', 'medium', 'low']).default('medium'),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userExamIdx: index('user_exam_idx').on(table.userId, table.examId),
}));

// 系统设置表
export const systemSettings = mysqlTable('system_settings', {
  id: int('id').primaryKey().autoincrement(),
  settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
  settingValue: text('setting_value').notNull(),
  description: text('description'),
  isEncrypted: boolean('is_encrypted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 邮箱验证令牌表
export const emailVerificationTokens = mysqlTable('email_verification_tokens', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  isUsed: boolean('is_used').default(false),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  tokenIdx: index('token_idx').on(table.token),
}));

// 邮件模板表
export const emailTemplates = mysqlTable('email_templates', {
  id: int('id').primaryKey().autoincrement(),
  templateType: varchar('template_type', { length: 100 }).notNull().unique(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  htmlContent: text('html_content').notNull(),
  description: text('description'),
  availableVariables: json('available_variables').$type<string[]>(),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 用户提醒设置表
export const userReminderSettings = mysqlTable('user_reminder_settings', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  emailVerified: boolean('email_verified').default(false),
  wechatOpenId: varchar('wechat_open_id', { length: 255 }),
  wechatNickname: varchar('wechat_nickname', { length: 255 }),
  notificationChannels: json('notification_channels').$type<string[]>().default(['system']),
  defaultReminderTime: int('default_reminder_time').default(86400),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// AI建议历史表
export const aiAdviceHistory = mysqlTable('ai_advice_history', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  adviceContent: json('advice_content').$type<{
    overallAssessment: string;
    studyAdvice: string[];
    reviewPlan: { task: string; priority: string; deadline: string }[];
    weakPoints: string[];
    encouragement: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 复习任务表
export const reviewTasks = mysqlTable('review_tasks', {
  id: int('id').primaryKey().autoincrement(),
  adviceId: int('advice_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  taskDescription: text('task_description').notNull(),
  priority: mysqlEnum('priority', ['high', 'medium', 'low']).notNull(),
  deadline: varchar('deadline', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 100 }),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  adviceIdIdx: index('advice_id_idx').on(table.adviceId),
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 复习任务提醒表
export const reviewTaskReminders = mysqlTable('review_task_reminders', {
  id: int('id').primaryKey().autoincrement(),
  taskId: int('task_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  reminderTime: timestamp('reminder_time').notNull(),
  isSent: boolean('is_sent').default(false),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  taskIdIdx: index('task_id_idx').on(table.taskId),
  reminderTimeIdx: index('reminder_time_idx').on(table.reminderTime),
}));

// 套餐表
export const packages = mysqlTable('packages', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  duration: int('duration').notNull(),
  features: json('features').$type<string[]>(),
  aiAnalysisQuota: int('ai_analysis_quota').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 订单表
export const orders = mysqlTable('orders', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  packageId: int('package_id').notNull(),
  orderNumber: varchar('order_number', { length: 100 }).notNull().unique(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum('payment_method', ['wechat', 'alipay', 'mock']).notNull(),
  paymentStatus: mysqlEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']).default('pending'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  orderNumberIdx: index('order_number_idx').on(table.orderNumber),
}));

// 用户订阅表
export const userSubscriptions = mysqlTable('user_subscriptions', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  packageId: int('package_id').notNull(),
  orderId: int('order_id').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  aiAnalysisRemaining: int('ai_analysis_remaining').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 支付配置表
export const paymentConfigs = mysqlTable('payment_configs', {
  id: int('id').primaryKey().autoincrement(),
  provider: mysqlEnum('provider', ['wechat', 'alipay']).notNull().unique(),
  appId: varchar('app_id', { length: 255 }).notNull(),
  mchId: varchar('mch_id', { length: 255 }).notNull(),
  apiKey: text('api_key').notNull(),
  certPath: varchar('cert_path', { length: 500 }),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 账号凭证表
export const accountCredentials = mysqlTable('account_credentials', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 权限记录表
export const permissionRecords = mysqlTable('permission_records', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  subscriptionId: int('subscription_id').notNull(),
  permissionType: varchar('permission_type', { length: 100 }).notNull(),
  grantedAt: timestamp('granted_at').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 推送配置表
export const pushConfigs = mysqlTable('push_configs', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  pushType: mysqlEnum('push_type', ['question', 'knowledge_point', 'learning_resource']).notNull(),
  targetUserGroup: json('target_user_group').$type<{
    schoolLevel?: string;
    grades?: string[];
    subjects?: string[];
    subscriptionStatus?: string;
    packageTypes?: string[];
  }>(),
  contentConfig: json('content_config').$type<{
    questionIds?: number[];
    knowledgePointIds?: number[];
    resourceUrls?: string[];
  }>(),
  pushChannels: json('push_channels').$type<string[]>(),
  frequency: mysqlEnum('frequency', ['once', 'daily', 'weekly', 'monthly']).notNull(),
  scheduledTime: varchar('scheduled_time', { length: 50 }),
  isActive: boolean('is_active').default(true),
  lastExecutedAt: timestamp('last_executed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// 推送记录表
export const pushRecords = mysqlTable('push_records', {
  id: int('id').primaryKey().autoincrement(),
  configId: int('config_id').notNull(),
  targetUserCount: int('target_user_count').notNull(),
  successCount: int('success_count').default(0),
  failedCount: int('failed_count').default(0),
  executedAt: timestamp('executed_at').notNull(),
  status: mysqlEnum('status', ['pending', 'in_progress', 'completed', 'failed']).default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  configIdIdx: index('config_id_idx').on(table.configId),
}));

// 用户推送接收表
export const userPushReceipts = mysqlTable('user_push_receipts', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  pushRecordId: int('push_record_id').notNull(),
  pushType: mysqlEnum('push_type', ['question', 'knowledge_point', 'learning_resource']).notNull(),
  content: json('content').$type<any>(),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  isClicked: boolean('is_clicked').default(false),
  clickedAt: timestamp('clicked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  pushRecordIdIdx: index('push_record_id_idx').on(table.pushRecordId),
}));

// 题目审核记录表
export const questionReviews = mysqlTable('question_reviews', {
  id: int('id').primaryKey().autoincrement(),
  questionId: int('question_id').notNull(),
  reviewerId: varchar('reviewer_id', { length: 255 }).notNull(),
  reviewStatus: mysqlEnum('review_status', ['approved', 'rejected', 'needs_revision']).notNull(),
  accuracyScore: int('accuracy_score'),
  difficultyScore: int('difficulty_score'),
  clarityScore: int('clarity_score'),
  discriminationScore: int('discrimination_score'),
  overallScore: decimal('overall_score', { precision: 3, scale: 2 }),
  reviewNotes: text('review_notes'),
  suggestions: text('suggestions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  questionIdIdx: index('question_id_idx').on(table.questionId),
  reviewerIdIdx: index('reviewer_id_idx').on(table.reviewerId),
}));

// 图表标注表
export const annotations = mysqlTable('annotations', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  itemType: mysqlEnum('item_type', ['error_question', 'practice_pool', 'question_bank', 'real_exam']).notNull(),
  itemId: int('item_id').notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  annotationType: mysqlEnum('annotation_type', ['marker', 'arrow', 'text', 'highlight', 'rectangle', 'circle']).notNull(),
  annotationData: json('annotation_data').$type<{
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    text?: string;
    color?: string;
    fontSize?: number;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
  }>(),
  color: varchar('color', { length: 50 }).default('#FF0000'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userItemIdx: index('user_item_idx').on(table.userId, table.itemType, table.itemId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type KnowledgePoint = typeof knowledgePoints.$inferSelect;
export type ErrorQuestion = typeof errorQuestions.$inferSelect;
export type PracticeRecord = typeof practiceRecords.$inferSelect;
export type LearningProgress = typeof learningProgress.$inferSelect;
export type QuestionBank = typeof questionBank.$inferSelect;
export type VideoResource = typeof videoResources.$inferSelect;
export type ReviewPlan = typeof reviewPlans.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type ParentStudentRelation = typeof parentStudentRelations.$inferSelect;
export type LearningGoal = typeof learningGoals.$inferSelect;
export type GoalReminder = typeof goalReminders.$inferSelect;
export type RealExamQuestion = typeof realExamQuestions.$inferSelect;
export type RealExamPracticeRecord = typeof realExamPracticeRecords.$inferSelect;
export type GeneratedExamPaper = typeof generatedExamPapers.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type TaskExecutionLog = typeof taskExecutionLogs.$inferSelect;
export type PracticePool = typeof practicePools.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type ReviewReminder = typeof reviewReminders.$inferSelect;
export type ReviewHistory = typeof reviewHistory.$inferSelect;
export type ErrorReviewRecord = typeof errorReviewRecords.$inferSelect;
export type LearningPath = typeof learningPaths.$inferSelect;
export type LearningPathProgress = typeof learningPathProgress.$inferSelect;
export type ExamCalendar = typeof examCalendar.$inferSelect;
export type SmartReviewTask = typeof smartReviewTasks.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type UserReminderSetting = typeof userReminderSettings.$inferSelect;
export type AiAdviceHistory = typeof aiAdviceHistory.$inferSelect;
export type ReviewTask = typeof reviewTasks.$inferSelect;
export type ReviewTaskReminder = typeof reviewTaskReminders.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type PaymentConfig = typeof paymentConfigs.$inferSelect;
export type AccountCredential = typeof accountCredentials.$inferSelect;
export type PermissionRecord = typeof permissionRecords.$inferSelect;
export type PushConfig = typeof pushConfigs.$inferSelect;
export type PushRecord = typeof pushRecords.$inferSelect;
export type UserPushReceipt = typeof userPushReceipts.$inferSelect;
export type QuestionReview = typeof questionReviews.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;

// 错题标签表
export const errorQuestionTags = mysqlTable('error_question_tags', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 50 }).default('#3B82F6'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 错题标签关联表
export const errorQuestionTagRelations = mysqlTable('error_question_tag_relations', {
  id: int('id').primaryKey().autoincrement(),
  errorQuestionId: int('error_question_id').notNull(),
  tagId: int('tag_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  errorQuestionTagIdx: uniqueIndex('error_question_tag_idx').on(table.errorQuestionId, table.tagId),
}));

// 类型导出
export type InsertErrorQuestionTag = typeof errorQuestionTags.$inferInsert;
export type InsertErrorQuestionTagRelation = typeof errorQuestionTagRelations.$inferInsert;
