import { db } from "../db";
import { 
  crawlerSelectorRules, 
  crawlerPerformanceStats,
  type CrawlerSelectorRule,
  type NewCrawlerSelectorRule,
  type CrawlerPerformanceStat,
  type NewCrawlerPerformanceStat
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

/**
 * 创建爬虫选择器规则
 */
export async function createSelectorRule(rule: NewCrawlerSelectorRule) {
  const [newRule] = await db.insert(crawlerSelectorRules).values(rule);
  return newRule;
}

/**
 * 获取所有选择器规则
 */
export async function getAllSelectorRules(websiteName?: string, isActive?: boolean) {
  const conditions = [];
  
  if (websiteName) {
    conditions.push(eq(crawlerSelectorRules.websiteName, websiteName));
  }
  
  if (isActive !== undefined) {
    conditions.push(eq(crawlerSelectorRules.isActive, isActive ? 1 : 0));
  }
  
  return await db
    .select()
    .from(crawlerSelectorRules)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(crawlerSelectorRules.priority));
}

/**
 * 获取单个选择器规则
 */
export async function getSelectorRuleById(id: number) {
  const [rule] = await db
    .select()
    .from(crawlerSelectorRules)
    .where(eq(crawlerSelectorRules.id, id));
  
  return rule;
}

/**
 * 更新选择器规则
 */
export async function updateSelectorRule(id: number, updates: Partial<CrawlerSelectorRule>) {
  await db
    .update(crawlerSelectorRules)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(crawlerSelectorRules.id, id));
  
  return await getSelectorRuleById(id);
}

/**
 * 删除选择器规则
 */
export async function deleteSelectorRule(id: number) {
  await db
    .delete(crawlerSelectorRules)
    .where(eq(crawlerSelectorRules.id, id));
}

/**
 * 记录爬虫性能统计
 */
export async function recordPerformanceStat(stat: NewCrawlerPerformanceStat) {
  const [newStat] = await db.insert(crawlerPerformanceStats).values(stat);
  return newStat;
}

/**
 * 更新爬虫性能统计
 */
export async function updatePerformanceStat(
  ruleId: number,
  success: boolean,
  responseTime: number,
  qualityScore?: number,
  errorMessage?: string
) {
  // 获取现有统计
  const [existingStat] = await db
    .select()
    .from(crawlerPerformanceStats)
    .where(eq(crawlerPerformanceStats.ruleId, ruleId))
    .orderBy(desc(crawlerPerformanceStats.createdAt))
    .limit(1);
  
  if (existingStat) {
    // 更新现有统计
    const totalAttempts = existingStat.totalAttempts + 1;
    const successfulAttempts = success ? existingStat.successfulAttempts + 1 : existingStat.successfulAttempts;
    const failedAttempts = success ? existingStat.failedAttempts : existingStat.failedAttempts + 1;
    
    // 计算平均响应时间
    const avgResponseTime = Math.round(
      (existingStat.averageResponseTime * existingStat.totalAttempts + responseTime) / totalAttempts
    );
    
    // 更新错误消息列表
    let errorMessages = existingStat.errorMessages as string[] || [];
    if (!success && errorMessage) {
      errorMessages = [...errorMessages.slice(-9), errorMessage]; // 保留最近10条错误
    }
    
    await db
      .update(crawlerPerformanceStats)
      .set({
        totalAttempts,
        successfulAttempts,
        failedAttempts,
        averageResponseTime: avgResponseTime,
        dataQualityScore: qualityScore !== undefined ? qualityScore.toString() : existingStat.dataQualityScore,
        errorMessages: JSON.stringify(errorMessages),
        lastRunAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(crawlerPerformanceStats.id, existingStat.id));
    
    // 同时更新规则的成功率
    const successRate = (successfulAttempts / totalAttempts) * 100;
    await db
      .update(crawlerSelectorRules)
      .set({
        successRate: successRate.toFixed(2),
        lastTestedAt: new Date().toISOString(),
      })
      .where(eq(crawlerSelectorRules.id, ruleId));
  }
}

/**
 * 获取爬虫性能统计
 */
export async function getPerformanceStats(ruleId?: number, websiteName?: string) {
  const conditions = [];
  
  if (ruleId) {
    conditions.push(eq(crawlerPerformanceStats.ruleId, ruleId));
  }
  
  if (websiteName) {
    conditions.push(eq(crawlerPerformanceStats.websiteName, websiteName));
  }
  
  return await db
    .select()
    .from(crawlerPerformanceStats)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(crawlerPerformanceStats.lastRunAt));
}

