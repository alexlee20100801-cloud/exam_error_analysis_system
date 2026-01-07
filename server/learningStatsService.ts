/**
 * 学习数据统计服务
 * 提供学习报告所需的各类统计数据
 */

import { getDb } from "./db";
import { errorQuestions, learningProgress, practiceRecords } from "../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * 知识点掌握度数据
 */
export interface KnowledgePointMastery {
  knowledgePoint: string;
  masteryLevel: number; // 0-100
  totalQuestions: number;
  correctCount: number;
  lastPracticeDate: Date | null;
}

/**
 * 错题分布数据
 */
export interface ErrorDistribution {
  subject: string;
  count: number;
  percentage: number;
}

/**
 * 学习时长趋势数据
 */
export interface LearningTimeTrend {
  date: string;
  practiceCount: number;
  correctRate: number;
  studyTime: number; // 分钟
}

/**
 * 获取用户的知识点掌握度数据（用于雷达图）
 */
export async function getKnowledgePointMasteryData(
  userId: string,
  subject?: string,
  limit: number = 10
): Promise<KnowledgePointMastery[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    // 查询用户的学习进度数据
    let query = db
      .select({
        knowledgePointId: learningProgress.knowledgePointId,
        masteryLevel: learningProgress.masteryLevel,
        practiceCount: learningProgress.practiceCount,
        correctCount: learningProgress.correctCount,
        lastPracticeAt: learningProgress.lastPracticeAt,
      })
      .from(learningProgress)
      .where(eq(learningProgress.userId, userId))
      .orderBy(desc(learningProgress.masteryLevel))
      .limit(limit);

    const progressData = await query;

    // 获取知识点名称
    const result: KnowledgePointMastery[] = [];
    for (const progress of progressData) {
      // 这里简化处理，实际应该join知识点表获取名称
      result.push({
        knowledgePoint: `知识点${progress.knowledgePointId}`,
        masteryLevel: progress.masteryLevel,
        totalQuestions: progress.practiceCount || 0,
        correctCount: progress.correctCount || 0,
        lastPracticeDate: progress.lastPracticeAt,
      });
    }

    return result;
  } catch (error) {
    console.error("[Learning Stats] 获取知识点掌握度失败:", error);
    return [];
  }
}

/**
 * 获取错题分布数据（用于饼图）
 */
export async function getErrorDistributionData(userId: string): Promise<ErrorDistribution[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .select({
        subject: errorQuestions.subject,
        count: sql<number>`COUNT(*)`,
      })
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, userId))
      .groupBy(errorQuestions.subject);

    const total = result.reduce((sum, item) => sum + Number(item.count), 0);

    return result.map((item) => ({
      subject: item.subject,
      count: Number(item.count),
      percentage: total > 0 ? Math.round((Number(item.count) / total) * 100) : 0,
    }));
  } catch (error) {
    console.error("[Learning Stats] 获取错题分布失败:", error);
    return [];
  }
}

/**
 * 获取学习时长趋势数据（用于折线图）
 */
export async function getLearningTimeTrendData(
  userId: string,
  days: number = 30
): Promise<LearningTimeTrend[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    // 计算起始日期
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 查询练习记录
      const records = await db
      .select({
        practiceDate: practiceRecords.createdAt,
        isCorrect: practiceRecords.isCorrect,
        timeSpent: practiceRecords.timeSpent,
      })
      .from(practiceRecords)
      .where(
        and(
          eq(practiceRecords.userId, userId),
          sql`${practiceRecords.createdAt} >= ${startDate}`
        )
      )
      .orderBy(practiceRecords.createdAt);

    // 按日期分组统计
    const dateMap = new Map<string, {
      practiceCount: number;
      correctCount: number;
      totalTime: number;
    }>();

    for (const record of records) {
      const dateStr = record.practiceDate.toISOString().split("T")[0];
      const existing = dateMap.get(dateStr) || {
        practiceCount: 0,
        correctCount: 0,
        totalTime: 0,
      };

      existing.practiceCount++;
      if (record.isCorrect) {
        existing.correctCount++;
      }
      existing.totalTime += record.timeSpent || 0;

      dateMap.set(dateStr, existing);
    }

    // 转换为数组
    const result: LearningTimeTrend[] = [];
    const entries = Array.from(dateMap.entries());
    for (const [date, stats] of entries) {
      result.push({
        date,
        practiceCount: stats.practiceCount,
        correctRate: stats.practiceCount > 0 
          ? Math.round((stats.correctCount / stats.practiceCount) * 100) 
          : 0,
        studyTime: Math.round(stats.totalTime / 60), // 转换为分钟
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("[Learning Stats] 获取学习时长趋势失败:", error);
    return [];
  }
}

/**
 * 获取学习总览统计
 */
export interface LearningOverview {
  totalErrorQuestions: number;
  totalPracticeCount: number;
  averageCorrectRate: number;
  totalStudyTime: number; // 分钟
  masteredKnowledgePoints: number;
  weakKnowledgePoints: number;
}

export async function getLearningOverview(userId: string, subject?: string): Promise<LearningOverview> {
  const db = await getDb();
  if (!db) {
    return {
      totalErrorQuestions: 0,
      totalPracticeCount: 0,
      averageCorrectRate: 0,
      totalStudyTime: 0,
      masteredKnowledgePoints: 0,
      weakKnowledgePoints: 0,
    };
  }

  try {
    // 错题总数
    const errorConditions = [eq(errorQuestions.userId, userId)];
    if (subject) {
      errorConditions.push(sql`${errorQuestions.subject} = ${subject}`);
    }
    const errorQuestionsCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(errorQuestions)
      .where(and(...errorConditions));

    // 练习总数和正确率
    const practiceStats = await db
      .select({
        totalCount: sql<number>`COUNT(*)`,
        correctCount: sql<number>`SUM(CASE WHEN ${practiceRecords.isCorrect} = 1 THEN 1 ELSE 0 END)`,
        totalTime: sql<number>`SUM(COALESCE(${practiceRecords.timeSpent}, 0))`,
      })
      .from(practiceRecords)
      .where(eq(practiceRecords.userId, userId));

    // 掌握的知识点数量（掌握度 >= 80）
    const masteredCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, userId),
          sql`${learningProgress.masteryLevel} >= 80`
        )
      );

    // 薄弱知识点数量（掌握度 < 60）
    const weakCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, userId),
          sql`${learningProgress.masteryLevel} < 60`
        )
      );

    const totalPractice = Number(practiceStats[0]?.totalCount || 0);
    const correctPractice = Number(practiceStats[0]?.correctCount || 0);

    return {
      totalErrorQuestions: Number(errorQuestionsCount[0]?.count || 0),
      totalPracticeCount: totalPractice,
      averageCorrectRate: totalPractice > 0 
        ? Math.round((correctPractice / totalPractice) * 100) 
        : 0,
      totalStudyTime: Math.round(Number(practiceStats[0]?.totalTime || 0) / 60),
      masteredKnowledgePoints: Number(masteredCount[0]?.count || 0),
      weakKnowledgePoints: Number(weakCount[0]?.count || 0),
    };
  } catch (error) {
    console.error("[Learning Stats] 获取学习总览失败:", error);
    return {
      totalErrorQuestions: 0,
      totalPracticeCount: 0,
      averageCorrectRate: 0,
      totalStudyTime: 0,
      masteredKnowledgePoints: 0,
      weakKnowledgePoints: 0,
    };
  }
}
