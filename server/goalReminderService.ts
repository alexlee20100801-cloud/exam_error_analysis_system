import { eq, and, lt, gte, isNull } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

/**
 * 计算目标当前完成值
 */
export async function calculateGoalProgress(goalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const goals = await db
    .select()
    .from(schema.learningGoals)
    .where(eq(schema.learningGoals.id, goalId))
    .limit(1);

  const goal = goals[0];

  if (!goal) throw new Error("Goal not found");

  const now = new Date();
  let currentValue = 0;

  switch (goal.goalType) {
    case "error_count": {
      // 统计周期内新增的错题数量
      const errors = await db
        .select()
        .from(schema.errorQuestions)
        .where(
          and(
            eq(schema.errorQuestions.userId, goal.studentId),
            gte(schema.errorQuestions.createdAt, goal.startDate),
            lt(schema.errorQuestions.createdAt, now)
          )
        );
      currentValue = errors.length;
      break;
    }

    case "mastery_rate": {
      // 计算掌握率
      const allErrors = await db
        .select()
        .from(schema.errorQuestions)
        .where(eq(schema.errorQuestions.userId, goal.studentId));

      if (allErrors.length > 0) {
        const masteredCount = allErrors.filter((e) => e.isMastered).length;
        currentValue = Math.round((masteredCount / allErrors.length) * 100);
      }
      break;
    }

    case "review_count": {
      // 统计周期内的复习次数
      const reviews = await db
        .select()
        .from(schema.errorReviewRecords)
        .where(
          and(
            eq(schema.errorReviewRecords.userId, goal.studentId),
            gte(schema.errorReviewRecords.createdAt, goal.startDate),
            lt(schema.errorReviewRecords.createdAt, now)
          )
        );
      currentValue = reviews.length;
      break;
    }

    case "study_time": {
      // 统计周期内的学习时长（分钟）
      // 这里简化处理，实际应该记录每次学习的时长
      const practices = await db
        .select()
        .from(schema.practiceRecords)
        .where(
          and(
            eq(schema.practiceRecords.userId, goal.studentId),
            gte(schema.practiceRecords.createdAt, goal.startDate),
            lt(schema.practiceRecords.createdAt, now)
          )
        );
      // 假设每次练习平均10分钟
      currentValue = practices.length * 10;
      break;
    }
  }

  // 更新目标的当前值
  await db
    .update(schema.learningGoals)
    .set({ currentValue, updatedAt: now })
    .where(eq(schema.learningGoals.id, goalId));

  return { currentValue, targetValue: goal.targetValue };
}

/**
 * 检查是否需要发送提醒
 */
export async function checkAndSendReminders() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const now = new Date();

  // 获取所有未完成的目标
  const activeGoals = await db
    .select()
    .from(schema.learningGoals)
    .where(
      and(
        eq(schema.learningGoals.completed, false),
        lt(schema.learningGoals.endDate, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) // 截止日期在7天内
      )
    );

  for (const goal of activeGoals) {
    // 计算当前进度
    const { currentValue, targetValue } = await calculateGoalProgress(goal.id);

    const progressRate = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
    const daysLeft = Math.ceil((goal.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    let reminderType: "deadline_approaching" | "progress_behind" | "goal_failed" | "goal_achieved" | null = null;
    let message = "";

    // 判断提醒类型
    if (currentValue >= targetValue && !goal.completed) {
      // 目标已达成
      reminderType = "goal_achieved";
      message = `恭喜！孩子已完成学习目标"${getGoalTypeName(goal.goalType)}"，当前进度 ${currentValue}/${targetValue}`;
      
      // 标记目标为已完成
      await db
        .update(schema.learningGoals)
        .set({ completed: true, completedAt: now })
        .where(eq(schema.learningGoals.id, goal.id));
    } else if (daysLeft <= 0 && currentValue < targetValue) {
      // 目标已过期但未完成
      reminderType = "goal_failed";
      message = `学习目标"${getGoalTypeName(goal.goalType)}"已截止，但未完成。目标值 ${targetValue}，实际完成 ${currentValue}`;
    } else if (daysLeft <= 3 && progressRate < 50) {
      // 截止日期临近且进度落后
      reminderType = "deadline_approaching";
      message = `学习目标"${getGoalTypeName(goal.goalType)}"还有 ${daysLeft} 天截止，当前进度 ${progressRate.toFixed(0)}%，请督促孩子加快学习`;
    } else if (progressRate < 30 && daysLeft > 3) {
      // 进度严重落后
      reminderType = "progress_behind";
      message = `学习目标"${getGoalTypeName(goal.goalType)}"进度落后，当前仅完成 ${progressRate.toFixed(0)}%，请关注孩子的学习情况`;
    }

    if (reminderType && goal.parentId) {
      // 检查是否已经发送过相同类型的提醒（24小时内）
      const recentReminder = await db
        .select()
        .from(schema.goalReminders)
        .where(
          and(
            eq(schema.goalReminders.goalId, goal.id),
            eq(schema.goalReminders.reminderType, reminderType),
            gte(schema.goalReminders.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))
          )
        )
        .limit(1);

      const recentReminderExists = recentReminder.length > 0;

      if (!recentReminderExists) {
        // 创建提醒记录
        await db.insert(schema.goalReminders).values({
          goalId: goal.id,
          parentId: goal.parentId,
          studentId: goal.studentId,
          reminderType,
          message,
          sent: true,
          sentAt: now,
        });

        // 发送通知给家长
        await notifyOwner({
          title: "学习目标提醒",
          content: message,
        });
      }
    }
  }
}

/**
 * 获取家长的所有提醒
 */
export async function getParentReminders(parentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const reminders = await db
    .select()
    .from(schema.goalReminders)
    .where(eq(schema.goalReminders.parentId, parentId))
    .orderBy(schema.goalReminders.createdAt)
    .limit(50);

  return reminders;
}

/**
 * 标记提醒为已读
 */
export async function markReminderAsRead(reminderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  await db
    .update(schema.goalReminders)
    .set({ read: true, readAt: new Date() })
    .where(eq(schema.goalReminders.id, reminderId));

  return { success: true };
}

/**
 * 获取目标类型的中文名称
 */
function getGoalTypeName(goalType: string): string {
  const names: Record<string, string> = {
    error_count: "错题数量控制",
    mastery_rate: "知识点掌握率",
    review_count: "复习次数",
    study_time: "学习时长",
  };
  return names[goalType] || goalType;
}
