import { db } from "./db";
import { uploadSessions, uploadSessionItems, questionAnalysisCache, errorQuestions } from "../drizzle/schema";
import { createHistoryFromSession } from "./uploadHistoryService";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

/**
 * 生成题目内容的SHA256哈希值
 */
export function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex');
}

/**
 * 创建批量上传会话
 */
export async function createUploadSession(userId: number) {
  const sessionKey = crypto.randomBytes(16).toString('hex');
  
  const [session] = await db.insert(uploadSessions).values({
    userId,
    sessionKey,
    status: 'pending',
    totalCount: 0,
    processedCount: 0,
  }).$returningId();

  return { id: session.id, sessionKey };
}

/**
 * 添加上传项到会话
 */
export async function addUploadSessionItem(params: {
  sessionId: number;
  imageUrl: string;
  imageKey?: string;
  ocrContent?: string;
  ocrConfidence?: number;
}) {
  const [item] = await db.insert(uploadSessionItems).values({
    sessionId: params.sessionId,
    imageUrl: params.imageUrl,
    imageKey: params.imageKey,
    ocrContent: params.ocrContent,
    ocrConfidence: params.ocrConfidence,
    status: 'pending',
  }).$returningId();

  // 更新会话的总数
  await db.update(uploadSessions)
    .set({ 
      totalCount: db.$count(uploadSessionItems, eq(uploadSessionItems.sessionId, params.sessionId))
    })
    .where(eq(uploadSessions.id, params.sessionId));

  return item;
}

/**
 * 获取会话详情及其所有项
 */
export async function getUploadSession(sessionId: number, userId: number) {
  const session = await db.query.uploadSessions.findFirst({
    where: and(
      eq(uploadSessions.id, sessionId),
      eq(uploadSessions.userId, userId)
    ),
  });

  if (!session) return null;

  const items = await db.query.uploadSessionItems.findMany({
    where: eq(uploadSessionItems.sessionId, sessionId),
    orderBy: [uploadSessionItems.createdAt],
  });

  return { session, items };
}

/**
 * 更新会话的公共属性(批量编辑)
 */
export async function updateSessionCommonFields(
  sessionId: number,
  userId: number,
  fields: {
    commonSubject?: string;
    commonGrade?: string;
    commonDifficulty?: string;
    commonSemester?: string;
  }
) {
  await db.update(uploadSessions)
    .set({
      ...fields,
      status: 'editing',
      updatedAt: new Date().toISOString(),
    })
    .where(and(
      eq(uploadSessions.id, sessionId),
      eq(uploadSessions.userId, userId)
    ));
}

/**
 * 更新单个上传项
 */
export async function updateUploadSessionItem(
  itemId: number,
  fields: {
    title?: string;
    subject?: string;
    grade?: string;
    difficulty?: string;
    semester?: string;
    userNotes?: string;
  }
) {
  await db.update(uploadSessionItems)
    .set(fields)
    .where(eq(uploadSessionItems.id, itemId));
}

/**
 * 确认并保存会话中的所有错题
 */
