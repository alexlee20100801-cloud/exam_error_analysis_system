import { mysqlTable, int, varchar, text, timestamp, boolean, mysqlEnum, index, json, decimal } from 'drizzle-orm/mysql-core';

/**
 * 边框检测记录表
 */
export const borderDetectionRecords = mysqlTable('border_detection_records', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  
  // 原始图片信息
  originalImageUrl: varchar('original_image_url', { length: 500 }).notNull(),
  originalImageKey: varchar('original_image_key', { length: 500 }),
  originalWidth: int('original_width'),
  originalHeight: int('original_height'),
  
  // 检测结果
  detectionStatus: mysqlEnum('detection_status', [
    'pending',
    'processing',
    'detected',
    'not_found',
    'failed'
  ]).default('pending').notNull(),
  
  // 检测到的边框坐标（四个角点）
  borderCoordinates: json('border_coordinates').$type<{
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  }>(),
  
  // 检测置信度 (0-100)
  detectionConfidence: int('detection_confidence'),
  
  // 裁剪后的图片
  croppedImageUrl: varchar('cropped_image_url', { length: 500 }),
  croppedImageKey: varchar('cropped_image_key', { length: 500 }),
  croppedWidth: int('cropped_width'),
  croppedHeight: int('cropped_height'),
  
  // 是否应用了透视校正
  perspectiveCorrected: boolean('perspective_corrected').default(false).notNull(),
  
  // 处理时间（毫秒）
  processingTimeMs: int('processing_time_ms'),
  
  // 错误信息
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  detectionStatusIdx: index('detection_status_idx').on(table.detectionStatus),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

/**
 * 手写识别增强记录表
 */
export const handwritingRecognitionRecords = mysqlTable('handwriting_recognition_records', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  
  // 图片信息
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  imageKey: varchar('image_key', { length: 500 }),
  
  // 预处理配置
  preprocessConfig: json('preprocess_config').$type<{
    contrastEnhancement: boolean;
    noiseReduction: boolean;
    binarization: boolean;
    skewCorrection: boolean;
    borderRemoval: boolean;
  }>(),
  
  // 识别结果
  recognitionStatus: mysqlEnum('recognition_status', [
    'pending',
    'preprocessing',
    'recognizing',
    'completed',
    'failed'
  ]).default('pending').notNull(),
  
  // 原始OCR结果
  rawOcrText: text('raw_ocr_text'),
  rawOcrConfidence: decimal('raw_ocr_confidence', { precision: 5, scale: 2 }),
  
  // 增强后的OCR结果
  enhancedOcrText: text('enhanced_ocr_text'),
  enhancedOcrConfidence: decimal('enhanced_ocr_confidence', { precision: 5, scale: 2 }),
  
  // 识别到的特殊符号
  specialSymbols: json('special_symbols').$type<{
    mathSymbols: string[];
    chemicalFormulas: string[];
    greekLetters: string[];
    other: string[];
  }>(),
  
  // 手写特征分析
  handwritingAnalysis: json('handwriting_analysis').$type<{
    clarity: 'clear' | 'moderate' | 'poor';
    slant: 'left' | 'upright' | 'right';
    consistency: 'high' | 'medium' | 'low';
    suggestions: string[];
  }>(),
  
  // 处理时间
  processingTimeMs: int('processing_time_ms'),
  
  // 错误信息
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  recognitionStatusIdx: index('recognition_status_idx').on(table.recognitionStatus),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

/**
 * OCR增强配置表
 */
export const ocrEnhancementConfigs = mysqlTable('ocr_enhancement_configs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  
  // 自动边框检测
  autoBorderDetection: boolean('auto_border_detection').default(true).notNull(),
  borderDetectionSensitivity: mysqlEnum('border_detection_sensitivity', ['low', 'medium', 'high']).default('medium').notNull(),
  
  // 自动透视校正
  autoPerspectiveCorrection: boolean('auto_perspective_correction').default(true).notNull(),
  
  // 图像增强
  autoContrastEnhancement: boolean('auto_contrast_enhancement').default(true).notNull(),
  autoNoiseReduction: boolean('auto_noise_reduction').default(true).notNull(),
  autoBinarization: boolean('auto_binarization').default(false).notNull(),
  
  // 手写识别增强
  handwritingMode: boolean('handwriting_mode').default(false).notNull(),
  mathSymbolEnhancement: boolean('math_symbol_enhancement').default(true).notNull(),
  chemicalFormulaEnhancement: boolean('chemical_formula_enhancement').default(true).notNull(),
  
  // 默认科目（影响识别策略）
  defaultSubject: mysqlEnum('default_subject', [
    'chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'
  ]),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

/**
 * OCR处理批次表
 */
export const ocrProcessingBatches = mysqlTable('ocr_processing_batches', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  
  // 批次信息
  batchName: varchar('batch_name', { length: 100 }),
  totalImages: int('total_images').default(0).notNull(),
  processedImages: int('processed_images').default(0).notNull(),
  successfulImages: int('successful_images').default(0).notNull(),
  failedImages: int('failed_images').default(0).notNull(),
  
  // 处理配置
  processingConfig: json('processing_config').$type<{
    autoBorderDetection: boolean;
    autoPerspectiveCorrection: boolean;
    autoContrastEnhancement: boolean;
    autoNoiseReduction: boolean;
    handwritingMode: boolean;
    subject?: string;
  }>(),
  
  // 状态
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed', 'cancelled']).default('pending').notNull(),
  
  // 处理时间
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  totalProcessingTimeMs: int('total_processing_time_ms'),
  
  // 错误信息
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  statusIdx: index('status_idx').on(table.status),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

// 类型导出
export type BorderDetectionRecord = typeof borderDetectionRecords.$inferSelect;
export type NewBorderDetectionRecord = typeof borderDetectionRecords.$inferInsert;

export type HandwritingRecognitionRecord = typeof handwritingRecognitionRecords.$inferSelect;
export type NewHandwritingRecognitionRecord = typeof handwritingRecognitionRecords.$inferInsert;

export type OcrEnhancementConfig = typeof ocrEnhancementConfigs.$inferSelect;
export type NewOcrEnhancementConfig = typeof ocrEnhancementConfigs.$inferInsert;

export type OcrProcessingBatch = typeof ocrProcessingBatches.$inferSelect;
export type NewOcrProcessingBatch = typeof ocrProcessingBatches.$inferInsert;
