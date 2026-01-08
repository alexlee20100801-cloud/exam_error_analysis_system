import { mysqlTable, int, varchar, text, timestamp, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * 打印模板配置表
 * 存储用户自定义的打印模板配置
 */
export const printTemplates = mysqlTable("print_templates", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // 模板名称
  
  // 排版配置
  layout: varchar("layout", { length: 50 }).notNull().default("single"), // single/double 单列/双列
  fontSize: int("font_size").notNull().default(14), // 字体大小 (px)
  marginTop: int("margin_top").notNull().default(20), // 上边距 (mm)
  marginBottom: int("margin_bottom").notNull().default(20), // 下边距 (mm)
  marginLeft: int("margin_left").notNull().default(20), // 左边距 (mm)
  marginRight: int("margin_right").notNull().default(20), // 右边距 (mm)
  
  // 内容选择
  includeAiAnalysis: boolean("include_ai_analysis").notNull().default(true), // 是否包含AI分析
  includeAnswer: boolean("include_answer").notNull().default(true), // 是否包含答案
  includeExplanation: boolean("include_explanation").notNull().default(true), // 是否包含解析
  includeKnowledgePoints: boolean("include_knowledge_points").notNull().default(true), // 是否包含知识点
  includeImage: boolean("include_image").notNull().default(true), // 是否包含原题图片
  
  // 样式配置
  headerText: text("header_text"), // 页眉文字
  footerText: text("footer_text"), // 页脚文字
  showPageNumber: boolean("show_page_number").notNull().default(true), // 是否显示页码
  
  // 其他配置
  paperSize: varchar("paper_size", { length: 20 }).notNull().default("A4"), // 纸张大小 A4/A5/Letter
  orientation: varchar("orientation", { length: 20 }).notNull().default("portrait"), // 方向 portrait/landscape
  
  isDefault: boolean("is_default").notNull().default(false), // 是否为默认模板
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
});

/**
 * 打印历史记录表
 * 记录用户的打印/导出操作
 */
export const printHistory = mysqlTable("print_history", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  templateId: int("template_id"), // 使用的模板ID
  
  // 打印内容
  questionIds: text("question_ids").notNull(), // JSON数组，包含的错题ID列表
  questionCount: int("question_count").notNull(), // 错题数量
  
  // 打印配置快照（记录当时的配置）
  configSnapshot: text("config_snapshot").notNull(), // JSON格式的配置快照
  
  // 打印类型
  exportType: varchar("export_type", { length: 50 }).notNull(), // print/pdf/word
  
  // 文件信息（如果导出为文件）
  fileUrl: text("file_url"), // 导出文件的URL
  fileSize: int("file_size"), // 文件大小 (bytes)
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// TypeScript 类型定义
export type PrintTemplate = typeof printTemplates.$inferSelect;
export type NewPrintTemplate = typeof printTemplates.$inferInsert;
export type PrintHistory = typeof printHistory.$inferSelect;
export type NewPrintHistory = typeof printHistory.$inferInsert;
