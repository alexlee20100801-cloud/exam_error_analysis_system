import { db } from "../db";
import {
  paperGenerationFeedback,
  paperAlgorithmConfig,
  paperQualityEvaluationHistory,
  type PaperGenerationFeedback,
  type NewPaperGenerationFeedback,
  type PaperAlgorithmConfig,
  type NewPaperAlgorithmConfig,
  type PaperQualityEvaluationHistory,
  type NewPaperQualityEvaluationHistory,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

/**
 * 提交组卷反馈
 */
export async function submitPaperFeedback(feedback: NewPaperGenerationFeedback) {
  const [newFeedback] = await db.insert(paperGenerationFeedback).values(feedback);
  return newFeedback;
}

/**
 * 获取组卷反馈
 */
export async function getPaperFeedback(filters?: {
  paperId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
}) {
  const conditions = [];

  if (filters?.paperId) {
    conditions.push(eq(paperGenerationFeedback.paperId, filters.paperId));
  }

  if (filters?.userId) {
    conditions.push(eq(paperGenerationFeedback.userId, filters.userId));
  }

  if (filters?.startDate) {
    conditions.push(gte(paperGenerationFeedback.createdAt, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(paperGenerationFeedback.createdAt, filters.endDate));
  }

  return await db
    .select()
    .from(paperGenerationFeedback)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(paperGenerationFeedback.createdAt));
}

/**
 * 创建算法配置
 */
export async function createAlgorithmConfig(config: NewPaperAlgorithmConfig) {
  const [newConfig] = await db.insert(paperAlgorithmConfig).values(config);
  return newConfig;
}

/**
 * 获取所有算法配置
 */
export async function getAllAlgorithmConfigs() {
  return await db
    .select()
    .from(paperAlgorithmConfig)
    .orderBy(desc(paperAlgorithmConfig.createdAt));
}

/**
 * 获取当前激活的算法配置
 */
export async function getActiveAlgorithmConfig() {
  const [activeConfig] = await db
    .select()
    .from(paperAlgorithmConfig)
    .where(eq(paperAlgorithmConfig.isActive, 1))
    .limit(1);

  return activeConfig;
}

/**
 * 激活算法配置
 */
export async function activateAlgorithmConfig(id: number) {
  // 先禁用所有配置
  await db.update(paperAlgorithmConfig).set({ isActive: 0 });

  // 激活指定配置
  await db
    .update(paperAlgorithmConfig)
    .set({ isActive: 1, updatedAt: new Date().toISOString() })
    .where(eq(paperAlgorithmConfig.id, id));

  return await db
    .select()
    .from(paperAlgorithmConfig)
    .where(eq(paperAlgorithmConfig.id, id))
    .then(rows => rows[0]);
}

/**
 * 更新算法配置
 */
export async function updateAlgorithmConfig(
  id: number,
  updates: Partial<PaperAlgorithmConfig>
) {
  await db
    .update(paperAlgorithmConfig)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(paperAlgorithmConfig.id, id));

  return await db
    .select()
    .from(paperAlgorithmConfig)
    .where(eq(paperAlgorithmConfig.id, id))
    .then(rows => rows[0]);
}

/**
 * 评估算法配置的性能
 */
