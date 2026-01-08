import { db } from "./db";
import {
  learningReports,
  studySessions,
  errorQuestions,
  type NewLearningReport,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { calculateSubjectMastery } from "./learningAnalyticsService";

/**
 * 生成学习报告
 */
export async function generateLearningReport(
  userId: number,
  reportType: 'weekly' | 'monthly'
) {
  // 计算报告周期
  const endDate = new Date();
  const startDate = new Date();

  if (reportType === 'weekly') {
    startDate.setDate(endDate.getDate() - 7);
  } else {
    startDate.setMonth(endDate.getMonth() - 1);
  }

  const periodStart = startDate.toISOString();
  const periodEnd = endDate.toISOString();

  // 创建报告记录（状态为generating）
  const [reportRecord] = await db.insert(learningReports).values({
    userId,
    reportType,
    periodStart,
    periodEnd,
    totalStudyTime: 0,
    newQuestionsCount: 0,
    reviewedQuestionsCount: 0,
    masteredQuestionsCount: 0,
    subjectMastery: JSON.stringify({}),
    weakKnowledgePoints: JSON.stringify([]),
    status: 'generating',
    isNotified: 0,
  }).$returningId();

  try {
    // 1. 统计总学习时长
    const studyTimeResult = await db
      .select({
        totalDuration: sql<number>`COALESCE(SUM(${studySessions.duration}), 0)`,
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          gte(studySessions.startedAt, periodStart),
          lte(studySessions.startedAt, periodEnd)
        )
      );

    const totalStudyTime = Number(studyTimeResult[0]?.totalDuration || 0);

    // 2. 统计新增错题数
    const newQuestionsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(errorQuestions)
      .where(
        and(
          eq(errorQuestions.userId, userId),
          gte(errorQuestions.createdAt, periodStart),
          lte(errorQuestions.createdAt, periodEnd)
        )
      );

    const newQuestionsCount = Number(newQuestionsResult[0]?.count || 0);

    // 3. 统计复习错题数（根据reviewCount > 0）
    const reviewedQuestionsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(errorQuestions)
      .where(
        and(
          eq(errorQuestions.userId, userId),
          sql`${errorQuestions.reviewCount} > 0`,
          gte(errorQuestions.lastReviewedAt, periodStart),
          lte(errorQuestions.lastReviewedAt, periodEnd)
        )
      );

    const reviewedQuestionsCount = Number(reviewedQuestionsResult[0]?.count || 0);

    // 4. 统计掌握错题数
    const masteredQuestionsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(errorQuestions)
      .where(
        and(
          eq(errorQuestions.userId, userId),
          eq(errorQuestions.isMastered, 1),
          gte(errorQuestions.updatedAt, periodStart),
          lte(errorQuestions.updatedAt, periodEnd)
        )
      );

    const masteredQuestionsCount = Number(masteredQuestionsResult[0]?.count || 0);

    // 5. 获取各学科掌握度
    const subjectMastery = await calculateSubjectMastery(userId);
    const subjectMasteryMap: Record<string, number> = {};
    subjectMastery.forEach((item) => {
      subjectMasteryMap[item.subject] = item.masteryRate;
    });

    // 6. 识别薄弱知识点（掌握度 < 50%）
    const weakSubjects = subjectMastery
      .filter((item) => item.masteryRate < 50)
      .map((item) => ({
        subject: item.subject,
        masteryRate: item.masteryRate,
        totalQuestions: item.totalQuestions,
        masteredQuestions: item.masteredQuestions,
      }));

    // 7. 使用AI生成改进建议
    const improvementSuggestions = await generateImprovementSuggestions({
      reportType,
      totalStudyTime,
      newQuestionsCount,
      reviewedQuestionsCount,
      masteredQuestionsCount,
      subjectMastery: subjectMasteryMap,
      weakSubjects,
    });

    // 8. 计算学习进步评分（0-100）
    const progressScore = calculateProgressScore({
      totalStudyTime,
      reviewedQuestionsCount,
      masteredQuestionsCount,
      averageMastery: subjectMastery.length > 0
        ? subjectMastery.reduce((sum, item) => sum + item.masteryRate, 0) / subjectMastery.length
        : 0,
    });

    // 9. 更新报告记录
    await db
      .update(learningReports)
      .set({
        totalStudyTime,
        newQuestionsCount,
        reviewedQuestionsCount,
        masteredQuestionsCount,
        subjectMastery: JSON.stringify(subjectMasteryMap),
        weakKnowledgePoints: JSON.stringify(weakSubjects),
        improvementSuggestions,
        progressScore: progressScore.toString(),
        status: 'completed',
      })
      .where(eq(learningReports.id, reportRecord.id));

    return reportRecord.id;
  } catch (error) {
    // 标记报告生成失败
    await db
      .update(learningReports)
      .set({ status: 'failed' })
      .where(eq(learningReports.id, reportRecord.id));

    throw error;
  }
}

/**
 * 使用AI生成改进建议
 */
async function generateImprovementSuggestions(data: {
  reportType: string;
  totalStudyTime: number;
  newQuestionsCount: number;
  reviewedQuestionsCount: number;
  masteredQuestionsCount: number;
  subjectMastery: Record<string, number>;
  weakSubjects: Array<{ subject: string; masteryRate: number }>;
}): Promise<string> {
  const prompt = `作为一名专业的学习顾问，请根据以下学生的学习数据，生成个性化的学习改进建议：

报告类型：${data.reportType === 'weekly' ? '周报' : '月报'}
总学习时长：${Math.floor(data.totalStudyTime / 60)}分钟
新增错题数：${data.newQuestionsCount}
复习错题数：${data.reviewedQuestionsCount}
掌握错题数：${data.masteredQuestionsCount}

各学科掌握度：
${Object.entries(data.subjectMastery).map(([subject, rate]) => `- ${subject}: ${rate.toFixed(1)}%`).join('\n')}

薄弱学科：
${data.weakSubjects.map((s) => `- ${s.subject}: ${s.masteryRate.toFixed(1)}%`).join('\n')}

请提供：
1. 学习情况总体评价
2. 薄弱环节分析
3. 具体的改进建议（3-5条）
4. 鼓励性的总结

要求：
- 语气友好、鼓励
- 建议具体可行
- 针对薄弱点提供重点突破方向
- 字数控制在300字以内`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: '你是一名专业的学习顾问，擅长分析学生的学习数据并提供个性化的改进建议。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.choices[0]?.message?.content || '暂无改进建议';
  } catch (error) {
    console.error('Failed to generate improvement suggestions:', error);
    return '系统正在分析您的学习数据，请稍后查看详细建议。';
  }
}

