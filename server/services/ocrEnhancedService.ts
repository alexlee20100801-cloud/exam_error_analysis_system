import { getDb } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { 
  borderDetectionRecords,
  handwritingRecognitionRecords,
  ocrEnhancementConfigs,
  ocrProcessingBatches,
  type BorderDetectionRecord,
  type NewBorderDetectionRecord,
  type HandwritingRecognitionRecord,
  type OcrEnhancementConfig,
  type NewOcrEnhancementConfig,
  type OcrProcessingBatch
} from '../../drizzle/ocr_enhanced_schema';
import { invokeLLM } from '../_core/llm';
import { storagePut } from '../storage';

// ==================== 边框检测 ====================

/**
 * 使用AI进行边框检测
 */
export async function detectBorder(
  userId: number,
  imageUrl: string,
  imageKey?: string
): Promise<BorderDetectionRecord> {
  const db = getDb();
  const startTime = Date.now();
  
  // 创建记录
  const [record] = await db.insert(borderDetectionRecords)
    .values({
      userId,
      originalImageUrl: imageUrl,
      originalImageKey: imageKey,
      detectionStatus: 'processing',
    })
    .$returningId();
  
  try {
    // 使用AI进行边框检测
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是一个专业的图像分析助手。请分析图片中的文档/试卷边框，返回四个角点的坐标。
坐标使用相对值（0-1之间的小数），左上角为原点。
如果检测到清晰的文档边框，返回四个角点坐标和置信度。
如果没有检测到明显的边框，返回null。`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请检测这张图片中的文档/试卷边框，返回四个角点的坐标。'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'border_detection',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              detected: { type: 'boolean' },
              confidence: { type: 'number' },
              coordinates: {
                type: 'object',
                properties: {
                  topLeft: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' }
                    },
                    required: ['x', 'y'],
                    additionalProperties: false
                  },
                  topRight: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' }
                    },
                    required: ['x', 'y'],
                    additionalProperties: false
                  },
                  bottomRight: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' }
                    },
                    required: ['x', 'y'],
                    additionalProperties: false
                  },
                  bottomLeft: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' }
                    },
                    required: ['x', 'y'],
                    additionalProperties: false
                  }
                },
                required: ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'],
                additionalProperties: false
              },
              needsPerspectiveCorrection: { type: 'boolean' },
              estimatedWidth: { type: 'number' },
              estimatedHeight: { type: 'number' }
            },
            required: ['detected', 'confidence', 'coordinates', 'needsPerspectiveCorrection', 'estimatedWidth', 'estimatedHeight'],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : '{}');
    
    const processingTime = Date.now() - startTime;
    
    if (result.detected && result.confidence > 50) {
      // 更新记录
      await db.update(borderDetectionRecords)
        .set({
          detectionStatus: 'detected',
          borderCoordinates: result.coordinates,
          detectionConfidence: Math.round(result.confidence),
          perspectiveCorrected: result.needsPerspectiveCorrection,
          originalWidth: result.estimatedWidth,
          originalHeight: result.estimatedHeight,
          processingTimeMs: processingTime,
        })
        .where(eq(borderDetectionRecords.id, record.id));
    } else {
      await db.update(borderDetectionRecords)
        .set({
          detectionStatus: 'not_found',
          detectionConfidence: Math.round(result.confidence || 0),
          processingTimeMs: processingTime,
        })
        .where(eq(borderDetectionRecords.id, record.id));
    }
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    await db.update(borderDetectionRecords)
      .set({
        detectionStatus: 'failed',
        errorMessage: error.message,
        processingTimeMs: processingTime,
      })
      .where(eq(borderDetectionRecords.id, record.id));
  }
  
  // 返回更新后的记录
  const [updatedRecord] = await db.select()
    .from(borderDetectionRecords)
    .where(eq(borderDetectionRecords.id, record.id))
    .limit(1);
  
  return updatedRecord;
}

/**
 * 基于检测结果生成裁剪建议
 */
export async function generateCropSuggestion(
  borderRecord: BorderDetectionRecord
): Promise<{
  shouldCrop: boolean;
  cropRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  needsPerspectiveCorrection: boolean;
  confidence: number;
}> {
  if (borderRecord.detectionStatus !== 'detected' || !borderRecord.borderCoordinates) {
    return {
      shouldCrop: false,
      needsPerspectiveCorrection: false,
      confidence: 0,
    };
  }
  
  const coords = borderRecord.borderCoordinates as any;
  
  // 计算边界框
  const minX = Math.min(coords.topLeft.x, coords.bottomLeft.x);
  const maxX = Math.max(coords.topRight.x, coords.bottomRight.x);
  const minY = Math.min(coords.topLeft.y, coords.topRight.y);
  const maxY = Math.max(coords.bottomLeft.y, coords.bottomRight.y);
  
  // 检查是否需要透视校正（角点是否形成矩形）
  const isRectangular = checkIfRectangular(coords);
  
  return {
    shouldCrop: true,
    cropRegion: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    needsPerspectiveCorrection: !isRectangular,
    confidence: borderRecord.detectionConfidence || 0,
  };
}

/**
 * 检查四个角点是否形成近似矩形
 */
function checkIfRectangular(coords: any): boolean {
  const tolerance = 0.05; // 5%的容差
  
  // 检查上边和下边是否平行
  const topSlope = (coords.topRight.y - coords.topLeft.y) / (coords.topRight.x - coords.topLeft.x);
  const bottomSlope = (coords.bottomRight.y - coords.bottomLeft.y) / (coords.bottomRight.x - coords.bottomLeft.x);
  
  // 检查左边和右边是否平行
  const leftSlope = (coords.bottomLeft.y - coords.topLeft.y) / (coords.bottomLeft.x - coords.topLeft.x);
  const rightSlope = (coords.bottomRight.y - coords.topRight.y) / (coords.bottomRight.x - coords.topRight.x);
  
  const horizontalParallel = Math.abs(topSlope - bottomSlope) < tolerance;
  const verticalParallel = Math.abs(leftSlope - rightSlope) < tolerance;
  
  return horizontalParallel && verticalParallel;
}

// ==================== 手写识别增强 ====================

/**
 * 增强手写识别
 */
export async function enhanceHandwritingRecognition(
  userId: number,
  imageUrl: string,
  imageKey?: string,
  options?: {
    subject?: string;
    contrastEnhancement?: boolean;
    noiseReduction?: boolean;
    mathSymbolEnhancement?: boolean;
    chemicalFormulaEnhancement?: boolean;
  }
): Promise<HandwritingRecognitionRecord> {
  const db = getDb();
  const startTime = Date.now();
  
  // 创建记录
  const [record] = await db.insert(handwritingRecognitionRecords)
    .values({
      userId,
      imageUrl,
      imageKey,
      preprocessConfig: {
        contrastEnhancement: options?.contrastEnhancement ?? true,
        noiseReduction: options?.noiseReduction ?? true,
        binarization: false,
        skewCorrection: true,
        borderRemoval: true,
      },
      recognitionStatus: 'recognizing',
    })
    .$returningId();
  
  try {
    // 构建针对手写识别优化的提示
    let systemPrompt = `你是一个专业的手写文字识别专家。请仔细识别图片中的手写内容，注意：
1. 保持原文的格式和换行
2. 识别所有文字，包括潦草的部分
3. 对于不确定的字符，提供最可能的解读`;
    
    if (options?.mathSymbolEnhancement) {
      systemPrompt += `
4. 特别注意数学符号的识别，如：
   - 分数、根号、指数
   - 积分、求和、极限符号
   - 希腊字母（α, β, γ, θ, π等）
   - 数学运算符（≤, ≥, ≠, ≈, ∞等）`;
    }
    
    if (options?.chemicalFormulaEnhancement) {
      systemPrompt += `
5. 特别注意化学符号的识别，如：
   - 化学元素符号和下标
   - 化学方程式箭头和条件
   - 离子符号和电荷标记`;
    }
    
    // 使用AI进行手写识别
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请识别这张图片中的手写内容。${options?.subject ? `这是一道${options.subject}题目。` : ''}`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'handwriting_recognition',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              recognizedText: { type: 'string' },
              confidence: { type: 'number' },
              specialSymbols: {
                type: 'object',
                properties: {
                  mathSymbols: { type: 'array', items: { type: 'string' } },
                  chemicalFormulas: { type: 'array', items: { type: 'string' } },
                  greekLetters: { type: 'array', items: { type: 'string' } },
                  other: { type: 'array', items: { type: 'string' } }
                },
                required: ['mathSymbols', 'chemicalFormulas', 'greekLetters', 'other'],
                additionalProperties: false
              },
              handwritingQuality: {
                type: 'object',
                properties: {
                  clarity: { type: 'string', enum: ['clear', 'moderate', 'poor'] },
                  slant: { type: 'string', enum: ['left', 'upright', 'right'] },
                  consistency: { type: 'string', enum: ['high', 'medium', 'low'] },
                  suggestions: { type: 'array', items: { type: 'string' } }
                },
                required: ['clarity', 'slant', 'consistency', 'suggestions'],
                additionalProperties: false
              }
            },
            required: ['recognizedText', 'confidence', 'specialSymbols', 'handwritingQuality'],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : '{}');
    
    const processingTime = Date.now() - startTime;
    
    // 更新记录
    await db.update(handwritingRecognitionRecords)
      .set({
        recognitionStatus: 'completed',
        enhancedOcrText: result.recognizedText,
        enhancedOcrConfidence: String(result.confidence),
        specialSymbols: result.specialSymbols,
        handwritingAnalysis: result.handwritingQuality,
        processingTimeMs: processingTime,
      })
      .where(eq(handwritingRecognitionRecords.id, record.id));
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    await db.update(handwritingRecognitionRecords)
      .set({
        recognitionStatus: 'failed',
        errorMessage: error.message,
        processingTimeMs: processingTime,
      })
      .where(eq(handwritingRecognitionRecords.id, record.id));
  }
  
  // 返回更新后的记录
  const [updatedRecord] = await db.select()
    .from(handwritingRecognitionRecords)
    .where(eq(handwritingRecognitionRecords.id, record.id))
    .limit(1);
  
  return updatedRecord;
}

