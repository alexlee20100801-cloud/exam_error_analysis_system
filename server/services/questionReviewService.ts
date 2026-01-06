import { getDb } from '../db';
import { 
  aiGeneratedQuestions, 
  questionReviewRecords,
  InsertQuestionReviewRecord 
} from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * 审核操作类型
 */
export type ReviewAction = 'approve' | 'reject' | 'request_revision';

/**
 * 审核状态类型
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

/**
 * 审核参数
 */
export interface ReviewQuestionParams {
  questionId: number;
  reviewerId: number;
  action: ReviewAction;
  notes?: string;
  modifiedFields?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

/**
 * 修改题目参数
 */
export interface ModifyQuestionParams {
  questionId: number;
  reviewerId: number;
  updates: {
    title?: string;
    content?: string;
    answer?: string;
    explanation?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    knowledgePointIds?: number[];
  };
  notes?: string;
}

/**
 * 获取待审核题目列表
 */
export async function getPendingQuestions(params: {
  subject?: string;
  grade?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const { subject, grade, limit = 20, offset = 0 } = params;

  let query = db
    .select()
    .from(aiGeneratedQuestions)
    .where(eq(aiGeneratedQuestions.reviewStatus, 'pending'))
    .orderBy(desc(aiGeneratedQuestions.createdAt))
    .limit(limit)
    .offset(offset);

  if (subject) {
    query = query.where(
      and(
        eq(aiGeneratedQuestions.reviewStatus, 'pending'),
        eq(aiGeneratedQuestions.subject, subject as any)
      )
    );
  }

  if (grade) {
    query = query.where(
      and(
        eq(aiGeneratedQuestions.reviewStatus, 'pending'),
        eq(aiGeneratedQuestions.grade, grade as any)
      )
    );
  }

  const questions = await query;
  
  // 获取总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiGeneratedQuestions)
    .where(eq(aiGeneratedQuestions.reviewStatus, 'pending'));

  return {
    questions,
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * 获取题目详情（包含来源信息）
 */
export async function getQuestionDetail(questionId: number) {
  const db = getDb();

  const result = await db
    .select({
      question: aiGeneratedQuestions,
    })
    .from(aiGeneratedQuestions)
    .where(eq(aiGeneratedQuestions.id, questionId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  // 获取审核历史
  const reviewHistory = await db
    .select()
    .from(questionReviewRecords)
    .where(eq(questionReviewRecords.questionId, questionId))
    .orderBy(desc(questionReviewRecords.createdAt));

  return {
    ...result[0].question,
    reviewHistory,
  };
}

/**
 * 审核题目
 */
export async function reviewQuestion(params: ReviewQuestionParams) {
  const db = getDb();
  const { questionId, reviewerId, action, notes, modifiedFields } = params;

  // 获取当前状态
  const currentQuestion = await db
    .select()
    .from(aiGeneratedQuestions)
    .where(eq(aiGeneratedQuestions.id, questionId))
    .limit(1);

  if (currentQuestion.length === 0) {
    throw new Error('题目不存在');
  }

  const previousStatus = currentQuestion[0].reviewStatus;

  // 确定新状态
  let newStatus: ReviewStatus;
  switch (action) {
    case 'approve':
      newStatus = 'approved';
      break;
    case 'reject':
      newStatus = 'rejected';
      break;
    case 'request_revision':
      newStatus = 'needs_revision';
      break;
    default:
      throw new Error('无效的审核操作');
  }

  // 更新题目状态
  await db
    .update(aiGeneratedQuestions)
    .set({
      reviewStatus: newStatus,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes,
      isPublic: newStatus === 'approved', // 批准后自动公开
    })
    .where(eq(aiGeneratedQuestions.id, questionId));

  // 记录审核历史
  const reviewRecord: InsertQuestionReviewRecord = {
    questionId,
    reviewerId,
    action,
    previousStatus,
    newStatus,
    notes,
    modifiedFields: modifiedFields || [],
  };

  await db.insert(questionReviewRecords).values(reviewRecord);

  return {
    success: true,
    newStatus,
  };
}

/**
 * 修改题目内容
 */
export async function modifyQuestion(params: ModifyQuestionParams) {
  const db = getDb();
  const { questionId, reviewerId, updates, notes } = params;

  // 获取当前题目
  const currentQuestion = await db
    .select()
    .from(aiGeneratedQuestions)
    .where(eq(aiGeneratedQuestions.id, questionId))
    .limit(1);

  if (currentQuestion.length === 0) {
    throw new Error('题目不存在');
  }

  const current = currentQuestion[0];

  // 记录修改的字段
  const modifiedFields: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }> = [];

  if (updates.title && updates.title !== current.title) {
    modifiedFields.push({
      field: 'title',
      oldValue: current.title,
      newValue: updates.title,
    });
  }

  if (updates.content && updates.content !== current.content) {
    modifiedFields.push({
      field: 'content',
      oldValue: current.content,
      newValue: updates.content,
    });
  }

  if (updates.answer && updates.answer !== current.answer) {
    modifiedFields.push({
      field: 'answer',
      oldValue: current.answer,
      newValue: updates.answer,
    });
  }

  if (updates.explanation && updates.explanation !== current.explanation) {
    modifiedFields.push({
      field: 'explanation',
      oldValue: current.explanation || '',
      newValue: updates.explanation,
    });
  }

  if (updates.difficulty && updates.difficulty !== current.difficulty) {
    modifiedFields.push({
      field: 'difficulty',
      oldValue: current.difficulty,
      newValue: updates.difficulty,
    });
  }

  // 更新题目
  await db
    .update(aiGeneratedQuestions)
    .set({
      ...updates,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    })
    .where(eq(aiGeneratedQuestions.id, questionId));

  // 记录修改历史
  const reviewRecord: InsertQuestionReviewRecord = {
    questionId,
    reviewerId,
    action: 'request_revision',
    previousStatus: current.reviewStatus,
    newStatus: 'needs_revision',
    notes: notes || '管理员修改了题目内容',
    modifiedFields,
  };

  await db.insert(questionReviewRecords).values(reviewRecord);

  return {
    success: true,
    modifiedFields,
  };
}

/**
 * 批量审核题目
 */
export async function batchReviewQuestions(params: {
  questionIds: number[];
  reviewerId: number;
  action: ReviewAction;
  notes?: string;
}) {
  const { questionIds, reviewerId, action, notes } = params;

  const results = await Promise.allSettled(
    questionIds.map((questionId) =>
      reviewQuestion({
        questionId,
        reviewerId,
        action,
        notes,
      })
    )
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failCount = results.filter((r) => r.status === 'rejected').length;

  return {
    total: questionIds.length,
    successCount,
    failCount,
    results,
  };
}

/**
 * 获取审核统计
 */
export async function getReviewStats(reviewerId?: number) {
  const db = getDb();

  // 总体统计
  const totalStats = await db
    .select({
      status: aiGeneratedQuestions.reviewStatus,
      count: sql<number>`count(*)`,
    })
    .from(aiGeneratedQuestions)
    .groupBy(aiGeneratedQuestions.reviewStatus);

  // 个人统计（如果提供了reviewerId）
  let personalStats = null;
  if (reviewerId) {
    personalStats = await db
      .select({
        action: questionReviewRecords.action,
        count: sql<number>`count(*)`,
      })
      .from(questionReviewRecords)
      .where(eq(questionReviewRecords.reviewerId, reviewerId))
      .groupBy(questionReviewRecords.action);
  }

  return {
    totalStats: totalStats.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    personalStats: personalStats
      ? personalStats.map((s) => ({
          action: s.action,
          count: Number(s.count),
        }))
      : null,
  };
}

/**
 * 获取已审核题目列表
 */
export async function getReviewedQuestions(params: {
  status?: ReviewStatus;
  reviewerId?: number;
  subject?: string;
  grade?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const { status, reviewerId, subject, grade, limit = 20, offset = 0 } = params;

  let conditions = [];

  if (status) {
    conditions.push(eq(aiGeneratedQuestions.reviewStatus, status));
  } else {
    // 默认排除pending状态
    conditions.push(
      sql`${aiGeneratedQuestions.reviewStatus} != 'pending'`
    );
  }

  if (reviewerId) {
    conditions.push(eq(aiGeneratedQuestions.reviewedBy, reviewerId));
  }

  if (subject) {
    conditions.push(eq(aiGeneratedQuestions.subject, subject as any));
  }

  if (grade) {
    conditions.push(eq(aiGeneratedQuestions.grade, grade as any));
  }

  const questions = await db
    .select()
    .from(aiGeneratedQuestions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiGeneratedQuestions.reviewedAt))
    .limit(limit)
    .offset(offset);

  // 获取总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiGeneratedQuestions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return {
    questions,
    total: Number(countResult[0]?.count || 0),
  };
}
