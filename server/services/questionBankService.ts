import { db } from "../db";
import { questions, questionSources, crawlTasks } from "../../drizzle/schema";
import { eq, and, or, gte, lte, like, inArray, desc, asc, sql } from "drizzle-orm";

/**
 * 题库管理服务
 * 提供题库查询、统计、分析等功能
 */

// ==================== 分类查询 ====================

/**
 * 获取所有分类（按年级、科目）
 */
export async function getQuestionCategories() {
  const categories = await db
    .selectDistinct({
      grade: questions.grade,
      subject: questions.subject,
    })
    .from(questions)
    .where(eq(questions.isPublished, 1));

  return categories;
}

/**
 * 获取指定分类的题目统计
 */
export async function getCategoryStats(
  grade?: string,
  subject?: string
) {
  const conditions = [eq(questions.isPublished, 1)];
  if (grade) conditions.push(eq(questions.grade, grade as any));
  if (subject) conditions.push(eq(questions.subject, subject as any));

  const stats = await db
    .select({
      totalQuestions: sql<number>`COUNT(*)`,
      avgDifficulty: sql<string>`AVG(CASE WHEN difficulty = 'easy' THEN 1 WHEN difficulty = 'medium' THEN 2 ELSE 3 END)`,
    })
    .from(questions)
    .where(and(...conditions));

  return stats[0] || { totalQuestions: 0, avgDifficulty: "0" };
}

// ==================== 题目查询 ====================

/**
 * 查询题目（支持多条件过滤）
 */
export async function searchQuestions(
  filters: {
    grade?: string;
    subject?: string;
    difficulty?: string;
    questionType?: string;
    keyword?: string;
    limit?: number;
    offset?: number;
  }
) {
  const {
    grade,
    subject,
    difficulty,
    questionType,
    keyword,
    limit = 20,
    offset = 0
  } = filters;

  const conditions = [eq(questions.isPublished, 1)];
  
  if (grade) conditions.push(eq(questions.grade, grade as any));
  if (subject) conditions.push(eq(questions.subject, subject as any));
  if (difficulty) conditions.push(eq(questions.difficulty, difficulty as any));
  if (questionType) conditions.push(eq(questions.questionType, questionType as any));

  // 全文搜索
  if (keyword) {
    conditions.push(
      or(
        like(questions.title, `%${keyword}%`),
        like(questions.content, `%${keyword}%`)
      )
    );
  }

  const result = await db
    .select()
    .from(questions)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(questions.createdAt));

  return result;
}

/**
 * 获取题目详情
 */
export async function getQuestionDetail(questionId: number) {
  const question = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  return question[0] || null;
}

// ==================== 题库统计 ====================

/**
 * 获取题库总体统计
 */
export async function getQuestionBankStats() {
  const stats = await db
    .select({
      totalQuestions: sql<number>`COUNT(*)`,
      gradeCount: sql<number>`COUNT(DISTINCT grade)`,
      subjectCount: sql<number>`COUNT(DISTINCT subject)`,
    })
    .from(questions)
    .where(eq(questions.isPublished, 1));

  return stats[0] || { totalQuestions: 0, gradeCount: 0, subjectCount: 0 };
}

/**
 * 获取题库来源统计
 */
export async function getSourceStats() {
  const stats = await db
    .select({
      sourceName: questionSources.sourceName,
      totalQuestions: sql<number>`COUNT(*)`,
    })
    .from(questionSources)
    .groupBy(questionSources.sourceName)
    .orderBy(desc(sql`COUNT(*)`));

  return stats;
}

/**
 * 获取知识点统计
 */
export async function getKnowledgePointStats(subject?: string) {
  const conditions = [eq(questions.isPublished, 1)];
  if (subject) {
    conditions.push(eq(questions.subject, subject as any));
  }

  const result = await db
    .select()
    .from(questions)
    .where(and(...conditions))
    .orderBy(desc(questions.createdAt))
    .limit(50);

  return result;
}

// ==================== 爬虫任务管理 ====================

/**
 * 获取爬虫任务列表
 */
export async function getCrawlerTasks(
  limit: number = 20,
  offset: number = 0
) {
  const tasks = await db
    .select()
    .from(crawlTasks)
    .orderBy(desc(crawlTasks.createdAt))
    .limit(limit)
    .offset(offset);

  return tasks;
}

/**
 * 获取爬虫任务详情
 */
export async function getCrawlerTaskDetail(taskId: number) {
  const task = await db
    .select()
    .from(crawlTasks)
    .where(eq(crawlTasks.id, taskId))
    .limit(1);

  return task[0] || null;
}

/**
 * 创建爬虫任务
 */
export async function createCrawlerTask(data: {
  taskName: string;
  taskType: string;
  sourceUrl?: string;
  sourceType?: string;
  targetSubject?: string;
  targetGrade?: string;
  scheduleType?: string;
  scheduleTime?: string;
  config?: Record<string, any>;
  createdBy: number;
}) {
  // Only insert valid crawlTasks fields
  const result = await db.insert(crawlTasks).values({
    sourceId: 1, // TODO: Get actual sourceId from input or create source first
    taskName: data.taskName,
    taskType: data.taskType as any,
    status: 'pending' as const
  });

  return result;
}

// ==================== 题目推荐 ====================

/**
 * 获取相似题推荐
 */
export async function getSimilarQuestions(
  questionId: number,
  limit: number = 5
) {
  const sourceQuestion = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!sourceQuestion.length) {
    return [];
  }

  const question = sourceQuestion[0];

  // 基于科目和难度查找相似题
  const similar = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subject, question.subject),
        eq(questions.grade, question.grade),
        eq(questions.difficulty, question.difficulty),
        sql`${questions.id} != ${questionId}`
      )
    )
    .orderBy(desc(questions.createdAt))
    .limit(limit);

  return similar;
}

/**
 * 记录题目使用
 */
export async function recordQuestionUsage(
  questionId: number,
  usageType: 'view' | 'practice' | 'collection' | 'paper' | 'analysis'
) {
  // 可以在这里记录详细的使用日志
  return { success: true };
}

export type QuestionBankStats = Awaited<ReturnType<typeof getQuestionBankStats>>;
export type QuestionDetail = Awaited<ReturnType<typeof getQuestionDetail>>;
export type SearchQuestionsResult = Awaited<ReturnType<typeof searchQuestions>>;
