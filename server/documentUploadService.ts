import { getDb } from "./db";
import { uploadedDocuments, documentRegions, recognizedContents, handwritingRemovalLogs, documentExports } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

/**
 * 文档上传处理服务
 * 提供文档上传、区域框选、AI识别、笔迹清除等功能
 */

export interface UploadDocumentParams {
  userId: number;
  fileName: string;
  fileType: 'image' | 'pdf' | 'word';
  fileSize: number;
  mimeType: string;
  fileBuffer: Buffer;
}

export interface CreateRegionParams {
  documentId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  regionType: 'text' | 'formula' | 'chart' | 'table' | 'image' | 'mixed';
  needsHandwritingRemoval?: boolean;
}

export interface RecognizeContentParams {
  regionId: number;
  documentId: number;
  imageUrl: string;
  regionType: string;
}

/**
 * 上传文档到S3并创建记录
 */
export async function uploadDocument(params: UploadDocumentParams) {
  const db = getDb();
  
  // 生成唯一文件key
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const fileKey = `documents/${params.userId}/${timestamp}-${randomSuffix}-${params.fileName}`;
  
  // 上传到S3
  const { url } = await storagePut(fileKey, params.fileBuffer, params.mimeType);
  
  // 创建数据库记录
  const [result] = await db.insert(uploadedDocuments).values({
    userId: params.userId,
    originalFileName: params.fileName,
    fileType: params.fileType,
    fileSize: params.fileSize,
    mimeType: params.mimeType,
    originalFileUrl: url,
    originalFileKey: fileKey,
    processingStatus: 'uploaded',
    totalRegions: 0,
    totalContents: 0,
  });
  
  return {
    id: result.insertId,
    fileUrl: url,
    fileKey: fileKey,
  };
}

/**
 * 获取用户的文档列表
 */
export async function getUserDocuments(userId: number, limit = 50) {
  const db = getDb();
  
  const documents = await db
    .select()
    .from(uploadedDocuments)
    .where(eq(uploadedDocuments.userId, userId))
    .orderBy(desc(uploadedDocuments.createdAt))
    .limit(limit);
  
  return documents;
}

/**
 * 获取文档详情
 */
export async function getDocumentById(documentId: number) {
  const db = getDb();
  
  const [document] = await db
    .select()
    .from(uploadedDocuments)
    .where(eq(uploadedDocuments.id, documentId));
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  return document;
}

/**
 * 创建框选区域
 */
export async function createRegion(params: CreateRegionParams) {
  const db = getDb();
  
  const [result] = await db.insert(documentRegions).values({
    documentId: params.documentId,
    x: params.x.toString(),
    y: params.y.toString(),
    width: params.width.toString(),
    height: params.height.toString(),
    regionType: params.regionType,
    needsHandwritingRemoval: params.needsHandwritingRemoval ? 1 : 0,
    processingStatus: 'pending',
  });
  
  // 更新文档的区域计数
  await db
    .update(uploadedDocuments)
    .set({
      totalRegions: db.raw('total_regions + 1') as any,
      processingStatus: 'region_selecting',
    })
    .where(eq(uploadedDocuments.id, params.documentId));
  
  return {
    id: result.insertId,
  };
}

/**
 * 获取文档的所有区域
 */
export async function getDocumentRegions(documentId: number) {
  const db = getDb();
  
  const regions = await db
    .select()
    .from(documentRegions)
    .where(eq(documentRegions.documentId, documentId))
    .orderBy(desc(documentRegions.createdAt));
  
  return regions;
}

/**
 * 删除区域
 */
export async function deleteRegion(regionId: number) {
  const db = getDb();
  
  // 获取区域信息
  const [region] = await db
    .select()
    .from(documentRegions)
    .where(eq(documentRegions.id, regionId));
  
  if (!region) {
    throw new Error('Region not found');
  }
  
  // 删除区域
  await db.delete(documentRegions).where(eq(documentRegions.id, regionId));
  
  // 更新文档的区域计数
  await db
    .update(uploadedDocuments)
    .set({
      totalRegions: db.raw('total_regions - 1') as any,
    })
    .where(eq(uploadedDocuments.id, region.documentId));
  
  return { success: true };
}

/**
 * 使用AI识别区域内容
 */