/**
 * 计算学习进步评分
 */
function calculateProgressScore(data: {
  totalStudyTime: number;
  reviewedQuestionsCount: number;
  masteredQuestionsCount: number;
  averageMastery: number;
}): number {
  // 学习时长得分（最多30分）
  const timeScore = Math.min((data.totalStudyTime / 3600) * 10, 30);

  // 复习次数得分（最多20分）
  const reviewScore = Math.min(data.reviewedQuestionsCount * 2, 20);

  // 掌握数量得分（最多30分）
  const masteryScore = Math.min(data.masteredQuestionsCount * 3, 30);

  // 平均掌握度得分（最多20分）
  const avgMasteryScore = (data.averageMastery / 100) * 20;

  const totalScore = timeScore + reviewScore + masteryScore + avgMasteryScore;

  return Math.min(Math.round(totalScore), 100);
}

/**
 * 获取用户的学习报告列表
 */
export async function getUserLearningReports(
  userId: number,
  limit: number = 10
) {
  const reports = await db
    .select()
    .from(learningReports)
    .where(eq(learningReports.userId, userId))
    .orderBy(desc(learningReports.createdAt))
    .limit(limit);

  return reports;
}

/**
 * 获取学习报告详情
 */
export async function getLearningReportById(reportId: number, userId: number) {
  const reports = await db
    .select()
    .from(learningReports)
    .where(
      and(
        eq(learningReports.id, reportId),
        eq(learningReports.userId, userId)
      )
    );

  return reports[0] || null;
}
