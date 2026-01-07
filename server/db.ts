import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { ENV } from './_core/env';

const connection = mysql.createPool(ENV.databaseUrl);
export const db = drizzle(connection);

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
} from '../drizzle/schema';
import { eq, and, desc, sql, gte, lte, inArray, or, like, asc, isNull, ne } from 'drizzle-orm';

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

// 错题相关
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

export async function deleteErrorQuestion(id: number) {
  const result = await db.delete(errorQuestions).where(eq(errorQuestions.id, id));
  return result;
}

export async function batchDeleteErrorQuestions(ids: number[]) {
  const result = await db.delete(errorQuestions).where(inArray(errorQuestions.id, ids));
  return result;
}

// 知识点相关
export async function getKnowledgePoints() {
  return await db.select().from(knowledgePoints).orderBy(sql`${knowledgePoints.subject}`, sql`${knowledgePoints.grade}`);
}

export async function getKnowledgePointsBySubjectAndGrade(subject: string, grade: string) {
  return await db.select().from(knowledgePoints)
    .where(and(
      sql`${knowledgePoints.subject} = ${subject}`,
      sql`${knowledgePoints.grade} = ${grade}`
    ));
}

export async function createKnowledgePoint(data: typeof knowledgePoints.$inferInsert) {
  const result = await db.insert(knowledgePoints).values(data);
  return result;
}

// 练习记录相关
export async function getPracticeRecordsByUserId(userId: number) {
  return await db.select().from(practiceRecords)
    .where(eq(practiceRecords.userId, userId))
    .orderBy(desc(practiceRecords.createdAt));
}

export async function createPracticeRecord(data: typeof practiceRecords.$inferInsert) {
  const result = await db.insert(practiceRecords).values(data);
  return result;
}

// 学习进度相关
export async function getLearningProgressByUserId(userId: number) {
  return await db.select().from(learningProgress)
    .where(eq(learningProgress.userId, userId))
    .orderBy(desc(learningProgress.masteryLevel));
}

export async function updateLearningProgress(userId: number, knowledgePointId: number, data: Partial<typeof learningProgress.$inferInsert>) {
  const existing = await db.select().from(learningProgress)
    .where(and(
      eq(learningProgress.userId, userId),
      eq(learningProgress.knowledgePointId, knowledgePointId)
    ))
    .limit(1);

  if (existing.length > 0) {
    return await db.update(learningProgress)
      .set(data)
      .where(and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.knowledgePointId, knowledgePointId)
      ));
  } else {
    return await db.insert(learningProgress).values({
      userId,
      knowledgePointId,
      ...data,
    } as any);
  }
}

// 题库相关
export async function getQuestionBankByFilters(filters: {
  subject?: string;
  grade?: string;
  difficulty?: string;
  knowledgePointIds?: number[];
}) {
  let query = db.select().from(questionBank);
  
  const conditions = [];
  if (filters.subject) conditions.push(eq(questionBank.subject, filters.subject as any));
  if (filters.grade) conditions.push(eq(questionBank.grade, filters.grade as any));
  if (filters.difficulty) conditions.push(eq(questionBank.difficulty, filters.difficulty as any));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query;
}

export async function createQuestionBank(data: typeof questionBank.$inferInsert) {
  const result = await db.insert(questionBank).values(data);
  return result;
}

// 视频资源相关
export async function getVideoResourcesByKnowledgePoints(knowledgePointIds: number[]) {
  return await db.select().from(videoResources)
    .orderBy(desc(videoResources.relevanceScore))
    .limit(10);
}

export async function createVideoResource(data: typeof videoResources.$inferInsert) {
  const result = await db.insert(videoResources).values(data);
  return result;
}

// 复习计划相关
export async function getReviewPlansByUserId(userId: number) {
  return await db.select().from(reviewPlans)
    .where(eq(reviewPlans.userId, userId))
    .orderBy(reviewPlans.scheduledAt);
}

export async function createReviewPlan(data: typeof reviewPlans.$inferInsert) {
  const result = await db.insert(reviewPlans).values(data);
  return result;
}

export async function updateReviewPlan(id: number, data: Partial<typeof reviewPlans.$inferInsert>) {
  const result = await db.update(reviewPlans).set(data).where(eq(reviewPlans.id, id));
  return result;
}