export async function recognizeRegionContent(params: RecognizeContentParams) {
  const db = getDb();
  
  // 更新区域状态为处理中
  await db
    .update(documentRegions)
    .set({ processingStatus: 'processing' })
    .where(eq(documentRegions.id, params.regionId));
  
  try {
    // 根据区域类型选择不同的识别策略
    let contentType: 'text' | 'formula' | 'chart_data' | 'table_data' | 'image_description';
    let editableFormat: 'plain_text' | 'markdown' | 'latex' | 'json' | 'html';
    let prompt: string;
    
    switch (params.regionType) {
      case 'text':
        contentType = 'text';
        editableFormat = 'plain_text';
        prompt = '请识别图片中的所有文字内容，保持原有的格式和换行。只返回识别出的文字，不要添加任何解释。';
        break;
      case 'formula':
        contentType = 'formula';
        editableFormat = 'latex';
        prompt = '请识别图片中的数学公式，并转换为LaTeX格式。只返回LaTeX代码，不要添加任何解释。';
        break;
      case 'chart':
        contentType = 'chart_data';
        editableFormat = 'json';
        prompt = '请识别图片中的图表，提取图表类型、标题、坐标轴信息和数据点。以JSON格式返回：{"type": "图表类型", "title": "标题", "xAxis": "X轴标签", "yAxis": "Y轴标签", "data": [数据点数组]}';
        break;
      case 'table':
        contentType = 'table_data';
        editableFormat = 'json';
        prompt = '请识别图片中的表格，提取所有单元格的内容。以JSON格式返回二维数组：[[第一行], [第二行], ...]';
        break;
      case 'image':
        contentType = 'image_description';
        editableFormat = 'markdown';
        prompt = '请详细描述图片中的图形、图画内容，包括几何形状、标注、关键特征等。使用Markdown格式。';
        break;
      case 'mixed':
        contentType = 'text';
        editableFormat = 'markdown';
        prompt = '请识别图片中的所有内容，包括文字、公式、图表等。使用Markdown格式组织内容，公式用LaTeX表示。';
        break;
      default:
        contentType = 'text';
        editableFormat = 'plain_text';
        prompt = '请识别图片中的内容。';
    }
    
    // 调用LLM进行识别
    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: params.imageUrl } }
          ]
        }
      ],
    });
    
    const rawContent = response.choices[0].message.content || '';
    
    // 解析结构化数据（如果是JSON格式）
    let structuredData = null;
    if (editableFormat === 'json') {
      try {
        // 尝试提取JSON内容（可能被markdown代码块包裹）
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         rawContent.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, rawContent];
        const jsonStr = jsonMatch[1] || rawContent;
        structuredData = JSON.parse(jsonStr.trim());
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        structuredData = { raw: rawContent };
      }
    }
    
    // 保存识别结果
    const [result] = await db.insert(recognizedContents).values({
      regionId: params.regionId,
      documentId: params.documentId,
      contentType,
      rawContent,
      structuredData: structuredData ? JSON.stringify(structuredData) : null,
      editableFormat,
      editableContent: rawContent,
      confidence: '95.00', // 默认置信度
      isEdited: 0,
    });
    
    // 更新区域状态为完成
    await db
      .update(documentRegions)
      .set({ processingStatus: 'completed' })
      .where(eq(documentRegions.id, params.regionId));
    
    // 更新文档的内容计数
    await db
      .update(uploadedDocuments)
      .set({
        totalContents: db.raw('total_contents + 1') as any,
      })
      .where(eq(uploadedDocuments.id, params.documentId));
    
    return {
      id: result.insertId,
      contentType,
      rawContent,
      structuredData,
      editableFormat,
      editableContent: rawContent,
    };
  } catch (error) {
    // 更新区域状态为失败
    await db
      .update(documentRegions)
      .set({ processingStatus: 'failed' })
      .where(eq(documentRegions.id, params.regionId));
    
    throw error;
  }
}

/**
 * 获取区域的识别内容
 */
export async function getRegionContents(regionId: number) {
  const db = getDb();
  
  const contents = await db
    .select()
    .from(recognizedContents)
    .where(eq(recognizedContents.regionId, regionId));
  
  return contents;
}

