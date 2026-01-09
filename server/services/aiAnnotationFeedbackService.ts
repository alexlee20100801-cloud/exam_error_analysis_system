import { getDb } from '../db';
import { aiAnnotationFeedback, chartTypeTemplates } from '../../drizzle/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { handleFeedbackRewards } from './pointsService';

/**
 * AI标注反馈服务
 * 收集用户对AI标注的反馈，用于优化识别准确度
 */

export interface FeedbackInput {
  userId: string;
  annotationId: number;
  imageUrl: string;
  chartType?: string;
  rating: number; // 1-5星
  feedbackType: 'accurate' | 'partially_accurate' | 'inaccurate' | 'missing_features';
  improvementSuggestion?: string;
  aiAnnotations?: any[];
  userCorrectedAnnotations?: any[];
  confidence?: number;
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  accuracyRate: number; // 准确+部分准确的比例
  feedbackByType: {
    accurate: number;
    partially_accurate: number;
    inaccurate: number;
    missing_features: number;
  };
  ratingDistribution: {
    [key: number]: number; // 1-5星的分布
  };
}

export interface ChartTypeAccuracy {
  chartType: string;
  name: string;
  totalFeedback: number;
  averageRating: number;
  accuracyRate: number;
  feedbackByType: {
    accurate: number;
    partially_accurate: number;
    inaccurate: number;
    missing_features: number;
  };
}

/**
 * 提交AI标注反馈
 */
export async function submitAnnotationFeedback(input: FeedbackInput) {
  const db = getDb();
  
  const [result] = await db.insert(aiAnnotationFeedback).values({
    userId: input.userId,
    annotationId: input.annotationId,
    imageUrl: input.imageUrl,
    chartType: input.chartType,
    rating: input.rating,
    feedbackType: input.feedbackType,
    improvementSuggestion: input.improvementSuggestion,
    aiAnnotations: input.aiAnnotations,
    userCorrectedAnnotations: input.userCorrectedAnnotations,
    confidence: input.confidence ? input.confidence.toString() : null,
  });

  // 如果有图表类型,更新该类型的反馈计数和准确率
  if (input.chartType) {
    await updateChartTypeAccuracy(input.chartType);
  }

  // 处理积分和成就奖励
  try {
    const rewards = await handleFeedbackRewards(input.userId, {
      rating: input.rating,
      improvementSuggestion: input.improvementSuggestion,
      userCorrectedAnnotations: input.userCorrectedAnnotations,
    });

    return {
      ...result,
      rewards,
    };
  } catch (error) {
    console.error('处理反馈奖励失败:', error);
    // 即使奖励失败,也返回反馈结果
    return result;
  }
}

/**
 * 获取整体反馈统计
 */
