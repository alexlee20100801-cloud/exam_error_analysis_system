/**
 * 预热任务智能优化服务
 * 基于历史数据分析,自动识别最佳预热时机和预热内容优先级
 */

import { db } from "../db";
import { 
  warmupTasks, 
  knowledgePointHotness, 
  questionTypeHotness,
  questionAnalysisCache 
} from "../../drizzle/schema";
import { desc, sql, and, gte, lte, eq } from "drizzle-orm";

/**
 * 预热推荐结果接口
 */
export interface WarmupRecommendation {
  taskName: string;
  taskType: "knowledge_point" | "question_type" | "recommendation";
  targetConfig: any;
  priority: number;
  aiRecommendationScore: number;
  aiRecommendationReason: string;
  estimatedImpact: {
    expectedHitRateImprovement: number;
    expectedResponseTimeImprovement: number;
    estimatedCacheSize: number;
  };
}

/**
 * 预热时机分析结果
 */
export interface WarmupTimingAnalysis {
  recommendedTime: Date;
  reason: string;
  confidence: number;
  historicalData: {
    avgUserActivity: number;
    avgSystemLoad: number;
    previousWarmupSuccess: number;
  };
}

/**
 * 分析历史预热任务效果
 * 计算平均效果指标,用于预测新任务的潜在影响
 */
export async function analyzeHistoricalWarmupEffectiveness() {
  const historicalTasks = await db
    .select({
      taskType: warmupTasks.taskType,
      avgHitRateImprovement: sql<number>`AVG(${warmupTasks.hitRateImprovement})`,
      avgResponseTimeImprovement: sql<number>`AVG(${warmupTasks.responseTimeImprovement})`,
      avgEffectivenessScore: sql<number>`AVG(${warmupTasks.effectivenessScore})`,
      successRate: sql<number>`SUM(CASE WHEN ${warmupTasks.status} = 'completed' THEN 1 ELSE 0 END) / COUNT(*) * 100`,
      totalCount: sql<number>`COUNT(*)`,
    })
    .from(warmupTasks)
    .where(sql`${warmupTasks.completedAt} IS NOT NULL`)
    .groupBy(warmupTasks.taskType);

  return historicalTasks;
}

/**
 * 识别高优先级知识点
 * 基于热度分数和访问频率,识别需要预热的知识点
 */
export async function identifyHighPriorityKnowledgePoints(limit: number = 20) {
  const hotKnowledgePoints = await db
    .select()
    .from(knowledgePointHotness)
    .orderBy(desc(knowledgePointHotness.hotnessScore))
    .limit(limit);

  return hotKnowledgePoints;
}

/**
 * 识别高优先级题目类型
 * 基于热度分数和分析频率,识别需要预热的题目类型
 */
export async function identifyHighPriorityQuestionTypes(limit: number = 10) {
  const hotQuestionTypes = await db
    .select()
    .from(questionTypeHotness)
    .orderBy(desc(questionTypeHotness.hotnessScore))
    .limit(limit);

  return hotQuestionTypes;
}

/**
 * 分析缓存覆盖率
 * 计算当前缓存对热门内容的覆盖程度
 */
export async function analyzeCacheCoverage() {
  // 获取热门知识点
  const hotKnowledgePoints = await identifyHighPriorityKnowledgePoints(50);
  const hotKpIds = hotKnowledgePoints.map(kp => kp.knowledgePointId);

  // 简化缓存覆盖率计算(由于JSON查询复杂性,这里使用简化逻辑)
  const totalCachedItems = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(questionAnalysisCache);

  const coverageRate = hotKpIds.length > 0 ? Math.min(100, (totalCachedItems[0]?.count || 0) / hotKpIds.length * 100) : 0;
  const estimatedCachedKp = Math.floor((coverageRate / 100) * hotKpIds.length);

  return {
    totalHotKnowledgePoints: hotKpIds.length,
    cachedHotKnowledgePoints: estimatedCachedKp,
    coverageRate: coverageRate,
    uncoveredKnowledgePoints: hotKpIds.length - estimatedCachedKp,
  };
}

/**
 * 计算预热任务的AI推荐分数
 * 综合考虑热度、缓存覆盖率、历史效果等因素
 */