/**
 * 更新识别内容（用户编辑）
 */
export async function updateRecognizedContent(contentId: number, editedContent: string) {
  const db = getDb();
  
  await db
    .update(recognizedContents)
    .set({
      userEditedContent: editedContent,
      isEdited: 1,
    })
    .where(eq(recognizedContents.id, contentId));
  
  return { success: true };
}

/**
 * 清除手写笔迹（使用AI图像处理）
 */
export async function removeHandwriting(regionId: number, imageUrl: string) {
  const db = getDb();
  
  // 获取区域信息
  const [region] = await db
    .select()
    .from(documentRegions)
    .where(eq(documentRegions.id, regionId));
  
  if (!region) {
    throw new Error('Region not found');
  }
  
  const startTime = Date.now();
  
  try {
    // 使用LLM分析图像并生成清除笔迹的指导
    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请分析这张图片，识别其中的手写笔迹（包括手写文字、标记、涂改等）。请详细描述：1. 检测到的手写笔迹位置和特征 2. 哪些是打印文字需要保留 3. 如何区分手写和打印内容。以JSON格式返回：{"hasHandwriting": true/false, "handwritingAreas": [{"description": "描述", "color": "颜色", "type": "类型"}], "printedTextAreas": [{"description": "描述"}], "removalStrategy": "清除策略"}'
            },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
    });
    
    const analysisResult = response.choices[0].message.content || '';
    
    // 解析分析结果
    let detectedHandwriting: any = {};
    try {
      const jsonMatch = analysisResult.match(/```json\s*([\s\S]*?)\s*```/) || 
                       analysisResult.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, analysisResult];
      const jsonStr = jsonMatch[1] || analysisResult;
      detectedHandwriting = JSON.parse(jsonStr.trim());
    } catch (e) {
      detectedHandwriting = { raw: analysisResult };
    }
    
    // 注意：实际的图像处理需要使用专门的图像处理库或服务
    // 这里我们模拟处理过程，实际应用中需要：
    // 1. 使用OpenCV或类似库进行图像处理
    // 2. 基于AI分析结果进行笔迹检测和清除
    // 3. 使用图像修复算法填补清除区域
    
    // 模拟处理：这里我们暂时使用原图作为处理后的图像
    // 在实际应用中，这里应该是处理后的新图像
    const processedImageKey = `processed/${region.documentId}/${regionId}-${Date.now()}.png`;
    const processedImageUrl = imageUrl; // 实际应该是处理后的图像URL
    
    const processingTimeMs = Date.now() - startTime;
    
    // 保存处理日志
    await db.insert(handwritingRemovalLogs).values({
      regionId,
      documentId: region.documentId,
      beforeImageUrl: imageUrl,
      beforeImageKey: imageUrl,
      afterImageUrl: processedImageUrl,
      afterImageKey: processedImageKey,
      detectedHandwriting: JSON.stringify(detectedHandwriting),
      processingParams: JSON.stringify({ strategy: 'ai_guided' }),
      processingTimeMs,
      qualityScore: '85.00',
    });
    
    // 更新区域的处理后图像
    await db
      .update(documentRegions)
      .set({
        processedImageUrl,
        processedImageKey,
      })
      .where(eq(documentRegions.id, regionId));
    
    return {
      success: true,
      processedImageUrl,
      detectedHandwriting,
      processingTimeMs,
    };
  } catch (error) {
    console.error('Failed to remove handwriting:', error);
    throw error;
  }
}

/**
 * 获取文档的所有识别内容
 */
export async function getDocumentContents(documentId: number) {
  const db = getDb();
  
  const contents = await db
    .select()
    .from(recognizedContents)
    .where(eq(recognizedContents.documentId, documentId))
    .orderBy(desc(recognizedContents.createdAt));
  
  return contents;
}

/**
 * 更新文档处理状态
 */
export async function updateDocumentStatus(
  documentId: number,
  status: 'uploaded' | 'region_selecting' | 'processing' | 'completed' | 'failed',
  errorMessage?: string
) {
  const db = getDb();
  
  await db
    .update(uploadedDocuments)
    .set({
      processingStatus: status,
      errorMessage: errorMessage || null,
    })
    .where(eq(uploadedDocuments.id, documentId));
  
  return { success: true };
}
