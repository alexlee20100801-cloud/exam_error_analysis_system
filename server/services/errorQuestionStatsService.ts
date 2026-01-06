import { getDb } from "../db";
import { errorQuestions, knowledgePoints } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * 错题统计服务
 * 提供错题本数据可视化所需的统计数据
 */

/**
 * 获取错题学科分布数据（饼图）
 */
export async function getSubjectDistribution(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const result = await db
    .select({
      subject: errorQuestions.subject,
      count: sql<number>`cast(count(*) as signed)`,
    })
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, userId))
    .groupBy(errorQuestions.subject)
    .orderBy(sql`count(*) desc`);

  return result;
}

/**
 * 获取错题难度分布数据（柱状图）
 */
export async function getDifficultyDistribution(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const result = await db
    .select({
      difficulty: errorQuestions.difficulty,
      count: sql<number>`cast(count(*) as signed)`,
    })
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, userId))
    .groupBy(errorQuestions.difficulty)
    .orderBy(errorQuestions.difficulty);

  return result;
}

/**
 * 获取知识点掌握度数据（雷达图）
 * 基于错题关联的知识点，计算掌握度
 */
export async function getKnowledgePointMastery(userId: string, limit: number = 8) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 获取用户的所有错题
  const userErrorQuestions = await db
    .select()
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, userId));

  // 统计每个知识点的错题数和掌握情况
  const knowledgePointStats = new Map<number, { name: string; totalErrors: number; masteredErrors: number }>();

  for (const question of userErrorQuestions) {
    if (!question.knowledgePointIds || question.knowledgePointIds.length === 0) continue;

    for (const kpId of question.knowledgePointIds) {
      if (!knowledgePointStats.has(kpId)) {
        // 获取知识点名称
        const [kp] = await db
          .select()
          .from(knowledgePoints)
          .where(eq(knowledgePoints.id, kpId))
          .limit(1);

        if (kp) {
          knowledgePointStats.set(kpId, {
            name: kp.name,
            totalErrors: 0,
            masteredErrors: 0,
          });
        }
      }

      const stats = knowledgePointStats.get(kpId);
      if (stats) {
        stats.totalErrors++;
        if (question.isMastered) {
          stats.masteredErrors++;
        }
      }
    }
  }

  // 计算掌握度（已掌握错题数 / 总错题数 * 100）
  const masteryData = Array.from(knowledgePointStats.entries())
    .map(([kpId, stats]) => ({
      knowledgePointId: kpId,
      knowledgePointName: stats.name,
      masteryLevel: stats.totalErrors > 0 
        ? Math.round((stats.masteredErrors / stats.totalErrors) * 100)
        : 0,
      totalErrors: stats.totalErrors,
      masteredErrors: stats.masteredErrors,
    }))
    .sort((a, b) => b.totalErrors - a.totalErrors) // 按错题数量排序
    .slice(0, limit); // 取前N个

  return masteryData;
}

/**
 * 获取错题统计总览
 */
export async function getErrorQuestionOverview(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 总错题数
  const [totalResult] = await db
    .select({
      count: sql<number>`cast(count(*) as signed)`,
    })
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, userId));

  // 已分析错题数
  const [analyzedResult] = await db
    .select({
      count: sql<number>`cast(count(*) as signed)`,
    })
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.isAnalyzed, true)
      )
    );

  // 已掌握错题数
  const [masteredResult] = await db
    .select({
      count: sql<number>`cast(count(*) as signed)`,
    })
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.isMastered, true)
      )
    );

  // 按难度统计
  const difficultyStats = await getDifficultyDistribution(userId);

  // 按学科统计
  const subjectStats = await getSubjectDistribution(userId);

  return {
    totalErrors: totalResult?.count || 0,
    analyzedErrors: analyzedResult?.count || 0,
    masteredErrors: masteredResult?.count || 0,
    masteryRate: totalResult?.count > 0 
      ? Math.round((masteredResult?.count || 0) / totalResult.count * 100)
      : 0,
    difficultyStats,
    subjectStats,
  };
}