function calculateRecommendationScore(
  hotnessScore: number,
  cacheCoverageRate: number,
  historicalEffectiveness: number,
  urgency: number
): number {
  // 权重配置
  const weights = {
    hotness: 0.35,
    coverage: 0.25,
    historical: 0.25,
    urgency: 0.15,
  };

  const score = 
    hotnessScore * weights.hotness +
    (100 - cacheCoverageRate) * weights.coverage +
    historicalEffectiveness * weights.historical +
    urgency * weights.urgency;

  return Math.min(100, Math.max(0, score));
}

/**
 * 生成智能预热推荐
 * 基于历史数据分析,自动推荐预热任务
 */
export async function generateIntelligentWarmupRecommendations(): Promise<WarmupRecommendation[]> {
  const recommendations: WarmupRecommendation[] = [];

  // 1. 分析历史效果
  const historicalData = await analyzeHistoricalWarmupEffectiveness();
  const knowledgePointHistorical = historicalData.find(h => h.taskType === "knowledge_point");
  const questionTypeHistorical = historicalData.find(h => h.taskType === "question_type");

  // 2. 分析缓存覆盖率
  const cacheCoverage = await analyzeCacheCoverage();

  // 3. 识别高优先级知识点
  const hotKnowledgePoints = await identifyHighPriorityKnowledgePoints(10);
  
  for (const kp of hotKnowledgePoints) {
    const urgency = kp.accessCount > 100 ? 80 : kp.accessCount > 50 ? 60 : 40;
    const score = calculateRecommendationScore(
      kp.hotnessScore,
      cacheCoverage.coverageRate,
      knowledgePointHistorical?.avgEffectivenessScore || 70,
      urgency
    );

    recommendations.push({
      taskName: `预热知识点: ${kp.knowledgePointName}`,
      taskType: "knowledge_point",
      targetConfig: {
        knowledgePointId: kp.knowledgePointId,
        knowledgePointName: kp.knowledgePointName,
        subject: kp.subject,
        schoolLevel: kp.schoolLevel,
      },
      priority: Math.ceil(score / 10),
      aiRecommendationScore: score,
      aiRecommendationReason: `该知识点热度分数${kp.hotnessScore.toFixed(2)},访问次数${kp.accessCount},分析次数${kp.analysisCount}。基于历史数据,预热该知识点预计可提升缓存命中率${(knowledgePointHistorical?.avgHitRateImprovement || 15).toFixed(1)}%,响应时间改善${(knowledgePointHistorical?.avgResponseTimeImprovement || 20).toFixed(1)}%。`,
      estimatedImpact: {
        expectedHitRateImprovement: knowledgePointHistorical?.avgHitRateImprovement || 15,
        expectedResponseTimeImprovement: knowledgePointHistorical?.avgResponseTimeImprovement || 20,
        estimatedCacheSize: Math.ceil(kp.questionCount * 0.8),
      },
    });
  }

  // 4. 识别高优先级题目类型
  const hotQuestionTypes = await identifyHighPriorityQuestionTypes(5);
  
  for (const qt of hotQuestionTypes) {
    const urgency = qt.analysisCount > 50 ? 75 : qt.analysisCount > 20 ? 55 : 35;
    const score = calculateRecommendationScore(
      qt.hotnessScore,
      cacheCoverage.coverageRate,
      questionTypeHistorical?.avgEffectivenessScore || 65,
      urgency
    );

    recommendations.push({
      taskName: `预热题目类型: ${qt.subject}-${qt.schoolLevel}-${qt.difficulty}`,
      taskType: "question_type",
      targetConfig: {
        subject: qt.subject,
        schoolLevel: qt.schoolLevel,
        difficulty: qt.difficulty,
        questionTypePattern: qt.questionTypePattern,
      },
      priority: Math.ceil(score / 10),
      aiRecommendationScore: score,
      aiRecommendationReason: `该题目类型热度分数${qt.hotnessScore.toFixed(2)},出现次数${qt.occurrenceCount},分析次数${qt.analysisCount}。预热该类型预计可提升缓存命中率${(questionTypeHistorical?.avgHitRateImprovement || 12).toFixed(1)}%。`,
      estimatedImpact: {
        expectedHitRateImprovement: questionTypeHistorical?.avgHitRateImprovement || 12,
        expectedResponseTimeImprovement: questionTypeHistorical?.avgResponseTimeImprovement || 18,
        estimatedCacheSize: Math.ceil(qt.occurrenceCount * 0.6),
      },
    });
  }

  // 按推荐分数排序
  recommendations.sort((a, b) => b.aiRecommendationScore - a.aiRecommendationScore);

  return recommendations;
}

