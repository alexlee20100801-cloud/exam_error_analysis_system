import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

/**
 * 生成邀请码
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * 创建家长-学生绑定邀请
 */
export async function createParentInvite(studentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const inviteCode = generateInviteCode();

  const [relation] = await db
    .insert(schema.parentStudentRelations)
    .values({
      parentId: 0, // 暂时为0，等待家长接受邀请
      studentId,
      inviteCode,
      status: "pending",
    })
    .$returningId();

  return { inviteCode, relationId: relation.id };
}

/**
 * 家长通过邀请码绑定学生
 */
export async function acceptInvite(parentId: number, inviteCode: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 查找邀请
  const [relation] = await db
    .select()
    .from(schema.parentStudentRelations)
    .where(eq(schema.parentStudentRelations.inviteCode, inviteCode))
    .limit(1);

  if (!relation) {
    throw new TRPCError({ code: "NOT_FOUND", message: "邀请码不存在或已失效" });
  }

  if (relation.status !== "pending") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该邀请已被使用" });
  }

  // 更新关联
  await db
    .update(schema.parentStudentRelations)
    .set({
      parentId,
      status: "active",
    })
    .where(eq(schema.parentStudentRelations.id, relation.id));

  return { success: true, studentId: relation.studentId };
}

/**
 * 获取家长绑定的所有学生
 */
export async function getParentStudents(parentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const relations = await db
    .select({
      relationId: schema.parentStudentRelations.id,
      studentId: schema.parentStudentRelations.studentId,
      studentName: schema.users.name,
      studentGrade: schema.users.grade,
      studentSchool: schema.users.school,
      bindingDate: schema.parentStudentRelations.createdAt,
    })
    .from(schema.parentStudentRelations)
    .leftJoin(schema.users, eq(schema.parentStudentRelations.studentId, schema.users.id))
    .where(
      and(
        eq(schema.parentStudentRelations.parentId, parentId),
        eq(schema.parentStudentRelations.status, "active")
      )
    );

  return relations;
}

/**
 * 获取学生的学习统计（供家长查看）
 */
export async function getStudentStats(studentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 错题统计
  const errorQuestions = await db
    .select()
    .from(schema.errorQuestions)
    .where(eq(schema.errorQuestions.userId, studentId));

  const totalErrors = errorQuestions.length;
  const masteredErrors = errorQuestions.filter((q) => q.isMastered).length;
  const masteryRate = totalErrors > 0 ? Math.round((masteredErrors / totalErrors) * 100) : 0;

  // 复习记录统计
  const reviewRecords = await db
    .select()
    .from(schema.errorReviewRecords)
    .where(eq(schema.errorReviewRecords.userId, studentId));

  const totalReviews = reviewRecords.length;

  // 练习记录统计
  const practiceRecords = await db
    .select()
    .from(schema.practiceRecords)
    .where(eq(schema.practiceRecords.userId, studentId));

  const totalPractices = practiceRecords.length;
  const correctPractices = practiceRecords.filter((p) => p.isCorrect).length;
  const practiceAccuracy = totalPractices > 0 ? Math.round((correctPractices / totalPractices) * 100) : 0;

  // 学科分布
  const subjectDistribution: Record<string, number> = {};
  errorQuestions.forEach((q) => {
    subjectDistribution[q.subject] = (subjectDistribution[q.subject] || 0) + 1;
  });

  return {
    totalErrors,
    masteredErrors,
    masteryRate,
    totalReviews,
    totalPractices,
    practiceAccuracy,
    subjectDistribution,
  };
}

/**
 * 创建学习目标
 */
export async function createLearningGoal(data: {
  studentId: number;
  parentId?: number;
  goalType: "error_count" | "mastery_rate" | "review_count" | "study_time";
  targetValue: number;
  period: "daily" | "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const [goal] = await db
    .insert(schema.learningGoals)
    .values({
      studentId: data.studentId,
      parentId: data.parentId,
      goalType: data.goalType,
      targetValue: data.targetValue,
      currentValue: 0,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate,
    })
    .$returningId();

  return { goalId: goal.id };
}

/**
 * 获取学生的学习目标
 */
export async function getStudentGoals(studentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const goals = await db
    .select()
    .from(schema.learningGoals)
    .where(eq(schema.learningGoals.studentId, studentId));

  return goals;
}

/**
 * 更新学习目标进度
 */
export async function updateGoalProgress(goalId: number, currentValue: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const [goal] = await db
    .select()
    .from(schema.learningGoals)
    .where(eq(schema.learningGoals.id, goalId))
    .limit(1);

  if (!goal) {
    throw new TRPCError({ code: "NOT_FOUND", message: "目标不存在" });
  }

  const completed = currentValue >= goal.targetValue;

  await db
    .update(schema.learningGoals)
    .set({
      currentValue,
      completed,
      completedAt: completed ? new Date() : null,
    })
    .where(eq(schema.learningGoals.id, goalId));

  return { success: true, completed };
}
