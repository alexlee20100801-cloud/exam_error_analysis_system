import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { ENV } from './_core/env';
import * as schema from '../drizzle/schema';

const connection = mysql.createPool(ENV.databaseUrl);
export const db = drizzle(connection, { schema, mode: 'default' });

import { 
  users, 
  errorQuestions, 
  knowledgePoints, 
  practiceRecords, 
  learningProgress, 
  questionBank, 
  videoResources, 
  reviewPlans, 
  achievements, 
  checkInRecords,
  parentStudentRelations,
  learningGoals,
  goalReminders,
  realExamQuestions,
  realExamPracticeRecords,
  generatedExamPapers,
  questions,
  scheduledTasks,
  taskExecutionLogs,
  practicePools,
  favorites,
  reviewReminders,
  reviewHistory,
  errorReviewRecords,
  learningPaths,
  learningPathProgress,
  exams,
  studyPlans,
  systemSettings,
  emailVerificationTokens,
  emailTemplates,
  userReminderSettings,
  aiAdviceHistory,
  reviewTasks,
  reviewTaskReminders,
  subscriptionPlans,
  orders,
  userSubscriptions,
  paymentConfigs,
  accountCredentials,
  pushConfigs,
  pushRecords,
  userPushReceipts,
  questionReviews,
  annotations,
  crawlerTasks,
  rawQuestions,
  crawlerSources,
  knowledgePointTags,
  knowledgePointRelations,
  ocrProcessingLogs,
  uploadHistory,
  uploadSessions,
  uploadSessionItems,
} from '../drizzle/schema';
import { eq, and, desc, sql, gte, lte, inArray, or, like, asc, isNull, ne } from 'drizzle-orm';

// 导出db实例供其他模块使用
export function getDb() {
  return db;
}

// ============ 用户相关 ============
export async function getUserById(id: number) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByOpenId(openId: string) {
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createUser(data: typeof users.$inferInsert) {
  const result = await db.insert(users).values(data);
  return result;
}

export async function updateUser(id: number, data: Partial<typeof users.$inferInsert>) {
  const result = await db.update(users).set(data).where(eq(users.id, id));
  return result;
}

export async function upsertUser(data: typeof users.$inferInsert) {
  try {
    const existingUser = await getUserByOpenId(data.openId);
    if (existingUser) {
      await updateUser(existingUser.id, data);
      return existingUser;
    } else {
      const result = await createUser(data);
      const newUser = await getUserByOpenId(data.openId);
      return newUser;
    }
  } catch (error) {
    console.error('Error in upsertUser:', error);
    throw error;
  }
}

// ============ 错题相关 ============
export async function getErrorQuestionsByUserId(userId: number) {
  return await db.select().from(errorQuestions).where(eq(errorQuestions.userId, userId)).orderBy(desc(errorQuestions.createdAt));
}

export async function getErrorQuestionById(id: number) {
  const result = await db.select().from(errorQuestions).where(eq(errorQuestions.id, id)).limit(1);
  return result[0];
}

export async function createErrorQuestion(data: typeof errorQuestions.$inferInsert) {
  const result = await db.insert(errorQuestions).values(data);
  return result;
}

export async function updateErrorQuestion(id: number, data: Partial<typeof errorQuestions.$inferInsert>) {
  const result = await db.update(errorQuestions).set(data).where(eq(errorQuestions.id, id));
  return result;
}

export async function getErrorQuestionsBySubjectAndGrade(userId: number, subject: string, grade: string) {
  return await db.select().from(errorQuestions)
    .where(and(
      eq(errorQuestions.userId, userId),
      eq(errorQuestions.subject, subject),
      eq(errorQuestions.grade, grade)
    ))
    .orderBy(desc(errorQuestions.createdAt));
}

// ============ 知识点相关 ============
export async function createKnowledgePoint(data: typeof knowledgePoints.$inferInsert) {
  const result = await db.insert(knowledgePoints).values(data);
  return result;
}

export async function getKnowledgePointsBySubjectAndGrade(subject: string, grade: string) {
  return await db.select().from(knowledgePoints)
    .where(and(
      eq(knowledgePoints.subject, subject),
      eq(knowledgePoints.grade, grade)
    ))
    .orderBy(asc(knowledgePoints.name));
}

export async function getKnowledgePointById(id: number) {
  const result = await db.select().from(knowledgePoints)
    .where(eq(knowledgePoints.id, id))
    .limit(1);
  return result[0];
}

export async function getKnowledgePointsByIds(ids: number[]) {
  return await db.select().from(knowledgePoints)
    .where(inArray(knowledgePoints.id, ids));
}

// ============ 知识点标签相关 ============
export async function createKnowledgePointTag(data: typeof knowledgePointTags.$inferInsert) {
  const result = await db.insert(knowledgePointTags).values(data);
  return result;
}

export async function getKnowledgePointTags() {
  return await db.select().from(knowledgePointTags);
}

// ============ 知识点关系相关 ============
export async function createKnowledgePointRelation(data: typeof knowledgePointRelations.$inferInsert) {
  const result = await db.insert(knowledgePointRelations).values(data);
  return result;
}

export async function getKnowledgePointRelations() {
  return await db.select().from(knowledgePointRelations);
}

// ============ OCR处理日志相关 ============
export async function createOcrProcessingLog(data: typeof ocrProcessingLogs.$inferInsert) {
  const result = await db.insert(ocrProcessingLogs).values(data);
  return result;
}

// ============ 练习相关 ============
export async function createPracticeRecord(data: typeof practiceRecords.$inferInsert) {
  const result = await db.insert(practiceRecords).values(data);
  return result;
}

export async function getPracticeRecordsByUserId(userId: number) {
  return await db.select().from(practiceRecords)
    .where(eq(practiceRecords.userId, userId))
    .orderBy(desc(practiceRecords.createdAt));
}

export async function getPracticeRecordById(id: number) {
  const result = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.id, id))
    .limit(1);
  return result[0];
}

