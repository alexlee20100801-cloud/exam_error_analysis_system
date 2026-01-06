import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

/**
 * 获取真题列表（支持按年级、学科、地区、学校筛选）
 */
export async function getRealExamQuestions(filters: {
  grade?: string;
  subject?: string;
  region?: string;
  school?: string;
  year?: number;
  difficulty?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const conditions = [];
  
  if (filters.grade) {
    conditions.push(eq(schema.realExamQuestions.grade, filters.grade as any));
  }
  if (filters.subject) {
    conditions.push(eq(schema.realExamQuestions.subject, filters.subject as any));
  }
  if (filters.region) {
    conditions.push(eq(schema.realExamQuestions.sourceRegion, filters.region));
  }
  if (filters.school) {
    conditions.push(eq(schema.realExamQuestions.sourceSchool, filters.school));
  }
  if (filters.year) {
    conditions.push(eq(schema.realExamQuestions.examYear, filters.year));
  }
  if (filters.difficulty) {
    conditions.push(eq(schema.realExamQuestions.difficulty, filters.difficulty as any));
  }

  // 只显示公开的题目
  conditions.push(eq(schema.realExamQuestions.isPublic, true));

  const questions = await db
    .select()
    .from(schema.realExamQuestions)
    .where(and(...conditions))
    .orderBy(desc(schema.realExamQuestions.examYear), desc(schema.realExamQuestions.createdAt))
    .limit(filters.limit || 20)
    .offset(filters.offset || 0);

  return questions;
}

/**
 * 获取真题详情
 */
export async function getRealExamQuestionById(questionId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const [question] = await db
    .select()
    .from(schema.realExamQuestions)
    .where(eq(schema.realExamQuestions.id, questionId));

  if (!question) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
  }

  return question;
}

/**
 * 创建真题（管理员功能）
 */
