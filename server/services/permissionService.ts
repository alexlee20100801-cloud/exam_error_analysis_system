import { getUserActiveSubscription } from "./accountProvisioningService";
import { getPlanById } from "./subscriptionPlanService";

/**
 * 功能权限枚举
 */
export const FEATURES = {
  ERROR_QUESTIONS: "error_questions", // 错题管理
  PRACTICE: "practice", // 练习功能
  AI_ANALYSIS: "ai_analysis", // AI分析
  VIDEO_LEARNING: "video_learning", // 视频学习
  BASIC_STATS: "basic_stats", // 基础统计
  ADVANCED_STATS: "advanced_stats", // 高级统计
  EXAM_GENERATOR: "exam_generator", // 试卷生成
  LEARNING_PATH: "learning_path", // 学习路径
  PARENT_SUPERVISION: "parent_supervision", // 家长监督
} as const;

/**
 * 检查用户是否有某个功能的权限
 */
export async function hasFeaturePermission(
  userId: number,
  feature: string
): Promise<boolean> {
  try {
    // 获取用户当前订阅
    const subscription = await getUserActiveSubscription(userId);
    if (!subscription) {
      return false; // 无订阅，无权限
    }

    // 获取套餐信息
    const plan = await getPlanById(subscription.planId);
    if (!plan || !plan.isActive) {
      return false;
    }

    // 检查功能是否在套餐中
    return plan.features.includes(feature);
  } catch (error) {
    console.error("Failed to check feature permission:", error);
    return false;
  }
}

/**
 * 获取用户的所有权限
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    const subscription = await getUserActiveSubscription(userId);
    if (!subscription) {
      return [];
    }

    const plan = await getPlanById(subscription.planId);
    if (!plan || !plan.isActive) {
      return [];
    }

    return plan.features;
  } catch (error) {
    console.error("Failed to get user permissions:", error);
    return [];
  }
}

/**
 * 检查用户AI分析次数是否超限
 */
export async function checkAiAnalysisQuota(userId: number): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  try {
    const subscription = await getUserActiveSubscription(userId);
    if (!subscription) {
      return { allowed: false, used: 0, limit: 0 };
    }

    const plan = await getPlanById(subscription.planId);
    if (!plan || !plan.isActive) {
      return { allowed: false, used: 0, limit: 0 };
    }

    const limit = plan.maxAiAnalysis;
    const used = subscription.usedAiAnalysis;

    // -1 表示无限制
    if (limit === -1) {
      return { allowed: true, used, limit: -1 };
    }

    return {
      allowed: used < limit,
      used,
      limit,
    };
  } catch (error) {
    console.error("Failed to check AI analysis quota:", error);
    return { allowed: false, used: 0, limit: 0 };
  }
}

/**
 * 增加AI分析使用次数
 */
export async function incrementAiAnalysisUsage(userId: number): Promise<void> {
  try {
    const subscription = await getUserActiveSubscription(userId);
    if (!subscription) {
      throw new Error("无有效订阅");
    }

    const { getDb } = await import("../db");
    const { userSubscriptions } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    await db
      .update(userSubscriptions)
      .set({ usedAiAnalysis: subscription.usedAiAnalysis + 1 })
      .where(eq(userSubscriptions.id, subscription.id));
  } catch (error) {
    console.error("Failed to increment AI analysis usage:", error);
    throw new Error("更新AI分析使用次数失败");
  }
}