// 成就相关
export async function getAchievementsByUserId(userId: number) {
  return await db.select({
    achievement: achievements,
    userAchievement: userAchievements
  })
  .from(achievements)
  .leftJoin(userAchievements, eq(userAchievements.achievementId, achievements.id))
  .where(eq(userAchievements.userId, userId))
  .orderBy(desc(userAchievements.progress));
}

export async function createAchievement(data: typeof achievements.$inferInsert) {
  const result = await db.insert(achievements).values(data);
  return result;
}

export async function updateAchievement(id: number, data: Partial<typeof achievements.$inferInsert>) {
  const result = await db.update(achievements).set(data).where(eq(achievements.id, id));
  return result;
}

// 打卡记录相关
export async function getCheckInRecordsByUserId(userId: number, startDate?: Date, endDate?: Date) {
  let query = db.select().from(checkInRecords).where(eq(checkInRecords.userId, userId));
  
  const conditions = [eq(checkInRecords.userId, userId)];
  if (startDate) conditions.push(gte(checkInRecords.checkInDate, startDate.toISOString().split('T')[0]));
  if (endDate) conditions.push(lte(checkInRecords.checkInDate, endDate.toISOString().split('T')[0]));
  
  return await db.select().from(checkInRecords)
    .where(and(...conditions))
    .orderBy(desc(checkInRecords.checkInDate));
}

export async function createCheckInRecord(data: typeof checkInRecords.$inferInsert) {
  const result = await db.insert(checkInRecords).values(data);
  return result;
}

// 家长-学生关联相关
export async function getParentStudentRelations(userId: number, userType: 'parent' | 'student') {
  if (userType === 'parent') {
    return await db.select().from(parentStudentRelations)
      .where(eq(parentStudentRelations.parentId, userId));
  } else {
    return await db.select().from(parentStudentRelations)
      .where(eq(parentStudentRelations.studentId, userId));
  }
}

export async function createParentStudentRelation(data: typeof parentStudentRelations.$inferInsert) {
  const result = await db.insert(parentStudentRelations).values(data);
  return result;
}

export async function updateParentStudentRelation(id: number, data: Partial<typeof parentStudentRelations.$inferInsert>) {
  const result = await db.update(parentStudentRelations).set(data).where(eq(parentStudentRelations.id, id));
  return result;
}

// 学习目标相关
export async function getLearningGoalsByStudentId(studentId: string) {
  return await db.select().from(learningGoals)
    .where(eq(learningGoals.studentId, studentId))
    .orderBy(desc(learningGoals.createdAt));
}

export async function createLearningGoal(data: typeof learningGoals.$inferInsert) {
  const result = await db.insert(learningGoals).values(data);
  return result;
}

export async function updateLearningGoal(id: number, data: Partial<typeof learningGoals.$inferInsert>) {
  const result = await db.update(learningGoals).set(data).where(eq(learningGoals.id, id));
  return result;
}

// 目标提醒相关
export async function getGoalRemindersByParentId(parentId: string) {
  return await db.select().from(goalReminders)
    .where(eq(goalReminders.parentId, parentId))
    .orderBy(desc(goalReminders.createdAt));
}

export async function createGoalReminder(data: typeof goalReminders.$inferInsert) {
  const result = await db.insert(goalReminders).values(data);
  return result;
}

export async function updateGoalReminder(id: number, data: Partial<typeof goalReminders.$inferInsert>) {
  const result = await db.update(goalReminders).set(data).where(eq(goalReminders.id, id));
  return result;
}

// 真题管理相关
export async function getRealExamQuestions(filters?: {
  subject?: string;
  grade?: string;
  difficulty?: string;
  sourceSchool?: string;
  examYear?: number;
}) {
  let query = db.select().from(realExamQuestions);
  
  const conditions = [];
  if (filters?.subject) conditions.push(eq(realExamQuestions.subject, filters.subject as any));
  if (filters?.grade) conditions.push(eq(realExamQuestions.grade, filters.grade as any));
  if (filters?.difficulty) conditions.push(eq(realExamQuestions.difficulty, filters.difficulty as any));
  if (filters?.sourceSchool) conditions.push(eq(realExamQuestions.sourceSchool, filters.sourceSchool));
  if (filters?.examYear) conditions.push(eq(realExamQuestions.examYear, filters.examYear));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(realExamQuestions.createdAt));
}