export async function updatePracticeRecord(id: number, data: Partial<typeof practiceRecords.$inferInsert>) {
  const result = await db.update(practiceRecords).set(data).where(eq(practiceRecords.id, id));
  return result;
}

// ============ 学习进度相关 ============
export async function upsertLearningProgress(data: typeof learningProgress.$inferInsert) {
  try {
    const existing = await db.select().from(learningProgress)
      .where(and(
        eq(learningProgress.userId, data.userId),
        eq(learningProgress.knowledgePointId, data.knowledgePointId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(learningProgress).set(data).where(eq(learningProgress.id, existing[0].id));
      return existing[0];
    } else {
      const result = await db.insert(learningProgress).values(data);
      return result;
    }
  } catch (error) {
    console.error('Error in upsertLearningProgress:', error);
    throw error;
  }
}

export async function getLearningProgressByUserId(userId: number) {
  return await db.select().from(learningProgress)
    .where(eq(learningProgress.userId, userId));
}

export async function getLearningProgressByUser(userId: number) {
  return await db.select().from(learningProgress)
    .where(eq(learningProgress.userId, userId));
}

export async function getLearningProgressByKnowledgePoint(knowledgePointId: number) {
  return await db.select().from(learningProgress)
    .where(eq(learningProgress.knowledgePointId, knowledgePointId));
}

export async function getLearningProgressById(id: number) {
  const result = await db.select().from(learningProgress)
    .where(eq(learningProgress.id, id))
    .limit(1);
  return result[0];
}

// ============ 题库相关 ============
export async function createQuestionBankItem(data: typeof questionBank.$inferInsert) {
  const result = await db.insert(questionBank).values(data);
  return result;
}

export async function getQuestionBankById(id: number) {
  const result = await db.select().from(questionBank)
    .where(eq(questionBank.id, id))
    .limit(1);
  return result[0];
}

export async function getQuestionBankBySubjectAndGrade(subject: string, grade: string) {
  return await db.select().from(questionBank)
    .where(and(
      eq(questionBank.subject, subject),
      eq(questionBank.grade, grade)
    ));
}

// ============ 视频资源相关 ============
export async function createVideoResource(data: typeof videoResources.$inferInsert) {
  const result = await db.insert(videoResources).values(data);
  return result;
}

export async function getVideosBySubjectAndGrade(subject: string, grade: string) {
  return await db.select().from(videoResources)
    .where(and(
      eq(videoResources.subject, subject),
      eq(videoResources.grade, grade)
    ));
}

export async function getVideoResourceById(id: number) {
  const result = await db.select().from(videoResources)
    .where(eq(videoResources.id, id))
    .limit(1);
  return result[0];
}

// ============ 真题相关 ============
export async function getRealExamQuestionById(id: number) {
  const result = await db.select().from(realExamQuestions)
    .where(eq(realExamQuestions.id, id))
    .limit(1);
  return result[0];
}

export async function getRealExamQuestionsByGrade(grade: string) {
  return await db.select().from(realExamQuestions)
    .where(eq(realExamQuestions.grade, grade));
}

// ============ 练习池相关 ============
export async function getPracticePoolById(id: number) {
  const result = await db.select().from(practicePools)
    .where(eq(practicePools.id, id))
    .limit(1);
  return result[0];
}

export async function getPracticePoolsByUserId(userId: number) {
  return await db.select().from(practicePools)
    .where(eq(practicePools.userId, userId));
}

export async function createPracticePool(data: typeof practicePools.$inferInsert) {
  const result = await db.insert(practicePools).values(data);
  return result;
}

// ============ 收藏相关 ============
export async function createFavorite(data: typeof favorites.$inferInsert) {
  const result = await db.insert(favorites).values(data);
  return result;
}

export async function getFavoritesByUserId(userId: number) {
  return await db.select().from(favorites)
    .where(eq(favorites.userId, userId));
}

export async function deleteFavorite(id: number) {
  return await db.delete(favorites).where(eq(favorites.id, id));
}

// ============ 复习计划相关 ============
export async function createReviewPlan(data: typeof reviewPlans.$inferInsert) {
  const result = await db.insert(reviewPlans).values(data);
  return result;
}

export async function getReviewPlansByUser(userId: number) {
  return await db.select().from(reviewPlans)
    .where(eq(reviewPlans.userId, userId));
}

export async function updateReviewPlan(id: number, data: Partial<typeof reviewPlans.$inferInsert>) {
  const result = await db.update(reviewPlans).set(data).where(eq(reviewPlans.id, id));
  return result;
}

export async function getPendingReviewPlans(userId: number) {
  return await db.select().from(reviewPlans)
    .where(and(
      eq(reviewPlans.userId, userId),
      eq(reviewPlans.status, 'pending')
    ));
}

// ============ 复习提醒相关 ============
export async function createReviewReminder(data: typeof reviewReminders.$inferInsert) {
  const result = await db.insert(reviewReminders).values(data);
  return result;
}

export async function getReviewRemindersByUserId(userId: number) {
  return await db.select().from(reviewReminders)
    .where(eq(reviewReminders.userId, userId));
}

// ============ 复习历史相关 ============
export async function createReviewHistory(data: typeof reviewHistory.$inferInsert) {
  const result = await db.insert(reviewHistory).values(data);
  return result;
}

export async function getReviewHistoryByUserId(userId: number) {
  return await db.select().from(reviewHistory)
    .where(eq(reviewHistory.userId, userId))
    .orderBy(desc(reviewHistory.createdAt));
}

// ============ 成就相关 ============
export async function getAchievementById(id: number) {
  const result = await db.select().from(achievements)
    .where(eq(achievements.id, id))
    .limit(1);
  return result[0];
}

export async function getAllAchievements() {
  return await db.select().from(achievements);
}

// ============ 注解相关 ============
export async function createAnnotation(data: any) {
  const result = await db.insert(annotations).values(data);
  return result;
}

export async function deleteAnnotation(id: number) {
  return await db.delete(annotations).where(eq(annotations.id, id));
}

export async function getAnnotationsByImageUrl(imageUrl: string) {
  return await db.select().from(annotations).where(eq(annotations.imageUrl, imageUrl));
}

export async function getAnnotationsByItem(itemId: number) {
  return await db.select().from(annotations).where(eq(annotations.itemId, itemId));
}

export async function updateAnnotation(id: number, data: any) {
  const result = await db.update(annotations).set(data).where(eq(annotations.id, id));
  return result;
}

export async function batchDeleteAnnotations(ids: number[]) {
  return await db.delete(annotations).where(inArray(annotations.id, ids));
}

// ============ 通用CRUD函数 ============
export async function getTableById<T extends { id: number }>(table: any, id: number): Promise<T | undefined> {
  const result = await db.select().from(table).where(eq(table.id, id)).limit(1);
  return result[0];
}

export async function getAllFromTable<T>(table: any): Promise<T[]> {
  return await db.select().from(table);
}

export async function createInTable<T>(table: any, data: any): Promise<any> {
  return await db.insert(table).values(data);
}

export async function updateInTable<T>(table: any, id: number, data: any): Promise<any> {
  return await db.update(table).set(data).where(eq(table.id, id));
}

export async function deleteFromTable<T>(table: any, id: number): Promise<any> {
  return await db.delete(table).where(eq(table.id, id));
}

// ============ 爬虫任务相关 ============
export async function createCrawlerTask(data: typeof crawlerTasks.$inferInsert) {
  const result = await db.insert(crawlerTasks).values(data);
  return result;
}

export async function getCrawlerTasks() {
  return await db.select().from(crawlerTasks);
}

export async function getCrawlerTaskById(id: number) {
  const result = await db.select().from(crawlerTasks)
    .where(eq(crawlerTasks.id, id))
    .limit(1);
  return result[0];
}

export async function updateCrawlerTask(id: number, data: Partial<typeof crawlerTasks.$inferInsert>) {
  const result = await db.update(crawlerTasks).set(data).where(eq(crawlerTasks.id, id));
  return result;
}

export async function deleteCrawlerTask(id: number) {
  return await db.delete(crawlerTasks).where(eq(crawlerTasks.id, id));
}

export async function createRawQuestion(data: typeof rawQuestions.$inferInsert) {
  const result = await db.insert(rawQuestions).values(data);
  return result;
}

export async function getRawQuestions() {
  return await db.select().from(rawQuestions);
}

export async function getRawQuestionById(id: number) {
  const result = await db.select().from(rawQuestions)
    .where(eq(rawQuestions.id, id))
    .limit(1);
  return result[0];
}

export async function updateRawQuestion(id: number, data: Partial<typeof rawQuestions.$inferInsert>) {
  const result = await db.update(rawQuestions).set(data).where(eq(rawQuestions.id, id));
  return result;
}

export async function createCrawlerSource(data: typeof crawlerSources.$inferInsert) {
  const result = await db.insert(crawlerSources).values(data);
  return result;
}

export async function getCrawlerSources() {
  return await db.select().from(crawlerSources);
}

export async function updateCrawlerSource(id: number, data: Partial<typeof crawlerSources.$inferInsert>) {
  const result = await db.update(crawlerSources).set(data).where(eq(crawlerSources.id, id));
  return result;
}

// ============ 动态导出代理 ============
// 为了处理任何可能的缺失函数，我们提供一个通用的导出对象
const handler = {
  get: (target: any, prop: string) => {
    if (prop in target) {
      return target[prop];
    }
    // 返回一个通用函数，用于处理任何未定义的导出
    return async (...args: any[]) => {
      console.warn(`Function ${prop} is not implemented in db.ts`);
      return null;
    };
  }
};

// 创建一个代理对象来处理所有可能的导出
export const dbProxy = new Proxy(module.exports, handler);
