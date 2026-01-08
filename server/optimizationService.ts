import { db } from "./db";
import {
  aiClassificationMetrics,
  paperAlgorithmMetrics,
  crawlerPerformanceMetrics,
  performanceAlertRules,
  performanceAlerts,
  weeklyReports,
  scheduledTaskLogs,
  aiClassificationTestSet,
  aiPromptVersions,
  paperAlgorithmConfig,
  type NewAiClassificationMetric,
  type NewPaperAlgorithmMetric,
  type NewCrawlerPerformanceMetric,
  type NewPerformanceAlertRule,
  type NewPerformanceAlert,
  type NewWeeklyReport,
  type NewScheduledTaskLog,
} from "../drizzle/schema";
import { desc, eq, and, gte, lte, sql, count } from "drizzle-orm";

// ==================== AI分类性能评估 ====================

/**
 * 记录AI分类性能指标
 */
export async function recordAiClassificationMetric(metric: NewAiClassificationMetric) {
  const [result] = await db.insert(aiClassificationMetrics).values(metric);
  return result;
}

/**
 * 获取AI分类性能历史
 */
export async function getAiClassificationMetricsHistory(
  promptVersionId?: number,
  startDate?: Date,
  endDate?: Date,
  limit: number = 30
) {
  let query = db.select().from(aiClassificationMetrics);

  const conditions = [];
  if (promptVersionId) {
    conditions.push(eq(aiClassificationMetrics.promptVersionId, promptVersionId));
  }
  if (startDate) {
    conditions.push(gte(aiClassificationMetrics.evaluationDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(aiClassificationMetrics.evaluationDate, endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query
    .orderBy(desc(aiClassificationMetrics.evaluationDate))
    .limit(limit);
}

/**
 * 计算AI分类准确率趋势
 */
export async function calculateAiClassificationTrend(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await db
    .select()
    .from(aiClassificationMetrics)
    .where(gte(aiClassificationMetrics.evaluationDate, startDate))
    .orderBy(aiClassificationMetrics.evaluationDate);

  return metrics.map((m) => ({
    date: m.evaluationDate,
    accuracy: parseFloat(m.accuracy as any),
    precision: m.precision ? parseFloat(m.precision as any) : null,
    recall: m.recall ? parseFloat(m.recall as any) : null,
    f1Score: m.f1Score ? parseFloat(m.f1Score as any) : null,
  }));
}

// ==================== 组卷算法性能评估 ====================

/**
 * 记录组卷算法性能指标
 */
export async function recordPaperAlgorithmMetric(metric: NewPaperAlgorithmMetric) {
  const [result] = await db.insert(paperAlgorithmMetrics).values(metric);
  return result;
}

/**
 * 获取组卷算法性能历史
 */
export async function getPaperAlgorithmMetricsHistory(
  configId?: number,
  startDate?: Date,
  endDate?: Date,
  limit: number = 30
) {
  let query = db.select().from(paperAlgorithmMetrics);

  const conditions = [];
  if (configId) {
    conditions.push(eq(paperAlgorithmMetrics.configId, configId));
  }
  if (startDate) {
    conditions.push(gte(paperAlgorithmMetrics.evaluationDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(paperAlgorithmMetrics.evaluationDate, endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query
    .orderBy(desc(paperAlgorithmMetrics.evaluationDate))
    .limit(limit);
}

/**
 * 计算组卷算法满意度趋势
 */
export async function calculatePaperAlgorithmTrend(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await db
    .select()
    .from(paperAlgorithmMetrics)
    .where(gte(paperAlgorithmMetrics.evaluationDate, startDate))
    .orderBy(paperAlgorithmMetrics.evaluationDate);

  return metrics.map((m) => ({
    date: m.evaluationDate,
    satisfactionScore: m.avgSatisfactionScore ? parseFloat(m.avgSatisfactionScore as any) : null,
    knowledgeCoverageScore: m.knowledgeCoverageScore ? parseFloat(m.knowledgeCoverageScore as any) : null,
    difficultyDistributionScore: m.difficultyDistributionScore ? parseFloat(m.difficultyDistributionScore as any) : null,
    questionTypeVarietyScore: m.questionTypeVarietyScore ? parseFloat(m.questionTypeVarietyScore as any) : null,
    successRate: m.generationSuccessRate ? parseFloat(m.generationSuccessRate as any) : null,
  }));
}

/**
 * 获取权重参数对比数据（用于雷达图）
 */
export async function getWeightParametersComparison(configIds: number[]) {
  const metrics = await db
    .select()
    .from(paperAlgorithmMetrics)
    .where(
      sql`${paperAlgorithmMetrics.configId} IN (${sql.join(configIds.map((id) => sql`${id}`), sql`, `)})`
    )
    .orderBy(desc(paperAlgorithmMetrics.evaluationDate));

  // 每个配置取最新的一条记录
  const latestMetrics = new Map();
  for (const metric of metrics) {
    if (!latestMetrics.has(metric.configId)) {
      latestMetrics.set(metric.configId, metric);
    }
  }

  return Array.from(latestMetrics.values()).map((m) => ({
    configId: m.configId,
    weightParameters: m.weightParameters,
    satisfactionScore: m.avgSatisfactionScore ? parseFloat(m.avgSatisfactionScore as any) : 0,
    knowledgeCoverageScore: m.knowledgeCoverageScore ? parseFloat(m.knowledgeCoverageScore as any) : 0,
    difficultyDistributionScore: m.difficultyDistributionScore ? parseFloat(m.difficultyDistributionScore as any) : 0,
    questionTypeVarietyScore: m.questionTypeVarietyScore ? parseFloat(m.questionTypeVarietyScore as any) : 0,
  }));
}

// ==================== 爬虫性能评估 ====================

/**
 * 记录爬虫性能指标
 */
export async function recordCrawlerPerformanceMetric(metric: NewCrawlerPerformanceMetric) {
  const [result] = await db.insert(crawlerPerformanceMetrics).values(metric);
  return result;
}

/**
 * 获取爬虫性能历史
 */
export async function getCrawlerPerformanceMetricsHistory(
  selectorRuleId?: number,
  startDate?: Date,
  endDate?: Date,
  limit: number = 30
) {
  let query = db.select().from(crawlerPerformanceMetrics);

  const conditions = [];
  if (selectorRuleId) {
    conditions.push(eq(crawlerPerformanceMetrics.selectorRuleId, selectorRuleId));
  }
  if (startDate) {
    conditions.push(gte(crawlerPerformanceMetrics.evaluationDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(crawlerPerformanceMetrics.evaluationDate, endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query
    .orderBy(desc(crawlerPerformanceMetrics.evaluationDate))
    .limit(limit);
}

// ==================== 告警管理 ====================

/**
 * 创建告警规则
 */
export async function createAlertRule(rule: NewPerformanceAlertRule) {
  const [result] = await db.insert(performanceAlertRules).values(rule);
  return result;
}

/**
 * 获取所有活跃的告警规则
 */
export async function getActiveAlertRules() {
  return await db
    .select()
    .from(performanceAlertRules)
    .where(eq(performanceAlertRules.isActive, 1));
}

/**
 * 更新告警规则
 */
export async function updateAlertRule(id: number, updates: Partial<NewPerformanceAlertRule>) {
  await db
    .update(performanceAlertRules)
    .set(updates)
    .where(eq(performanceAlertRules.id, id));
}

/**
 * 删除告警规则
 */
export async function deleteAlertRule(id: number) {
  await db.delete(performanceAlertRules).where(eq(performanceAlertRules.id, id));
}

/**
 * 检查指标是否触发告警
 */
export async function checkMetricAlerts(
  metricType: "ai_classification" | "paper_algorithm" | "crawler_performance",
  metricId: number,
  metricValues: Record<string, number>
) {
  const rules = await db
    .select()
    .from(performanceAlertRules)
    .where(
      and(
        eq(performanceAlertRules.metricType, metricType),
        eq(performanceAlertRules.isActive, 1)
      )
    );

  const triggeredAlerts: NewPerformanceAlert[] = [];

  for (const rule of rules) {
    const metricValue = metricValues[rule.metricName];
    if (metricValue === undefined) continue;

    const threshold = parseFloat(rule.threshold as any);
    let triggered = false;

    switch (rule.operator) {
      case "<":
        triggered = metricValue < threshold;
        break;
      case "<=":
        triggered = metricValue <= threshold;
        break;
      case ">":
        triggered = metricValue > threshold;
        break;
      case ">=":
        triggered = metricValue >= threshold;
        break;
      case "==":
        triggered = metricValue === threshold;
        break;
    }

    if (triggered) {
      triggeredAlerts.push({
        ruleId: rule.id,
        metricType,
        metricId,
        metricValue: metricValue.toString(),
        threshold: rule.threshold,
        severity: rule.severity,
        status: "pending",
        notificationSent: 0,
      });
    }
  }

  if (triggeredAlerts.length > 0) {
    await db.insert(performanceAlerts).values(triggeredAlerts);
  }

  return triggeredAlerts;
}

/**
 * 获取待处理的告警
 */
export async function getPendingAlerts(limit: number = 50) {
  return await db
    .select()
    .from(performanceAlerts)
    .where(eq(performanceAlerts.status, "pending"))
    .orderBy(desc(performanceAlerts.alertTime))
    .limit(limit);
}

/**
 * 确认告警
 */
export async function acknowledgeAlert(alertId: number, userId: number) {
  await db
    .update(performanceAlerts)
    .set({
      status: "acknowledged",
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    })
    .where(eq(performanceAlerts.id, alertId));
}

/**
 * 解决告警
 */
export async function resolveAlert(alertId: number, userId: number, notes: string) {
  await db
    .update(performanceAlerts)
    .set({
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes: notes,
    })
    .where(eq(performanceAlerts.id, alertId));
}

// ==================== 周报生成 ====================

/**
 * 生成周报
 */
export async function generateWeeklyReport(
  reportType: "ai_classification" | "paper_algorithm" | "crawler_performance" | "comprehensive",
  weekStartDate: Date,
  weekEndDate: Date,
  generatedBy?: number
) {
  let reportData: any = {};
  let summary = "";
  let highlights: any[] = [];
  let issues: any[] = [];
  let recommendations: any[] = [];

  if (reportType === "ai_classification" || reportType === "comprehensive") {
    const aiMetrics = await db
      .select()
      .from(aiClassificationMetrics)
      .where(
        and(
          gte(aiClassificationMetrics.evaluationDate, weekStartDate),
          lte(aiClassificationMetrics.evaluationDate, weekEndDate)
        )
      );

    const avgAccuracy =
      aiMetrics.reduce((sum, m) => sum + parseFloat(m.accuracy as any), 0) / aiMetrics.length;

    reportData.aiClassification = {
      totalEvaluations: aiMetrics.length,
      avgAccuracy,
      metrics: aiMetrics,
    };

    if (avgAccuracy > 0.9) {
      highlights.push({ type: "ai_classification", message: `AI分类准确率达到 ${(avgAccuracy * 100).toFixed(2)}%` });
    } else if (avgAccuracy < 0.8) {
      issues.push({ type: "ai_classification", message: `AI分类准确率偏低: ${(avgAccuracy * 100).toFixed(2)}%` });
      recommendations.push({ type: "ai_classification", message: "建议优化prompt或增加训练样本" });
    }
  }

  if (reportType === "paper_algorithm" || reportType === "comprehensive") {
    const paperMetrics = await db
      .select()
      .from(paperAlgorithmMetrics)
      .where(
        and(
          gte(paperAlgorithmMetrics.evaluationDate, weekStartDate),
          lte(paperAlgorithmMetrics.evaluationDate, weekEndDate)
        )
      );

    const avgSatisfaction =
      paperMetrics.reduce((sum, m) => sum + parseFloat(m.avgSatisfactionScore as any || "0"), 0) /
      paperMetrics.length;

    reportData.paperAlgorithm = {
      totalEvaluations: paperMetrics.length,
      avgSatisfaction,
      metrics: paperMetrics,
    };

    if (avgSatisfaction > 4.0) {
      highlights.push({ type: "paper_algorithm", message: `组卷满意度达到 ${avgSatisfaction.toFixed(2)}分` });
    } else if (avgSatisfaction < 3.0) {
      issues.push({ type: "paper_algorithm", message: `组卷满意度偏低: ${avgSatisfaction.toFixed(2)}分` });
      recommendations.push({ type: "paper_algorithm", message: "建议调整权重参数或优化选题策略" });
    }
  }

  if (reportType === "crawler_performance" || reportType === "comprehensive") {
    const crawlerMetrics = await db
      .select()
      .from(crawlerPerformanceMetrics)
      .where(
        and(
          gte(crawlerPerformanceMetrics.evaluationDate, weekStartDate),
          lte(crawlerPerformanceMetrics.evaluationDate, weekEndDate)
        )
      );

    const avgSuccessRate =
      crawlerMetrics.reduce((sum, m) => sum + parseFloat(m.successRate as any), 0) /
      crawlerMetrics.length;

    reportData.crawlerPerformance = {
      totalEvaluations: crawlerMetrics.length,
      avgSuccessRate,
      metrics: crawlerMetrics,
    };

    if (avgSuccessRate > 0.95) {
      highlights.push({ type: "crawler_performance", message: `爬虫成功率达到 ${(avgSuccessRate * 100).toFixed(2)}%` });
    } else if (avgSuccessRate < 0.8) {
      issues.push({ type: "crawler_performance", message: `爬虫成功率偏低: ${(avgSuccessRate * 100).toFixed(2)}%` });
      recommendations.push({ type: "crawler_performance", message: "建议检查选择器规则或目标网站变化" });
    }
  }

  summary = `本周共进行了 ${Object.values(reportData).reduce((sum: number, d: any) => sum + (d.totalEvaluations || 0), 0)} 次性能评估`;

  const [result] = await db.insert(weeklyReports).values({
    reportType,
    weekStartDate,
    weekEndDate,
    reportData,
    summary,
    highlights,
    issues,
    recommendations,
    generatedBy,
  });

  return result;
}

/**
 * 获取周报列表
 */
export async function getWeeklyReports(reportType?: string, limit: number = 10) {
  let query = db.select().from(weeklyReports);

  if (reportType) {
    query = query.where(eq(weeklyReports.reportType, reportType as any)) as any;
  }

  return await query.orderBy(desc(weeklyReports.generatedAt)).limit(limit);
}

// ==================== 定时任务日志 ====================

/**
 * 记录定时任务执行日志
 */
export async function logScheduledTask(log: NewScheduledTaskLog) {
  const [result] = await db.insert(scheduledTaskLogs).values(log);
  return result;
}

/**
 * 获取定时任务执行历史
 */
export async function getScheduledTaskLogs(
  taskType?: string,
  status?: "success" | "failed" | "partial",
  limit: number = 50
) {
  let query = db.select().from(scheduledTaskLogs);

  const conditions = [];
  if (taskType) {
    conditions.push(eq(scheduledTaskLogs.taskType, taskType as any));
  }
  if (status) {
    conditions.push(eq(scheduledTaskLogs.status, status));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query.orderBy(desc(scheduledTaskLogs.executionTime)).limit(limit);
}

/**
 * 获取定时任务统计
 */
export async function getScheduledTaskStats(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await db
    .select()
    .from(scheduledTaskLogs)
    .where(gte(scheduledTaskLogs.executionTime, startDate));

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === "success").length,
    failed: logs.filter((l) => l.status === "failed").length,
    partial: logs.filter((l) => l.status === "partial").length,
    avgDuration: logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length,
    byType: {} as Record<string, { total: number; success: number; failed: number }>,
  };

  for (const log of logs) {
    if (!stats.byType[log.taskType]) {
      stats.byType[log.taskType] = { total: 0, success: 0, failed: 0 };
    }
    stats.byType[log.taskType].total++;
    if (log.status === "success") {
      stats.byType[log.taskType].success++;
    } else if (log.status === "failed") {
      stats.byType[log.taskType].failed++;
    }
  }

  return stats;
}