export async function getRealExamQuestionById(id: number) {
  const result = await db.select().from(realExamQuestions).where(eq(realExamQuestions.id, id)).limit(1);
  return result[0];
}

export async function createRealExamQuestion(data: typeof realExamQuestions.$inferInsert) {
  const result = await db.insert(realExamQuestions).values(data);
  return result;
}

export async function updateRealExamQuestion(id: number, data: Partial<typeof realExamQuestions.$inferInsert>) {
  const result = await db.update(realExamQuestions).set(data).where(eq(realExamQuestions.id, id));
  return result;
}

export async function deleteRealExamQuestion(id: number) {
  const result = await db.delete(realExamQuestions).where(eq(realExamQuestions.id, id));
  return result;
}

export async function batchDeleteRealExamQuestions(ids: number[]) {
  const result = await db.delete(realExamQuestions).where(inArray(realExamQuestions.id, ids));
  return result;
}

// 真题练习记录相关
export async function getRealExamPracticeRecordsByUserId(userId: number) {
  return await db.select().from(realExamPracticeRecords)
    .where(eq(realExamPracticeRecords.userId, userId))
    .orderBy(desc(realExamPracticeRecords.practiceDate));
}

export async function createRealExamPracticeRecord(data: typeof realExamPracticeRecords.$inferInsert) {
  const result = await db.insert(realExamPracticeRecords).values(data);
  return result;
}

// AI生成试卷相关
export async function getGeneratedExamPapersByUserId(userId: number) {
  return await db.select().from(generatedExamPapers)
    .where(eq(generatedExamPapers.userId, userId))
    .orderBy(desc(generatedExamPapers.createdAt));
}

export async function getGeneratedExamPaperById(id: number) {
  const result = await db.select().from(generatedExamPapers).where(eq(generatedExamPapers.id, id)).limit(1);
  return result[0];
}

export async function createGeneratedExamPaper(data: typeof generatedExamPapers.$inferInsert) {
  const result = await db.insert(generatedExamPapers).values(data);
  return result;
}

export async function updateGeneratedExamPaper(id: number, data: Partial<typeof generatedExamPapers.$inferInsert>) {
  const result = await db.update(generatedExamPapers).set(data).where(eq(generatedExamPapers.id, id));
  return result;
}

// AI真题相关
export async function getQuestions(filters?: {
  subject?: string;
  grade?: string;
  difficulty?: string;
  knowledgePointIds?: number[];
}) {
  let query = db.select().from(questions);
  
  const conditions = [];
  if (filters?.subject) conditions.push(eq(questions.subject, filters.subject as any));
  if (filters?.grade) conditions.push(eq(questions.grade, filters.grade as any));
  if (filters?.difficulty) conditions.push(eq(questions.difficulty, filters.difficulty as any));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(questions.createdAt));
}

export async function getQuestionById(id: number) {
  const result = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return result[0];
}

export async function createQuestion(data: typeof questions.$inferInsert) {
  const result = await db.insert(questions).values(data);
  return result;
}

export async function updateQuestion(id: number, data: Partial<typeof questions.$inferInsert>) {
  const result = await db.update(questions).set(data).where(eq(questions.id, id));
  return result;
}

export async function deleteQuestion(id: number) {
  const result = await db.delete(questions).where(eq(questions.id, id));
  return result;
}

// 定时任务相关
export async function getScheduledTasks() {
  return await db.select().from(scheduledTasks).orderBy(scheduledTasks.name);
}

export async function getScheduledTaskById(id: number) {
  const result = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, id)).limit(1);
  return result[0];
}

export async function createScheduledTask(data: typeof scheduledTasks.$inferInsert) {
  const result = await db.insert(scheduledTasks).values(data);
  return result;
}

export async function updateScheduledTask(id: number, data: Partial<typeof scheduledTasks.$inferInsert>) {
  const result = await db.update(scheduledTasks).set(data).where(eq(scheduledTasks.id, id));
  return result;
}

// 任务执行日志相关
export async function getTaskExecutionLogs(taskId: number) {
  return await db.select().from(taskExecutionLogs)
    .where(eq(taskExecutionLogs.taskId, taskId))
    .orderBy(desc(taskExecutionLogs.createdAt));
}

export async function createTaskExecutionLog(data: typeof taskExecutionLogs.$inferInsert) {
  const result = await db.insert(taskExecutionLogs).values(data);
  return result;
}

