import { getDb } from "../db";
import { practicePools, questions, errorQuestions } from "../../drizzle/schema";
import { eq, and, ne, inArray, sql } from "drizzle-orm";

/**
 * 推荐理由类型
 */
export type RecommendReason = 
  | "same_knowledge_point"  // 同知识点
  | "similar_difficulty"     // 相似难度
  | "same_question_type"     // 相同题型
  | "error_prone";           // 易错题型

/**
 * 相似题推荐结果
 */
export interface SimilarPracticeRecommendation {
  practicePoolId: number;
  practiceQuestion: any;
  errorQuestion: any;
  similarity: number; // 相似度评分 0-100
  reasons: RecommendReason[];
  reasonTexts: string[];
}

/**
 * 获取相似题推荐
 * @param userId 用户ID
 * @param currentPracticePoolId 当前练习池ID
 * @param limit 推荐数量限制
 */
export async function getSimilarPractices(
  userId: number,
  currentPracticePoolId: number,
  limit: number = 5
): Promise<SimilarPracticeRecommendation[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. 获取当前练习池信息
  const [currentPool] = await db
    .select()
    .from(practicePools)
    .where(
      and(
        eq(practicePools.id, currentPracticePoolId),
        eq(practicePools.userId, userId)
      )
    )
    .limit(1);

  if (!currentPool) {
    throw new Error("Practice pool not found");
  }

  // 2. 获取当前练习题信息
  const [currentQuestion] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, currentPool.practiceQuestionId))
    .limit(1);

  if (!currentQuestion) {
    throw new Error("Practice question not found");
  }

  // 3. 获取当前错题信息
  const [currentErrorQuestion] = await db
    .select()
    .from(errorQuestions)
    .where(eq(errorQuestions.id, currentPool.sourceErrorQuestionId))
    .limit(1);

  if (!currentErrorQuestion) {
    throw new Error("Error question not found");
  }

  // 4. 查找用户的其他练习池（排除当前的和已完成的）
  const otherPools = await db
    .select({
      pool: practicePools,
      question: questions,
      errorQuestion: errorQuestions,
    })
    .from(practicePools)
    .leftJoin(questions, eq(practicePools.practiceQuestionId, questions.id))
    .leftJoin(errorQuestions, eq(practicePools.sourceErrorQuestionId, errorQuestions.id))
    .where(
      and(
        eq(practicePools.userId, userId),
        ne(practicePools.id, currentPracticePoolId),
        eq(practicePools.status, "pending") // 只推荐未完成的
      )
    )
    .limit(50); // 先取50个候选

  // 5. 计算相似度并排序
  const recommendations: SimilarPracticeRecommendation[] = [];

  for (const item of otherPools) {
    if (!item.question || !item.errorQuestion) continue;

    const reasons: RecommendReason[] = [];
    const reasonTexts: string[] = [];
    let similarity = 0;

    // 检查知识点匹配（权重40分）
    const currentKnowledgePoints = typeof currentErrorQuestion.knowledgePointIds === 'string' 
      ? JSON.parse(currentErrorQuestion.knowledgePointIds || "[]") 
      : (currentErrorQuestion.knowledgePointIds || []);
    const candidateKnowledgePoints = typeof item.errorQuestion.knowledgePointIds === 'string'
      ? JSON.parse(item.errorQuestion.knowledgePointIds || "[]")
      : (item.errorQuestion.knowledgePointIds || []);
    const hasCommonKnowledgePoint = currentKnowledgePoints.some((kp: number) =>
      candidateKnowledgePoints.includes(kp)
    );
    if (hasCommonKnowledgePoint) {
      similarity += 40;
      reasons.push("same_knowledge_point");
      reasonTexts.push("同知识点");
    }

    // 检查学科匹配（权重20分）
    if (currentErrorQuestion.subject === item.errorQuestion.subject) {
      similarity += 20;
    }

    // 检查难度匹配（权重20分）
    if (currentPool.difficulty === item.pool.difficulty) {
      similarity += 20;
      reasons.push("similar_difficulty");
      reasonTexts.push("相似难度");
    } else {
      // 相邻难度给10分
      const difficultyOrder = ["easy", "medium", "hard"];
      const currentDiffIndex = difficultyOrder.indexOf(currentPool.difficulty);
      const candidateDiffIndex = difficultyOrder.indexOf(item.pool.difficulty);
      if (Math.abs(currentDiffIndex - candidateDiffIndex) === 1) {
        similarity += 10;
      }
    }

    // 检查题型匹配（权重20分）
    if (currentQuestion.questionType === item.question.questionType) {
      similarity += 20;
      reasons.push("same_question_type");
      reasonTexts.push("相同题型");
    }

    // 只推荐相似度>=30的题目
    if (similarity >= 30) {
      recommendations.push({
        practicePoolId: item.pool.id,
        practiceQuestion: item.question,
        errorQuestion: item.errorQuestion,
        similarity,
        reasons,
        reasonTexts,
      });
    }
  }

  // 6. 按相似度排序并返回前N个
  recommendations.sort((a, b) => b.similarity - a.similarity);
  return recommendations.slice(0, limit);
}

/**
 * 获取热门练习推荐（基于其他学生的练习数据）
 * @param userId 用户ID
 * @param subject 学科
 * @param grade 年级
 * @param limit 推荐数量
 */
export async function getPopularPractices(
  userId: number,
  subject: string,
  grade: string,
  limit: number = 5
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 查询该学科下，被最多学生练习的题目
  const popularPractices = await db
    .select({
      practiceQuestionId: practicePools.practiceQuestionId,
      practiceCount: sql<number>`COUNT(DISTINCT ${practicePools.userId})`,
      avgScore: sql<number>`AVG(${practicePools.score})`,
    })
    .from(practicePools)
    .leftJoin(errorQuestions, eq(practicePools.sourceErrorQuestionId, errorQuestions.id))
    .where(
      and(
        sql`${errorQuestions.subject} = ${subject}`,
        ne(practicePools.userId, userId) // 排除当前用户
      )
    )
    .groupBy(practicePools.practiceQuestionId)
    .orderBy(sql`COUNT(DISTINCT ${practicePools.userId}) DESC`)
    .limit(limit);

  return popularPractices;
}
