import { getDb } from '../db';
import { userPracticeBehaviors, users, aiGeneratedQuestions, userSimilarityCache, errorQuestions } from '../../drizzle/schema';
import { eq, and, desc, sql, inArray, ne, gte } from 'drizzle-orm';

/**
 * 记录用户练习行为
 */
export async function recordPracticeBehavior(
  userId: number,
  questionId: number,
  behaviorType: 'view' | 'practice' | 'correct' | 'incorrect' | 'favorite' | 'export',
  metadata?: {
    timeSpent?: number;
    score?: number;
    difficulty?: string;
    knowledgePoints?: string[];
    userAnswer?: string;
  }
) {
  const db = getDb();
  
  await db.insert(userPracticeBehaviors).values({
    userId,
    questionId,
    behaviorType,
    timeSpent: metadata?.timeSpent || null,
    score: metadata?.score || null,
    metadata: metadata ? {
      difficulty: metadata.difficulty,
      knowledgePoints: metadata.knowledgePoints,
      userAnswer: metadata.userAnswer,
    } : null,
  });
  
  return { success: true };
}

/**
 * 计算两个用户之间的相似度（基于共同行为）
 */
async function calculateUserSimilarity(userId1: number, userId2: number): Promise<number> {
  const db = getDb();
  
  // 获取用户1的行为
  const user1Behaviors = await db.select()
    .from(userPracticeBehaviors)
    .where(eq(userPracticeBehaviors.userId, userId1));
  
  // 获取用户2的行为
  const user2Behaviors = await db.select()
    .from(userPracticeBehaviors)
    .where(eq(userPracticeBehaviors.userId, userId2));
  
  // 构建用户行为集合（题目ID -> 行为类型）
  const user1QuestionBehaviors = new Map<number, Set<string>>();
  user1Behaviors.forEach(b => {
    if (!user1QuestionBehaviors.has(b.questionId)) {
      user1QuestionBehaviors.set(b.questionId, new Set());
    }
    user1QuestionBehaviors.get(b.questionId)!.add(b.behaviorType);
  });
  
  const user2QuestionBehaviors = new Map<number, Set<string>>();
  user2Behaviors.forEach(b => {
    if (!user2QuestionBehaviors.has(b.questionId)) {
      user2QuestionBehaviors.set(b.questionId, new Set());
    }
    user2QuestionBehaviors.get(b.questionId)!.add(b.behaviorType);
  });
  
  // 计算共同题目数量和行为相似度
  let commonQuestions = 0;
  let similarityScore = 0;
  
  for (const [questionId, behaviors1] of user1QuestionBehaviors) {
    if (user2QuestionBehaviors.has(questionId)) {
      commonQuestions++;
      const behaviors2 = user2QuestionBehaviors.get(questionId)!;
      
      // 计算行为重叠度
      const intersection = new Set([...behaviors1].filter(x => behaviors2.has(x)));
      const union = new Set([...behaviors1, ...behaviors2]);
      const overlapScore = intersection.size / union.size;
      
      // 权重：正确答题 > 练习 > 收藏 > 查看
      let weightedScore = overlapScore;
      if (intersection.has('correct')) weightedScore *= 2;
      if (intersection.has('practice')) weightedScore *= 1.5;
      if (intersection.has('favorite')) weightedScore *= 1.3;
      
      similarityScore += weightedScore;
    }
  }
  
  if (commonQuestions === 0) return 0;
  
  // 归一化到0-100
  const normalizedScore = (similarityScore / user1QuestionBehaviors.size) * 100;
  return Math.min(100, Math.round(normalizedScore));
}

/**
 * 获取相似用户（基于年级、地区、行为）
 */
