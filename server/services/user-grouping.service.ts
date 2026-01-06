/**
 * 用户分组引擎服务
 * 根据年级、学科、订阅状态等条件筛选目标用户
 */

import { getDb } from "../db";
import { users, userSubscriptions, subscriptionPlans } from "../../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export interface UserGroupFilters {
  schoolLevel?: "junior" | "senior"; // 学段
  grades?: string[]; // 年级
  subjects?: string[]; // 学科（用于筛选用户的主要学科）
  planIds?: number[]; // 套餐ID
  subscriptionStatus?: "active" | "expired" | "cancelled"; // 订阅状态
}

export interface GroupedUser {
  id: number;
  name: string | null;
  email: string | null;
  grade: string | null;
  school: string | null;
  subscriptionStatus: "active" | "expired" | "cancelled" | "none";
  planName: string | null;
}

/**
 * 根据筛选条件获取目标用户列表
 */
export async function getTargetUsers(filters: UserGroupFilters): Promise<GroupedUser[]> {
  try {
    // 构建查询条件
    const conditions: any[] = [];

    // 学段筛选
    if (filters.schoolLevel) {
      if (filters.schoolLevel === "junior") {
        conditions.push(
          inArray(users.grade, ["junior1", "junior2", "junior3"])
        );
      } else if (filters.schoolLevel === "senior") {
        conditions.push(
          inArray(users.grade, ["senior1", "senior2", "senior3"])
        );
      }
    }

    // 年级筛选
    if (filters.grades && filters.grades.length > 0) {
      conditions.push(inArray(users.grade, filters.grades as any));
    }

    // 基础用户查询
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }
    let query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        grade: users.grade,
        school: users.school,
        subscriptionId: userSubscriptions.id,
        subscriptionStatus: userSubscriptions.status,
        planId: userSubscriptions.planId,
        planName: subscriptionPlans.name,
      })
      .from(users)
      .leftJoin(
        userSubscriptions,
        and(
          eq(users.id, userSubscriptions.userId),
          eq(userSubscriptions.status, "active")
        )
      )
      .leftJoin(
        subscriptionPlans,
        eq(userSubscriptions.planId, subscriptionPlans.id)
      );

    // 应用用户表条件
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query;

    // 后处理：根据订阅状态和套餐ID筛选
    let filteredResults = results;

    // 订阅状态筛选
    if (filters.subscriptionStatus) {
      filteredResults = filteredResults.filter((user: any) => {
        if (filters.subscriptionStatus === "active") {
          return user.subscriptionStatus === "active";
        } else if (filters.subscriptionStatus === "expired") {
          return user.subscriptionStatus === "expired";
        } else if (filters.subscriptionStatus === "cancelled") {
          return user.subscriptionStatus === "cancelled";
        }
        return true;
      });
    }

    // 套餐ID筛选
    if (filters.planIds && filters.planIds.length > 0) {
      filteredResults = filteredResults.filter((user: any) =>
        user.planId ? filters.planIds!.includes(user.planId) : false
      );
    }

    // 转换为统一格式
    return filteredResults.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      grade: user.grade,
      school: user.school,
      subscriptionStatus: user.subscriptionStatus || "none",
      planName: user.planName,
    }));
  } catch (error) {
    console.error("[UserGrouping] Error getting target users:", error);
    throw error;
  }
}

/**
 * 统计目标用户数量
 */
export async function countTargetUsers(filters: UserGroupFilters): Promise<number> {
  const users = await getTargetUsers(filters);
  return users.length;
}

/**
 * 获取用户分组统计信息
 */
export async function getUserGroupStats(filters: UserGroupFilters) {
  const targetUsers = await getTargetUsers(filters);

  // 按年级分组统计
  const gradeStats = targetUsers.reduce((acc, user) => {
    const grade = user.grade || "unknown";
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 按订阅状态分组统计
  const subscriptionStats = targetUsers.reduce((acc, user) => {
    const status = user.subscriptionStatus;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 按套餐分组统计
  const planStats = targetUsers.reduce((acc, user) => {
    const plan = user.planName || "无套餐";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalUsers: targetUsers.length,
    gradeStats,
    subscriptionStats,
    planStats,
  };
}

/**
 * 验证筛选条件是否有效
 */
export function validateFilters(filters: UserGroupFilters): { valid: boolean; error?: string } {
  // 检查学段和年级是否匹配
  if (filters.schoolLevel && filters.grades && filters.grades.length > 0) {
    const juniorGrades = ["junior1", "junior2", "junior3"];
    const seniorGrades = ["senior1", "senior2", "senior3"];

    if (filters.schoolLevel === "junior") {
      const hasInvalidGrade = filters.grades.some((g) => !juniorGrades.includes(g));
      if (hasInvalidGrade) {
        return { valid: false, error: "初中学段不能选择高中年级" };
      }
    } else if (filters.schoolLevel === "senior") {
      const hasInvalidGrade = filters.grades.some((g) => !seniorGrades.includes(g));
      if (hasInvalidGrade) {
        return { valid: false, error: "高中学段不能选择初中年级" };
      }
    }
  }

  return { valid: true };
}
