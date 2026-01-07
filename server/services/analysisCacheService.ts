import crypto from 'crypto';
import { getDb } from '../db';
import { questionAnalysisCache } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * 生成题目内容的哈希值
 */
export function generateContentHash(content: string, subject: string, grade: string): string {
  const normalizedContent = content.trim().toLowerCase();
  const hashInput = `${normalizedContent}|${subject}|${grade}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * 查询缓存的AI分析结果
 */
export async function getCachedAnalysis(
  contentHash: string,
  subject: string,
  grade: string
) {
  try {
    const db = await getDb();
    if (!db) return null;

    const results = await db
      .select()
      .from(questionAnalysisCache)
      .where(
        and(
          eq(questionAnalysisCache.contentHash, contentHash),
          eq(questionAnalysisCache.subject, subject as any),
          eq(questionAnalysisCache.grade, grade as any)
        )
      )
      .limit(1);

    if (results.length === 0) return null;

    const cache = results[0];

    // 更新缓存命中统计
    await db
      .update(questionAnalysisCache)
      .set({
        hitCount: (cache.hitCount || 0) + 1,
        lastHitAt: new Date().toISOString(),
      })
      .where(eq(questionAnalysisCache.id, cache.id));

    return {
      errorAnalysis: cache.errorAnalysis,
      correctAnswer: cache.correctAnswer,
      detailedExplanation: cache.detailedExplanation,
      detailedAnalysis: cache.detailedAnalysis,
      knowledgePointIds: cache.knowledgePointIds,
      difficulty: cache.difficulty,
      fromCache: true,
    };
  } catch (error) {
    console.error('[AnalysisCache] 查询缓存失败:', error);
    return null;
  }
}

/**
 * 保存AI分析结果到缓存
 */
export async function saveAnalysisToCache(
  contentHash: string,
  subject: string,
  grade: string,
  analysis: {
    errorReason: string;
    correctAnswer: string;
    detailedExplanation: string;
    studyAdvice: string;
    knowledgePoints: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  }
) {
  try {
    const db = await getDb();
    if (!db) return false;

    // 检查是否已存在
    const existing = await db
      .select()
      .from(questionAnalysisCache)
      .where(
        and(
          eq(questionAnalysisCache.contentHash, contentHash),
          eq(questionAnalysisCache.subject, subject as any),
          eq(questionAnalysisCache.grade, grade as any)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 更新现有缓存
      await db
        .update(questionAnalysisCache)
        .set({
          errorAnalysis: analysis.errorReason,
          correctAnswer: analysis.correctAnswer,
          detailedExplanation: analysis.detailedExplanation,
          detailedAnalysis: analysis.studyAdvice,
          knowledgePointIds: JSON.stringify(analysis.knowledgePoints),
          difficulty: analysis.difficulty,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(questionAnalysisCache.id, existing[0].id));
    } else {
      // 创建新缓存
      await db.insert(questionAnalysisCache).values({
        contentHash,
        subject: subject as any,
        grade: grade as any,
        errorAnalysis: analysis.errorReason,
        correctAnswer: analysis.correctAnswer,
        detailedExplanation: analysis.detailedExplanation,
        detailedAnalysis: analysis.studyAdvice,
        knowledgePointIds: JSON.stringify(analysis.knowledgePoints),
        difficulty: analysis.difficulty,
        hitCount: 0,
        analysisVersion: 'v1',
      });
    }

    return true;
  } catch (error) {
    console.error('[AnalysisCache] 保存缓存失败:', error);
    return false;
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats() {
  try {
    const db = await getDb();
    if (!db) return null;

    const caches = await db.select().from(questionAnalysisCache);

    const totalCaches = caches.length;
    const totalHits = caches.reduce((sum, cache) => sum + (cache.hitCount || 0), 0);
    const avgHitCount = totalCaches > 0 ? totalHits / totalCaches : 0;

    return {
      totalCaches,
      totalHits,
      avgHitCount: Math.round(avgHitCount * 100) / 100,
    };
  } catch (error) {
    console.error('[AnalysisCache] 获取统计信息失败:', error);
    return null;
  }
}
