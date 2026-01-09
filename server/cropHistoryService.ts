import { getDb } from "./db";
import { cropHistory, type CropHistory, type NewCropHistory } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { invokeLLM } from "./_core/llm";

/**
 * 计算图片哈希值（用于相似度匹配）
 */
function calculateImageHash(imageUrl: string): string {
  return crypto.createHash('md5').update(imageUrl).digest('hex');
}

/**
 * 保存框选历史记录
 */
export async function saveCropHistory(data: {
  userId: number;
  imageUrl: string;
  regions: any[];
  questionType?: string;
  subject?: string;
  grade?: string;
}): Promise<CropHistory> {
  const db = getDb();
  
  const imageHash = calculateImageHash(data.imageUrl);
  
  // 检查是否已存在相同的历史记录
  const [existing] = await db.select()
    .from(cropHistory)
    .where(
      and(
        eq(cropHistory.userId, data.userId),
        eq(cropHistory.imageHash, imageHash)
      )
    );

  if (existing) {
    // 更新使用次数和最后使用时间
    await db.update(cropHistory)
      .set({
        usageCount: existing.usageCount + 1,
        lastUsedAt: new Date().toISOString(),
        regions: data.regions, // 更新为最新的框选区域
      })
      .where(eq(cropHistory.id, existing.id));
    
    const [updated] = await db.select().from(cropHistory).where(eq(cropHistory.id, existing.id));
    return updated;
  }

  // 创建新记录
  const [record] = await db.insert(cropHistory).values({
    userId: data.userId,
    imageUrl: data.imageUrl,
    imageHash,
    regions: data.regions,
    questionType: data.questionType as any,
    subject: data.subject as any,
    grade: data.grade as any,
  }).$returningId();

  const [created] = await db.select().from(cropHistory).where(eq(cropHistory.id, record.id));
  return created;
}

/**
 * 获取用户的框选历史记录
 */
export async function getUserCropHistory(userId: number, limit: number = 50): Promise<CropHistory[]> {
  const db = getDb();
  return await db.select()
    .from(cropHistory)
    .where(eq(cropHistory.userId, userId))
    .orderBy(desc(cropHistory.lastUsedAt))
    .limit(limit);
}

/**
 * 根据题型获取历史记录
 */
export async function getCropHistoryByQuestionType(
  userId: number,
  questionType: string
): Promise<CropHistory[]> {
  const db = getDb();
  return await db.select()
    .from(cropHistory)
    .where(
      and(
        eq(cropHistory.userId, userId),
        sql`${cropHistory.questionType} = ${questionType}`
      )
    )
    .orderBy(desc(cropHistory.usageCount))
    .limit(10);
}

/**
 * AI智能推荐框选方案
 */
export async function recommendCropRegions(data: {
  userId: number;
  imageUrl: string;
  questionType?: string;
  subject?: string;
}): Promise<{
  recommended: {
    regions: any[];
    confidence: number;
    reason: string;
    source: 'history' | 'ai' | 'template';
  };
  alternatives: Array<{
    regions: any[];
    confidence: number;
    reason: string;
    source: 'history' | 'ai' | 'template';
  }>;
}> {
  const db = getDb();
  const recommendations: any[] = [];

  // 1. 基于历史记录推荐
  let historyRecords: CropHistory[] = [];
  if (data.questionType) {
    historyRecords = await getCropHistoryByQuestionType(data.userId, data.questionType);
  } else {
    historyRecords = await getUserCropHistory(data.userId, 10);
  }

  if (historyRecords.length > 0) {
    // 找出使用次数最多且反馈为accepted的记录
    const bestHistory = historyRecords
      .filter(h => h.feedback === 'accepted' || !h.feedback)
      .sort((a, b) => b.usageCount - a.usageCount)[0];

    if (bestHistory) {
      recommendations.push({
        regions: bestHistory.regions,
        confidence: Math.min(0.95, 0.7 + (bestHistory.usageCount * 0.05)),
        reason: `基于您之前${bestHistory.usageCount}次成功的框选经验`,
        source: 'history',
      });
    }
  }

  // 2. AI智能分析推荐
  try {
    const aiResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个专业的试卷图像分析助手。请分析图片并推荐最佳的框选方案。",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请分析这张${data.questionType || ''}试卷图片，推荐最佳的框选区域。返回框选建议和置信度。`,
            },
            {
              type: "image_url",
              image_url: {
                url: data.imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "crop_recommendation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              regions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    label: { type: "string" },
                  },
                  required: ["x", "y", "width", "height", "label"],
                  additionalProperties: false,
                },
              },
              confidence: { type: "number" },
              reason: { type: "string" },
            },
            required: ["regions", "confidence", "reason"],
            additionalProperties: false,
          },
        },
      },
    });

    // @ts-ignore
    const aiResult = JSON.parse(aiResponse.choices[0].message.content || '{}');
    recommendations.push({
      ...aiResult,
      source: 'ai',
    });
  } catch (error) {
    console.error("AI推荐失败:", error);
  }

  // 按置信度排序
  recommendations.sort((a, b) => b.confidence - a.confidence);

  return {
    recommended: recommendations[0] || {
      regions: [],
      confidence: 0,
      reason: "暂无推荐",
      source: 'ai',
    },
    alternatives: recommendations.slice(1),
  };
}

/**
 * 更新用户反馈
 */
export async function updateCropFeedback(
  id: number,
  userId: number,
  feedback: 'accepted' | 'rejected' | 'modified'
): Promise<CropHistory | undefined> {
  const db = getDb();
  await db.update(cropHistory)
    .set({ feedback })
    .where(
      and(
        eq(cropHistory.id, id),
        eq(cropHistory.userId, userId)
      )
    );

  const [updated] = await db.select().from(cropHistory).where(eq(cropHistory.id, id));
  return updated;
}

/**
 * 删除历史记录
 */
export async function deleteCropHistory(id: number, userId: number): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(cropHistory)
    .where(
      and(
        eq(cropHistory.id, id),
        eq(cropHistory.userId, userId)
      )
    );
  return (result as any).rowsAffected > 0 || (result as any).length > 0;
}

/**
 * 获取框选统计信息
 */
export async function getCropStatistics(userId: number): Promise<{
  totalRecords: number;
  byQuestionType: Record<string, number>;
  bySubject: Record<string, number>;
  mostUsedRegions: CropHistory[];
}> {
  const db = getDb();
  
  const records = await getUserCropHistory(userId, 1000);
  
  const byQuestionType: Record<string, number> = {};
  const bySubject: Record<string, number> = {};
  
  records.forEach(record => {
    if (record.questionType) {
      byQuestionType[record.questionType] = (byQuestionType[record.questionType] || 0) + 1;
    }
    if (record.subject) {
      bySubject[record.subject] = (bySubject[record.subject] || 0) + 1;
    }
  });

  const mostUsedRegions = records
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);

  return {
    totalRecords: records.length,
    byQuestionType,
    bySubject,
    mostUsedRegions,
  };
}