export async function confirmUploadSession(sessionId: number, userId: number) {
  const sessionData = await getUploadSession(sessionId, userId);
  if (!sessionData) throw new Error('Session not found');

  const { session, items } = sessionData;
  const createdQuestions: number[] = [];

  for (const item of items) {
    if (item.status === 'skipped') continue;

    try {
      // 合并公共属性和单项属性
      const subject = item.subject || session.commonSubject;
      const grade = item.grade || session.commonGrade;
      const difficulty = item.difficulty || session.commonDifficulty;
      const semester = item.semester || session.commonSemester;

      if (!subject || !grade) {
        throw new Error('Subject and grade are required');
      }

      // 检查AI缓存
      const contentHash = item.ocrContent ? generateContentHash(item.ocrContent) : null;
      let cachedAnalysis = null;
      
      if (contentHash && subject && grade) {
        cachedAnalysis = await db.query.questionAnalysisCache.findFirst({
          where: and(
            eq(questionAnalysisCache.contentHash, contentHash),
            eq(questionAnalysisCache.subject, subject as any),
            eq(questionAnalysisCache.grade, grade as any)
          ),
        });

        if (cachedAnalysis) {
          // 更新缓存命中次数
          await db.update(questionAnalysisCache)
            .set({
              hitCount: (cachedAnalysis.hitCount || 0) + 1,
              lastHitAt: new Date().toISOString(),
            })
            .where(eq(questionAnalysisCache.id, cachedAnalysis.id));
        }
      }

      // 创建错题记录
      const [question] = await db.insert(errorQuestions).values({
        userId,
        title: item.title || '未命名错题',
        content: item.ocrContent || '',
        imageUrl: item.imageUrl,
        imageKey: item.imageKey,
        subject: subject as any,
        grade: grade as any,
        schoolLevel: (grade as string).startsWith('junior') ? 'junior' : 'senior',
        difficulty: difficulty as any,
        semester: semester as any,
        userNotes: item.userNotes,
        // 如果有缓存,直接使用缓存的分析结果
        isAnalyzed: cachedAnalysis ? 1 : 0,
        errorAnalysis: cachedAnalysis?.errorAnalysis,
        correctAnswer: cachedAnalysis?.correctAnswer,
        detailedExplanation: cachedAnalysis?.detailedExplanation,
        detailedAnalysis: cachedAnalysis?.detailedAnalysis,
        knowledgePointIds: cachedAnalysis?.knowledgePointIds as any,
      }).$returningId();

      createdQuestions.push(question.id);

      // 更新项状态
      await db.update(uploadSessionItems)
        .set({ status: 'processed' })
        .where(eq(uploadSessionItems.id, item.id));

    } catch (error) {
      // 标记错误项
      await db.update(uploadSessionItems)
        .set({ 
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(uploadSessionItems.id, item.id));
    }
  }

  // 更新会话状态
  await db.update(uploadSessions)
    .set({
      status: 'completed',
      processedCount: createdQuestions.length,
      completedAt: new Date().toISOString(),
    })
    .where(eq(uploadSessions.id, sessionId));

  // 自动创建上传历史记录
  try {
    await createHistoryFromSession(sessionId, userId);
  } catch (error) {
    console.error('Failed to create upload history:', error);
  }

  return { createdQuestions, totalProcessed: createdQuestions.length };
}

/**
 * 取消上传会话
 */
export async function cancelUploadSession(sessionId: number, userId: number) {
  await db.update(uploadSessions)
    .set({ status: 'cancelled' })
    .where(and(
      eq(uploadSessions.id, sessionId),
      eq(uploadSessions.userId, userId)
    ));
}

/**
 * 查询AI分析缓存
 */
export async function findAnalysisCache(
  contentHash: string,
  subject: string,
  grade: string
) {
  return await db.query.questionAnalysisCache.findFirst({
    where: and(
      eq(questionAnalysisCache.contentHash, contentHash),
      eq(questionAnalysisCache.subject, subject as any),
      eq(questionAnalysisCache.grade, grade as any)
    ),
  });
}

/**
 * 保存AI分析结果到缓存
 */
export async function saveAnalysisCache(params: {
  contentHash: string;
  subject: string;
  grade: string;
  errorAnalysis?: string;
  correctAnswer?: string;
  detailedExplanation?: string;
  detailedAnalysis?: string;
  knowledgePointIds?: any;
  difficulty?: string;
  analysisVersion?: string;
}) {
  const [cache] = await db.insert(questionAnalysisCache).values({
    contentHash: params.contentHash,
    subject: params.subject as any,
    grade: params.grade as any,
    errorAnalysis: params.errorAnalysis,
    correctAnswer: params.correctAnswer,
    detailedExplanation: params.detailedExplanation,
    detailedAnalysis: params.detailedAnalysis,
    knowledgePointIds: params.knowledgePointIds,
    difficulty: params.difficulty as any,
    analysisVersion: params.analysisVersion || 'v1',
    hitCount: 0,
  }).$returningId();

  return cache;
}

/**
 * 获取用户的最近上传会话列表
 */
export async function getUserUploadSessions(userId: number, limit = 10) {
  return await db.query.uploadSessions.findMany({
    where: eq(uploadSessions.userId, userId),
    orderBy: [desc(uploadSessions.createdAt)],
    limit,
  });
}
