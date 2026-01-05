import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  errorQuestions, 
  InsertErrorQuestion,
  knowledgePoints,
  InsertKnowledgePoint,
  practiceRecords,
  InsertPracticeRecord,
  learningProgress,
  InsertLearningProgress,
  questionBank,
  InsertQuestionBank,
  videoResources,
  InsertVideoResource,
  reviewPlans,
  InsertReviewPlan
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== 用户相关 ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "school"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.grade !== undefined) {
      values.grade = user.grade;
      updateSet.grade = user.grade;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== 错题相关 ====================

export async function createErrorQuestion(question: InsertErrorQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(errorQuestions).values(question);
  return result;
}

export async function getErrorQuestionsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, userId))
    .orderBy(desc(errorQuestions.createdAt))
    .limit(limit);
}

export async function getErrorQuestionById(questionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(errorQuestions)
    .where(eq(errorQuestions.id, questionId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateErrorQuestion(questionId: number, updates: Partial<InsertErrorQuestion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .update(errorQuestions)
    .set(updates)
    .where(eq(errorQuestions.id, questionId));
}

export async function getErrorQuestionsBySubjectAndGrade(
  userId: number, 
  subject: string, 
  grade: string
) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.subject, subject as any),
        eq(errorQuestions.grade, grade as any)
      )
    )
    .orderBy(desc(errorQuestions.createdAt));
}

// ==================== 知识点相关 ====================

export async function createKnowledgePoint(kp: InsertKnowledgePoint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(knowledgePoints).values(kp);
}

export async function getKnowledgePointsBySubjectAndGrade(subject: string, grade: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(knowledgePoints)
    .where(
      and(
        eq(knowledgePoints.subject, subject as any),
        eq(knowledgePoints.grade, grade as any)
      )
    );
}

export async function getKnowledgePointById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getKnowledgePointsByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  
  return await db
    .select()
    .from(knowledgePoints)
    .where(inArray(knowledgePoints.id, ids));
}

// ==================== 练习记录相关 ====================

export async function createPracticeRecord(record: InsertPracticeRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(practiceRecords).values(record);
}

export async function getPracticeRecordsByUserId(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(practiceRecords)
    .where(eq(practiceRecords.userId, userId))
    .orderBy(desc(practiceRecords.createdAt))
    .limit(limit);
}

export async function getPracticeRecordsByKnowledgePoint(userId: number, knowledgePointId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(practiceRecords)
    .where(eq(practiceRecords.userId, userId))
    .orderBy(desc(practiceRecords.createdAt));
}

// ==================== 学习进度相关 ====================

export async function upsertLearningProgress(progress: InsertLearningProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .insert(learningProgress)
    .values(progress)
    .onDuplicateKeyUpdate({
      set: {
        masteryLevel: progress.masteryLevel,
        practiceCount: progress.practiceCount,
        correctCount: progress.correctCount,
        errorCount: progress.errorCount,
        status: progress.status,
        lastPracticeAt: progress.lastPracticeAt,
        nextReviewAt: progress.nextReviewAt,
        reviewInterval: progress.reviewInterval,
        updatedAt: new Date(),
      }
    });
}

export async function getLearningProgressByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(learningProgress)
    .where(eq(learningProgress.userId, userId));
}

export async function getLearningProgressByKnowledgePoint(userId: number, knowledgePointId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(learningProgress)
    .where(
      and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.knowledgePointId, knowledgePointId)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== 题库相关 ====================

export async function createQuestionBankItem(question: InsertQuestionBank) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(questionBank).values(question);
}

export async function getQuestionsByKnowledgePoints(
  knowledgePointIds: number[], 
  difficulty: string,
  limit = 10
) {
  const db = await getDb();
  if (!db || knowledgePointIds.length === 0) return [];
  
  return await db
    .select()
    .from(questionBank)
    .where(eq(questionBank.difficulty, difficulty as any))
    .limit(limit);
}

export async function getQuestionById(questionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(questionBank)
    .where(eq(questionBank.id, questionId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== 视频资源相关 ====================

export async function createVideoResource(video: InsertVideoResource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(videoResources).values(video);
}

export async function getVideosByKnowledgePoints(knowledgePointIds: number[], limit = 10) {
  const db = await getDb();
  if (!db || knowledgePointIds.length === 0) return [];
  
  return await db
    .select()
    .from(videoResources)
    .orderBy(desc(videoResources.relevanceScore))
    .limit(limit);
}

export async function getVideosBySubjectAndGrade(subject: string, grade: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(videoResources)
    .where(
      and(
        eq(videoResources.subject, subject as any),
        eq(videoResources.grade, grade as any)
      )
    )
    .orderBy(desc(videoResources.qualityScore))
    .limit(limit);
}

// ==================== 复习计划相关 ====================

export async function createReviewPlan(plan: InsertReviewPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(reviewPlans).values(plan);
}

export async function getReviewPlansByUser(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(reviewPlans.userId, userId)];
  if (status) {
    conditions.push(eq(reviewPlans.status, status as any));
  }
  
  return await db
    .select()
    .from(reviewPlans)
    .where(and(...conditions))
    .orderBy(reviewPlans.scheduledAt);
}

export async function updateReviewPlan(planId: number, updates: Partial<InsertReviewPlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .update(reviewPlans)
    .set(updates)
    .where(eq(reviewPlans.id, planId));
}

export async function getPendingReviewPlans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(reviewPlans)
    .where(
      and(
        eq(reviewPlans.userId, userId),
        eq(reviewPlans.status, "pending"),
        sql`${reviewPlans.scheduledAt} <= NOW()`
      )
    )
    .orderBy(desc(reviewPlans.priority));
}
