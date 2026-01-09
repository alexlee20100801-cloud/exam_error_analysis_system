import { getDb } from "../db";
import { aiAdviceHistory, reviewTasks } from "../../drizzle/schema";
import { createRemindersForTask, cancelRemindersForCompletedTask } from "./reviewTaskReminderService";
import { eq, and, desc } from "drizzle-orm";
import type { LearningAdvice } from "./aiLearningAdviceService";

/**
 * 复习任务管理服务
 */

/**
 * 保存AI建议并创建复习任务
 */
export async function saveAdviceAndCreateTasks(
  userId: string,
  advice: LearningAdvice,
  totalErrorQuestions: number,
  masteryRate: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 保存AI建议历史
  const [adviceRecord] = await db.insert(aiAdviceHistory).values({
    // @ts-ignore
    userId,
    adviceData: advice,
    totalErrorQuestions,
    masteryRate,
  });

  const adviceHistoryId = Number(adviceRecord.insertId);

  // 创建复习任务
  if (advice.reviewPlan.length > 0) {
    const tasks = advice.reviewPlan.map((plan: any) => ({
      userId,
      adviceHistoryId,
      subject: plan.subject,
      knowledgePoint: plan.knowledgePoint,
      reason: plan.reason,
      suggestedTime: plan.suggestedTime,
      priority: plan.priority,
      scheduledDate: parseSuggestedTimeToDate(plan.suggestedTime),
    }));

    const [result] = await db.insert(reviewTasks as any).values(tasks);
    
    // 为每个任务创建提醒
    const firstInsertId = Number(result.insertId);
    for (let i = 0; i < tasks.length; i++) {
      const taskId = firstInsertId + i;
      const task = tasks[i];
      if (task.scheduledDate) {
        await createRemindersForTask(userId, taskId, task.scheduledDate);
      }
    }
  }

  return adviceHistoryId;
}

/**
 * 解析建议时间文本为具体日期
 */
function parseSuggestedTimeToDate(suggestedTime: string): Date {
  const now = new Date();
  now.setHours(19, 0, 0, 0); // 默认晚上7点

  const timeText = suggestedTime.toLowerCase();

  if (timeText.includes("今天") || timeText.includes("today")) {
    return now;
  } else if (timeText.includes("明天") || timeText.includes("tomorrow")) {
    now.setDate(now.getDate() + 1);
    return now;
  } else if (timeText.includes("后天")) {
    now.setDate(now.getDate() + 2);
    return now;
  } else if (timeText.includes("本周") || timeText.includes("this week")) {
    now.setDate(now.getDate() + 3);
    return now;
  } else if (timeText.includes("下周") || timeText.includes("next week")) {
    now.setDate(now.getDate() + 7);
    return now;
  } else {
    now.setDate(now.getDate() + 3);
    return now;
  }
}

/**
 * 获取用户的所有复习任务
 */
export async function getUserReviewTasks(userId: number, includeCompleted = true) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  let query = db
    .select()
    .from(reviewTasks)
    .where(eq(reviewTasks.userId, userId))
    .orderBy(desc(reviewTasks.createdAt));

  const tasks = await query;

  if (!includeCompleted) {
    return tasks.filter((task) => !task.completed);
  }

  return tasks;
}

/**
 * 获取最新的AI建议及其任务
 */
export async function getLatestAdviceWithTasks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 获取最新的AI建议
  const [latestAdvice] = await db
    .select()
    .from(aiAdviceHistory)
    .where(eq(aiAdviceHistory.userId, userId))
    .orderBy(desc(aiAdviceHistory.createdAt))
    .limit(1);

  if (!latestAdvice) {
    return null;
  }

  // 获取该建议的所有任务
  const tasks = await db
    .select()
    .from(reviewTasks)
    .where(eq(reviewTasks.adviceHistoryId, latestAdvice.id))
    .orderBy(reviewTasks.priority);

  return {
    advice: latestAdvice,
    tasks,
  };
}

/**
 * 标记任务完成/未完成
 */
export async function toggleTaskCompletion(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 获取任务当前状态
  const [task] = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.id, taskId), eq(reviewTasks.userId, userId)))
    .limit(1);

  if (!task) {
    throw new Error("任务不存在");
  }

  // 切换完成状态
  const newCompleted = !task.completed;
  const completedAt = newCompleted ? new Date() : null;

  await db
    .update(reviewTasks)
    .set({
      // @ts-ignore
      completed: newCompleted,
      // @ts-ignore
      completedAt,
    })
    .where(eq(reviewTasks.id, taskId));

  // 如果任务被标记为完成，取消未发送的提醒
  if (newCompleted) {
    await cancelRemindersForCompletedTask(taskId);
  }

  return {
    taskId,
    completed: newCompleted,
    completedAt,
  };
}

/**
 * 获取复习完成率统计
 */
export async function getReviewCompletionStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 获取所有任务
  const allTasks = await db
    .select()
    .from(reviewTasks)
    .where(eq(reviewTasks.userId, userId));

  if (allTasks.length === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      subjectStats: [],
    };
  }

  // 计算总体完成率
  const completedTasks = allTasks.filter((task) => task.completed).length;
  const completionRate = Math.round((completedTasks / allTasks.length) * 100);

  // 按学科统计
  const subjectMap = new Map<string, { total: number; completed: number }>();

  allTasks.forEach((task) => {
    const subject = task.subject;
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, { total: 0, completed: 0 });
    }
    const stats = subjectMap.get(subject)!;
    stats.total++;
    if (task.completed) {
      stats.completed++;
    }
  });

  const subjectStats = Array.from(subjectMap.entries()).map(([subject, stats]) => ({
    subject,
    total: stats.total,
    completed: stats.completed,
    completionRate: Math.round((stats.completed / stats.total) * 100),
  }));

  return {
    totalTasks: allTasks.length,
    completedTasks,
    completionRate,
    subjectStats,
  };
}

/**
 * 获取复习任务历史（按建议分组）
 */
export async function getReviewTaskHistory(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 获取历史AI建议
  const adviceList = await db
    .select()
    .from(aiAdviceHistory)
    .where(eq(aiAdviceHistory.userId, userId))
    .orderBy(desc(aiAdviceHistory.createdAt))
    .limit(limit);

  // 为每个建议获取任务
  const history = await Promise.all(
    adviceList.map(async (advice) => {
      const tasks = await db
        .select()
        .from(reviewTasks)
        .where(eq(reviewTasks.adviceHistoryId, advice.id))
        .orderBy(reviewTasks.priority);

      const completedCount = tasks.filter((t) => t.completed).length;
      const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

      return {
        advice,
        tasks,
        completedCount,
        totalCount: tasks.length,
        completionRate,
      };
    })
  );

  return history;
}