// 专项练习池相关
export async function getPracticePoolsByUserId(userId: number) {
  return await db.select().from(practicePools)
    .where(eq(practicePools.userId, userId))
    .orderBy(desc(practicePools.createdAt));
}

export async function getPracticePoolById(id: number) {
  const result = await db.select().from(practicePools).where(eq(practicePools.id, id)).limit(1);
  return result[0];
}

export async function createPracticePool(data: typeof practicePools.$inferInsert) {
  const result = await db.insert(practicePools).values(data);
  return result;
}

export async function updatePracticePool(id: number, data: Partial<typeof practicePools.$inferInsert>) {
  const result = await db.update(practicePools).set(data).where(eq(practicePools.id, id));
  return result;
}

export async function deletePracticePool(id: number) {
  const result = await db.delete(practicePools).where(eq(practicePools.id, id));
  return result;
}

export async function batchDeletePracticePools(ids: number[]) {
  const result = await db.delete(practicePools).where(inArray(practicePools.id, ids));
  return result;
}

// 收藏相关
export async function getFavoritesByUserId(userId: number, itemType?: string) {
  let query = db.select().from(favorites).where(eq(favorites.userId, userId));
  
  if (itemType) {
    query = query.where(and(
      eq(favorites.userId, userId),
      eq(favorites.itemType, itemType as any)
    )) as any;
  }
  
  return await query.orderBy(desc(favorites.createdAt));
}

export async function createFavorite(data: typeof favorites.$inferInsert) {
  const result = await db.insert(favorites).values(data);
  return result;
}

export async function deleteFavorite(userId: number, itemType: string, itemId: number) {
  const result = await db.delete(favorites)
    .where(and(
      eq(favorites.userId, userId),
      eq(favorites.itemType, itemType as any),
      eq(favorites.itemId, itemId)
    ));
  return result;
}

// 学习提醒相关
export async function getReviewRemindersByUserId(userId: number) {
  return await db.select().from(reviewReminders)
    .where(eq(reviewReminders.userId, userId))
    .orderBy(reviewReminders.scheduledDate);
}

export async function createReviewReminder(data: typeof reviewReminders.$inferInsert) {
  const result = await db.insert(reviewReminders).values(data);
  return result;
}

export async function updateReviewReminder(id: number, data: Partial<typeof reviewReminders.$inferInsert>) {
  const result = await db.update(reviewReminders).set(data).where(eq(reviewReminders.id, id));
  return result;
}

// 复习历史相关
export async function getReviewHistoryByReminderId(reminderId: number) {
  return await db.select().from(reviewHistory)
    .where(eq(reviewHistory.reminderId, reminderId))
    .orderBy(desc(reviewHistory.reviewedAt));
}

export async function createReviewHistory(data: typeof reviewHistory.$inferInsert) {
  const result = await db.insert(reviewHistory).values(data);
  return result;
}

// 错题复习记录相关
export async function getErrorReviewRecordsByUserId(userId: number) {
  return await db.select().from(errorReviewRecords)
    .where(eq(errorReviewRecords.userId, userId))
    .orderBy(desc(errorReviewRecords.lastReviewedAt));
}

export async function getErrorReviewRecordByUserAndQuestion(userId: number, errorQuestionId: number) {
  const result = await db.select().from(errorReviewRecords)
    .where(and(
      eq(errorReviewRecords.userId, userId),
      eq(errorReviewRecords.errorQuestionId, errorQuestionId)
    ))
    .limit(1);
  return result[0];
}

export async function createErrorReviewRecord(data: typeof errorReviewRecords.$inferInsert) {
  const result = await db.insert(errorReviewRecords).values(data);
  return result;
}

export async function updateErrorReviewRecord(id: number, data: Partial<typeof errorReviewRecords.$inferInsert>) {
  const result = await db.update(errorReviewRecords).set(data).where(eq(errorReviewRecords.id, id));
  return result;
}

// 学习路径相关
export async function getLearningPathsByUserId(userId: number) {
  return await db.select().from(learningPaths)
    .where(eq(learningPaths.userId, userId))
    .orderBy(desc(learningPaths.createdAt));
}

export async function getLearningPathById(id: number) {
  const result = await db.select().from(learningPaths).where(eq(learningPaths.id, id)).limit(1);
  return result[0];
}

export async function createLearningPath(data: typeof learningPaths.$inferInsert) {
  const result = await db.insert(learningPaths).values(data);
  return result;
}