export async function getSimilarUsers(userId: number, limit: number = 10): Promise<Array<{ userId: number; similarityScore: number }>> {
  const db = getDb();
  
  // 获取当前用户信息
  const [currentUser] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!currentUser) {
    throw new Error('用户不存在');
  }
  
  // 查找相似用户（同年级、同地区）
  const similarUsers = await db.select()
    .from(users)
    .where(and(
      ne(users.id, userId),
      eq(users.grade, currentUser.grade),
      currentUser.region ? eq(users.region, currentUser.region) : sql`1=1`
    ))
    .limit(50); // 先获取候选用户
  
  if (similarUsers.length === 0) {
    return [];
  }
  
  // 检查缓存
  const cacheResults = await db.select()
    .from(userSimilarityCache)
    .where(and(
      eq(userSimilarityCache.userId1, userId),
      inArray(userSimilarityCache.userId2, similarUsers.map(u => u.id)),
      gte(userSimilarityCache.lastCalculatedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7天内的缓存
    ));
  
  const cachedScores = new Map(cacheResults.map(r => [r.userId2, r.similarityScore]));
  
  // 计算未缓存的相似度
  const results: Array<{ userId: number; similarityScore: number }> = [];
  
  for (const user of similarUsers) {
    let score = cachedScores.get(user.id);
    
    if (score === undefined) {
      // 计算新的相似度
      score = await calculateUserSimilarity(userId, user.id);
      
      // 保存到缓存
      const [commonCount] = await db.select({
        count: sql<number>`COUNT(DISTINCT b1.question_id)`,
      })
      .from(userPracticeBehaviors)
      .where(and(
        eq(userPracticeBehaviors.userId, userId),
        sql`EXISTS (
          SELECT 1 FROM ${userPracticeBehaviors} b2 
          WHERE b2.user_id = ${user.id} 
          AND b2.question_id = ${userPracticeBehaviors.questionId}
        )`
      ));
      
      await db.insert(userSimilarityCache).values({
        userId1: userId,
        userId2: user.id,
        similarityScore: score,
        commonBehaviorCount: commonCount?.count || 0,
      });
    }
    
    if (score > 0) {
      results.push({ userId: user.id, similarityScore: score });
    }
  }
  
  // 按相似度排序并返回前N个
  return results.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, limit);
}

/**
 * 基于用户的协同过滤推荐
 */
