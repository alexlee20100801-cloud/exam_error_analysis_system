/**
 * AI薄弱点分析服务
 * 分析用户错题数据，识别薄弱知识点，生成学习建议
 */

import { eq, and, sql, desc, inArray, count } from "drizzle-orm";
import { getDb } from "./db";
import {
  errorQuestions,
  knowledgePoints,
  learningProgress,
  practiceRecords,
  type KnowledgePoint,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";

/**
 * 薄弱点分析结果
 */
export interface WeaknessAnalysis {
  userId: number;
  weakKnowledgePoints: WeakKnowledgePoint[];
  overallMasteryRate: number;
  totalErrorQuestions: number;
  recommendations: string[];
  learningPath: LearningPathNode[];
  analysisDate: string;
}

/**
 * 薄弱知识点
 */
export interface WeakKnowledgePoint {
  knowledgePointId: number;
  name: string;
  subject: string;
  grade: string;
  errorCount: number;
  totalPracticeCount: number;
  errorRate: number;
  masteryLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  relatedQuestionIds: number[];
  improvementSuggestion: string;
}

/**
 * 学习路径节点
 */
export interface LearningPathNode {
  knowledgePointId: number;
  name: string;
  order: number;
  estimatedTime: number; // 预计学习时间（分钟）
  prerequisiteIds: number[];
  recommendedQuestions: number[];
  status: 'not_started' | 'in_progress' | 'completed';
}

/**
 * 分析用户薄弱点
 */
export async function analyzeUserWeakness(userId: number): Promise<WeaknessAnalysis> {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  // 1. 获取用户所有错题
  const userErrors = await db
    .select()
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, userId));

  if (userErrors.length === 0) {
    return {
      userId,
      weakKnowledgePoints: [],
      overallMasteryRate: 100,
      totalErrorQuestions: 0,
      recommendations: ["开始录入错题，系统将为您分析薄弱点"],
      learningPath: [],
      analysisDate: new Date().toISOString(),
    };
  }

  // 2. 按知识点分组统计错题
  const knowledgePointStats = await db
    .select({
      knowledgePointId: errorQuestions.knowledgePointId,
      errorCount: count(errorQuestions.id),
    })
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        sql`${errorQuestions.knowledgePointId} IS NOT NULL`
      )
    )
    .groupBy(errorQuestions.knowledgePointId);

  // 3. 获取每个知识点的详细信息和练习记录
  const weakPoints: WeakKnowledgePoint[] = [];

  for (const stat of knowledgePointStats) {
    if (!stat.knowledgePointId) continue;

    // 获取知识点信息
    const kpInfo = await db
      .select()
      .from(knowledgePoints)
      .where(eq(knowledgePoints.id, stat.knowledgePointId))
      .limit(1);

    if (kpInfo.length === 0) continue;

    const kp = kpInfo[0];

    // 获取该知识点的练习记录
    const practiceStats = await db
      .select({
        totalCount: count(practiceRecords.id),
        correctCount: sql<number>`SUM(CASE WHEN ${practiceRecords.isCorrect} = 1 THEN 1 ELSE 0 END)`,
      })
      .from(practiceRecords)
      .innerJoin(
        errorQuestions,
        eq(practiceRecords.questionId, errorQuestions.id)
      )
      .where(
        and(
          eq(practiceRecords.userId, userId),
          eq(errorQuestions.knowledgePointId, stat.knowledgePointId)
        )
      );

    const totalPractice = practiceStats[0]?.totalCount || 0;
    const correctCount = Number(practiceStats[0]?.correctCount) || 0;
    const errorRate = totalPractice > 0 ? ((totalPractice - correctCount) / totalPractice) * 100 : 100;

    // 获取该知识点的学习进度
    const progress = await db
      .select()
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.knowledgePointId, stat.knowledgePointId)
        )
      )
      .limit(1);

    const masteryLevel = progress[0]?.masteryLevel ? Number(progress[0].masteryLevel) : 0;

    // 获取相关错题ID
    const relatedErrors = await db
      .select({ id: errorQuestions.id })
      .from(errorQuestions)
      .where(
        and(
          eq(errorQuestions.userId, userId),
          eq(errorQuestions.knowledgePointId, stat.knowledgePointId)
        )
      );

    weakPoints.push({
      knowledgePointId: stat.knowledgePointId,
      name: kp.name,
      subject: kp.subject,
      grade: kp.grade,
      errorCount: stat.errorCount,
      totalPracticeCount: totalPractice,
      errorRate,
      masteryLevel,
      difficulty: kp.difficulty as 'easy' | 'medium' | 'hard',
      relatedQuestionIds: relatedErrors.map(e => e.id),
      improvementSuggestion: "",
    });
  }

  // 4. 按错误率排序，找出最薄弱的知识点
  weakPoints.sort((a, b) => b.errorRate - a.errorRate);

  // 5. 使用AI生成改进建议
  const topWeakPoints = weakPoints.slice(0, 5);
  for (const wp of topWeakPoints) {
    wp.improvementSuggestion = await generateImprovementSuggestion(wp);
  }

  // 6. 计算整体掌握率
  const masteredCount = userErrors.filter(e => e.isMastered === 1).length;
  const overallMasteryRate = (masteredCount / userErrors.length) * 100;

  // 7. 生成学习建议
  const recommendations = await generateRecommendations(weakPoints, overallMasteryRate);

  // 8. 生成学习路径
  const learningPath = await generateLearningPath(weakPoints);

  return {
    userId,
    weakKnowledgePoints: weakPoints,
    overallMasteryRate,
    totalErrorQuestions: userErrors.length,
    recommendations,
    learningPath,
    analysisDate: new Date().toISOString(),
  };
}