export async function updateLearningPath(id: number, data: Partial<typeof learningPaths.$inferInsert>) {
  const result = await db.update(learningPaths).set(data).where(eq(learningPaths.id, id));
  return result;
}

// 学习路径进度相关
export async function getLearningPathProgressByUserAndPath(userId: number, pathId: number) {
  return await db.select().from(learningPathProgress)
    .where(and(
      eq(learningPathProgress.userId, userId),
      eq(learningPathProgress.pathId, pathId)
    ))
    .orderBy(learningPathProgress.nodeId);
}

export async function createLearningPathProgress(data: typeof learningPathProgress.$inferInsert) {
  const result = await db.insert(learningPathProgress).values(data);
  return result;
}

export async function updateLearningPathProgress(userId: number, pathId: number, nodeId: string, data: Partial<typeof learningPathProgress.$inferInsert>) {
  const result = await db.update(learningPathProgress)
    .set(data)
    .where(and(
      eq(learningPathProgress.userId, userId),
      eq(learningPathProgress.pathId, pathId),
      eq(learningPathProgress.nodeId, nodeId)
    ));
  return result;
}

// 考试日历相关
export async function getExamCalendarByUserId(userId: number) {
  return await db.select().from(exams)
    .where(eq(exams.userId, userId))
    .orderBy(exams.examDate);
}

export async function createExamCalendar(data: typeof exams.$inferInsert) {
  const result = await db.insert(exams).values(data);
  return result;
}

export async function updateExamCalendar(id: number, data: Partial<typeof exams.$inferInsert>) {
  const result = await db.update(exams).set(data).where(eq(exams.id, id));
  return result;
}

export async function deleteExamCalendar(id: number) {
  const result = await db.delete(exams).where(eq(exams.id, id));
  return result;
}

// 智能复习任务相关
export async function getSmartReviewTasksByUserAndExam(userId: number, examId: number) {
  return await db.select().from(studyPlans)
    .where(and(
      eq(studyPlans.userId, userId),
      eq(studyPlans.examId, examId)
    ))
    .orderBy(studyPlans.taskDate);
}

export async function createSmartReviewTask(data: typeof studyPlans.$inferInsert) {
  const result = await db.insert(studyPlans).values(data);
  return result;
}

export async function updateSmartReviewTask(id: number, data: Partial<typeof studyPlans.$inferInsert>) {
  const result = await db.update(studyPlans).set(data).where(eq(studyPlans.id, id));
  return result;
}

// 系统设置相关
export async function getSystemSettings() {
  return await db.select().from(systemSettings);
}

export async function getSystemSettingByKey(key: string) {
  const result = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, key)).limit(1);
  return result[0];
}

export async function createSystemSetting(data: typeof systemSettings.$inferInsert) {
  const result = await db.insert(systemSettings).values(data);
  return result;
}

export async function updateSystemSetting(key: string, value: string) {
  const result = await db.update(systemSettings)
    .set({ settingValue: value })
    .where(eq(systemSettings.settingKey, key));
  return result;
}

// 邮箱验证令牌相关
export async function getEmailVerificationTokenByToken(token: string) {
  const result = await db.select().from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.token, token))
    .limit(1);
  return result[0];
}

export async function createEmailVerificationToken(data: typeof emailVerificationTokens.$inferInsert) {
  const result = await db.insert(emailVerificationTokens).values(data);
  return result;
}

export async function updateEmailVerificationToken(id: number, data: Partial<typeof emailVerificationTokens.$inferInsert>) {
  const result = await db.update(emailVerificationTokens).set(data).where(eq(emailVerificationTokens.id, id));
  return result;
}

// 邮件模板相关
export async function getEmailTemplates() {
  return await db.select().from(emailTemplates).where(eq(emailTemplates.isActive, true));
}

export async function getEmailTemplateByType(type: string) {
  const result = await db.select().from(emailTemplates)
    .where(and(
      eq(emailTemplates.templateType, type),
      eq(emailTemplates.isActive, true)
    ))
    .limit(1);
  return result[0];
}

export async function createEmailTemplate(data: typeof emailTemplates.$inferInsert) {
  const result = await db.insert(emailTemplates).values(data);
  return result;
}

