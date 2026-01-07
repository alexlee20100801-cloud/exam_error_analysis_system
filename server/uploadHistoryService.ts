import { db } from "./db";
import { uploadHistory, uploadSessions, uploadSessionItems } from "../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

/**
 * 创建上传历史记录
 */
export async function createUploadHistory(params: {
  userId: number;
  sessionId?: number;
  uploadType: 'single' | 'batch';
  totalCount: number;
  successCount: number;
  failedCount: number;
  averageConfidence?: number;
  subjectDistribution?: Record<string, number>;
  gradeDistribution?: Record<string, number>;
  processingDuration?: number;
}) {
  const [history] = await db.insert(uploadHistory).values({
    userId: params.userId,
    sessionId: params.sessionId,
    uploadType: params.uploadType,
    totalCount: params.totalCount,
    successCount: params.successCount,
    failedCount: params.failedCount,
    averageConfidence: params.averageConfidence?.toString(),
    subjectDistribution: params.subjectDistribution ? JSON.stringify(params.subjectDistribution) : null,
    gradeDistribution: params.gradeDistribution ? JSON.stringify(params.gradeDistribution) : null,
    processingDuration: params.processingDuration,
  }).$returningId();

  return history;
}

/**
 * 从会话生成上传历史记录
 */
export async function createHistoryFromSession(sessionId: number, userId: number) {
  // 获取会话信息
  const session = await db.query.uploadSessions.findFirst({
    where: and(
      eq(uploadSessions.id, sessionId),
      eq(uploadSessions.userId, userId)
    ),
  });

  if (!session) throw new Error('Session not found');

  // 获取所有上传项
  const items = await db.query.uploadSessionItems.findMany({
    where: eq(uploadSessionItems.sessionId, sessionId),
  });

  // 统计信息
  const totalCount = items.length;
  const successCount = items.filter(item => item.status === 'processed').length;
  const failedCount = items.filter(item => item.status === 'error').length;

  // 计算平均置信度
  const confidenceValues = items
    .filter(item => item.ocrConfidence !== null)
    .map(item => item.ocrConfidence!);
  const averageConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
    : undefined;

  // 科目分布统计
  const subjectDistribution: Record<string, number> = {};
  items.forEach(item => {
    const subject = item.subject || session.commonSubject;
    if (subject) {
      subjectDistribution[subject] = (subjectDistribution[subject] || 0) + 1;
    }
  });

  // 年级分布统计
  const gradeDistribution: Record<string, number> = {};
  items.forEach(item => {
    const grade = item.grade || session.commonGrade;
    if (grade) {
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }
  });

  // 计算处理时长(秒)
  const processingDuration = session.completedAt && session.createdAt
    ? Math.floor((new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()) / 1000)
    : undefined;

  return await createUploadHistory({
    userId,
    sessionId,
    uploadType: 'batch',
    totalCount,
    successCount,
    failedCount,
    averageConfidence,
    subjectDistribution: Object.keys(subjectDistribution).length > 0 ? subjectDistribution : undefined,
    gradeDistribution: Object.keys(gradeDistribution).length > 0 ? gradeDistribution : undefined,
    processingDuration,
  });
}

/**
 * 获取用户的上传历史列表
 */
export async function getUserUploadHistory(
  userId: number,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
) {
  const conditions = [eq(uploadHistory.userId, userId)];

  if (options?.startDate) {
    conditions.push(gte(uploadHistory.createdAt, options.startDate));
  }

  if (options?.endDate) {
    conditions.push(lte(uploadHistory.createdAt, options.endDate));
  }

  const history = await db.query.uploadHistory.findMany({
    where: and(...conditions),
    orderBy: [desc(uploadHistory.createdAt)],
    limit: options?.limit || 50,
  });

  // 解析JSON字段
  return history.map(record => ({
    ...record,
    subjectDistribution: record.subjectDistribution ? JSON.parse(record.subjectDistribution) : null,
    gradeDistribution: record.gradeDistribution ? JSON.parse(record.gradeDistribution) : null,
    averageConfidence: record.averageConfidence ? parseFloat(record.averageConfidence) : null,
  }));
}

/**
 * 获取用户的上传统计摘要
 */
export async function getUserUploadStats(userId: number, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await db.query.uploadHistory.findMany({
    where: and(
      eq(uploadHistory.userId, userId),
      gte(uploadHistory.createdAt, startDate.toISOString())
    ),
  });

  const totalUploads = history.length;
  const totalQuestions = history.reduce((sum: number, record) => sum + (record.totalCount || 0), 0);
  const totalSuccess = history.reduce((sum: number, record) => sum + (record.successCount || 0), 0);
  const totalFailed = history.reduce((sum: number, record) => sum + (record.failedCount || 0), 0);

  // 计算平均识别准确率
  const overallAccuracy = totalQuestions > 0 ? (totalSuccess / totalQuestions) * 100 : 0;

  // 最近一次上传
  const latestUpload = history.length > 0 ? history[0] : null;

  return {
    totalUploads,
    totalQuestions,
    totalSuccess,
    totalFailed,
    overallAccuracy: Math.round(overallAccuracy * 100) / 100,
    latestUpload,
  };
}