// ==================== 一站式OCR增强处理 ====================

/**
 * 一站式OCR增强处理
 */
export async function processImageWithEnhancement(
  userId: number,
  imageUrl: string,
  imageKey?: string,
  options?: {
    autoBorderDetection?: boolean;
    autoPerspectiveCorrection?: boolean;
    handwritingMode?: boolean;
    subject?: string;
    mathSymbolEnhancement?: boolean;
    chemicalFormulaEnhancement?: boolean;
  }
): Promise<{
  success: boolean;
  borderDetection?: BorderDetectionRecord;
  cropSuggestion?: {
    shouldCrop: boolean;
    cropRegion?: { x: number; y: number; width: number; height: number };
    needsPerspectiveCorrection: boolean;
    confidence: number;
  };
  handwritingRecognition?: HandwritingRecognitionRecord;
  finalText?: string;
  error?: string;
}> {
  try {
    let borderDetection: BorderDetectionRecord | undefined;
    let cropSuggestion: any;
    let handwritingRecognition: HandwritingRecognitionRecord | undefined;
    let processedImageUrl = imageUrl;
    
    // 1. 边框检测
    if (options?.autoBorderDetection !== false) {
      borderDetection = await detectBorder(userId, imageUrl, imageKey);
      
      if (borderDetection.detectionStatus === 'detected') {
        cropSuggestion = await generateCropSuggestion(borderDetection);
        
        // 如果检测到边框且有裁剪后的图片，使用裁剪后的图片
        if (borderDetection.croppedImageUrl) {
          processedImageUrl = borderDetection.croppedImageUrl;
        }
      }
    }
    
    // 2. 手写识别增强
    if (options?.handwritingMode !== false) {
      handwritingRecognition = await enhanceHandwritingRecognition(
        userId,
        processedImageUrl,
        imageKey,
        {
          subject: options?.subject,
          contrastEnhancement: true,
          noiseReduction: true,
          mathSymbolEnhancement: options?.mathSymbolEnhancement,
          chemicalFormulaEnhancement: options?.chemicalFormulaEnhancement,
        }
      );
    }
    
    // 获取最终识别文本
    const finalText = handwritingRecognition?.enhancedOcrText || '';
    
    return {
      success: true,
      borderDetection,
      cropSuggestion,
      handwritingRecognition,
      finalText,
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ==================== 配置管理 ====================

/**
 * 获取用户的OCR增强配置
 */
export async function getUserOcrConfig(userId: number): Promise<OcrEnhancementConfig | null> {
  const db = getDb();
  
  const [config] = await db.select()
    .from(ocrEnhancementConfigs)
    .where(eq(ocrEnhancementConfigs.userId, userId))
    .limit(1);
  
  return config || null;
}

/**
 * 创建或更新用户的OCR增强配置
 */
export async function upsertOcrConfig(
  userId: number,
  data: Partial<NewOcrEnhancementConfig>
): Promise<OcrEnhancementConfig> {
  const db = getDb();
  
  const existing = await getUserOcrConfig(userId);
  
  if (existing) {
    await db.update(ocrEnhancementConfigs)
      .set(data)
      .where(eq(ocrEnhancementConfigs.userId, userId));
  } else {
    await db.insert(ocrEnhancementConfigs)
      .values({
        userId,
        ...data,
      });
  }
  
  const [config] = await db.select()
    .from(ocrEnhancementConfigs)
    .where(eq(ocrEnhancementConfigs.userId, userId))
    .limit(1);
  
  return config;
}

// ==================== 批量处理 ====================

/**
 * 创建批量OCR处理任务
 */
export async function createOcrBatch(
  userId: number,
  batchName: string,
  totalImages: number,
  config?: {
    autoBorderDetection?: boolean;
    autoPerspectiveCorrection?: boolean;
    autoContrastEnhancement?: boolean;
    autoNoiseReduction?: boolean;
    handwritingMode?: boolean;
    subject?: string;
  }
): Promise<OcrProcessingBatch> {
  const db = getDb();
  
  const [batch] = await db.insert(ocrProcessingBatches)
    .values({
      userId,
      batchName,
      totalImages,
      processingConfig: config ? {
        autoBorderDetection: config.autoBorderDetection ?? true,
        autoPerspectiveCorrection: config.autoPerspectiveCorrection ?? true,
        autoContrastEnhancement: config.autoContrastEnhancement ?? true,
        autoNoiseReduction: config.autoNoiseReduction ?? true,
        handwritingMode: config.handwritingMode ?? false,
        subject: config.subject,
      } : undefined,
      status: 'pending',
    })
    .$returningId();
  
  const [result] = await db.select()
    .from(ocrProcessingBatches)
    .where(eq(ocrProcessingBatches.id, batch.id))
    .limit(1);
  
  return result;
}

/**
 * 更新批量处理进度
 */
export async function updateBatchProgress(
  batchId: number,
  update: {
    processedImages?: number;
    successfulImages?: number;
    failedImages?: number;
    status?: OcrProcessingBatch['status'];
    errorMessage?: string;
  }
): Promise<void> {
  const db = getDb();
  
  const updateData: any = { ...update };
  
  if (update.status === 'processing' && !updateData.startedAt) {
    updateData.startedAt = new Date();
  }
  
  if (update.status === 'completed' || update.status === 'failed') {
    updateData.completedAt = new Date();
  }
  
  await db.update(ocrProcessingBatches)
    .set(updateData)
    .where(eq(ocrProcessingBatches.id, batchId));
}

/**
 * 获取用户的批量处理历史
 */
export async function getUserOcrBatches(
  userId: number,
  limit = 20
): Promise<OcrProcessingBatch[]> {
  const db = getDb();
  
  return await db.select()
    .from(ocrProcessingBatches)
    .where(eq(ocrProcessingBatches.userId, userId))
    .orderBy(desc(ocrProcessingBatches.createdAt))
    .limit(limit);
}

// ==================== 统计 ====================

/**
 * 获取OCR处理统计
 */
export async function getOcrStatistics(userId: number): Promise<{
  totalBorderDetections: number;
  successfulDetections: number;
  totalHandwritingRecognitions: number;
  averageConfidence: number;
  totalBatches: number;
  totalImagesProcessed: number;
}> {
  const db = getDb();
  
  // 边框检测统计
  const borderStats = await db.select({
    total: sql<number>`count(*)`,
    successful: sql<number>`sum(case when detection_status = 'detected' then 1 else 0 end)`,
  })
    .from(borderDetectionRecords)
    .where(eq(borderDetectionRecords.userId, userId));
  
  // 手写识别统计
  const handwritingStats = await db.select({
    total: sql<number>`count(*)`,
    avgConfidence: sql<number>`avg(enhanced_ocr_confidence)`,
  })
    .from(handwritingRecognitionRecords)
    .where(eq(handwritingRecognitionRecords.userId, userId));
  
  // 批量处理统计
  const batchStats = await db.select({
    total: sql<number>`count(*)`,
    totalImages: sql<number>`sum(processed_images)`,
  })
    .from(ocrProcessingBatches)
    .where(eq(ocrProcessingBatches.userId, userId));
  
  return {
    totalBorderDetections: borderStats[0]?.total || 0,
    successfulDetections: borderStats[0]?.successful || 0,
    totalHandwritingRecognitions: handwritingStats[0]?.total || 0,
    averageConfidence: handwritingStats[0]?.avgConfidence || 0,
    totalBatches: batchStats[0]?.total || 0,
    totalImagesProcessed: batchStats[0]?.totalImages || 0,
  };
}
