import { getDb } from "./db";
import { exams } from "../drizzle/schema";
import { eq, and, gte, desc } from "drizzle-orm";

/**
 * 考试管理服务
 */

type InsertExam = typeof exams.$inferInsert;

/**
 * 创建考试
 */
export async function createExam(examData: InsertExam) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result = await db.insert(exams).values(examData);
  return result[0].insertId;
}

/**
 * 更新考试
 */
export async function updateExam(userId: string, examId: number, examData: Partial<InsertExam>) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.update(exams).set(examData).where(and(eq(exams.id, examId), eq(exams.userId, userId)));
}

/**
 * 删除考试
 */
export async function deleteExam(userId: string, examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.delete(exams).where(and(eq(exams.id, examId), eq(exams.userId, userId)));
}

/**
 * 获取用户的所有考试
 */
export async function getUserExams(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const examsList = await db.select().from(exams).where(eq(exams.userId, userId)).orderBy(desc(exams.examDate));

  return examsList;
}

/**
 * 获取即将到来的考试（未来30天内）
 */
export async function getUpcomingExams(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const examsList = await db
    .select()
    .from(exams)
    .where(and(eq(exams.userId, userId), gte(exams.examDate, today)))
    .orderBy(exams.examDate);

  return examsList;
}

/**
 * 获取单个考试详情
 */
export async function getExamById(userId: string, examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const exam = await db.select().from(exams).where(and(eq(exams.id, examId), eq(exams.userId, userId))).limit(1);

  if (exam.length === 0) {
    throw new Error("Exam not found");
  }

  return exam[0];
}