export async function getUserBasedRecommendations(userId: number, limit: number = 10) {
  const db = getDb();
  
  // 获取相似用户
  const similarUsers = await getSimilarUsers(userId, 20);
  
  if (similarUsers.length === 0) {
    return [];
  }
  
  // 获取当前用户已练习的题目
  const userBehaviors = await db.select()
    .from(userPracticeBehaviors)
    .where(eq(userPracticeBehaviors.userId, userId));
  
  const userQuestionIds = new Set(userBehaviors.map(b => b.questionId));
  
  // 获取相似用户的高质量行为（正确答题、收藏）
  const similarUserBehaviors = await db.select()
    .from(userPracticeBehaviors)
    .where(and(
      inArray(userPracticeBehaviors.userId, similarUsers.map(u => u.userId)),
      inArray(userPracticeBehaviors.behaviorType, ['correct', 'favorite'])
    ));
  
  // 计算题目推荐分数
  const questionScores = new Map<number, number>();
  const similarityMap = new Map(similarUsers.map(u => [u.userId, u.similarityScore]));
  
  for (const behavior of similarUserBehaviors) {
    // 跳过用户已练习的题目
    if (userQuestionIds.has(behavior.questionId)) continue;
    
    const userSimilarity = similarityMap.get(behavior.userId) || 0;
    const behaviorWeight = behavior.behaviorType === 'correct' ? 2 : 1;
    const score = userSimilarity * behaviorWeight;
    
    questionScores.set(
      behavior.questionId,
      (questionScores.get(behavior.questionId) || 0) + score
    );
  }
  
  // 排序并获取题目详情
  const topQuestionIds = Array.from(questionScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  
  if (topQuestionIds.length === 0) {
    return [];
  }
  
  const questions = await db.select()
    .from(aiGeneratedQuestions)
    .where(inArray(aiGeneratedQuestions.id, topQuestionIds));
  
  return topQuestionIds.map(id => {
    const question = questions.find(q => q.id === id);
    return {
      question,
      score: questionScores.get(id) || 0,
      reason: '基于相似学生的学习行为推荐',
    };
  }).filter(r => r.question);
}

/**
 * 基于物品的协同过滤推荐
 */
export async function getItemBasedRecommendations(userId: number, limit: number = 10) {
  const db = getDb();
  
  // 获取用户最近练习的题目
  const recentBehaviors = await db.select()
    .from(userPracticeBehaviors)
    .where(eq(userPracticeBehaviors.userId, userId))
    .orderBy(desc(userPracticeBehaviors.createdAt))
    .limit(10);
  
  if (recentBehaviors.length === 0) {
    return [];
  }
  
  const recentQuestionIds = recentBehaviors.map(b => b.questionId);
  
  // 获取练习过这些题目的其他用户
  const relatedBehaviors = await db.select()
    .from(userPracticeBehaviors)
    .where(and(
      inArray(userPracticeBehaviors.questionId, recentQuestionIds),
      ne(userPracticeBehaviors.userId, userId)
    ));
  
  // 统计这些用户还练习了哪些题目
  const relatedUserIds = [...new Set(relatedBehaviors.map(b => b.userId))];
  
  if (relatedUserIds.length === 0) {
    return [];
  }
  
  const otherBehaviors = await db.select()
    .from(userPracticeBehaviors)
    .where(and(
      inArray(userPracticeBehaviors.userId, relatedUserIds),
      inArray(userPracticeBehaviors.behaviorType, ['correct', 'favorite'])
    ));
  
  // 计算题目共现频率
  const questionCooccurrence = new Map<number, number>();
  const userQuestionIds = new Set(recentQuestionIds);
  
  for (const behavior of otherBehaviors) {
    if (userQuestionIds.has(behavior.questionId)) continue;
    
    const weight = behavior.behaviorType === 'correct' ? 2 : 1;
    questionCooccurrence.set(
      behavior.questionId,
      (questionCooccurrence.get(behavior.questionId) || 0) + weight
    );
  }
  
  // 排序并获取题目详情
  const topQuestionIds = Array.from(questionCooccurrence.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  
  if (topQuestionIds.length === 0) {
    return [];
  }
  
  const questions = await db.select()
    .from(aiGeneratedQuestions)
    .where(inArray(aiGeneratedQuestions.id, topQuestionIds));
  
  return topQuestionIds.map(id => {
    const question = questions.find(q => q.id === id);
    return {
      question,
      score: questionCooccurrence.get(id) || 0,
      reason: '基于题目关联性推荐',
    };
  }).filter(r => r.question);
}

/**
 * 混合推荐算法（结合内容推荐和协同过滤）
 */
export async function getHybridRecommendations(userId: number, limit: number = 10) {
  const db = getDb();
  
  // 获取用户的错题分析（薄弱知识点）
  const userErrors = await db.select()
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, userId))
    .orderBy(desc(errorQuestions.createdAt))
    .limit(20);
  
  // 提取薄弱知识点
  const weakKnowledgePoints = new Set<string>();
  userErrors.forEach(error => {
    if (error.knowledgePointIds && Array.isArray(error.knowledgePointIds)) {
      error.knowledgePointIds.forEach(kp => weakKnowledgePoints.add(String(kp)));
    }
  });
  
  // 获取三种推荐
  const [userBased, itemBased] = await Promise.all([
    getUserBasedRecommendations(userId, 15),
    getItemBasedRecommendations(userId, 15),
  ]);
  
  // 合并推荐结果并去重
  const allRecommendations = new Map<number, any>();
  
  // 用户协同过滤（权重0.4）
  userBased.forEach(rec => {
    allRecommendations.set(rec.question.id, {
      ...rec,
      finalScore: rec.score * 0.4,
    });
  });
  
  // 物品协同过滤（权重0.3）
  itemBased.forEach(rec => {
    const existing = allRecommendations.get(rec.question.id);
    if (existing) {
      existing.finalScore += rec.score * 0.3;
      existing.reason += ' + ' + rec.reason;
    } else {
      allRecommendations.set(rec.question.id, {
        ...rec,
        finalScore: rec.score * 0.3,
      });
    }
  });
  
  // 内容匹配加分（权重0.3）
  for (const [questionId, rec] of allRecommendations) {
    if (rec.question.knowledgePoints) {
      const matchingPoints = rec.question.knowledgePoints.filter((kp: string) => 
        weakKnowledgePoints.has(kp)
      );
      if (matchingPoints.length > 0) {
        rec.finalScore += matchingPoints.length * 10 * 0.3;
        rec.reason += ' + 匹配薄弱知识点';
      }
    }
  }
  
  // 排序并返回
  return Array.from(allRecommendations.values())
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
}