/**
 * 使用AI生成改进建议
 */
async function generateImprovementSuggestion(wp: WeakKnowledgePoint): Promise<string> {
  try {
    const prompt = `作为一名资深教师，请为以下薄弱知识点提供具体的改进建议：

知识点：${wp.name}
学科：${wp.subject}
年级：${wp.grade}
错误次数：${wp.errorCount}
错误率：${wp.errorRate.toFixed(1)}%
掌握度：${wp.masteryLevel}%
难度：${wp.difficulty}

请提供：
1. 该知识点的核心概念（1-2句话）
2. 常见错误原因（2-3点）
3. 具体学习建议（3-4点）
4. 推荐的练习方法

要求：简洁实用，不超过150字。`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一位经验丰富的教师，擅长分析学生的学习问题并提供针对性建议。" },
        { role: "user", content: prompt },
      ],
    });

    return response.choices[0]?.message?.content || "建议加强该知识点的练习";
  } catch (error) {
    console.error("生成改进建议失败:", error);
    return "建议加强该知识点的练习，多做相关题目";
  }
}

/**
 * 生成学习建议
 */
async function generateRecommendations(
  weakPoints: WeakKnowledgePoint[],
  overallMasteryRate: number
): Promise<string[]> {
  const recommendations: string[] = [];

  if (overallMasteryRate >= 80) {
    recommendations.push("整体掌握情况良好，继续保持！");
  } else if (overallMasteryRate >= 60) {
    recommendations.push("整体掌握情况一般，需要加强薄弱环节的练习");
  } else {
    recommendations.push("需要系统性地复习基础知识，建议制定详细的学习计划");
  }

  // 针对最薄弱的3个知识点给出建议
  const top3Weak = weakPoints.slice(0, 3);
  for (const wp of top3Weak) {
    if (wp.errorRate > 70) {
      recommendations.push(`【${wp.name}】掌握度较低，建议优先复习该知识点`);
    } else if (wp.errorRate > 50) {
      recommendations.push(`【${wp.name}】需要加强练习，多做相关题目`);
    }
  }

  // 学科分布建议
  const subjectGroups = new Map<string, number>();
  weakPoints.forEach(wp => {
    subjectGroups.set(wp.subject, (subjectGroups.get(wp.subject) || 0) + wp.errorCount);
  });

  const sortedSubjects = Array.from(subjectGroups.entries())
    .sort((a, b) => b[1] - a[1]);

  if (sortedSubjects.length > 0) {
    const weakestSubject = sortedSubjects[0][0];
    recommendations.push(`【${weakestSubject}】是当前最需要关注的学科`);
  }

  return recommendations;
}

