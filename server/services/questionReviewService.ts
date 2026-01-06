import { getDb } from "../db";
import { questionBank, questionReviews } from "../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * 题目审核服务
 * 处理题目审核工作流和质量评分
 */

// 审核统计接口
export interface ReviewStats {
  totalPending: number; // 待审核总数
  totalApproved: number; // 已通过总数
  totalRejected: number; // 已拒绝总数
  totalNeedsRevision: number; // 需修改总数
  approvalRate: number; // 通过率
  averageQualityScore: number; // 平均质量分
  todayReviewed: number; // 今日审核数
}

// 审核请求接口
export interface ReviewRequest {
  questionId: number;
  reviewerId: number;
  reviewerName: string;
  status: "approved" | "rejected" | "needs_revision";
  scores?: {
    accuracy?: number; // 准确性 1-5
    difficulty?: number; // 难度适当性 1-5
    clarity?: number; // 表述清晰度 1-5
    discrimination?: number; // 区分度 1-5
  };
  notes?: string; // 审核意见
  suggestions?: string; // 修改建议
}

/**
 * 获取待审核题目列表
 */
export async function getPendingQuestions(params: {
  limit?: number;
  offset?: number;
  subject?: string;
  grade?: string;
  source?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { limit = 20, offset = 0, subject, grade, source } = params;

  const conditions: any[] = [eq(questionBank.reviewStatus, "pending")];

  if (subject) {
    conditions.push(eq(questionBank.subject, subject as any));
  }

  if (grade) {
    conditions.push(eq(questionBank.grade, grade as any));
  }

  if (source) {
    conditions.push(eq(questionBank.source, source as any));
  }

  const questions = await db
    .select()
    .from(questionBank)
    .where(and(...conditions))
    .orderBy(desc(questionBank.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(questionBank)
    .where(and(...conditions));

  return {
    questions,
    total: countResult.count,
  };
}

/**
 * 获取题目详情（包含审核历史）
 */
export async function getQuestionWithReviewHistory(questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 获取题目详情
  const [question] = await db
    .select()
    .from(questionBank)
    .where(eq(questionBank.id, questionId));

  if (!question) {
    throw new Error("题目不存在");
  }

  // 获取审核历史
  const reviews = await db
    .select()
    .from(questionReviews)
    .where(eq(questionReviews.questionId, questionId))
    .orderBy(desc(questionReviews.createdAt));

  return {
    question,
    reviews,
  };
}

/**
 * 提交审核
 */
export async function submitReview(request: ReviewRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 计算综合评分
  let overallScore = 0;
  let scoreCount = 0;

  if (request.scores) {
    if (request.scores.accuracy) {
      overallScore += request.scores.accuracy;
      scoreCount++;
    }
    if (request.scores.difficulty) {
      overallScore += request.scores.difficulty;
      scoreCount++;
    }
    if (request.scores.clarity) {
      overallScore += request.scores.clarity;
      scoreCount++;
    }
    if (request.scores.discrimination) {
      overallScore += request.scores.discrimination;
      scoreCount++;
    }
  }

  const finalScore = scoreCount > 0 ? overallScore / scoreCount : 0;

  // 插入审核记录
  await db.insert(questionReviews).values({
    questionId: request.questionId,
    reviewerId: request.reviewerId,
    reviewerName: request.reviewerName,
    status: request.status,
    accuracyScore: request.scores?.accuracy,
    difficultyScore: request.scores?.difficulty,
    clarityScore: request.scores?.clarity,
    discriminationScore: request.scores?.discrimination,
    overallScore: finalScore,
    notes: request.notes,
    suggestions: request.suggestions,
    createdAt: new Date(),
  });

  // 更新题目审核状态
  await db
    .update(questionBank)
    .set({
      reviewStatus: request.status,
      reviewedBy: request.reviewerId,
      reviewedAt: new Date(),
      reviewNotes: request.notes,
      qualityScore: finalScore,
    })
    .where(eq(questionBank.id, request.questionId));

  return {
    success: true,
    overallScore: finalScore,
  };
}

/**
 * 批量审核
 */
export async function batchReview(params: {
  questionIds: number[];
  reviewerId: number;
  reviewerName: string;
  status: "approved" | "rejected";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { questionIds, reviewerId, reviewerName, status, notes } = params;

  let successCount = 0;
  let failedCount = 0;

  for (const questionId of questionIds) {
    try {
      await submitReview({
        questionId,
        reviewerId,
        reviewerName,
        status,
        notes,
      });
      successCount++;
    } catch (error) {
      failedCount++;
      console.error(`批量审核失败: questionId=${questionId}`, error);
    }
  }

  return {
    successCount,
    failedCount,
    total: questionIds.length,
  };
}

/**
 * 获取审核统计
 */
export async function getReviewStats(): Promise<ReviewStats> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 按状态统计
  const statusStats = await db
    .select({
      reviewStatus: questionBank.reviewStatus,
      count: sql<number>`COUNT(*)`,
    })
    .from(questionBank)
    .groupBy(questionBank.reviewStatus);

  const stats: ReviewStats = {
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalNeedsRevision: 0,
    approvalRate: 0,
    averageQualityScore: 0,
    todayReviewed: 0,
  };

  statusStats.forEach((item) => {
    switch (item.reviewStatus) {
      case "pending":
        stats.totalPending = item.count;
        break;
      case "approved":
        stats.totalApproved = item.count;
        break;
      case "rejected":
        stats.totalRejected = item.count;
        break;
      case "needs_revision":
        stats.totalNeedsRevision = item.count;
        break;
    }
  });

  // 计算通过率
  const totalReviewed =
    stats.totalApproved + stats.totalRejected + stats.totalNeedsRevision;
  if (totalReviewed > 0) {
    stats.approvalRate = (stats.totalApproved / totalReviewed) * 100;
  }

  // 计算平均质量分
  const [avgResult] = await db
    .select({
      avg: sql<number>`AVG(${questionBank.qualityScore})`,
    })
    .from(questionBank)
    .where(sql`${questionBank.qualityScore} > 0`);

  stats.averageQualityScore = avgResult.avg || 0;

  // 今日审核数
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayResult] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(questionBank)
    .where(sql`${questionBank.reviewedAt} >= ${today}`);

  stats.todayReviewed = todayResult.count;

  return stats;
}

/**
 * 获取审核历史列表
 */
export async function getReviewHistory(params: {
  limit?: number;
  offset?: number;
  reviewerId?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { limit = 20, offset = 0, reviewerId, status } = params;

  const conditions: any[] = [];

  if (reviewerId) {
    conditions.push(eq(questionReviews.reviewerId, reviewerId));
  }

  if (status) {
    conditions.push(eq(questionReviews.status, status as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const reviews = await db
    .select()
    .from(questionReviews)
    .where(whereClause)
    .orderBy(desc(questionReviews.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(questionReviews)
    .where(whereClause);

  return {
    reviews,
    total: countResult.count,
  };
}

/**
 * 撤销审核（将题目重新设为待审核状态）
 */
export async function revokeReview(questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(questionBank)
    .set({
      reviewStatus: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
    })
    .where(eq(questionBank.id, questionId));

  return {
    success: true,
  };
}