/**
 * 获取爬虫性能汇总
 */
export async function getPerformanceSummary(websiteName?: string) {
  const conditions = [];
  
  if (websiteName) {
    conditions.push(eq(crawlerPerformanceStats.websiteName, websiteName));
  }
  
  const stats = await db
    .select({
      websiteName: crawlerPerformanceStats.websiteName,
      totalAttempts: sql<number>`SUM(${crawlerPerformanceStats.totalAttempts})`,
      totalSuccessful: sql<number>`SUM(${crawlerPerformanceStats.successfulAttempts})`,
      totalFailed: sql<number>`SUM(${crawlerPerformanceStats.failedAttempts})`,
      avgResponseTime: sql<number>`AVG(${crawlerPerformanceStats.averageResponseTime})`,
      avgQualityScore: sql<number>`AVG(${crawlerPerformanceStats.dataQualityScore})`,
    })
    .from(crawlerPerformanceStats)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(crawlerPerformanceStats.websiteName);
  
  return stats.map(stat => ({
    ...stat,
    successRate: stat.totalAttempts > 0 
      ? ((stat.totalSuccessful / stat.totalAttempts) * 100).toFixed(2) 
      : "0.00",
  }));
}

/**
 * 自动调优选择器规则（基于性能数据）
 */
export async function autoTuneRules(websiteName: string) {
  // 获取该网站的所有规则和性能数据
  const rules = await getAllSelectorRules(websiteName, true);
  const performanceData = await getPerformanceStats(undefined, websiteName);
  
  const suggestions = [];
  
  for (const rule of rules) {
    const rulePerfData = performanceData.find(p => p.ruleId === rule.id);
    
    if (!rulePerfData) continue;
    
    const successRate = rulePerfData.totalAttempts > 0
      ? (rulePerfData.successfulAttempts / rulePerfData.totalAttempts) * 100
      : 0;
    
    // 如果成功率低于50%，建议禁用或修改
    if (successRate < 50 && rulePerfData.totalAttempts >= 10) {
      suggestions.push({
        ruleId: rule.id,
        targetField: rule.targetField,
        currentSuccessRate: successRate.toFixed(2),
        suggestion: "成功率过低，建议检查选择器规则或考虑使用备用规则",
        action: "review_or_disable",
        errorMessages: rulePerfData.errorMessages,
      });
    }
    
    // 如果响应时间过长，建议优化
    if (rulePerfData.averageResponseTime > 5000) {
      suggestions.push({
        ruleId: rule.id,
        targetField: rule.targetField,
        avgResponseTime: rulePerfData.averageResponseTime,
        suggestion: "平均响应时间过长，建议优化选择器复杂度",
        action: "optimize_selector",
      });
    }
    
    // 如果数据质量评分低，建议改进
    if (rulePerfData.dataQualityScore && parseFloat(rulePerfData.dataQualityScore) < 0.6) {
      suggestions.push({
        ruleId: rule.id,
        targetField: rule.targetField,
        qualityScore: rulePerfData.dataQualityScore,
        suggestion: "数据质量评分偏低，建议改进数据清洗逻辑",
        action: "improve_data_quality",
      });
    }
  }
  
  return suggestions;
}
