import { getDb } from '../db';
import { practicePools, errorQuestions, questions, learningProgress } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generatePracticeQuestions } from '../practiceGenerationService';

/**
 * 错题转练习题服务
 * 将学生的错题自动转化为针对性练习题
 */

/**
 * 为错题生成专项练习题
 * @param userId 用户ID
 * @param errorQuestionId 错题ID
 * @param count 生成题目数量（默认3道）
 */
export async function generatePracticeFromError(
  userId: string,
  errorQuestionId: number,
  count: number = 3
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // 1. 获取错题信息
  const errorQuestion = await db
    .select()
    .from(errorQuestions)
    .where(eq(errorQuestions.id, errorQuestionId))
    .limit(1);

  if (errorQuestion.length === 0) {
    throw new Error('Error question not found');
  }

  const error = errorQuestion[0];

  // 2. 获取该知识点的掌握度，用于调整难度
  let masteryLevel = 0.5; // 默认中等掌握度
  if (error.knowledgePointIds && error.knowledgePointIds.length > 0) {
    const progress = await db
      .select()
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.knowledgePointId, error.knowledgePointIds[0])
        )
      )
      .limit(1);

    if (progress.length > 0) {
      masteryLevel = progress[0].masteryLevel;
    }
  }

  // 3. 根据掌握度智能调整难度
  let targetDifficulty: 'easy' | 'medium' | 'hard';
  if (masteryLevel < 0.3) {
    targetDifficulty = 'easy'; // 掌握度低，生成简单题
  } else if (masteryLevel < 0.7) {
    targetDifficulty = 'medium'; // 掌握度中等，生成中等难度题
  } else {
    targetDifficulty = 'hard'; // 掌握度高，生成困难题
  }

  // 4. 使用AI生成相似题目
  const result = await generatePracticeQuestions(
    [], // 知识点留空
    error.subject,
    error.grade,
    targetDifficulty,
    count
  );

  if (!result.success || !result.questions) {
    throw new Error('Failed to generate practice questions');
  }

  // 5. 保存生成的题目到questions表
  const practiceQuestionIds: number[] = [];
  for (const q of result.questions) {
    const insertResult = await db.insert(questions).values({
      title: q.title,
      content: q.content,
      subject: error.subject,
      grade: error.grade,
      difficulty: q.difficulty,
      questionType: 'essay',
      correctAnswer: q.answer,
      explanation: q.explanation,
      knowledgePoints: [],
      isPublished: true,
    });
    practiceQuestionIds.push(insertResult[0].insertId);
  }

  // 6. 创建专项练习池记录
  const practicePoolRecords = practiceQuestionIds.map((questionId) => ({
    userId,
    sourceErrorQuestionId: errorQuestionId,
    practiceQuestionId: questionId,
    knowledgePointId: error.knowledgePointIds?.[0] || null,
    difficulty: targetDifficulty,
    status: 'pending' as const,
  }));

  await db.insert(practicePools).values(practicePoolRecords);

  return {
    success: true,
    generatedCount: practiceQuestionIds.length,
    difficulty: targetDifficulty,
    masteryLevel,
    practiceQuestionIds,
  };
}

/**
 * 获取用户的专项练习池
 * @param userId 用户ID
 * @param status 状态筛选（可选）
 */
export async function getUserPracticePool(
  userId: string,
  status?: 'pending' | 'completed' | 'skipped'
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const baseQuery = db
    .select({
      pool: practicePools,
      question: questions,
      errorQuestion: errorQuestions,
    })
    .from(practicePools)
    .leftJoin(questions, eq(practicePools.practiceQuestionId, questions.id))
    .leftJoin(errorQuestions, eq(practicePools.sourceErrorQuestionId, errorQuestions.id));

  let query;
  if (status) {
    query = baseQuery.where(
      and(
        eq(practicePools.userId, userId),
        sql`${practicePools.status} = ${status}`
      )
    );
  } else {
    query = baseQuery.where(eq(practicePools.userId, userId));
  }

  const results = await query.orderBy(desc(practicePools.createdAt));

  return results;
}

