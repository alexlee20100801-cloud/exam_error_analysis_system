/**
 * A/B测试自动决策服务
 * 当实验达到统计显著性且效果提升明显时,自动推送通知并建议全量上线
 */

import { db } from "../db";
import {
  abTestExperiments,
  abTestStatistics,
  abTestUserGroups,
  recommendationFeedback,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * 统计检验结果接口
 */
export interface StatisticalTestResult {
  metricName: string;
  controlMean: number;
  treatmentMean: number;
  pValue: number;
  isSignificant: boolean;
  effectSize: number;
  confidenceInterval: { lower: number; upper: number };
  improvement: number; // 提升百分比
}

/**
 * 自动决策结果接口
 */
export interface AutoDecisionResult {
  experimentId: number;
  experimentName: string;
  decision: "rollout_treatment" | "keep_control" | "needs_review" | "inconclusive";
  reason: string;
  confidence: number;
  statisticalTests: StatisticalTestResult[];
  shouldNotify: boolean;
}

/**
 * 计算两个样本的t检验
 * 用于比较对照组和实验组的均值差异
 */
function calculateTTest(
  controlMean: number,
  controlStdDev: number,
  controlSize: number,
  treatmentMean: number,
  treatmentStdDev: number,
  treatmentSize: number
): { tStatistic: number; pValue: number; effectSize: number } {
  // 计算合并标准差
  const pooledStdDev = Math.sqrt(
    ((controlSize - 1) * controlStdDev ** 2 + (treatmentSize - 1) * treatmentStdDev ** 2) /
      (controlSize + treatmentSize - 2)
  );

  // 计算t统计量
  const tStatistic =
    (treatmentMean - controlMean) /
    (pooledStdDev * Math.sqrt(1 / controlSize + 1 / treatmentSize));

  // 自由度
  const df = controlSize + treatmentSize - 2;

  // 简化的p值计算(双尾检验)
  // 实际应用中应使用更精确的t分布表或库
  const pValue = 2 * (1 - approximateTCDF(Math.abs(tStatistic), df));

  // Cohen's d效应量
  const effectSize = (treatmentMean - controlMean) / pooledStdDev;

  return { tStatistic, pValue, effectSize };
}

/**
 * 近似t分布累积分布函数
 * 简化实现,实际应用中建议使用专业统计库
 */
function approximateTCDF(t: number, df: number): number {
  // 使用正态分布近似(当df > 30时较准确)
  if (df > 30) {
    return normalCDF(t);
  }

  // 简化的t分布近似
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;

  // 使用beta分布近似
  return 1 - 0.5 * incompleteBeta(x, a, b);
}

/**
 * 标准正态分布累积分布函数
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * 不完全Beta函数(简化实现)
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // 使用连分数展开的简化实现
  let result = Math.pow(x, a) * Math.pow(1 - x, b) / a;
  let term = result;

  for (let i = 1; i < 100; i++) {
    term *= ((a + i - 1) * x) / (a + i);
    result += term;
    if (Math.abs(term) < 1e-10) break;
  }

  return result;
}

/**
 * 计算置信区间
 */
function calculateConfidenceInterval(
  mean: number,
  stdDev: number,
  sampleSize: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  // 使用z分数(当样本量足够大时)
  const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;
  const marginOfError = zScore * (stdDev / Math.sqrt(sampleSize));

  return {
    lower: mean - marginOfError,
    upper: mean + marginOfError,
  };
}

/**
 * 收集实验的反馈数据并计算统计指标
 */
async function collectExperimentMetrics(experimentId: number) {
  // 获取对照组和实验组用户
  const userGroups = await db
    .select()
    .from(abTestUserGroups)
    .where(eq(abTestUserGroups.experimentId, experimentId));

  const controlUsers = userGroups.filter((u) => u.groupType === "control").map((u) => u.userId);
  const treatmentUsers = userGroups.filter((u) => u.groupType === "treatment").map((u) => u.userId);

  // 收集反馈数据
  const feedback = await db
    .select()
    .from(recommendationFeedback)
    .where(eq(recommendationFeedback.experimentId, experimentId));

  const controlFeedback = feedback.filter((f) => controlUsers.includes(f.userId));
  const treatmentFeedback = feedback.filter((f) => treatmentUsers.includes(f.userId));

  // 计算关键指标
  const metrics = {
    // 点击率(CTR)
    ctr: {
      control: {
        mean: controlFeedback.length > 0 
          ? (controlFeedback.filter((f) => f.wasClicked === 1).length / controlFeedback.length) * 100
          : 0,
        stdDev: 0, // 需要计算标准差
        sampleSize: controlFeedback.length,
      },
      treatment: {
        mean: treatmentFeedback.length > 0
          ? (treatmentFeedback.filter((f) => f.wasClicked === 1).length / treatmentFeedback.length) * 100
          : 0,
        stdDev: 0,
        sampleSize: treatmentFeedback.length,
      },
    },
    // 使用率
    usageRate: {
      control: {
        mean: controlFeedback.length > 0
          ? (controlFeedback.filter((f) => f.wasUsed === 1).length / controlFeedback.length) * 100
          : 0,
        stdDev: 0,
        sampleSize: controlFeedback.length,
      },
      treatment: {
        mean: treatmentFeedback.length > 0
          ? (treatmentFeedback.filter((f) => f.wasUsed === 1).length / treatmentFeedback.length) * 100
          : 0,
        stdDev: 0,
        sampleSize: treatmentFeedback.length,
      },
    },
    // 平均评分
    avgRating: {
      control: {
        mean: controlFeedback.filter((f) => f.userRating !== null).length > 0
          ? controlFeedback.reduce((sum, f) => sum + (f.userRating || 0), 0) /
            controlFeedback.filter((f) => f.userRating !== null).length
          : 0,
        stdDev: 0,
        sampleSize: controlFeedback.filter((f) => f.userRating !== null).length,
      },
      treatment: {
        mean: treatmentFeedback.filter((f) => f.userRating !== null).length > 0
          ? treatmentFeedback.reduce((sum, f) => sum + (f.userRating || 0), 0) /
            treatmentFeedback.filter((f) => f.userRating !== null).length
          : 0,
        stdDev: 0,
        sampleSize: treatmentFeedback.filter((f) => f.userRating !== null).length,
      },
    },
  };

  // 计算标准差(简化实现,使用二项分布的标准差公式)
  metrics.ctr.control.stdDev = Math.sqrt((metrics.ctr.control.mean * (100 - metrics.ctr.control.mean)) / 100);
  metrics.ctr.treatment.stdDev = Math.sqrt((metrics.ctr.treatment.mean * (100 - metrics.ctr.treatment.mean)) / 100);
  metrics.usageRate.control.stdDev = Math.sqrt((metrics.usageRate.control.mean * (100 - metrics.usageRate.control.mean)) / 100);
  metrics.usageRate.treatment.stdDev = Math.sqrt((metrics.usageRate.treatment.mean * (100 - metrics.usageRate.treatment.mean)) / 100);

  return metrics;
}

/**
 * 执行统计显著性检验
 */
async function performStatisticalTests(experimentId: number): Promise<StatisticalTestResult[]> {
  const metrics = await collectExperimentMetrics(experimentId);
  const results: StatisticalTestResult[] = [];

  // 对每个指标执行t检验
  for (const [metricName, data] of Object.entries(metrics)) {
    if (data.control.sampleSize === 0 || data.treatment.sampleSize === 0) {
      continue;
    }

    const testResult = calculateTTest(
      data.control.mean,
      data.control.stdDev,
      data.control.sampleSize,
      data.treatment.mean,
      data.treatment.stdDev,
      data.treatment.sampleSize
    );

    const confidenceInterval = calculateConfidenceInterval(
      data.treatment.mean - data.control.mean,
      Math.sqrt(data.control.stdDev ** 2 + data.treatment.stdDev ** 2),
      Math.min(data.control.sampleSize, data.treatment.sampleSize)
    );

    const improvement = data.control.mean !== 0
      ? ((data.treatment.mean - data.control.mean) / data.control.mean) * 100
      : 0;

    results.push({
      metricName,
      controlMean: data.control.mean,
      treatmentMean: data.treatment.mean,
      pValue: testResult.pValue,
      isSignificant: testResult.pValue < 0.05,
      effectSize: testResult.effectSize,
      confidenceInterval,
      improvement,
    });

    // 保存统计结果到数据库
    await db.insert(abTestStatistics).values({
      experimentId,
      metricName,
      controlMean: data.control.mean,
      controlStdDev: data.control.stdDev,
      controlSampleSize: data.control.sampleSize,
      treatmentMean: data.treatment.mean,
      treatmentStdDev: data.treatment.stdDev,
      treatmentSampleSize: data.treatment.sampleSize,
      pValue: testResult.pValue,
      confidenceInterval,
      isSignificant: testResult.pValue < 0.05 ? 1 : 0,
      effectSize: testResult.effectSize,
    });
  }

  return results;
}

/**
 * 执行自动决策逻辑
 */
export async function performAutoDecision(experimentId: number): Promise<AutoDecisionResult> {
  // 获取实验配置
  const [experiment] = await db
    .select()
    .from(abTestExperiments)
    .where(eq(abTestExperiments.id, experimentId))
    .limit(1);

  if (!experiment) {
    throw new Error("实验不存在");
  }

  if (experiment.autoDecisionEnabled !== 1) {
    throw new Error("该实验未启用自动决策");
  }

  // 检查样本量是否足够
  if (
    experiment.controlGroupSize < experiment.minSampleSize ||
    experiment.treatmentGroupSize < experiment.minSampleSize
  ) {
    return {
      experimentId,
      experimentName: experiment.experimentName,
      decision: "inconclusive",
      reason: `样本量不足。对照组: ${experiment.controlGroupSize}, 实验组: ${experiment.treatmentGroupSize}, 最小要求: ${experiment.minSampleSize}`,
      confidence: 0,
      statisticalTests: [],
      shouldNotify: false,
    };
  }

  // 执行统计检验
  const testResults = await performStatisticalTests(experimentId);

  if (testResults.length === 0) {
    return {
      experimentId,
      experimentName: experiment.experimentName,
      decision: "inconclusive",
      reason: "没有足够的数据进行统计分析",
      confidence: 0,
      statisticalTests: [],
      shouldNotify: false,
    };
  }

  // 分析结果并做出决策
  const significantResults = testResults.filter((r) => r.isSignificant);
  const positiveImprovements = significantResults.filter((r) => r.improvement > 0);
  const negativeImprovements = significantResults.filter((r) => r.improvement < 0);

  let decision: AutoDecisionResult["decision"];
  let reason: string;
  let confidence: number;
  let shouldNotify: boolean = false;

  // 决策逻辑
  if (positiveImprovements.length > 0 && negativeImprovements.length === 0) {
    // 所有显著指标都有正向提升
    const avgImprovement = positiveImprovements.reduce((sum, r) => sum + r.improvement, 0) / positiveImprovements.length;
    
    if (avgImprovement >= experiment.minEffectSize * 100) {
      decision = "rollout_treatment";
      reason = `实验组在${positiveImprovements.length}个关键指标上表现显著优于对照组,平均提升${avgImprovement.toFixed(2)}%,建议全量上线实验组算法。`;
      confidence = Math.min(0.95, 0.7 + (positiveImprovements.length / testResults.length) * 0.25);
      shouldNotify = true;
    } else {
      decision = "needs_review";
      reason = `实验组有正向提升(${avgImprovement.toFixed(2)}%),但未达到最小效应量要求(${(experiment.minEffectSize * 100).toFixed(2)}%),建议人工审核。`;
      confidence = 0.6;
    }
  } else if (negativeImprovements.length > 0 && positiveImprovements.length === 0) {
    // 所有显著指标都有负向影响
    decision = "keep_control";
    reason = `实验组在${negativeImprovements.length}个关键指标上表现不如对照组,建议保持当前算法。`;
    confidence = 0.8;
    shouldNotify = true;
  } else if (positiveImprovements.length > 0 && negativeImprovements.length > 0) {
    // 有正有负,需要权衡
    decision = "needs_review";
    reason = `实验结果混合:${positiveImprovements.length}个指标提升,${negativeImprovements.length}个指标下降,需要人工权衡决策。`;
    confidence = 0.5;
    shouldNotify = true;
  } else {
    // 没有显著差异
    decision = "inconclusive";
    reason = `统计检验未发现显著差异(p > ${experiment.significanceLevel}),建议继续收集数据或结束实验。`;
    confidence = 0.4;
  }

  // 更新实验决策状态
  await db
    .update(abTestExperiments)
    .set({
      decisionStatus: shouldNotify ? "ready_for_decision" : "pending",
      decisionRecommendation: decision,
      decisionReason: reason,
      decisionConfidence: confidence,
      decisionMadeAt: new Date(),
    })
    .where(eq(abTestExperiments.id, experimentId));

  return {
    experimentId,
    experimentName: experiment.experimentName,
    decision,
    reason,
    confidence,
    statisticalTests: testResults,
    shouldNotify,
  };
}

/**
 * 发送决策通知
 */
export async function sendDecisionNotification(decisionResult: AutoDecisionResult) {
  const title = `A/B测试自动决策: ${decisionResult.experimentName}`;
  const content = `
实验ID: ${decisionResult.experimentId}
决策建议: ${decisionResult.decision === "rollout_treatment" ? "全量上线实验组" : decisionResult.decision === "keep_control" ? "保持对照组" : decisionResult.decision === "needs_review" ? "需要人工审核" : "结果不确定"}
置信度: ${(decisionResult.confidence * 100).toFixed(1)}%

决策理由:
${decisionResult.reason}

统计检验结果:
${decisionResult.statisticalTests
  .map(
    (t) =>
      `- ${t.metricName}: ${t.isSignificant ? "显著" : "不显著"} (p=${t.pValue.toFixed(4)}), 提升${t.improvement.toFixed(2)}%`
  )
  .join("\n")}

请登录系统查看详细数据并做出最终决策。
  `.trim();

  const success = await notifyOwner({ title, content });

  if (success) {
    // 更新通知发送状态
    await db
      .update(abTestExperiments)
      .set({
        decisionStatus: "notified",
        notificationSentAt: new Date(),
      })
      .where(eq(abTestExperiments.id, decisionResult.experimentId));
  }

  return success;
}

/**
 * 检查所有运行中的实验并执行自动决策
 */
export async function checkAndDecideAllExperiments() {
  const runningExperiments = await db
    .select()
    .from(abTestExperiments)
    .where(
      and(
        eq(abTestExperiments.status, "running"),
        eq(abTestExperiments.autoDecisionEnabled, 1),
        sql`${abTestExperiments.decisionStatus} IN ('pending', 'ready_for_decision')`
      )
    );

  const results = [];

  for (const experiment of runningExperiments) {
    try {
      const decisionResult = await performAutoDecision(experiment.id);
      
      if (decisionResult.shouldNotify) {
        await sendDecisionNotification(decisionResult);
      }

      results.push(decisionResult);
    } catch (error) {
      console.error(`实验${experiment.id}自动决策失败:`, error);
    }
  }

  return results;
}
