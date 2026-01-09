import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";

export interface RecommendedQuestion {
  question: any;
  score: number;
  reason: string;
  relatedKnowledgePoints: string[];
}

/**
 * 获取用户的错题知识点分布
 */
async function getUserErrorKnowledgePoints(userId: number) {
  const db = getDb();

  // 获取用户最近的错题记录
  // 直接从错题表获取数据（错题表已包含知识点和分类信息）
  const errorQuestions = await db
    .select({
      id: schema.errorQuestions.id,
      knowledgePointIds: schema.errorQuestions.knowledgePointIds,
      subject: schema.errorQuestions.subject,
      grade: schema.errorQuestions.grade,
    })
    .from(schema.errorQuestions)
    .where(eq(schema.errorQuestions.userId, userId))
    .orderBy(desc(schema.errorQuestions.createdAt))
    .limit(50);

  // 统计知识点出现频率
  const knowledgePointFreq: Record<number, number> = {};
  const subjectFreq: Record<string, number> = {};
  const gradeFreq: Record<string, number> = {};

  for (const eq of errorQuestions) {
    // 统计学科
    const subject = eq.subject;
    subjectFreq[subject] = (subjectFreq[subject] || 0) + 1;

    // 统计年级
    const grade = eq.grade;
    gradeFreq[grade] = (gradeFreq[grade] || 0) + 1;

    // 统计知识点
    if (eq.knowledgePointIds && Array.isArray(eq.knowledgePointIds)) {
      for (const kpId of eq.knowledgePointIds) {
        knowledgePointFreq[kpId] = (knowledgePointFreq[kpId] || 0) + 1;
      }
    }
  }

  // 获取高频知识点（出现次数>=2）
  const frequentKnowledgePoints = Object.entries(knowledgePointFreq)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([kpId]) => parseInt(kpId));

  // 获取高频学科
  const topSubjects = Object.entries(subjectFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([subject]) => subject);

  return {
    knowledgePoints: frequentKnowledgePoints,
    subjects: topSubjects,
    grade: Object.keys(gradeFreq)[0], // 取最常见的年级
    knowledgePointFreq,
    subjectFreq,
  };
}

/**
 * 获取智能推荐的真题
 */
export async function getRecommendedRealExams(
  userId: string,
  limit: number = 10
): Promise<RecommendedQuestion[]> {
  const db = getDb();

  // 1. 分析用户错题
  // @ts-ignore
  const errorAnalysis = await getUserErrorKnowledgePoints(userId);

  if (
    errorAnalysis.knowledgePoints.length === 0 &&
    errorAnalysis.subjects.length === 0
  ) {
    // 如果没有错题记录，返回空数组
    return [];
  }

  // 2. 查询相关真题
  const conditions = [];

  // 优先推荐相同学科的题目
  if (errorAnalysis.subjects.length > 0) {
    conditions.push(
      inArray(schema.realExamQuestions.subject, errorAnalysis.subjects as any[])
    );
  }

  // 优先推荐相同年级的题目
  if (errorAnalysis.grade) {
    conditions.push(
      sql`${schema.realExamQuestions.grade} = ${errorAnalysis.grade}`
    );
  }

  // 只显示公开的题目
  // @ts-ignore
  conditions.push(eq(schema.realExamQuestions.isPublic, true));

  let candidateQuestions = await db
    .select()
    .from(schema.realExamQuestions)
    .where(and(...conditions))
    .limit(100);

  // 3. 获取用户已经练习过的题目ID
  const practicedQuestions = await db
    .select({ questionId: schema.realExamPracticeRecords.questionId })
    .from(schema.realExamPracticeRecords)
    .where(eq(schema.realExamPracticeRecords.userId, userId as any));

  const practicedIds = new Set(
    practicedQuestions.map((p: any) => p.questionId)
  );

  // 4. 过滤掉已练习的题目
  candidateQuestions = candidateQuestions.filter(
    (q) => !practicedIds.has(q.id)
  );

  // 5. 计算推荐分数
  const recommendations: RecommendedQuestion[] = [];

  for (const question of candidateQuestions) {
    let score = 0;
    const reasons: string[] = [];
    const relatedKPs: string[] = [];

    // 学科匹配度（权重：30）
    const subjectWeight = errorAnalysis.subjectFreq[question.subject] || 0;
    score += subjectWeight * 3;
    if (subjectWeight > 0) {
      reasons.push(`${question.subject}学科薄弱`);
    }

    // 知识点匹配度（权重：50）
    if (
      question.knowledgePointIds &&
      Array.isArray(question.knowledgePointIds)
    ) {
      for (const kpId of question.knowledgePointIds) {
        if (errorAnalysis.knowledgePointFreq[kpId]) {
          score += errorAnalysis.knowledgePointFreq[kpId] * 5;
          relatedKPs.push(`知识点${kpId}`);
        }
      }
    }

    if (relatedKPs.length > 0) {
      reasons.push(`包含你的薄弱知识点`);
    }

    // 难度匹配度（权重：10）
    if (question.difficulty === "medium") {
      score += 5; // 中等难度优先
      reasons.push("难度适中");
    } else if (question.difficulty === "hard") {
      score += 3; // 困难题次之
    }

    // 年份新鲜度（权重：10）
    if (question.examYear) {
      const yearScore = Math.max(0, question.examYear - 2020);
      score += yearScore;
      if (question.examYear >= 2023) {
        reasons.push("近年真题");
      }
    }

    // 只推荐有一定相关性的题目（score > 5）
    if (score > 5) {
      recommendations.push({
        question,
        score,
        reason: reasons.join("，"),
        relatedKnowledgePoints: relatedKPs,
      });
    }
  }

  // 6. 按分数排序并返回top N
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, limit);
}

/**
 * 获取推荐统计信息
 */
export async function getRecommendationStats(userId: number) {
  const db = getDb();

  // 获取错题分析
  const errorAnalysis = await getUserErrorKnowledgePoints(userId);

  // 获取推荐题目数量
  // @ts-ignore
  const recommendations = await getRecommendedRealExams(userId, 100);

  return {
    totalErrorQuestions: Object.values(errorAnalysis.knowledgePointFreq).reduce(
      (a, b) => a + b,
      0
    ),
    weakSubjects: errorAnalysis.subjects,
    weakKnowledgePointsCount: errorAnalysis.knowledgePoints.length,
    recommendedQuestionsCount: recommendations.length,
  };
}
