import { getDb } from "./db";
import { exams, studyPlans, errorQuestions, knowledgePoints, learningProgress } from "../drizzle/schema";
import type { InsertStudyPlan } from "../drizzle/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

/**
 * 智能复习计划生成服务
 * 基于考试日期、科学学习规律（艾宾浩斯曲线、间隔重复）反推生成复习计划
 */

/**
 * 生成复习计划
 * @param userId 用户ID
 * @param examId 考试ID
 * @returns 生成的复习计划数量
 */
export async function generateStudyPlan(userId: number, examId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 1. 获取考试信息
  const exam = await db.select().from(exams).where(and(eq(exams.id, examId), eq(exams.userId, userId))).limit(1);
  if (exam.length === 0) throw new Error("Exam not found");

  const examInfo = exam[0];
  const examDate = new Date(examInfo.examDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 计算距离考试的天数
  const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExam < 1) {
    throw new Error("考试日期已过或为今天，无法生成复习计划");
  }

  // 2. 获取该科目的所有知识点和掌握度
  const knowledgePointsList = await db
    .select({
      id: knowledgePoints.id,
      name: knowledgePoints.name,
      masteryLevel: learningProgress.masteryLevel,
      errorCount: learningProgress.errorCount,
    })
    .from(knowledgePoints)
    .leftJoin(
      learningProgress,
      and(eq(learningProgress.knowledgePointId, knowledgePoints.id), eq(learningProgress.userId, userId))
    )
    .where(and(eq(knowledgePoints.subject, examInfo.subject), eq(knowledgePoints.grade, examInfo.grade)));

  // 3. 获取该科目的所有错题
  const errorQuestionsList = await db
    .select()
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.subject, examInfo.subject),
        eq(errorQuestions.grade, examInfo.grade),
        eq(errorQuestions.isMastered, false)
      )
    )
    .orderBy(desc(errorQuestions.difficulty));

  // 4. 计算知识点优先级（基于掌握度、错题数量）
  const knowledgePointsWithPriority = knowledgePointsList.map((kp) => {
    const masteryLevel = kp.masteryLevel || 0;
    const errorCount = kp.errorCount || 0;

    // 优先级计算：掌握度越低、错题越多，优先级越高
    const priority = Math.round((100 - masteryLevel) * 0.6 + Math.min(errorCount * 5, 40));

    return {
      id: kp.id,
      name: kp.name,
      priority,
      masteryLevel,
    };
  });

  // 按优先级排序
  knowledgePointsWithPriority.sort((a, b) => b.priority - a.priority);

  // 5. 生成复习计划
  const plans: InsertStudyPlan[] = [];

  // 计算每日可用的复习时间段
  const totalDays = daysUntilExam;

  // 艾宾浩斯复习间隔：1天、2天、4天、7天、15天
  // 根据距离考试的天数，调整复习轮次
  const reviewIntervals = [1, 2, 4, 7, 15].filter((interval) => interval < totalDays);

  // 6. 为薄弱知识点安排复习（优先级高的知识点）
  const weakKnowledgePoints = knowledgePointsWithPriority.filter((kp) => kp.masteryLevel < 70);

  for (const kp of weakKnowledgePoints.slice(0, 10)) {
    // 最多选10个薄弱知识点
    // 为每个知识点安排多次复习
    for (const interval of reviewIntervals) {
      const planDate = new Date(examDate);
      planDate.setDate(planDate.getDate() - interval);

      if (planDate >= today) {
        plans.push({
          userId,
          examId,
          planDate,
          taskType: "knowledge_point",
          targetId: kp.id,
          targetName: kp.name || undefined,
          priority: kp.priority,
          estimatedMinutes: 30,
          completed: false,
        });
      }
    }
  }

  // 7. 为错题安排复习
  for (const errorQuestion of errorQuestionsList.slice(0, 20)) {
    // 最多选20道错题
    // 为每道错题安排多次复习
    for (const interval of reviewIntervals) {
      const planDate = new Date(examDate);
      planDate.setDate(planDate.getDate() - interval);

      if (planDate >= today) {
        plans.push({
          userId,
          examId,
          planDate,
          taskType: "error_question",
          targetId: errorQuestion.id,
          targetName: errorQuestion.title || undefined,
          priority: errorQuestion.difficulty === "hard" ? 90 : errorQuestion.difficulty === "medium" ? 70 : 50,
          estimatedMinutes: 20,
          completed: false,
        });
      }
    }
  }

  // 8. 为考前冲刺安排练习（考前3天）
  for (let i = 1; i <= Math.min(3, totalDays); i++) {
    const planDate = new Date(examDate);
    planDate.setDate(planDate.getDate() - i);

    if (planDate >= today) {
      plans.push({
        userId,
        examId,
        planDate,
        taskType: "practice",
        targetId: null,
        targetName: `${examInfo.subject}综合练习`,
        priority: 90,
        estimatedMinutes: 60,
        completed: false,
      });
    }
  }

  // 9. 删除该考试的旧计划
  await db.delete(studyPlans).where(and(eq(studyPlans.userId, userId), eq(studyPlans.examId, examId)));

  // 10. 批量插入新计划
  if (plans.length > 0) {
    await db.insert(studyPlans).values(plans);
  }

  return plans.length;
}

/**
 * 获取指定日期的复习计划
 */
export async function getStudyPlansByDate(userId: number, date: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const plans = await db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.userId, userId), gte(studyPlans.planDate, startOfDay), lte(studyPlans.planDate, endOfDay)))
    .orderBy(desc(studyPlans.priority), asc(studyPlans.id));

  return plans;
}

/**
 * 获取指定日期范围的复习计划
 */
export async function getStudyPlansByDateRange(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const plans = await db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.userId, userId), gte(studyPlans.planDate, startDate), lte(studyPlans.planDate, endDate)))
    .orderBy(asc(studyPlans.planDate), desc(studyPlans.priority));

  return plans;
}

/**
 * 标记计划为已完成
 */
export async function markPlanAsCompleted(userId: number, planId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(studyPlans)
    .set({ completed: true, completedAt: new Date() })
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)));
}

/**
 * 获取复习计划统计
 */
export async function getStudyPlanStats(userId: number, examId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const allPlans = await db.select().from(studyPlans).where(and(eq(studyPlans.userId, userId), eq(studyPlans.examId, examId)));

  const totalPlans = allPlans.length;
  const completedPlans = allPlans.filter((p) => p.completed).length;
  const completionRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  return {
    totalPlans,
    completedPlans,
    completionRate,
  };
}
