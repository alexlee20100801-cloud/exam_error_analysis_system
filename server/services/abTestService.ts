import { db } from "../db";
import {
  abTestExperiments,
  abTestUserGroups,
  recommendationFeedback,
  abTestStatistics,
  type NewAbTestExperiment,
  type NewAbTestUserGroup,
  type NewRecommendationFeedback,
  type NewAbTestStatistic,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

/**
 * A/B测试服务
 * 管理推荐算法的A/B测试实验
 */

/**
 * 创建A/B测试实验
 */
export async function createAbTestExperiment(params: {
  experimentName: string;
  experimentDescription?: string;
  controlAlgorithm: string;
  treatmentAlgorithm: string;
  algorithmConfig?: any;
  trafficSplitRatio?: number;
  targetUserSegment?: any;
  startDate?: Date;
  endDate?: Date;
}) {
  const [experiment] = await db
    .insert(abTestExperiments)
    .values({
      experimentName: params.experimentName,
      experimentDescription: params.experimentDescription || null,
      controlAlgorithm: params.controlAlgorithm,
      treatmentAlgorithm: params.treatmentAlgorithm,
      algorithmConfig: params.algorithmConfig ? JSON.stringify(params.algorithmConfig) : null,
      trafficSplitRatio: params.trafficSplitRatio || 0.5,
      targetUserSegment: params.targetUserSegment
        ? JSON.stringify(params.targetUserSegment)
        : null,
      status: "draft",
      controlGroupSize: 0,
      treatmentGroupSize: 0,
      startDate: params.startDate || null,
      endDate: params.endDate || null,
      createdAt: new Date(),
    })
    .$returningId();

  return experiment.id;
}

/**
 * 启动A/B测试实验
 */
export async function startAbTestExperiment(experimentId: number) {
  const [experiment] = await db
    .select()
    .from(abTestExperiments)
    .where(eq(abTestExperiments.id, experimentId))
    .limit(1);

  if (!experiment) {
    throw new Error("实验不存在");
  }

  if (experiment.status !== "draft") {
    throw new Error("只能启动草稿状态的实验");
  }

  await db
    .update(abTestExperiments)
    .set({
      status: "running",
      startDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(abTestExperiments.id, experimentId));

  return { success: true, message: "实验已启动" };
}

/**
 * 暂停A/B测试实验
 */
export async function pauseAbTestExperiment(experimentId: number) {
  await db
    .update(abTestExperiments)
    .set({
      status: "paused",
      updatedAt: new Date(),
    })
    .where(eq(abTestExperiments.id, experimentId));

  return { success: true, message: "实验已暂停" };
}

/**
 * 完成A/B测试实验
 */
export async function completeAbTestExperiment(experimentId: number) {
  await db
    .update(abTestExperiments)
    .set({
      status: "completed",
      endDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(abTestExperiments.id, experimentId));

  return { success: true, message: "实验已完成" };
}

/**
 * 为用户分配实验分组
 * 使用一致性哈希确保同一用户总是分配到同一组
 */
export async function assignUserToExperiment(experimentId: number, userId: number) {
  // 检查用户是否已经分配过
  const [existingAssignment] = await db
    .select()
    .from(abTestUserGroups)
    .where(
      and(eq(abTestUserGroups.experimentId, experimentId), eq(abTestUserGroups.userId, userId))
    )
    .limit(1);

  if (existingAssignment) {
    return existingAssignment.groupType;
  }

  // 获取实验配置
  const [experiment] = await db
    .select()
    .from(abTestExperiments)
    .where(eq(abTestExperiments.id, experimentId))
    .limit(1);

  if (!experiment || experiment.status !== "running") {
    throw new Error("实验不存在或未运行");
  }

  // 使用简单哈希算法分配分组
  const hash = (userId * 2654435761) % 2147483648; // 简单的哈希函数
  const ratio = hash / 2147483648;
  const groupType = ratio < experiment.trafficSplitRatio ? "control" : "treatment";

  // 记录分组
  await db.insert(abTestUserGroups).values({
    experimentId,
    userId,
    groupType,
    userFeatures: null, // 可以记录用户特征用于后续分析
    assignedAt: new Date(),
    createdAt: new Date(),
  });

  // 更新实验的分组人数
  if (groupType === "control") {
    await db
      .update(abTestExperiments)
      .set({
        controlGroupSize: sql`${abTestExperiments.controlGroupSize} + 1`,
      })
      .where(eq(abTestExperiments.id, experimentId));
  } else {
    await db
      .update(abTestExperiments)
      .set({
        treatmentGroupSize: sql`${abTestExperiments.treatmentGroupSize} + 1`,
      })
      .where(eq(abTestExperiments.id, experimentId));
  }

  return groupType;
}

/**
 * 获取用户所属的实验分组
 */
export async function getUserExperimentGroup(experimentId: number, userId: number) {
  const [assignment] = await db
    .select()
    .from(abTestUserGroups)
    .where(
      and(eq(abTestUserGroups.experimentId, experimentId), eq(abTestUserGroups.userId, userId))
    )
    .limit(1);

  return assignment ? assignment.groupType : null;
}

/**
 * 记录推荐反馈数据
 */
export async function recordRecommendationFeedback(params: {
  experimentId?: number;
  userId: number;
  recommendationType: string;
  recommendedItemId: number;
  recommendationAlgorithm: string;
  recommendationRank?: number;
  wasClicked?: boolean;
  wasUsed?: boolean;
  timeSpentSeconds?: number;
  userRating?: number;
  userComment?: string;
  wasMarkedMastered?: boolean;
  wasAddedToFavorites?: boolean;
}) {
  const [feedback] = await db
    .insert(recommendationFeedback)
    .values({
      experimentId: params.experimentId || null,
      userId: params.userId,
      recommendationType: params.recommendationType,
      recommendedItemId: params.recommendedItemId,
      recommendationAlgorithm: params.recommendationAlgorithm,
      recommendationRank: params.recommendationRank || null,
      wasClicked: params.wasClicked ? 1 : 0,
      wasUsed: params.wasUsed ? 1 : 0,
      timeSpentSeconds: params.timeSpentSeconds || null,
      userRating: params.userRating || null,
      userComment: params.userComment || null,
      wasMarkedMastered: params.wasMarkedMastered ? 1 : 0,
      wasAddedToFavorites: params.wasAddedToFavorites ? 1 : 0,
      createdAt: new Date(),
    })
    .$returningId();

  return feedback.id;
}

/**
 * 计算A/B测试统计结果
 */
export async function calculateAbTestStatistics(experimentId: number) {
  // 获取实验信息
  const [experiment] = await db
    .select()
    .from(abTestExperiments)
    .where(eq(abTestExperiments.id, experimentId))
    .limit(1);

  if (!experiment) {
    throw new Error("实验不存在");
  }

  // 获取对照组和实验组的用户ID列表
  const controlUsers = await db
    .select({ userId: abTestUserGroups.userId })
    .from(abTestUserGroups)
    .where(
      and(
        eq(abTestUserGroups.experimentId, experimentId),
        eq(abTestUserGroups.groupType, "control")
      )
    );

  const treatmentUsers = await db
    .select({ userId: abTestUserGroups.userId })
    .from(abTestUserGroups)
    .where(
      and(
        eq(abTestUserGroups.experimentId, experimentId),
        eq(abTestUserGroups.groupType, "treatment")
      )
    );

  const controlUserIds = controlUsers.map((u) => u.userId);
  const treatmentUserIds = treatmentUsers.map((u) => u.userId);

  // 计算各项指标

  // 1. 点击率 (CTR)
  const ctrStats = await calculateCTR(experimentId, controlUserIds, treatmentUserIds);

  // 2. 使用率
  const usageStats = await calculateUsageRate(experimentId, controlUserIds, treatmentUserIds);

  // 3. 用户满意度
  const satisfactionStats = await calculateSatisfaction(
    experimentId,
    controlUserIds,
    treatmentUserIds
  );

  // 保存统计结果
  const statistics = [ctrStats, usageStats, satisfactionStats];

  for (const stat of statistics) {
    await db.insert(abTestStatistics).values({
      experimentId,
      metricName: stat.metricName,
      controlMean: stat.controlMean,
      controlStdDev: stat.controlStdDev || null,
      controlSampleSize: stat.controlSampleSize,
      treatmentMean: stat.treatmentMean,
      treatmentStdDev: stat.treatmentStdDev || null,
      treatmentSampleSize: stat.treatmentSampleSize,
      pValue: stat.pValue || null,
      confidenceInterval: stat.confidenceInterval
        ? JSON.stringify(stat.confidenceInterval)
        : null,
      isSignificant: stat.isSignificant ? 1 : 0,
      effectSize: stat.effectSize || null,
      recommendation: stat.recommendation || null,
      calculatedAt: new Date(),
      createdAt: new Date(),
    });
  }

  return statistics;
}

/**
 * 计算点击率(CTR)
 */
async function calculateCTR(
  experimentId: number,
  controlUserIds: number[],
  treatmentUserIds: number[]
) {
  // 对照组CTR
  const controlFeedback = await db
    .select({
      totalCount: sql<number>`COUNT(*)`,
      clickCount: sql<number>`SUM(${recommendationFeedback.wasClicked})`,
    })
    .from(recommendationFeedback)
    .where(
      and(
        eq(recommendationFeedback.experimentId, experimentId),
        sql`${recommendationFeedback.userId} IN (${controlUserIds.join(",")})`
      )
    );

  // 实验组CTR
  const treatmentFeedback = await db
    .select({
      totalCount: sql<number>`COUNT(*)`,
      clickCount: sql<number>`SUM(${recommendationFeedback.wasClicked})`,
    })
    .from(recommendationFeedback)
    .where(
      and(
        eq(recommendationFeedback.experimentId, experimentId),
        sql`${recommendationFeedback.userId} IN (${treatmentUserIds.join(",")})`
      )
    );

  const controlCTR =
    controlFeedback[0].totalCount > 0
      ? controlFeedback[0].clickCount / controlFeedback[0].totalCount
      : 0;
  const treatmentCTR =
    treatmentFeedback[0].totalCount > 0
      ? treatmentFeedback[0].clickCount / treatmentFeedback[0].totalCount
      : 0;

  // 简化的统计显著性检验(实际应使用更严格的方法)
  const diff = Math.abs(treatmentCTR - controlCTR);
  const isSignificant = diff > 0.05; // 简化判断:差异大于5%认为显著

  return {
    metricName: "CTR",
    controlMean: controlCTR,
    controlSampleSize: controlFeedback[0].totalCount,
    treatmentMean: treatmentCTR,
    treatmentSampleSize: treatmentFeedback[0].totalCount,
    isSignificant,
    effectSize: diff,
    recommendation: isSignificant
      ? treatmentCTR > controlCTR
        ? "实验组效果更好,建议采用新算法"
        : "对照组效果更好,建议保持现有算法"
      : "差异不显著,需要更多数据",
  };
}

/**
 * 计算使用率
 */
async function calculateUsageRate(
  experimentId: number,
  controlUserIds: number[],
  treatmentUserIds: number[]
) {
  // 对照组使用率
  const controlFeedback = await db
    .select({
      totalCount: sql<number>`COUNT(*)`,
      usageCount: sql<number>`SUM(${recommendationFeedback.wasUsed})`,
    })
    .from(recommendationFeedback)
    .where(
      and(
        eq(recommendationFeedback.experimentId, experimentId),
        sql`${recommendationFeedback.userId} IN (${controlUserIds.join(",")})`
      )
    );

  // 实验组使用率
  const treatmentFeedback = await db
    .select({
      totalCount: sql<number>`COUNT(*)`,
      usageCount: sql<number>`SUM(${recommendationFeedback.wasUsed})`,
    })
    .from(recommendationFeedback)
    .where(
      and(
        eq(recommendationFeedback.experimentId, experimentId),
        sql`${recommendationFeedback.userId} IN (${treatmentUserIds.join(",")})`
      )
    );

  const controlUsageRate =
    controlFeedback[0].totalCount > 0
      ? controlFeedback[0].usageCount / controlFeedback[0].totalCount
      : 0;
  const treatmentUsageRate =
    treatmentFeedback[0].totalCount > 0
      ? treatmentFeedback[0].usageCount / treatmentFeedback[0].totalCount
      : 0;

  const diff = Math.abs(treatmentUsageRate - controlUsageRate);
  const isSignificant = diff > 0.05;

  return {
    metricName: "UsageRate",
    controlMean: controlUsageRate,
    controlSampleSize: controlFeedback[0].totalCount,
    treatmentMean: treatmentUsageRate,
    treatmentSampleSize: treatmentFeedback[0].totalCount,
    isSignificant,
    effectSize: diff,
    recommendation: isSignificant
      ? treatmentUsageRate > controlUsageRate
        ? "实验组使用率更高,建议采用新算法"
        : "对照组使用率更高,建议保持现有算法"
      : "差异不显著,需要更多数据",
  };
}

/**
 * 计算用户满意度
 */
async function calculateSatisfaction(
  experimentId: number,
  controlUserIds: number[],
  treatmentUserIds: number[]
) {
  // 对照组满意度
  const controlRatings = await db
    .select({
      avgRating: sql<number>`AVG(${recommendationFeedback.userRating})`,
      ratingCount: sql<number>`COUNT(${recommendationFeedback.userRating})`,
    })
    .from(recommendationFeedback)
    .where(
      and(
        eq(recommendationFeedback.experimentId, experimentId),
        sql`${recommendationFeedback.userId} IN (${controlUserIds.join(",")})`,
        sql`${recommendationFeedback.userRating} IS NOT NULL`
      )
    );

  // 实验组满意度
  const treatmentRatings = await db
    .select({
      avgRating: sql<number>`AVG(${recommendationFeedback.userRating})`,
      ratingCount: sql<number>`COUNT(${recommendationFeedback.userRating})`,
    })
    .from(recommendationFeedback)
    .where(
      and(
        eq(recommendationFeedback.experimentId, experimentId),
        sql`${recommendationFeedback.userId} IN (${treatmentUserIds.join(",")})`,
        sql`${recommendationFeedback.userRating} IS NOT NULL`
      )
    );

  const controlSatisfaction = controlRatings[0].avgRating || 0;
  const treatmentSatisfaction = treatmentRatings[0].avgRating || 0;

  const diff = Math.abs(treatmentSatisfaction - controlSatisfaction);
  const isSignificant = diff > 0.5; // 满意度差异大于0.5分认为显著

  return {
    metricName: "Satisfaction",
    controlMean: controlSatisfaction,
    controlSampleSize: controlRatings[0].ratingCount,
    treatmentMean: treatmentSatisfaction,
    treatmentSampleSize: treatmentRatings[0].ratingCount,
    isSignificant,
    effectSize: diff,
    recommendation: isSignificant
      ? treatmentSatisfaction > controlSatisfaction
        ? "实验组满意度更高,建议采用新算法"
        : "对照组满意度更高,建议保持现有算法"
      : "差异不显著,需要更多数据",
  };
}

/**
 * 获取实验的统计结果
 */
export async function getAbTestStatistics(experimentId: number) {
  const statistics = await db
    .select()
    .from(abTestStatistics)
    .where(eq(abTestStatistics.experimentId, experimentId))
    .orderBy(desc(abTestStatistics.calculatedAt));

  return statistics.map((stat) => ({
    ...stat,
    confidenceInterval: stat.confidenceInterval
      ? JSON.parse(stat.confidenceInterval as string)
      : null,
  }));
}

/**
 * 获取所有实验列表
 */
export async function getAllExperiments(status?: string) {
  let query = db.select().from(abTestExperiments).orderBy(desc(abTestExperiments.createdAt));

  if (status) {
    query = query.where(eq(abTestExperiments.status, status as any));
  }

  return await query;
}

/**
 * 获取实验详情
 */
export async function getExperimentDetail(experimentId: number) {
  const [experiment] = await db
    .select()
    .from(abTestExperiments)
    .where(eq(abTestExperiments.id, experimentId))
    .limit(1);

  if (!experiment) {
    throw new Error("实验不存在");
  }

  return {
    ...experiment,
    algorithmConfig: experiment.algorithmConfig
      ? JSON.parse(experiment.algorithmConfig as string)
      : null,
    targetUserSegment: experiment.targetUserSegment
      ? JSON.parse(experiment.targetUserSegment as string)
      : null,
  };
}