export async function createRealExamQuestion(data: {
  title: string;
  content: string;
  questionType: string;
  answer: string;
  explanation?: string;
  subject: string;
  grade: string;
  schoolLevel: string;
  difficulty: string;
  knowledgePointIds?: number[];
  sourceSchool?: string;
  sourceRegion?: string;
  examYear?: number;
  examSemester?: string;
  examType?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const [result] = await db
    .insert(schema.realExamQuestions)
    .values({
      title: data.title,
      content: data.content,
      questionType: data.questionType as any,
      answer: data.answer,
      explanation: data.explanation || null,
      subject: data.subject as any,
      grade: data.grade as any,
      schoolLevel: data.schoolLevel as any,
      difficulty: data.difficulty as any,
      knowledgePointIds: data.knowledgePointIds || null,
      sourceSchool: data.sourceSchool || null,
      sourceRegion: data.sourceRegion || null,
      examYear: data.examYear || null,
      examSemester: data.examSemester as any || null,
      examType: data.examType || null,
      createdBy: data.createdBy,
      isVerified: false,
      isPublic: true,
      usageCount: 0,
    })
    .$returningId();

  return result;
}

/**
 * 记录用户真题练习
 */
export async function recordRealExamPractice(data: {
  userId: number;
  questionId: number;
  userAnswer?: string;
  isCorrect?: boolean;
  timeSpent?: number;
  score?: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const [record] = await db
    .insert(schema.realExamPracticeRecords)
    .values({
      userId: data.userId,
      questionId: data.questionId,
      userAnswer: data.userAnswer || null,
      isCorrect: data.isCorrect || null,
      timeSpent: data.timeSpent || null,
      score: data.score ? data.score.toString() : null,
    })
    .$returningId();

  // 更新题目使用次数
  await db
    .update(schema.realExamQuestions)
    .set({
      usageCount: sql`${schema.realExamQuestions.usageCount} + 1`,
    })
    .where(eq(schema.realExamQuestions.id, data.questionId));

  return record;
}

/**
 * 获取用户真题练习记录
 */
export async function getUserRealExamPracticeRecords(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const records = await db
    .select({
      record: schema.realExamPracticeRecords,
      question: schema.realExamQuestions,
    })
    .from(schema.realExamPracticeRecords)
    .leftJoin(
      schema.realExamQuestions,
      eq(schema.realExamPracticeRecords.questionId, schema.realExamQuestions.id)
    )
    .where(eq(schema.realExamPracticeRecords.userId, userId))
    .orderBy(desc(schema.realExamPracticeRecords.practiceDate))
    .limit(limit);

  return records;
}

/**
 * 收藏/取消收藏真题
 */
export async function toggleRealExamBookmark(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 查找最近的练习记录
  const [record] = await db
    .select()
    .from(schema.realExamPracticeRecords)
    .where(
      and(
        eq(schema.realExamPracticeRecords.userId, userId),
        eq(schema.realExamPracticeRecords.questionId, questionId)
      )
    )
    .orderBy(desc(schema.realExamPracticeRecords.practiceDate))
    .limit(1);

  if (!record) {
    // 如果没有练习记录，创建一个只用于收藏的记录
    await db.insert(schema.realExamPracticeRecords).values({
      userId,
      questionId,
      isBookmarked: true,
    });
    return { isBookmarked: true };
  }

  // 切换收藏状态
  const newBookmarkStatus = !record.isBookmarked;
  await db
    .update(schema.realExamPracticeRecords)
    .set({ isBookmarked: newBookmarkStatus })
    .where(eq(schema.realExamPracticeRecords.id, record.id));

  return { isBookmarked: newBookmarkStatus };
}

/**
 * 获取用户收藏的真题
 */
export async function getUserBookmarkedRealExams(userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const bookmarked = await db
    .select({
      record: schema.realExamPracticeRecords,
      question: schema.realExamQuestions,
    })
    .from(schema.realExamPracticeRecords)
    .leftJoin(
      schema.realExamQuestions,
      eq(schema.realExamPracticeRecords.questionId, schema.realExamQuestions.id)
    )
    .where(
      and(
        eq(schema.realExamPracticeRecords.userId, userId),
        eq(schema.realExamPracticeRecords.isBookmarked, true)
      )
    )
    .orderBy(desc(schema.realExamPracticeRecords.practiceDate));

  return bookmarked;
}

/**
 * 获取可用的学校列表（用于筛选）
 */
export async function getAvailableSchools(region?: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const conditions = [eq(schema.realExamQuestions.isPublic, true)];
  if (region) {
    conditions.push(eq(schema.realExamQuestions.sourceRegion, region));
  }

  const schools = await db
    .selectDistinct({ school: schema.realExamQuestions.sourceSchool })
    .from(schema.realExamQuestions)
    .where(and(...conditions));

  return schools.map(s => s.school).filter(Boolean);
}

/**
 * 获取可用的年份列表（用于筛选）
 */
export async function getAvailableYears() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const years = await db
    .selectDistinct({ year: schema.realExamQuestions.examYear })
    .from(schema.realExamQuestions)
    .where(eq(schema.realExamQuestions.isPublic, true))
    .orderBy(desc(schema.realExamQuestions.examYear));

  return years.map(y => y.year).filter(Boolean);
}

/**
 * 删除真题（仅管理员或题目创建者）
 */
export async function deleteRealExamQuestion(questionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 获取题目信息
  const question = await db
    .select()
    .from(schema.realExamQuestions)
    .where(eq(schema.realExamQuestions.id, questionId))
    .limit(1);

  if (question.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "真题不存在" });
  }

  // 验证权限（仅创建者可删除，或者管理员）
  // 注意：这里假设管理员权限已在路由层检查，这里只检查创建者
  if (question[0].createdBy && question[0].createdBy !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "无权删除此真题" });
  }

  // 删除真题
  await db
    .delete(schema.realExamQuestions)
    .where(eq(schema.realExamQuestions.id, questionId));

  return {
    success: true,
  };
}
