import { mysqlTable, int, varchar, text, timestamp, boolean, mysqlEnum, index, json } from 'drizzle-orm/mysql-core';

/**
 * 增强版导出模板表 - 支持保存常用导出配置
 */
export const exportTemplatesEnhanced = mysqlTable('export_templates_enhanced', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  
  // 模板类型
  templateType: mysqlEnum('template_type', [
    'error_book',      // 错题本
    'review_card',     // 复习卡片
    'exam_paper',      // 试卷
    'analysis_report', // 分析报告
    'custom'           // 自定义
  ]).default('custom').notNull(),
  
  // 是否为默认模板
  isDefault: boolean('is_default').default(false).notNull(),
  
  // 是否公开给其他用户
  isPublic: boolean('is_public').default(false).notNull(),
  
  // 是否为系统预设模板
  isSystemPreset: boolean('is_system_preset').default(false).notNull(),
  
  // ========== 筛选条件配置 ==========
  filterConfig: json('filter_config').$type<{
    subjects?: string[];           // 学科筛选
    grades?: string[];             // 年级筛选
    difficulties?: string[];       // 难度筛选
    masteryLevels?: string[];      // 掌握度筛选
    dateRange?: {                  // 日期范围
      type: 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
      startDate?: string;
      endDate?: string;
    };
    tags?: string[];               // 标签筛选
    knowledgePointIds?: number[];  // 知识点筛选
  }>(),
  
  // ========== 排序配置 ==========
  sortConfig: json('sort_config').$type<{
    field: 'createdAt' | 'updatedAt' | 'difficulty' | 'masteryLevel' | 'subject';
    order: 'asc' | 'desc';
  }>(),
  
  // ========== 内容配置 ==========
  contentConfig: json('content_config').$type<{
    showQuestionNumber: boolean;    // 显示题号
    showDifficulty: boolean;        // 显示难度
    showKnowledgePoints: boolean;   // 显示知识点
    showAnswer: boolean;            // 显示答案
    showExplanation: boolean;       // 显示解析
    showErrorAnalysis: boolean;     // 显示错因分析
    showSimilarQuestions: boolean;  // 显示相似题
    showStudyNotes: boolean;        // 显示学习笔记
    showReviewHistory: boolean;     // 显示复习历史
    groupBySubject: boolean;        // 按学科分组
    groupByKnowledgePoint: boolean; // 按知识点分组
  }>(),
  
  // ========== 样式配置 ==========
  styleConfig: json('style_config').$type<{
    // 页面设置
    paperSize: 'A4' | 'A5' | 'Letter';
    orientation: 'portrait' | 'landscape';
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    
    // 字体设置
    fontSize: number;
    lineSpacing: number;
    fontFamily?: string;
    
    // 页眉页脚
    headerText?: string;
    headerAlign: 'left' | 'center' | 'right';
    headerFontSize: number;
    footerText?: string;
    footerAlign: 'left' | 'center' | 'right';
    footerFontSize: number;
    showPageNumber: boolean;
    
    // Logo设置
    logoUrl?: string;
    logoPosition: 'top-left' | 'top-center' | 'top-right';
    logoWidth: number;
    
    // 主题颜色
    primaryColor?: string;
    secondaryColor?: string;
  }>(),
  
  // ========== 导出格式配置 ==========
  exportFormat: mysqlEnum('export_format', ['pdf', 'word', 'markdown', 'html']).default('pdf').notNull(),
  
  // 使用统计
  usageCount: int('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  
  // 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  isPublicIdx: index('is_public_idx').on(table.isPublic),
  templateTypeIdx: index('template_type_idx').on(table.templateType),
  isDefaultIdx: index('is_default_idx').on(table.isDefault),
}));

/**
 * 快速导出配置表 - 一键导出的快捷方式
 */
export const quickExportConfigs = mysqlTable('quick_export_configs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  templateId: int('template_id').notNull(), // 关联导出模板
  
  // 快捷方式名称
  name: varchar('name', { length: 100 }).notNull(),
  
  // 快捷键（可选）
  shortcutKey: varchar('shortcut_key', { length: 20 }),
  
  // 显示顺序
  displayOrder: int('display_order').default(0).notNull(),
  
  // 是否在工具栏显示
  showInToolbar: boolean('show_in_toolbar').default(true).notNull(),
  
  // 图标（可选）
  icon: varchar('icon', { length: 50 }),
  
  // 使用统计
  usageCount: int('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  templateIdIdx: index('template_id_idx').on(table.templateId),
}));

/**
 * 导出历史记录表
 */
export const exportHistoryRecords = mysqlTable('export_history_records', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  templateId: int('template_id'), // 使用的模板ID（可为空表示未使用模板）
  
  // 导出信息
  exportType: mysqlEnum('export_type', ['error_questions', 'exam_paper', 'learning_report', 'custom']).notNull(),
  exportFormat: mysqlEnum('export_format', ['pdf', 'word', 'markdown', 'html']).notNull(),
  
  // 导出的题目数量
  questionCount: int('question_count').default(0).notNull(),
  
  // 导出文件信息
  fileUrl: varchar('file_url', { length: 500 }),
  fileKey: varchar('file_key', { length: 500 }),
  fileSize: int('file_size'), // 字节
  
  // 导出配置快照（保存当时的配置）
  configSnapshot: json('config_snapshot'),
  
  // 导出状态
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed']).default('pending').notNull(),
  errorMessage: text('error_message'),
  
  // 处理时间
  processingTimeMs: int('processing_time_ms'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  templateIdIdx: index('template_id_idx').on(table.templateId),
  statusIdx: index('status_idx').on(table.status),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

// 类型导出
export type ExportTemplateEnhanced = typeof exportTemplatesEnhanced.$inferSelect;
export type NewExportTemplateEnhanced = typeof exportTemplatesEnhanced.$inferInsert;

export type QuickExportConfig = typeof quickExportConfigs.$inferSelect;
export type NewQuickExportConfig = typeof quickExportConfigs.$inferInsert;

export type ExportHistoryRecord = typeof exportHistoryRecords.$inferSelect;
export type NewExportHistoryRecord = typeof exportHistoryRecords.$inferInsert;