/**
 * 生成学习路径
 */
async function generateLearningPath(weakPoints: WeakKnowledgePoint[]): Promise<LearningPathNode[]> {
  const db = getDb();
  if (!db) return [];

  const path: LearningPathNode[] = [];

  // 按难度和错误率排序，先易后难
  const sortedPoints = [...weakPoints].sort((a, b) => {
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
    if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    }
    return b.errorRate - a.errorRate;
  });

  for (let i = 0; i < Math.min(sortedPoints.length, 10); i++) {
    const wp = sortedPoints[i];

    // 获取前置知识点
    const kpInfo = await db
      .select()
      .from(knowledgePoints)
      .where(eq(knowledgePoints.id, wp.knowledgePointId))
      .limit(1);

    const prerequisiteIds: number[] = [];
    if (kpInfo[0]?.parentId) {
      prerequisiteIds.push(kpInfo[0].parentId);
    }

    // 估算学习时间（根据难度和错误率）
    let estimatedTime = 30; // 基础时间30分钟
    if (wp.difficulty === 'medium') estimatedTime = 45;
    if (wp.difficulty === 'hard') estimatedTime = 60;
    if (wp.errorRate > 80) estimatedTime += 15;

    path.push({
      knowledgePointId: wp.knowledgePointId,
      name: wp.name,
      order: i + 1,
      estimatedTime,
      prerequisiteIds,
      recommendedQuestions: wp.relatedQuestionIds.slice(0, 5),
      status: 'not_started',
    });
  }

  return path;
}

/**
 * 获取知识点掌握度雷达图数据
 */
export async function getKnowledgeRadarData(userId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  // 按学科统计掌握度
  const subjectMastery = await db
    .select({
      subject: knowledgePoints.subject,
      avgMastery: sql<number>`AVG(CAST(${learningProgress.masteryLevel} AS DECIMAL(5,2)))`,
      totalPoints: count(knowledgePoints.id),
    })
    .from(learningProgress)
    .innerJoin(
      knowledgePoints,
      eq(learningProgress.knowledgePointId, knowledgePoints.id)
    )
    .where(eq(learningProgress.userId, userId))
    .groupBy(sql`${knowledgePoints.subject}`);

  return subjectMastery.map(s => ({
    subject: s.subject,
    mastery: Number(s.avgMastery) || 0,
    totalPoints: s.totalPoints,
  }));
}

/**
 * 获取知识点掌握度热力图数据
 */
export async function getKnowledgeHeatmapData(userId: number, subject: string) {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  // 获取该学科下所有知识点的掌握度
  const heatmapData = await db
    .select({
      knowledgePointId: knowledgePoints.id,
      name: knowledgePoints.name,
      grade: knowledgePoints.grade,
      chapter: knowledgePoints.chapter,
      masteryLevel: learningProgress.masteryLevel,
      errorCount: sql<number>`(
        SELECT COUNT(*) FROM ${errorQuestions}
        WHERE ${errorQuestions.knowledgePointId} = ${knowledgePoints.id}
        AND ${errorQuestions.userId} = ${userId}
      )`,
    })
    .from(knowledgePoints)
    .leftJoin(
      learningProgress,
      and(
        eq(learningProgress.knowledgePointId, knowledgePoints.id),
        eq(learningProgress.userId, userId)
      )
    )
    .where(eq(knowledgePoints.subject, subject));

  return heatmapData.map(d => ({
    knowledgePointId: d.knowledgePointId,
    name: d.name,
    grade: d.grade,
    chapter: d.chapter || "未分类",
    masteryLevel: d.masteryLevel ? Number(d.masteryLevel) : 0,
    errorCount: Number(d.errorCount) || 0,
  }));
}
