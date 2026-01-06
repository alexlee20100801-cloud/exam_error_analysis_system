import { mysqlTable, int, varchar, text, timestamp, boolean, mysqlEnum, index, json } from 'drizzle-orm/mysql-core';

// AI题目收藏表
export const aiQuestionFavorites = mysqlTable('ai_question_favorites', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  questionId: int('question_id').notNull(), // 关联ai_generated_questions表
  folderId: int('folder_id'), // 可选的收藏夹分类
  notes: text('notes'), // 用户备注
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  questionIdIdx: index('question_id_idx').on(table.questionId),
  userQuestionIdx: index('user_question_idx').on(table.userId, table.questionId), // 唯一索引
}));

// 收藏夹表
export const favoriteFolders = mysqlTable('favorite_folders', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 50 }), // 文件夹颜色标识
  questionCount: int('question_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// 用户练习行为表（用于协同过滤）
export const userPracticeBehaviors = mysqlTable('user_practice_behaviors', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  questionId: int('question_id').notNull(), // 关联ai_generated_questions表
  behaviorType: mysqlEnum('behavior_type', ['view', 'practice', 'correct', 'incorrect', 'favorite', 'export']).notNull(),
  timeSpent: int('time_spent'), // 花费时间（秒）
  score: int('score'), // 得分（如果适用）
  metadata: json('metadata').$type<{
    difficulty?: string;
    knowledgePoints?: string[];
    userAnswer?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  questionIdIdx: index('question_id_idx').on(table.questionId),
  behaviorTypeIdx: index('behavior_type_idx').on(table.behaviorType),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

// 导出模板配置表
export const exportTemplates = mysqlTable('export_templates', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  isPublic: boolean('is_public').default(false).notNull(), // 是否公开给其他用户
  
  // Logo配置
  logoUrl: varchar('logo_url', { length: 500 }),
  logoPosition: mysqlEnum('logo_position', ['top-left', 'top-center', 'top-right']).default('top-left'),
  logoWidth: int('logo_width').default(100), // 像素
  
  // 页眉配置
  headerText: varchar('header_text', { length: 500 }),
  headerAlign: mysqlEnum('header_align', ['left', 'center', 'right']).default('center'),
  headerFontSize: int('header_font_size').default(14),
  
  // 页脚配置
  footerText: varchar('footer_text', { length: 500 }),
  footerAlign: mysqlEnum('footer_align', ['left', 'center', 'right']).default('center'),
  footerFontSize: int('footer_font_size').default(12),
  showPageNumber: boolean('show_page_number').default(true).notNull(),
  
  // 样式配置
  fontSize: int('font_size').default(12),
  lineSpacing: int('line_spacing').default(150), // 行间距百分比
  marginTop: int('margin_top').default(20), // 毫米
  marginBottom: int('margin_bottom').default(20),
  marginLeft: int('margin_left').default(20),
  marginRight: int('margin_right').default(20),
  
  // 内容配置
  showQuestionNumber: boolean('show_question_number').default(true).notNull(),
  showDifficulty: boolean('show_difficulty').default(true).notNull(),
  showKnowledgePoints: boolean('show_knowledge_points').default(true).notNull(),
  showAnswer: boolean('show_answer').default(true).notNull(),
  showExplanation: boolean('show_explanation').default(true).notNull(),
  
  // 其他配置
  paperSize: mysqlEnum('paper_size', ['A4', 'A5', 'Letter']).default('A4'),
  orientation: mysqlEnum('orientation', ['portrait', 'landscape']).default('portrait'),
  
  usageCount: int('usage_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  isPublicIdx: index('is_public_idx').on(table.isPublic),
}));

// 用户相似度缓存表（优化协同过滤性能）
export const userSimilarityCache = mysqlTable('user_similarity_cache', {
  id: int('id').primaryKey().autoincrement(),
  userId1: int('user_id_1').notNull(),
  userId2: int('user_id_2').notNull(),
  similarityScore: int('similarity_score').notNull(), // 0-100的相似度分数
  commonBehaviorCount: int('common_behavior_count').notNull(),
  lastCalculatedAt: timestamp('last_calculated_at').defaultNow().notNull(),
}, (table) => ({
  user1Idx: index('user_1_idx').on(table.userId1),
  user2Idx: index('user_2_idx').on(table.userId2),
  scoreIdx: index('score_idx').on(table.similarityScore),
}));
