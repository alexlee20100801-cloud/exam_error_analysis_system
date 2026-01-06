import { getDb } from "../db";
import { subscriptionPlans } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * 获取所有套餐
 */
export async function getAllPlans(includeInactive = false) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    if (!includeInactive) {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.sortOrder, desc(subscriptionPlans.createdAt));
      return plans;
    }

    const plans = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder, desc(subscriptionPlans.createdAt));
    return plans;
  } catch (error) {
    console.error("Failed to get all plans:", error);
    return [];
  }
}

/**
 * 根据ID获取套餐
 */
export async function getPlanById(planId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
    return plan || null;
  } catch (error) {
    console.error("Failed to get plan:", error);
    return null;
  }
}

/**
 * 创建或更新套餐
 */
export async function savePlan(params: {
  id?: number;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationDays: number;
  features: string[];
  maxErrorQuestions?: number;
  maxAiAnalysis?: number;
  isActive?: boolean;
  sortOrder?: number;
}) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const planData = {
      name: params.name,
      description: params.description,
      price: params.price,
      currency: params.currency || "CNY",
      durationDays: params.durationDays,
      features: params.features,
      maxErrorQuestions: params.maxErrorQuestions ?? -1,
      maxAiAnalysis: params.maxAiAnalysis ?? -1,
      isActive: params.isActive ?? true,
      sortOrder: params.sortOrder ?? 0,
    };

    if (params.id) {
      // 更新
      await db.update(subscriptionPlans).set(planData).where(eq(subscriptionPlans.id, params.id));
      return params.id;
    } else {
      // 创建
      const [result] = await db.insert(subscriptionPlans).values(planData);
      return result.insertId;
    }
  } catch (error) {
    console.error("Failed to save plan:", error);
    throw new Error("保存套餐失败");
  }
}

/**
 * 删除套餐
 */
export async function deletePlan(planId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
  } catch (error) {
    console.error("Failed to delete plan:", error);
    throw new Error("删除套餐失败");
  }
}

/**
 * 初始化默认套餐
 */
export async function initializeDefaultPlans() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const existingPlans = await getAllPlans(true);
    if (existingPlans.length > 0) {
      return; // 已有套餐，不重复初始化
    }

    const defaultPlans = [
      {
        name: "基础版",
        description: "适合个人学习使用",
        price: 9900, // 99元
        currency: "CNY",
        durationDays: 30,
        features: ["error_questions", "practice", "basic_stats"],
        maxErrorQuestions: 100,
        maxAiAnalysis: 10,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "标准版",
        description: "适合认真备考的学生",
        price: 29900, // 299元
        currency: "CNY",
        durationDays: 90,
        features: ["error_questions", "practice", "ai_analysis", "video_learning", "advanced_stats"],
        maxErrorQuestions: 500,
        maxAiAnalysis: 50,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "专业版",
        description: "全功能无限制使用",
        price: 59900, // 599元
        currency: "CNY",
        durationDays: 365,
        features: [
          "error_questions",
          "practice",
          "ai_analysis",
          "video_learning",
          "advanced_stats",
          "exam_generator",
          "learning_path",
          "parent_supervision",
        ],
        maxErrorQuestions: -1,
        maxAiAnalysis: -1,
        isActive: true,
        sortOrder: 3,
      },
    ];

    for (const plan of defaultPlans) {
      await db.insert(subscriptionPlans).values(plan);
    }
  } catch (error) {
    console.error("Failed to initialize default plans:", error);
    throw new Error("初始化默认套餐失败");
  }
}