export async function evaluateAlgorithmConfig(
  configId: number,
  evaluationPeriod: string
) {
  // 获取该配置在评估期间的所有反馈
  const feedbacks = await db
    .select()
    .from(paperGenerationFeedback)
    .where(
      and(
        gte(paperGenerationFeedback.createdAt, evaluationPeriod),
        lte(
          paperGenerationFeedback.createdAt,
          new Date(
            new Date(evaluationPeriod).setMonth(new Date(evaluationPeriod).getMonth() + 1)
          ).toISOString()
        )
      )
    );

  if (feedbacks.length === 0) {
    throw new Error("评估期间没有反馈数据");
  }

  // 计算平均评分
  const totalPapers = feedbacks.length;
  const avgSatisfaction =
    feedbacks.reduce((sum, f) => sum + f.overallSatisfaction, 0) / totalPapers;
  const avgDifficultyRating =
    feedbacks.reduce((sum, f) => sum + f.difficultyRating, 0) / totalPapers;
  const avgKnowledgeCoverage =
    feedbacks.reduce((sum, f) => sum + f.knowledgeCoverageRating, 0) / totalPapers;
  const avgQuestionQuality =
    feedbacks.reduce((sum, f) => sum + f.questionQualityRating, 0) / totalPapers;

  // 计算平均正确率
  const feedbacksWithCorrectRate = feedbacks.filter(f => f.correctRate !== null);
  const avgCorrectRate =
    feedbacksWithCorrectRate.length > 0
      ? feedbacksWithCorrectRate.reduce(
          (sum, f) => sum + parseFloat(f.correctRate || "0"),
          0
        ) / feedbacksWithCorrectRate.length
      : null;

  // 生成改进建议
  const suggestions = [];

  if (avgSatisfaction < 3) {
    suggestions.push("总体满意度偏低，建议全面审查组卷算法");
  }

  if (avgDifficultyRating < 3) {
    suggestions.push("难度评分偏低，建议调整难度平衡权重");
  } else if (avgDifficultyRating > 4) {
    suggestions.push("难度评分偏高，可能题目过难，建议降低难度平衡权重");
  }

  if (avgKnowledgeCoverage < 3) {
    suggestions.push("知识点覆盖评分偏低，建议增加知识点覆盖权重");
  }

  if (avgQuestionQuality < 3) {
    suggestions.push("题目质量评分偏低，建议提高最低质量评分阈值");
  }

  if (avgCorrectRate !== null && avgCorrectRate < 0.5) {
    suggestions.push("平均正确率偏低，建议降低题目难度或增加基础题比例");
  }

  // 保存评估结果
  const evaluationData: NewPaperQualityEvaluationHistory = {
    configId,
    evaluationPeriod,
    totalPapers,
    averageSatisfaction: avgSatisfaction.toFixed(2),
    averageDifficultyRating: avgDifficultyRating.toFixed(2),
    averageKnowledgeCoverage: avgKnowledgeCoverage.toFixed(2),
    averageQuestionQuality: avgQuestionQuality.toFixed(2),
    averageCorrectRate: avgCorrectRate !== null ? avgCorrectRate.toFixed(2) : null,
    improvementSuggestions: JSON.stringify(suggestions),
  };

  const [evaluation] = await db
    .insert(paperQualityEvaluationHistory)
    .values(evaluationData);

  // 更新算法配置的性能评分
  const performanceScore = (
    (avgSatisfaction / 5) * 0.4 +
    (avgKnowledgeCoverage / 5) * 0.3 +
    (avgQuestionQuality / 5) * 0.3
  ) * 100;

  await updateAlgorithmConfig(configId, {
    performanceScore: performanceScore.toFixed(2),
  });

  return {
    totalPapers,
    averageSatisfaction: avgSatisfaction.toFixed(2),
    averageDifficultyRating: avgDifficultyRating.toFixed(2),
    averageKnowledgeCoverage: avgKnowledgeCoverage.toFixed(2),
    averageQuestionQuality: avgQuestionQuality.toFixed(2),
    averageCorrectRate: avgCorrectRate !== null ? avgCorrectRate.toFixed(2) : null,
    improvementSuggestions: suggestions,
    performanceScore: performanceScore.toFixed(2),
  };
}

/**
 * 获取评估历史
 */
export async function getEvaluationHistory(configId?: number) {
  const conditions = [];

  if (configId) {
    conditions.push(eq(paperQualityEvaluationHistory.configId, configId));
  }

  return await db
    .select()
    .from(paperQualityEvaluationHistory)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(paperQualityEvaluationHistory.evaluatedAt));
}

/**
 * 自动调优算法权重
 */
export async function autoTuneAlgorithmWeights(configId: number) {
  // 获取最近的评估历史
  const evaluations = await getEvaluationHistory(configId);

  if (evaluations.length === 0) {
    return {
      success: false,
      message: "没有评估历史，无法进行自动调优",
    };
  }

  const latestEvaluation = evaluations[0];
  const suggestions = JSON.parse(
    latestEvaluation.improvementSuggestions as string
  ) as string[];

  // 获取当前配置
  const [currentConfig] = await db
    .select()
    .from(paperAlgorithmConfig)
    .where(eq(paperAlgorithmConfig.id, configId));

  if (!currentConfig) {
    throw new Error("配置不存在");
  }

  // 根据建议调整权重
  const adjustments: Partial<PaperAlgorithmConfig> = {};

  suggestions.forEach(suggestion => {
    if (suggestion.includes("难度平衡权重")) {
      if (suggestion.includes("降低")) {
        adjustments.difficultyBalanceWeight = (
          parseFloat(currentConfig.difficultyBalanceWeight || "0.2") - 0.05
        ).toFixed(2);
      } else if (suggestion.includes("增加")) {
        adjustments.difficultyBalanceWeight = (
          parseFloat(currentConfig.difficultyBalanceWeight || "0.2") + 0.05
        ).toFixed(2);
      }
    }

    if (suggestion.includes("知识点覆盖权重")) {
      adjustments.knowledgeCoverageWeight = (
        parseFloat(currentConfig.knowledgeCoverageWeight || "0.25") + 0.05
      ).toFixed(2);
    }

    if (suggestion.includes("最低质量评分阈值")) {
      adjustments.minQualityScore = (
        parseFloat(currentConfig.minQualityScore || "0.6") + 0.05
      ).toFixed(2);
    }
  });

  // 如果有调整，创建新配置
  if (Object.keys(adjustments).length > 0) {
    const newConfig = {
      ...currentConfig,
      ...adjustments,
      configName: `${currentConfig.configName} (自动调优)`,
      algorithmVersion: `${currentConfig.algorithmVersion}-auto`,
      notes: `基于评估 ${latestEvaluation.evaluationPeriod} 的自动调优`,
      isActive: 0,
    };

    delete (newConfig as any).id;
    delete (newConfig as any).createdAt;
    delete (newConfig as any).updatedAt;

    const [created] = await db.insert(paperAlgorithmConfig).values(newConfig);

    return {
      success: true,
      message: "已创建自动调优配置",
      newConfigId: created.insertId,
      adjustments,
    };
  }

  return {
    success: false,
    message: "当前配置已经较优，无需调整",
  };
}