export async function updateEmailTemplate(id: number, data: Partial<typeof emailTemplates.$inferInsert>) {
  const result = await db.update(emailTemplates).set(data).where(eq(emailTemplates.id, id));
  return result;
}

// 用户提醒设置相关
export async function getUserReminderSettingsByUserId(userId: number) {
  const result = await db.select().from(userReminderSettings)
    .where(eq(userReminderSettings.userId, userId))
    .limit(1);
  return result[0];
}

export async function createUserReminderSettings(data: typeof userReminderSettings.$inferInsert) {
  const result = await db.insert(userReminderSettings).values(data);
  return result;
}

export async function updateUserReminderSettings(userId: number, data: Partial<typeof userReminderSettings.$inferInsert>) {
  const result = await db.update(userReminderSettings)
    .set(data)
    .where(eq(userReminderSettings.userId, userId));
  return result;
}

// AI建议历史相关
export async function getAiAdviceHistoryByUserId(userId: number) {
  return await db.select().from(aiAdviceHistory)
    .where(eq(aiAdviceHistory.userId, userId))
    .orderBy(desc(aiAdviceHistory.createdAt));
}

export async function createAiAdviceHistory(data: typeof aiAdviceHistory.$inferInsert) {
  const result = await db.insert(aiAdviceHistory).values(data);
  return result;
}

// 复习任务相关
export async function getReviewTasksByUserId(userId: number) {
  return await db.select().from(reviewTasks)
    .where(eq(reviewTasks.userId, userId))
    .orderBy(desc(reviewTasks.createdAt));
}

export async function createReviewTask(data: typeof reviewTasks.$inferInsert) {
  const result = await db.insert(reviewTasks).values(data);
  return result;
}

export async function updateReviewTask(id: number, data: Partial<typeof reviewTasks.$inferInsert>) {
  const result = await db.update(reviewTasks).set(data).where(eq(reviewTasks.id, id));
  return result;
}

// 复习任务提醒相关
export async function getReviewTaskRemindersByTaskId(taskId: number) {
  return await db.select().from(reviewTaskReminders)
    .where(eq(reviewTaskReminders.taskId, taskId))
    .orderBy(reviewTaskReminders.reminderTime);
}

export async function createReviewTaskReminder(data: typeof reviewTaskReminders.$inferInsert) {
  const result = await db.insert(reviewTaskReminders).values(data);
  return result;
}

export async function updateReviewTaskReminder(id: number, data: Partial<typeof reviewTaskReminders.$inferInsert>) {
  const result = await db.update(reviewTaskReminders).set(data).where(eq(reviewTaskReminders.id, id));
  return result;
}

// 套餐相关
export async function getPackages() {
  return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
}

export async function getPackageById(id: number) {
  const result = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return result[0];
}

export async function createPackage(data: typeof subscriptionPlans.$inferInsert) {
  const result = await db.insert(subscriptionPlans).values(data);
  return result;
}

export async function updatePackage(id: number, data: Partial<typeof subscriptionPlans.$inferInsert>) {
  const result = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id));
  return result;
}

// 订单相关
export async function getOrdersByUserId(userId: number) {
  return await db.select().from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderByOrderNumber(orderNumber: string) {
  const result = await db.select().from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  return result[0];
}

export async function createOrder(data: typeof orders.$inferInsert) {
  const result = await db.insert(orders).values(data);
  return result;
}

export async function updateOrder(id: number, data: Partial<typeof orders.$inferInsert>) {
  const result = await db.update(orders).set(data).where(eq(orders.id, id));
  return result;
}

// 用户订阅相关
export async function getUserSubscriptionsByUserId(userId: number) {
  return await db.select().from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .orderBy(desc(userSubscriptions.createdAt));
}

export async function getActiveUserSubscription(userId: number) {
  const result = await db.select().from(userSubscriptions)
    .where(and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.isActive, true)
    ))
    .orderBy(desc(userSubscriptions.endDate))
    .limit(1);
  return result[0];
}

export async function createUserSubscription(data: typeof userSubscriptions.$inferInsert) {
  const result = await db.insert(userSubscriptions).values(data);
  return result;
}

export async function updateUserSubscription(id: number, data: Partial<typeof userSubscriptions.$inferInsert>) {
  const result = await db.update(userSubscriptions).set(data).where(eq(userSubscriptions.id, id));
  return result;
}

// 支付配置相关
export async function getPaymentConfigs() {
  return await db.select().from(paymentConfigs).where(eq(paymentConfigs.isActive, true));
}

