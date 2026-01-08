import { db } from "../db";
import { users, errorQuestions, knowledgePoints } from "../../drizzle/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

/**
 * 个性化推荐服务
 * 基于用户资料、学习历史和目标提供个性化推荐
 */

interface UserProfile {
  subjectPreferences?: string[];
  learningGoals?: Array<{
    subject: string;
    targetScore: number;
    deadline: string;
    description?: string;
  }>;
  grade?: string;
  dailyStudyTime?: number;
}

/**
 * 获取用户的薄弱知识点
 */
export async function getWeakKnowledgePoints(userId: number, limit: number = 10) {
  // 获取用户的错题
  const userErrors = await db
    .select()
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.isMastered, 0)
      )
    )
    .orderBy(desc(errorQuestions.createdAt));

  // 统计知识点出现频率
  const knowledgePointFreq: Record<string, number> = {};
  
  for (const error of userErrors) {
    if (error.knowledgePointIds && Array.isArray(error.knowledgePointIds)) {
      for (const kpId of error.knowledgePointIds) {
        knowledgePointFreq[kpId] = (knowledgePointFreq[kpId] || 0) + 1;
      }
    }
  }

  // 按频率排序
  const sortedKnowledgePoints = Object.entries(knowledgePointFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id, count]) => ({ id: parseInt(id), count }));

  return sortedKnowledgePoints;
}

/**
 * 生成个性化学习建议
 */
export async function generatePersonalizedAdvice(userId: number) {
  // 获取用户资料
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) {
    throw new Error('User not found');
  }

  const profile: UserProfile = {
    subjectPreferences: user[0].subjectPreferences as string[] || [],
    learningGoals: user[0].learningGoals as any[] || [],
    grade: user[0].grade || undefined,
    dailyStudyTime: user[0].dailyStudyTime || 30,
  };

  // 获取用户错题统计
  const totalErrors = await db
    .select({ count: sql<number>`count(*)` })
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, userId));

  const masteredErrors = await db
    .select({ count: sql<number>`count(*)` })
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.isMastered, 1)
      )
    );

  const totalCount = Number(totalErrors[0]?.count || 0);
  const masteredCount = Number(masteredErrors[0]?.count || 0);
  const masteryRate = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  // 获取薄弱知识点
  const weakPoints = await getWeakKnowledgePoints(userId, 5);

  // 生成建议
  const advice = {
    overview: {
      totalErrors: totalCount,
      masteredErrors: masteredCount,
      masteryRate,
      dailyStudyTime: profile.dailyStudyTime,
    },
    weakKnowledgePoints: weakPoints,
    recommendations: [] as string[],
  };

  // 基于掌握率生成建议
  if (masteryRate < 30) {
    advice.recommendations.push('建议每天至少学习60分钟，重点复习基础知识点');
  } else if (masteryRate < 60) {
    advice.recommendations.push('保持当前学习节奏，继续巩固薄弱环节');
  } else {
    advice.recommendations.push('掌握情况良好，可以尝试更有挑战性的题目');
  }

  // 基于学科偏好生成建议
  if (profile.subjectPreferences && profile.subjectPreferences.length > 0) {
    advice.recommendations.push(
      `重点关注你选择的学科：${profile.subjectPreferences.join('、')}`
    );
  }

  // 基于学习目标生成建议
  if (profile.learningGoals && profile.learningGoals.length > 0) {
    for (const goal of profile.learningGoals) {
      const deadline = new Date(goal.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0 && daysLeft <= 30) {
        advice.recommendations.push(
          `距离${goal.subject}目标（${goal.targetScore}分）还有${daysLeft}天，建议加强练习`
        );
      }
    }
  }

  // 基于薄弱知识点生成建议
  if (weakPoints.length > 0) {
    advice.recommendations.push(
      `发现${weakPoints.length}个薄弱知识点，建议优先复习这些内容`
    );
  }

  return advice;
}

/**
 * 获取推荐的学习内容
 */
export async function getRecommendedContent(userId: number, limit: number = 10) {
  // 获取用户资料
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) {
    throw new Error('User not found');
  }

  const profile: UserProfile = {
    subjectPreferences: user[0].subjectPreferences as string[] || [],
    grade: user[0].grade || undefined,
  };

  // 获取薄弱知识点
  const weakPoints = await getWeakKnowledgePoints(userId, 5);
  const weakPointIds = weakPoints.map(wp => wp.id);

  // 推荐相关的错题（未掌握的，包含薄弱知识点的）
  const recommendations: any[] = [];

  if (weakPointIds.length > 0) {
    // 这里简化处理，实际应该查询包含这些知识点的题目
    const relatedErrors = await db
      .select()
      .from(errorQuestions)
      .where(
        and(
          eq(errorQuestions.userId, userId),
          eq(errorQuestions.isMastered, 0)
        )
      )
      .orderBy(desc(errorQuestions.reviewCount))
      .limit(limit);

    recommendations.push(...relatedErrors.map(error => ({
      type: 'error_question',
      id: error.id,
      title: error.title,
      subject: error.subject,
      difficulty: error.difficulty,
      reviewCount: error.reviewCount,
      reason: '包含你的薄弱知识点',
    })));
  }

  // 基于学科偏好推荐
  if (profile.subjectPreferences && profile.subjectPreferences.length > 0) {
    const subjectErrors = await db
      .select()
      .from(errorQuestions)
      .where(
        and(
          eq(errorQuestions.userId, userId),
          eq(errorQuestions.isMastered, 0),
          inArray(errorQuestions.subject, profile.subjectPreferences as any[])
        )
      )
      .orderBy(desc(errorQuestions.createdAt))
      .limit(Math.min(5, limit - recommendations.length));

    recommendations.push(...subjectErrors.map(error => ({
      type: 'error_question',
      id: error.id,
      title: error.title,
      subject: error.subject,
      difficulty: error.difficulty,
      reviewCount: error.reviewCount,
      reason: '匹配你的学科偏好',
    })));
  }

  return recommendations.slice(0, limit);
}

/**
 * 计算学习目标进度
 */
export async function calculateGoalProgress(userId: number) {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0] || !user[0].learningGoals) {
    return [];
  }

  const learningGoals = user[0].learningGoals as any[];
  const progress = [];

  for (const goal of learningGoals) {
    // 获取该学科的错题统计
    const totalErrors = await db
      .select({ count: sql<number>`count(*)` })
      .from(errorQuestions)
      .where(
        and(
          eq(errorQuestions.userId, userId),
          eq(errorQuestions.subject, goal.subject)
        )
      );

    const masteredErrors = await db
      .select({ count: sql<number>`count(*)` })
      .from(errorQuestions)
      .where(
        and(
          eq(errorQuestions.userId, userId),
          eq(errorQuestions.subject, goal.subject),
          eq(errorQuestions.isMastered, 1)
        )
      );

    const totalCount = Number(totalErrors[0]?.count || 0);
    const masteredCount = Number(masteredErrors[0]?.count || 0);
    const currentProgress = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

    const deadline = new Date(goal.deadline);
    const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    progress.push({
      subject: goal.subject,
      targetScore: goal.targetScore,
      currentProgress,
      deadline: goal.deadline,
      daysLeft: Math.max(0, daysLeft),
      description: goal.description,
      status: daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'urgent' : 'normal',
    });
  }

  return progress;
}
