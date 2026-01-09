import { getDb } from '../db';
import {
  aiGeneratedQuestions,
  errorQuestions,
  questionRecommendations,
  knowledgePoints,
  // @ts-ignore
  InsertQuestionRecommendation,
} from '../../drizzle/schema';
import { eq, and, desc, sql, inArray, notInArray } from 'drizzle-orm';

/**
 * 分析用户错题，提取薄弱知识点
 */
export async function analyzeWeakKnowledgePoints(userId: number, subject?: string) {
  const db = getDb();

  // 获取用户的错题
  let query = db
    .select({
      errorQuestion: errorQuestions,
      knowledgePoint: knowledgePoints,
    })
    .from(errorQuestions)
    .leftJoin(
      knowledgePoints,
      // @ts-ignore
      eq(errorQuestions.knowledgePointId, knowledgePoints.id)
    )
    .where(
      and(
        eq(errorQuestions.userId, userId),
        // @ts-ignore
        eq(errorQuestions.isMastered, false) // 只统计未掌握的错题
      )
    );

  if (subject) {
    // @ts-ignore
    query = query.where(
      and(
        eq(errorQuestions.userId, userId),
        // @ts-ignore
        eq(errorQuestions.isMastered, false),
        sql`${errorQuestions.subject} = ${subject}`
      )
    );
  }

  const results = await query;

  // 统计知识点出现频率
  const knowledgePointFrequency = new Map<number, {
    id: number;
    name: string;
    count: number;
    subject: string;
    grade: string;
  }>();

  results.forEach((result) => {
    if (result.knowledgePoint) {
      const kpId = result.knowledgePoint.id;
      const existing = knowledgePointFrequency.get(kpId);
      if (existing) {
        existing.count++;
      } else {
        knowledgePointFrequency.set(kpId, {
          id: kpId,
          name: result.knowledgePoint.name,
          count: 1,
          subject: result.knowledgePoint.subject,
          grade: result.knowledgePoint.grade,
        });
      }
    }
  });

  // 按频率排序，返回最薄弱的知识点
  const weakKnowledgePoints = Array.from(knowledgePointFrequency.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // 取前10个最薄弱的知识点

  return weakKnowledgePoints;
}

/**
 * 计算题目与用户薄弱知识点的匹配度
 */
function calculateMatchScore(
  question: any,
  weakKnowledgePointIds: number[],
  userGrade: string
): number {
  let score = 0;

  // 知识点匹配度（最高50分）
  if (question.knowledgePointIds && Array.isArray(question.knowledgePointIds)) {
    const matchedCount = question.knowledgePointIds.filter((id: number) =>
      weakKnowledgePointIds.includes(id)
    ).length;
    score += Math.min(matchedCount * 10, 50);
  }

  // 年级匹配度（20分）
  if (question.grade === userGrade) {
    score += 20;
  }

  // 题目质量评分（最高30分）
  if (question.qualityScore) {
    score += (parseFloat(question.qualityScore) / 100) * 30;
  }

  return Math.min(score, 100);
}

/**
 * 为用户生成题目推荐
 */
export async function generateRecommendations(params: {
  userId: number;
  subject?: string;
  limit?: number;
}) {
  const db = getDb();
  const { userId, subject, limit = 10 } = params;

  // 1. 分析用户薄弱知识点
  const weakKnowledgePoints = await analyzeWeakKnowledgePoints(userId, subject);

  if (weakKnowledgePoints.length === 0) {
    return {
      recommendations: [],
      message: '暂无错题数据，无法生成推荐',
    };
  }

  const weakKnowledgePointIds = weakKnowledgePoints.map((kp: any) => kp.id);
  const weakKnowledgePointNames = weakKnowledgePoints.map((kp: any) => kp.name);

  // 获取用户信息
  const userResult = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
  });

  if (!userResult) {
    throw new Error('用户不存在');
  }

  const userGrade = userResult.grade || 'grade7';

  // 2. 获取已推荐过的题目ID
  const existingRecommendations = await db
    .select({ questionId: questionRecommendations.questionId })
    .from(questionRecommendations)
    .where(eq(questionRecommendations.userId, userId));

  const existingQuestionIds = existingRecommendations.map((r: any) => r.questionId);

  // 3. 查找匹配的已批准题目
  let candidateQuery = db
    .select()
    .from(aiGeneratedQuestions)
    .where(
      and(
        eq(aiGeneratedQuestions.reviewStatus, 'approved'),
        // @ts-ignore
        eq(aiGeneratedQuestions.isPublic, true)
      )
    )
    .limit(100); // 先获取候选题目

  if (subject) {
    // @ts-ignore
    candidateQuery = candidateQuery.where(
      and(
        eq(aiGeneratedQuestions.reviewStatus, 'approved'),
        // @ts-ignore
        eq(aiGeneratedQuestions.isPublic, true),
        sql`${aiGeneratedQuestions.subject} = ${subject}`
      )
    );
  }

  // 排除已推荐的题目
  if (existingQuestionIds.length > 0) {
    // @ts-ignore
    candidateQuery = candidateQuery.where(
      and(
        eq(aiGeneratedQuestions.reviewStatus, 'approved'),
        // @ts-ignore
        eq(aiGeneratedQuestions.isPublic, true),
        notInArray(aiGeneratedQuestions.id, existingQuestionIds)
      )
    );
  }

  const candidates = await candidateQuery;

  // 4. 计算匹配度并排序
  const scoredCandidates = candidates
    .map((question: any) => {
      const matchScore = calculateMatchScore(
        question,
        weakKnowledgePointIds,
        userGrade
      );

      // 生成推荐理由
      const matchedKnowledgePoints = question.knowledgePointIds
        ? question.knowledgePointIds.filter((id: number) =>
            weakKnowledgePointIds.includes(id)
          )
        : [];

      let reason = '';
      if (matchedKnowledgePoints.length > 0) {
        const matchedNames = weakKnowledgePoints
          .filter((kp) => matchedKnowledgePoints.includes(kp.id))
          .map((kp: any) => kp.name)
          .slice(0, 3);
        reason = `针对您在 ${matchedNames.join('、')} 等知识点的薄弱环节`;
      } else {
        reason = `与您的学习内容相关，建议练习`;
      }

      return {
        question,
        matchScore,
        reason,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  // 5. 保存推荐记录
  const recommendationRecords: InsertQuestionRecommendation[] = scoredCandidates.map((item: any) => ({
      userId,
      questionId: item.question.id,
      recommendationReason: item.reason,
      matchScore: item.matchScore.toFixed(2),
      basedOnErrorQuestionIds: [], // 可以进一步优化，记录具体基于哪些错题
      weakKnowledgePoints: weakKnowledgePointNames,
    })
  );

  if (recommendationRecords.length > 0) {
    await db.insert(questionRecommendations).values(recommendationRecords);
  }

  return {
    recommendations: scoredCandidates.map((item: any) => ({
      ...item.question,
      matchScore: item.matchScore,
      recommendationReason: item.reason,
    })),
    weakKnowledgePoints: weakKnowledgePoints.map((kp: any) => ({
      name: kp.name,
      errorCount: kp.count,
    })),
  };
}

/**
 * 获取用户的推荐题目列表
 */
export async function getUserRecommendations(params: {
  userId: number;
  subject?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const { userId, subject, limit = 10, offset = 0 } = params;

  let conditions = [eq(questionRecommendations.userId, userId)];

  const results = await db
    .select({
      recommendation: questionRecommendations,
      question: aiGeneratedQuestions,
    })
    .from(questionRecommendations)
    .innerJoin(
      aiGeneratedQuestions,
      eq(questionRecommendations.questionId, aiGeneratedQuestions.id)
    )
    .where(and(...conditions))
    .orderBy(desc(questionRecommendations.matchScore))
    .limit(limit)
    .offset(offset);

  // 如果有subject筛选，在内存中过滤
  let filteredResults = results;
  if (subject) {
    filteredResults = results.filter(
      (r) => r.question.subject === subject
    );
  }

  // 获取总数
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(questionRecommendations)
    .where(eq(questionRecommendations.userId, userId));

  return {
    recommendations: filteredResults.map((r: any) => ({
      ...r.question,
      recommendationReason: r.recommendation.recommendationReason,
      matchScore: parseFloat(r.recommendation.matchScore || '0'),
      isPracticed: r.recommendation.isPracticed,
      practiceResult: r.recommendation.practiceResult,
    })),
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * 标记推荐题目为已点击
 */
export async function markRecommendationClicked(params: {
  userId: number;
  questionId: number;
}) {
  const db = getDb();
  const { userId, questionId } = params;

  await db
    .update(questionRecommendations)
    .set({
      // @ts-ignore
      isClicked: true,
      // @ts-ignore
      clickedAt: new Date(),
    })
    .where(
      and(
        eq(questionRecommendations.userId, userId),
        eq(questionRecommendations.questionId, questionId)
      )
    );

  return { success: true };
}

/**
 * 记录推荐题目的练习结果
 */
export async function recordPracticeResult(params: {
  userId: number;
  questionId: number;
  result: 'correct' | 'incorrect' | 'skipped';
}) {
  const db = getDb();
  const { userId, questionId, result } = params;

  await db
    .update(questionRecommendations)
    .set({
      // @ts-ignore
      isPracticed: true,
      practiceResult: result,
      // @ts-ignore
      practicedAt: new Date(),
    })
    .where(
      and(
        eq(questionRecommendations.userId, userId),
        eq(questionRecommendations.questionId, questionId)
      )
    );

  // 更新题目使用次数
  await db
    .update(aiGeneratedQuestions)
    .set({
      usageCount: sql`${aiGeneratedQuestions.usageCount} + 1`,
    })
    .where(eq(aiGeneratedQuestions.id, questionId));

  return { success: true };
}

/**
 * 获取推荐统计
 */
export async function getRecommendationStats(userId: number) {
  const db = getDb();

  const stats = await db
    .select({
      total: sql<number>`count(*)`,
      practiced: sql<number>`sum(case when ${questionRecommendations.isPracticed} then 1 else 0 end)`,
      correct: sql<number>`sum(case when ${questionRecommendations.practiceResult} = 'correct' then 1 else 0 end)`,
      incorrect: sql<number>`sum(case when ${questionRecommendations.practiceResult} = 'incorrect' then 1 else 0 end)`,
    })
    .from(questionRecommendations)
    .where(eq(questionRecommendations.userId, userId));

  return {
    total: Number(stats[0]?.total || 0),
    practiced: Number(stats[0]?.practiced || 0),
    correct: Number(stats[0]?.correct || 0),
    incorrect: Number(stats[0]?.incorrect || 0),
    accuracy:
      Number(stats[0]?.practiced || 0) > 0
        ? (Number(stats[0]?.correct || 0) / Number(stats[0]?.practiced || 0)) * 100
        : 0,
  };
}