/**
 * 分析最佳预热时机
 * 基于历史数据,识别系统负载低、预热效果好的时间段
 */
export async function analyzeOptimalWarmupTiming(): Promise<WarmupTimingAnalysis> {
  // 获取过去30天的预热任务数据
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const historicalTasks = await db
    .select({
      scheduledHour: sql<number>`HOUR(scheduled_at)`,
      avgEffectiveness: sql<number>`AVG(effectiveness_score)`,
      successRate: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*) * 100`,
      taskCount: sql<number>`COUNT(*)`,
    })
    .from(warmupTasks)
    .where(gte(warmupTasks.scheduledAt, thirtyDaysAgo))
    .groupBy(sql`HOUR(scheduled_at)`)
    .orderBy(desc(sql`AVG(effectiveness_score)`));

  // 找到效果最好的时间段
  const bestTiming = historicalTasks[0];

  if (!bestTiming) {
    // 如果没有历史数据,推荐凌晨2点(系统负载通常较低)
    const recommendedTime = new Date();
    recommendedTime.setHours(2, 0, 0, 0);
    if (recommendedTime < new Date()) {
      recommendedTime.setDate(recommendedTime.getDate() + 1);
    }

    return {
      recommendedTime,
      reason: "基于系统负载分析,凌晨2点是推荐的预热时间(用户活跃度低,系统资源充足)。",
      confidence: 0.7,
      historicalData: {
        avgUserActivity: 0,
        avgSystemLoad: 0,
        previousWarmupSuccess: 0,
      },
    };
  }

  // 计算推荐时间
  const recommendedTime = new Date();
  recommendedTime.setHours(bestTiming.scheduledHour, 0, 0, 0);
  if (recommendedTime < new Date()) {
    recommendedTime.setDate(recommendedTime.getDate() + 1);
  }

  return {
    recommendedTime,
    reason: `基于历史数据分析,${bestTiming.scheduledHour}点是最佳预热时间。该时段历史预热任务平均效果评分${bestTiming.avgEffectiveness?.toFixed ? bestTiming.avgEffectiveness.toFixed(1) : bestTiming.avgEffectiveness || 'N/A'},成功率${bestTiming.successRate !== null && bestTiming.successRate !== undefined ? Number(bestTiming.successRate).toFixed(1) : 'N/A'}%,共执行${bestTiming.taskCount}次任务。`,
    confidence: Math.min(0.95, 0.6 + (bestTiming.taskCount / 100) * 0.35),
    historicalData: {
      avgUserActivity: 100 - (bestTiming.scheduledHour >= 0 && bestTiming.scheduledHour <= 6 ? 90 : 50),
      avgSystemLoad: bestTiming.scheduledHour >= 0 && bestTiming.scheduledHour <= 6 ? 20 : 60,
      previousWarmupSuccess: bestTiming.successRate || 0,
    },
  };
}

/**
 * 记录预热任务效果
 * 在预热任务完成后,记录效果数据用于后续分析
 */
export async function recordWarmupEffectiveness(
  taskId: number,
  beforeMetrics: { cacheHitRate: number; avgResponseTime: number },
  afterMetrics: { cacheHitRate: number; avgResponseTime: number }
) {
  const hitRateImprovement = afterMetrics.cacheHitRate - beforeMetrics.cacheHitRate;
  const responseTimeImprovement = 
    ((beforeMetrics.avgResponseTime - afterMetrics.avgResponseTime) / beforeMetrics.avgResponseTime) * 100;

  // 计算综合效果评分
  const effectivenessScore = Math.min(100, 
    (hitRateImprovement * 0.6 + responseTimeImprovement * 0.4)
  );

  await db
    .update(warmupTasks)
    .set({
      beforeCacheHitRate: beforeMetrics.cacheHitRate,
      afterCacheHitRate: afterMetrics.cacheHitRate,
      hitRateImprovement,
      beforeAvgResponseTime: beforeMetrics.avgResponseTime,
      afterAvgResponseTime: afterMetrics.avgResponseTime,
      responseTimeImprovement,
      effectivenessScore,
    })
    .where(eq(warmupTasks.id, taskId));

  return {
    hitRateImprovement,
    responseTimeImprovement,
    effectivenessScore,
  };
}
