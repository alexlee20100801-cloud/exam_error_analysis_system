import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { errorQuestions, knowledgePoints, learningProgress, practiceRecords } from "../drizzle/schema";
import type { Subject } from "../shared/subjects";

/**
 * 获取学科的知识点掌握度数据（用于雷达图）
 */
export async function getSubjectKnowledgeMastery(userId: string, subject: Subject) {
  const db = await getDb();
  if (!db) return [];

  // 获取该学科的所有知识点及其掌握度（只取chapter级别的知识点）
  const results = await db
    .select({
      knowledgePointName: knowledgePoints.name,
      level: knowledgePoints.level,
      masteryLevel: learningProgress.masteryLevel,
    })
    .from(knowledgePoints)
    .leftJoin(
      learningProgress,
      and(
        eq(learningProgress.knowledgePointId, knowledgePoints.id),
        eq(learningProgress.userId, userId)
      )
    )
    .where(
      and(
        sql`${knowledgePoints.subject} = ${subject}`,
        sql`${knowledgePoints.level} = 'chapter'` // 只统计章节级别
      )
    )
    .orderBy(knowledgePoints.name);

  // 转换为雷达图数据格式
  return results.map(row => ({
    chapter: row.knowledgePointName,
    mastery: Math.round((row.masteryLevel || 0) * 100),
  }));
}

/**
 * 获取学科的错题趋势数据（按周统计）
 */
export async function getSubjectErrorTrend(userId: string, subject: Subject, weeks: number = 8) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const results = await db
    .select({
      week: sql<string>`DATE_FORMAT(${errorQuestions.createdAt}, '%Y-%u')`.as('week'),
      count: count(),
    })
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        sql`${errorQuestions.subject} = ${subject}`,
        gte(errorQuestions.createdAt, startDate)
      )
    )
    .groupBy(sql.raw(`DATE_FORMAT(\`createdAt\`, '%Y-%u')`))
    .orderBy(sql.raw(`DATE_FORMAT(\`createdAt\`, '%Y-%u')`));

  return results.map(r => ({
    week: r.week,
    errorCount: r.count,
  }));
}

/**
 * 获取学科的练习正确率趋势（按周统计）
 */
export async function getSubjectAccuracyTrend(userId: string, subject: Subject, weeks: number = 8) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const results = await db
    .select({
      week: sql<string>`DATE_FORMAT(${practiceRecords.createdAt}, '%Y-%u')`.as('week'),
      totalCount: count(),
      correctCount: sql<number>`SUM(CASE WHEN ${practiceRecords.isCorrect} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(practiceRecords)
    .where(
      and(
        eq(practiceRecords.userId, userId),
        sql`${practiceRecords.subject} = ${subject}`,
        gte(practiceRecords.createdAt, startDate)
      )
    )
    .groupBy(sql.raw(`DATE_FORMAT(\`createdAt\`, '%Y-%u')`))
    .orderBy(sql.raw(`DATE_FORMAT(\`createdAt\`, '%Y-%u')`));

  return results.map(r => ({
    week: r.week,
    accuracy: r.totalCount > 0 ? Math.round((Number(r.correctCount) / r.totalCount) * 100) : 0,
  }));
}

/**
 * 识别学科的薄弱章节
 */
export async function getSubjectWeakChapters(userId: string, subject: Subject) {
  const db = await getDb();
  if (!db) return [];

  // 获取该学科各章节的平均掌握度（只统计chapter级别）
  const results = await db
    .select({
      chapter: knowledgePoints.name,
      knowledgePointId: knowledgePoints.id,
      avgMastery: sql<number>`AVG(COALESCE(${learningProgress.masteryLevel}, 0))`,
    })
    .from(knowledgePoints)
    .leftJoin(
      learningProgress,
      and(
        eq(learningProgress.knowledgePointId, knowledgePoints.id),
        eq(learningProgress.userId, userId)
      )
    )
    .where(
      and(
        sql`${knowledgePoints.subject} = ${subject}`,
        sql`${knowledgePoints.level} = 'chapter'`
      )
    )
    .groupBy(knowledgePoints.id, knowledgePoints.name)
    .orderBy(sql`AVG(COALESCE(${learningProgress.masteryLevel}, 0))`);

  // 统计每个章节的错题数
  const weakChaptersWithErrors = await Promise.all(
    results.map(async (r) => {
      const errorCount = await db
        .select({ count: count() })
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, userId),
            sql`${errorQuestions.subject} = ${subject}`,
            sql`JSON_CONTAINS(${errorQuestions.knowledgePointIds}, JSON_ARRAY(${r.knowledgePointId}))`
          )
        );

      return {
        chapter: r.chapter,
        mastery: Math.round(Number(r.avgMastery) * 100),
        errorCount: errorCount[0]?.count || 0,
      };
    })
  );

  // 筛选出掌握度低于60%的章节
  return weakChaptersWithErrors.filter(r => r.mastery < 60);
}

/**
 * 生成学科学习建议
 */
export async function generateSubjectAdvice(userId: string, subject: Subject) {
  const weakChapters = await getSubjectWeakChapters(userId, subject);
  const mastery = await getSubjectKnowledgeMastery(userId, subject);
  
  const avgMastery = mastery.length > 0 
    ? mastery.reduce((sum, m) => sum + m.mastery, 0) / mastery.length 
    : 0;

  const advice: string[] = [];

  if (avgMastery < 40) {
    advice.push("整体掌握度较低，建议系统复习基础知识，从简单题目开始练习。");
  } else if (avgMastery < 70) {
    advice.push("基础知识掌握尚可，建议针对薄弱章节进行专项突破。");
  } else {
    advice.push("整体掌握良好，建议挑战更高难度的题目，巩固提升。");
  }

  if (weakChapters.length > 0) {
    const topWeak = weakChapters.slice(0, 3).map(c => c.chapter).join("、");
    advice.push(`重点关注：${topWeak}等章节，建议每天安排30分钟专项练习。`);
  }

  if (weakChapters.length > 3) {
    advice.push("薄弱知识点较多，建议制定长期学习计划，逐个攻克。");
  }

  return advice;
}

/**
 * 获取学科的完整统计数据
 */
export async function getSubjectFullStats(userId: string, subject: Subject) {
  const [mastery, errorTrend, accuracyTrend, weakChapters, advice] = await Promise.all([
    getSubjectKnowledgeMastery(userId, subject),
    getSubjectErrorTrend(userId, subject),
    getSubjectAccuracyTrend(userId, subject),
    getSubjectWeakChapters(userId, subject),
    generateSubjectAdvice(userId, subject),
  ]);

  return {
    mastery,
    errorTrend,
    accuracyTrend,
    weakChapters,
    advice,
  };
}