/**
 * 获取单个错题的专项练习题
 * @param userId 用户ID
 * @param errorQuestionId 错题ID
 */
export async function getPracticeByErrorQuestion(
  userId: string,
  errorQuestionId: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const results = await db
    .select({
      pool: practicePools,
      question: questions,
    })
    .from(practicePools)
    .leftJoin(questions, eq(practicePools.practiceQuestionId, questions.id))
    .where(
      and(
        eq(practicePools.userId, userId),
        eq(practicePools.sourceErrorQuestionId, errorQuestionId)
      )
    )
    .orderBy(desc(practicePools.createdAt));

  return results;
}

/**
 * 完成专项练习题
 * @param userId 用户ID
 * @param practicePoolId 练习池ID
 * @param score 得分
 */
export async function completePractice(
  userId: string,
  practicePoolId: number,
  score: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // 1. 更新练习池状态
  await db
    .update(practicePools)
    .set({
      status: 'completed',
      score,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(practicePools.id, practicePoolId),
        eq(practicePools.userId, userId)
      )
    );

  // 2. 获取练习池信息
  const pool = await db
    .select()
    .from(practicePools)
    .where(eq(practicePools.id, practicePoolId))
    .limit(1);

  if (pool.length === 0) {
    throw new Error('Practice pool not found');
  }

  // 3. 如果有关联的知识点，更新掌握度
  if (pool[0].knowledgePointId) {
    const progress = await db
      .select()
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.knowledgePointId, pool[0].knowledgePointId)
        )
      )
      .limit(1);

    if (progress.length > 0 && progress[0]) {
      // 根据得分更新掌握度
      const currentMastery = progress[0].masteryLevel;
      const scoreRate = score / 100; // 假设满分100
      const newMastery = Math.min(1, currentMastery * 0.7 + scoreRate * 0.3); // 加权平均
      const currentPracticeCount = progress[0].practiceCount || 0;

      await db
        .update(learningProgress)
        .set({
          masteryLevel: newMastery,
          practiceCount: currentPracticeCount + 1,
          lastPracticeAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(learningProgress.id, progress[0].id));
    }
  }

  return {
    success: true,
    score,
    message: 'Practice completed successfully',
  };
}

/**
 * 批量为用户的错题生成专项练习
 * @param userId 用户ID
 * @param limit 处理的错题数量限制
 */
export async function batchGeneratePracticeForUser(
  userId: string,
  limit: number = 10
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // 1. 查询用户未掌握的错题（掌握度低于0.7）
  const weakErrors = await db
    .select({
      error: errorQuestions,
      progress: learningProgress,
    })
    .from(errorQuestions)
    .leftJoin(
      learningProgress,
      and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.knowledgePointId, errorQuestions.knowledgePointIds)
      )
    )
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.isMastered, false)
      )
    )
    .limit(limit);

  const results = [];
  for (const { error } of weakErrors) {
    try {
      const result = await generatePracticeFromError(userId, error.id, 2);
      results.push({
        errorQuestionId: error.id,
        ...result,
      });
    } catch (error) {
      console.error(`Failed to generate practice for error ${error}:`, error);
    }
  }

  return {
    success: true,
    processedCount: results.length,
    results,
  };
}

/**
 * 获取专项练习统计
 * @param userId 用户ID
 */
export async function getPracticeStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const allPractices = await db
    .select()
    .from(practicePools)
    .where(eq(practicePools.userId, userId));

  const pending = allPractices.filter((p) => p.status === 'pending').length;
  const completed = allPractices.filter((p) => p.status === 'completed').length;
  const skipped = allPractices.filter((p) => p.status === 'skipped').length;

  const completedPractices = allPractices.filter(
    (p) => p.status === 'completed' && p.score !== null
  );
  const averageScore =
    completedPractices.length > 0
      ? completedPractices.reduce((sum, p) => sum + (p.score || 0), 0) / completedPractices.length
      : 0;

  return {
    total: allPractices.length,
    pending,
    completed,
    skipped,
    averageScore: Math.round(averageScore),
  };
}
