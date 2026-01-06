import { getDb } from "../db";
import { userReminderSettings, reviewTaskReminders, reviewTasks } from "../../drizzle/schema";
import { eq, and, lt, lte } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * 默认提醒时间（分钟）
 * 1440 = 1天, 180 = 3小时, 60 = 1小时
 */
export const DEFAULT_REMINDER_MINUTES = [1440, 180, 60];

/**
 * 提醒类型映射
 */
const REMINDER_TYPE_MAP: Record<number, "one_day_before" | "three_hours_before" | "one_hour_before" | "custom"> = {
  1440: "one_day_before",
  180: "three_hours_before",
  60: "one_hour_before",
};

/**
 * 获取用户的提醒设置
 */
export async function getUserReminderSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const [settings] = await db
    .select()
    .from(userReminderSettings)
    .where(eq(userReminderSettings.userId, userId))
    .limit(1);

  // 如果用户没有设置，返回默认值
  if (!settings) {
    return {
      enabled: true,
      reminderMinutes: DEFAULT_REMINDER_MINUTES,
    };
  }

  return {
    enabled: settings.enabled,
    reminderMinutes: settings.reminderMinutes as number[],
  };
}

/**
 * 更新用户的提醒设置
 */
export async function updateUserReminderSettings(
  userId: number,
  enabled: boolean,
  reminderMinutes: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 检查是否已有设置
  const [existing] = await db
    .select()
    .from(userReminderSettings)
    .where(eq(userReminderSettings.userId, userId))
    .limit(1);

  if (existing) {
    // 更新现有设置
    await db
      .update(userReminderSettings)
      .set({
        enabled,
        reminderMinutes: reminderMinutes as any,
        updatedAt: new Date(),
      })
      .where(eq(userReminderSettings.userId, userId));
  } else {
    // 创建新设置
    await db.insert(userReminderSettings).values({
      userId,
      enabled,
      reminderMinutes: reminderMinutes as any,
    });
  }

  return { success: true };
}

/**
 * 为新创建的复习任务生成提醒
 */
export async function createRemindersForTask(
  userId: number,
  taskId: number,
  scheduledDate: Date | null
) {
  if (!scheduledDate) return; // 如果没有计划日期，不创建提醒

  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 获取用户的提醒设置
  const settings = await getUserReminderSettings(userId);
  if (!settings.enabled) return; // 如果用户禁用了提醒，不创建

  // 获取任务信息
  const [task] = await db
    .select()
    .from(reviewTasks)
    .where(eq(reviewTasks.id, taskId))
    .limit(1);

  if (!task) return;

  const now = new Date();
  const remindersToCreate = [];

  // 为每个提醒时间点创建提醒
  for (const minutes of settings.reminderMinutes) {
    const reminderTime = new Date(scheduledDate.getTime() - minutes * 60 * 1000);

    // 只创建未来的提醒
    if (reminderTime > now) {
      const reminderType = REMINDER_TYPE_MAP[minutes] || "custom";
      const message = `复习提醒：${task.subject}${task.knowledgePoint ? ` - ${task.knowledgePoint}` : ""}。${task.reason}`;

      remindersToCreate.push({
        userId,
        taskId,
        reminderType,
        reminderMinutes: minutes,
        scheduledTime: reminderTime,
        message,
        sent: false,
      });
    }
  }

  if (remindersToCreate.length > 0) {
    await db.insert(reviewTaskReminders).values(remindersToCreate);
  }
}

/**
 * 检查并发送到期的提醒
 * 这个函数会被定时任务调用
 */
export async function checkAndSendReminders() {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const now = new Date();

  // 查找所有未发送且已到期的提醒
  const pendingReminders = await db
    .select()
    .from(reviewTaskReminders)
    .where(
      and(
        eq(reviewTaskReminders.sent, false),
        lte(reviewTaskReminders.scheduledTime, now)
      )
    )
    .limit(100); // 一次最多处理100条

  let sentCount = 0;

  for (const reminder of pendingReminders) {
    try {
      // 发送通知给用户（项目所有者）
      const success = await notifyOwner({
        title: "复习任务提醒",
        content: reminder.message,
      });

      if (success) {
        // 标记为已发送
        await db
          .update(reviewTaskReminders)
          .set({
            sent: true,
            sentAt: new Date(),
          })
          .where(eq(reviewTaskReminders.id, reminder.id));

        sentCount++;
      }
    } catch (error) {
      console.error(`发送提醒失败 (ID: ${reminder.id}):`, error);
    }
  }

  return {
    checked: pendingReminders.length,
    sent: sentCount,
  };
}

/**
 * 删除已完成任务的未发送提醒
 */
export async function cancelRemindersForCompletedTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  // 删除该任务的所有未发送提醒
  await db
    .delete(reviewTaskReminders)
    .where(
      and(
        eq(reviewTaskReminders.taskId, taskId),
        eq(reviewTaskReminders.sent, false)
      )
    );
}

/**
 * 获取用户的提醒历史
 */
export async function getUserReminderHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const reminders = await db
    .select()
    .from(reviewTaskReminders)
    .where(eq(reviewTaskReminders.userId, userId))
    .orderBy(reviewTaskReminders.createdAt)
    .limit(limit);

  return reminders;
}
