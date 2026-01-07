import { mysqlTable, int, varchar, text, json, timestamp, decimal, mysqlEnum, index } from "drizzle-orm/mysql-core";

/**
 * 上传的文档记录表
 */
export const uploadedDocuments = mysqlTable("uploaded_documents", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  
  // 文件信息
  originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
  fileType: mysqlEnum("file_type", ['image', 'pdf', 'word']).notNull(),
  fileSize: int("file_size").notNull(), // 字节数
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  
  // S3存储路径
  originalFileUrl: varchar("original_file_url", { length: 500 }).notNull(),
  originalFileKey: varchar("original_file_key", { length: 500 }).notNull(),
  
  // 处理状态
  processingStatus: mysqlEnum("processing_status", [
    'uploaded',           // 刚上传
    'region_selecting',   // 用户正在框选区域
    'processing',         // AI正在处理
    'completed',          // 处理完成
    'failed'              // 处理失败
  ]).default('uploaded').notNull(),
  
  errorMessage: text("error_message"),
  
  // 元数据
  totalRegions: int("total_regions").default(0).notNull(),
  totalContents: int("total_contents").default(0).notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("user_id_idx").on(table.userId),
  index("processing_status_idx").on(table.processingStatus),
  index("created_at_idx").on(table.createdAt),
]);

/**
 * 框选区域表
 */
export const documentRegions = mysqlTable("document_regions", {
  id: int().autoincrement().primaryKey().notNull(),
  documentId: int("document_id").notNull(),
  
  // 区域位置（相对于原图的百分比坐标）
  x: decimal({ precision: 10, scale: 6 }).notNull(),
  y: decimal({ precision: 10, scale: 6 }).notNull(),
  width: decimal({ precision: 10, scale: 6 }).notNull(),
  height: decimal({ precision: 10, scale: 6 }).notNull(),
  
  // 区域类型
  regionType: mysqlEnum("region_type", [
    'text',        // 文字
    'formula',     // 数学公式
    'chart',       // 图表
    'table',       // 表格
    'image',       // 图画
    'mixed'        // 混合内容
  ]).notNull(),
  
  // 处理后的图像（去除笔迹后）
  processedImageUrl: varchar("processed_image_url", { length: 500 }),
  processedImageKey: varchar("processed_image_key", { length: 500 }),
  
  // 是否需要清除笔迹
  needsHandwritingRemoval: int("needs_handwriting_removal").default(1).notNull(),
  
  // 处理状态
  processingStatus: mysqlEnum("processing_status", [
    'pending',
    'processing',
    'completed',
    'failed'
  ]).default('pending').notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("document_id_idx").on(table.documentId),
  index("region_type_idx").on(table.regionType),
  index("processing_status_idx").on(table.processingStatus),
]);

/**
 * 识别的内容表
 */
export const recognizedContents = mysqlTable("recognized_contents", {
  id: int().autoincrement().primaryKey().notNull(),
  regionId: int("region_id").notNull(),
  documentId: int("document_id").notNull(),
  
  // 内容类型
  contentType: mysqlEnum("content_type", [
    'text',           // 纯文字
    'formula',        // 数学公式
    'chart_data',     // 图表数据
    'table_data',     // 表格数据
    'image_description' // 图像描述
  ]).notNull(),
  
  // 原始识别结果
  rawContent: text("raw_content").notNull(),
  
  // 结构化数据（JSON格式）
  structuredData: json("structured_data"),
  
  // 可编辑格式
  editableFormat: mysqlEnum("editable_format", [
    'plain_text',
    'markdown',
    'latex',
    'json',
    'html'
  ]).notNull(),
  
  editableContent: text("editable_content").notNull(),
  
  // 识别置信度
  confidence: decimal({ precision: 5, scale: 2 }),
  
  // 是否已被用户编辑
  isEdited: int("is_edited").default(0).notNull(),
  
  // 用户编辑后的内容
  userEditedContent: text("user_edited_content"),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("region_id_idx").on(table.regionId),
  index("document_id_idx").on(table.documentId),
  index("content_type_idx").on(table.contentType),
]);

/**
 * 手写笔迹清除记录表
 */
export const handwritingRemovalLogs = mysqlTable("handwriting_removal_logs", {
  id: int().autoincrement().primaryKey().notNull(),
  regionId: int("region_id").notNull(),
  documentId: int("document_id").notNull(),
  
  // 原始图像
  beforeImageUrl: varchar("before_image_url", { length: 500 }).notNull(),
  beforeImageKey: varchar("before_image_key", { length: 500 }).notNull(),
  
  // 处理后图像
  afterImageUrl: varchar("after_image_url", { length: 500 }).notNull(),
  afterImageKey: varchar("after_image_key", { length: 500 }).notNull(),
  
  // 检测到的笔迹信息
  detectedHandwriting: json("detected_handwriting"),
  
  // 处理参数
  processingParams: json("processing_params"),
  
  // 处理耗时（毫秒）
  processingTimeMs: int("processing_time_ms"),
  
  // 质量评分
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index("region_id_idx").on(table.regionId),
  index("document_id_idx").on(table.documentId),
]);

/**
 * 导出记录表
 */
export const documentExports = mysqlTable("document_exports", {
  id: int().autoincrement().primaryKey().notNull(),
  documentId: int("document_id").notNull(),
  userId: int("user_id").notNull(),
  
  // 导出格式
  exportFormat: mysqlEnum("export_format", [
    'word',
    'pdf',
    'markdown',
    'latex',
    'json'
  ]).notNull(),
  
  // 导出文件
  exportFileUrl: varchar("export_file_url", { length: 500 }).notNull(),
  exportFileKey: varchar("export_file_key", { length: 500 }).notNull(),
  
  // 导出配置
  exportConfig: json("export_config"),
  
  // 文件大小
  fileSize: int("file_size").notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index("document_id_idx").on(table.documentId),
  index("user_id_idx").on(table.userId),
  index("created_at_idx").on(table.createdAt),
]);