export async function getFeedbackStats(userId?: string): Promise<FeedbackStats> {
  const db = getDb();
  
  const conditions = userId ? [eq(aiAnnotationFeedback.userId, userId)] : [];
  
  const feedbackList = await db
    .select()
    .from(aiAnnotationFeedback)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiAnnotationFeedback.createdAt));

  const totalFeedback = feedbackList.length;
  
  if (totalFeedback === 0) {
    return {
      totalFeedback: 0,
      averageRating: 0,
      accuracyRate: 0,
      feedbackByType: {
        accurate: 0,
        partially_accurate: 0,
        inaccurate: 0,
        missing_features: 0,
      },
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  // 计算平均评分
  const totalRating = feedbackList.reduce((sum, f) => sum + f.rating, 0);
  const averageRating = totalRating / totalFeedback;

  // 统计反馈类型
  const feedbackByType = {
    accurate: 0,
    partially_accurate: 0,
    inaccurate: 0,
    missing_features: 0,
  };

  feedbackList.forEach(f => {
    feedbackByType[f.feedbackType]++;
  });

  // 计算准确率（准确+部分准确）
  const accurateCount = feedbackByType.accurate + feedbackByType.partially_accurate;
  const accuracyRate = (accurateCount / totalFeedback) * 100;

  // 统计评分分布
  const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  feedbackList.forEach(f => {
    ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1;
  });

  return {
    totalFeedback,
    averageRating: Math.round(averageRating * 100) / 100,
    accuracyRate: Math.round(accuracyRate * 100) / 100,
    feedbackByType,
    ratingDistribution,
  };
}

/**
 * 获取按图表类型分组的准确率统计
 */
export async function getChartTypeAccuracyStats(): Promise<ChartTypeAccuracy[]> {
  const db = getDb();
  
  // 获取所有有反馈的图表类型
  const feedbackList = await db
    .select()
    .from(aiAnnotationFeedback)
    .where(sql`${aiAnnotationFeedback.chartType} IS NOT NULL`)
    .orderBy(desc(aiAnnotationFeedback.createdAt));

  // 按图表类型分组统计
  const chartTypeMap = new Map<string, any[]>();
  feedbackList.forEach(f => {
    if (!f.chartType) return;
    if (!chartTypeMap.has(f.chartType)) {
      chartTypeMap.set(f.chartType, []);
    }
    chartTypeMap.get(f.chartType)!.push(f);
  });

  // 获取图表类型模板信息
  const templates = await db.select().from(chartTypeTemplates);
  const templateMap = new Map(templates.map(t => [t.chartType, t]));

  const results: ChartTypeAccuracy[] = [];

  // @ts-ignore
  for (const [chartType, feedbacks] of chartTypeMap.entries()) {
    const template = templateMap.get(chartType);
    const totalFeedback = feedbacks.length;
    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / totalFeedback;

    const feedbackByType = {
      accurate: 0,
      partially_accurate: 0,
      inaccurate: 0,
      missing_features: 0,
    };

    feedbacks.forEach(f => {
      feedbackByType[f.feedbackType]++;
    });

    const accurateCount = feedbackByType.accurate + feedbackByType.partially_accurate;
    const accuracyRate = (accurateCount / totalFeedback) * 100;

    results.push({
      chartType,
      name: template?.name || chartType,
      totalFeedback,
      averageRating: Math.round(averageRating * 100) / 100,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      feedbackByType,
    });
  }

  // 按准确率排序（从低到高，优先显示需要改进的）
  results.sort((a, b) => a.accuracyRate - b.accuracyRate);

  return results;
}

/**
 * 获取用户的反馈历史
 */
export async function getUserFeedbackHistory(userId: number, limit = 20) {
  const db = getDb();
  
  return db
    .select()
    .from(aiAnnotationFeedback)
    .where(eq(aiAnnotationFeedback.userId, userId as any))
    .orderBy(desc(aiAnnotationFeedback.createdAt))
    .limit(limit);
}

/**
 * 获取特定标注的反馈
 */
export async function getAnnotationFeedback(annotationId: number) {
  const db = getDb();
  
  return db
    .select()
    .from(aiAnnotationFeedback)
    .where(eq(aiAnnotationFeedback.annotationId, annotationId))
    .orderBy(desc(aiAnnotationFeedback.createdAt));
}

/**
 * 更新图表类型的准确率统计
 */
async function updateChartTypeAccuracy(chartType: string) {
  const db = getDb();
  
  // 获取该类型的所有反馈
  const feedbacks = await db
    .select()
    .from(aiAnnotationFeedback)
    .where(eq(aiAnnotationFeedback.chartType, chartType));

  if (feedbacks.length === 0) return;

  // 计算准确率
  const accurateCount = feedbacks.filter(
    f => f.feedbackType === 'accurate' || f.feedbackType === 'partially_accurate'
  ).length;
  const accuracyRate = (accurateCount / feedbacks.length) * 100;

  // 更新模板表中的统计数据
  await db
    .update(chartTypeTemplates)
    .set({
      accuracyRate: accuracyRate.toFixed(2),
      feedbackCount: feedbacks.length,
    })
    .where(eq(chartTypeTemplates.chartType, chartType));
}

/**
 * 获取改进建议汇总
 */
export async function getImprovementSuggestions(chartType?: string, limit = 50) {
  const db = getDb();
  
  const conditions = [
    sql`${aiAnnotationFeedback.improvementSuggestion} IS NOT NULL`,
    sql`${aiAnnotationFeedback.improvementSuggestion} != ''`,
  ];

  if (chartType) {
    conditions.push(eq(aiAnnotationFeedback.chartType, chartType));
  }

  return db
    .select({
      id: aiAnnotationFeedback.id,
      chartType: aiAnnotationFeedback.chartType,
      rating: aiAnnotationFeedback.rating,
      feedbackType: aiAnnotationFeedback.feedbackType,
      improvementSuggestion: aiAnnotationFeedback.improvementSuggestion,
      createdAt: aiAnnotationFeedback.createdAt,
    })
    .from(aiAnnotationFeedback)
    .where(and(...conditions))
    .orderBy(desc(aiAnnotationFeedback.createdAt))
    .limit(limit);
}

/**
 * 获取近期反馈趋势（按天统计）
 */
export async function getFeedbackTrend(days = 30) {
  const db = getDb();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const feedbacks = await db
    .select()
    .from(aiAnnotationFeedback)
    // @ts-ignore
    .where(gte(aiAnnotationFeedback.createdAt, startDate))
    .orderBy(aiAnnotationFeedback.createdAt);

  // 按日期分组统计
  const trendMap = new Map<string, { date: string; count: number; averageRating: number; accuracyRate: number }>();

  feedbacks.forEach(f => {
    // @ts-ignore
    const dateStr = f.createdAt.toISOString().split('T')[0];
    if (!trendMap.has(dateStr)) {
      trendMap.set(dateStr, { date: dateStr, count: 0, averageRating: 0, accuracyRate: 0 });
    }
    const trend = trendMap.get(dateStr)!;
    trend.count++;
  });

  // 计算每天的平均评分和准确率
  // @ts-ignore
  for (const [dateStr, trend] of trendMap.entries()) {
    // @ts-ignore
    const dayFeedbacks = feedbacks.filter(f => f.createdAt.toISOString().split('T')[0] === dateStr);
    const totalRating = dayFeedbacks.reduce((sum, f) => sum + f.rating, 0);
    trend.averageRating = Math.round((totalRating / dayFeedbacks.length) * 100) / 100;

    const accurateCount = dayFeedbacks.filter(
      f => f.feedbackType === 'accurate' || f.feedbackType === 'partially_accurate'
    ).length;
    trend.accuracyRate = Math.round((accurateCount / dayFeedbacks.length) * 100 * 100) / 100;
  }

  return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