export async function getPaymentConfigByProvider(provider: string) {
  const result = await db.select().from(paymentConfigs)
    .where(eq(paymentConfigs.provider, provider as any))
    .limit(1);
  return result[0];
}

export async function createPaymentConfig(data: typeof paymentConfigs.$inferInsert) {
  const result = await db.insert(paymentConfigs).values(data);
  return result;
}

export async function updatePaymentConfig(id: number, data: Partial<typeof paymentConfigs.$inferInsert>) {
  const result = await db.update(paymentConfigs).set(data).where(eq(paymentConfigs.id, id));
  return result;
}

// 账号凭证相关
export async function getAccountCredentialByUserId(userId: number) {
  const result = await db.select().from(accountCredentials)
    .where(eq(accountCredentials.userId, userId))
    .limit(1);
  return result[0];
}

export async function getAccountCredentialByUsername(username: string) {
  const result = await db.select().from(accountCredentials)
    .where(eq(accountCredentials.username, username))
    .limit(1);
  return result[0];
}

export async function createAccountCredential(data: typeof accountCredentials.$inferInsert) {
  const result = await db.insert(accountCredentials).values(data);
  return result;
}

export async function updateAccountCredential(userId: number, data: Partial<typeof accountCredentials.$inferInsert>) {
  const result = await db.update(accountCredentials)
    .set(data)
    .where(eq(accountCredentials.userId, userId));
  return result;
}

// 权限记录相关
// TODO: permissionRecords表不存在，需要创建或移除这些函数
// export async function getPermissionRecordsByUserId(userId: number) {
//   return await db.select().from(permissionRecords)
//     .where(eq(permissionRecords.userId, userId))
//     .orderBy(desc(permissionRecords.grantedAt));
// }

// export async function createPermissionRecord(data: typeof permissionRecords.$inferInsert) {
//   const result = await db.insert(permissionRecords).values(data);
//   return result;
// }

// 推送配置相关
export async function getPushConfigs() {
  return await db.select().from(pushConfigs).where(eq(pushConfigs.isActive, true));
}

export async function getPushConfigById(id: number) {
  const result = await db.select().from(pushConfigs).where(eq(pushConfigs.id, id)).limit(1);
  return result[0];
}

export async function createPushConfig(data: typeof pushConfigs.$inferInsert) {
  const result = await db.insert(pushConfigs).values(data);
  return result;
}

export async function updatePushConfig(id: number, data: Partial<typeof pushConfigs.$inferInsert>) {
  const result = await db.update(pushConfigs).set(data).where(eq(pushConfigs.id, id));
  return result;
}

// 推送记录相关
export async function getPushRecordsByConfigId(configId: number) {
  return await db.select().from(pushRecords)
    .where(eq(pushRecords.configId, configId))
    .orderBy(desc(pushRecords.createdAt));
}

export async function createPushRecord(data: typeof pushRecords.$inferInsert) {
  const result = await db.insert(pushRecords).values(data);
  return result;
}

export async function updatePushRecord(id: number, data: Partial<typeof pushRecords.$inferInsert>) {
  const result = await db.update(pushRecords).set(data).where(eq(pushRecords.id, id));
  return result;
}

// 用户推送接收相关
export async function getUserPushReceiptsByUserId(userId: number) {
  return await db.select().from(userPushReceipts)
    .where(eq(userPushReceipts.userId, userId))
    .orderBy(desc(userPushReceipts.createdAt));
}

export async function createUserPushReceipt(data: typeof userPushReceipts.$inferInsert) {
  const result = await db.insert(userPushReceipts).values(data);
  return result;
}

export async function updateUserPushReceipt(id: number, data: Partial<typeof userPushReceipts.$inferInsert>) {
  const result = await db.update(userPushReceipts).set(data).where(eq(userPushReceipts.id, id));
  return result;
}

// 题目审核记录相关
export async function getQuestionReviewsByQuestionId(questionId: number) {
  return await db.select().from(questionReviews)
    .where(eq(questionReviews.questionId, questionId))
    .orderBy(desc(questionReviews.createdAt));
}

export async function createQuestionReview(data: typeof questionReviews.$inferInsert) {
  const result = await db.insert(questionReviews).values(data);
  return result;
}

// 图表标注相关
export async function getAnnotationsByItem(userId: number, itemType: string, itemId: number) {
  return await db.select().from(annotations)
    .where(and(
      eq(annotations.userId, userId),
      eq(annotations.itemType, itemType as any),
      eq(annotations.itemId, itemId)
    ))
    .orderBy(desc(annotations.createdAt));
}

export async function getAnnotationsByImageUrl(userId: number, imageUrl: string) {
  return await db.select().from(annotations)
    .where(and(
      eq(annotations.userId, userId),
      eq(annotations.imageUrl, imageUrl)
    ))
    .orderBy(desc(annotations.createdAt));
}

export async function createAnnotation(data: typeof annotations.$inferInsert) {
  const result = await db.insert(annotations).values(data);
  return result;
}

export async function updateAnnotation(id: number, data: Partial<typeof annotations.$inferInsert>) {
  const result = await db.update(annotations).set(data).where(eq(annotations.id, id));
  return result;
}

export async function deleteAnnotation(id: number) {
  const result = await db.delete(annotations).where(eq(annotations.id, id));
  return result;
}

export async function batchDeleteAnnotations(ids: number[]) {
  const result = await db.delete(annotations).where(inArray(annotations.id, ids));
  return result;
}

// 获取数据库实例
export function getDb() {
  return db;
}

// 创建或更新用户
export async function upsertUser(userData: typeof users.$inferInsert) {
  const existing = await getUserByOpenId(userData.openId);
  
  if (existing) {
    await updateUser(existing.id, userData);
    return await getUserById(existing.id);
  } else {
    const result = await createUser(userData);
    return await getUserByOpenId(userData.openId);
  }
}

// 根据科目和年级获取错题
export async function getErrorQuestionsBySubjectAndGrade(userId: number, subject: string, grade: string) {
  const result = await db.select().from(errorQuestions)
    .where(and(
      eq(errorQuestions.userId, userId),
      eq(errorQuestions.subject, subject as any),
      eq(errorQuestions.grade, grade as any)
    ));
  return result;
}

// 根据ID获取知识点
export async function getKnowledgePointById(id: number) {
  const result = await db.select().from(knowledgePoints)
    .where(eq(knowledgePoints.id, id))
    .limit(1);
  return result[0] || null;
}

// 根据IDs批量获取知识点
export async function getKnowledgePointsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const result = await db.select().from(knowledgePoints)
    .where(inArray(knowledgePoints.id, ids));
  return result;
}

// 根据科目和年级获取视频资源
export async function getVideosBySubjectAndGrade(subject: string, grade: string) {
  const result = await db.select().from(videoResources)
    .where(and(
      eq(videoResources.subject, subject as any),
      eq(videoResources.grade, grade as any)
    ));
  return result;
}

// 创建题库项目
export async function createQuestionBankItem(data: typeof questionBank.$inferInsert) {
  const result = await db.insert(questionBank).values(data);
  return result;
}

// 创建或更新学习进度
export async function upsertLearningProgress(data: typeof learningProgress.$inferInsert) {
  const existing = await db.select().from(learningProgress)
    .where(and(
      eq(learningProgress.userId, data.userId),
      eq(learningProgress.knowledgePointId, data.knowledgePointId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(learningProgress)
      .set(data)
      .where(eq(learningProgress.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(learningProgress).values(data);
    return result[0]?.insertId;
  }
}

// 获取用户的学习进度
export async function getLearningProgressByUser(userId: number) {
  const result = await db.select().from(learningProgress)
    .where(eq(learningProgress.userId, userId));
  return result;
}

// 根据知识点获取学习进度
export async function getLearningProgressByKnowledgePoint(userId: number, knowledgePointId: number) {
  const result = await db.select().from(learningProgress)
    .where(and(
      eq(learningProgress.userId, userId),
      eq(learningProgress.knowledgePointId, knowledgePointId)
    ))
    .limit(1);
  return result[0] || null;
}

// 获取用户的复习计划
export async function getReviewPlansByUser(userId: number) {
  const result = await db.select().from(reviewPlans)
    .where(eq(reviewPlans.userId, userId));
  return result;
}

// 获取待复习的计划
export async function getPendingReviewPlans(userId: number) {
  const result = await db.select().from(reviewPlans)
    .where(and(
      eq(reviewPlans.userId, userId),
      eq(reviewPlans.status, 'pending')
    ));
  return result;
}
