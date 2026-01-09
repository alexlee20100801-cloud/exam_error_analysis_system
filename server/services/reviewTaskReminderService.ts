import { getDb } from "../db";
import { userReminderSettings, reviewTaskReminders, reviewTasks, users } from "../../drizzle/schema";
import { eq, and, lt, lte } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { sendReviewTaskReminderEmail } from "./emailNotificationService";
import { sendReviewTaskReminderWechat } from "./wechatNotificationService";

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
      notificationChannels: ["system"], // 默认只使用系统通知
    };
  }

  return {
    enabled: settings.enabled,
    reminderMinutes: settings.reminderMinutes as number[],
    notificationChannels: settings.notificationChannels as string[],
  };
}

/**
 * 更新用户的提醒设置
 */
export async function updateUserReminderSettings(
  userId: string,
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
        // 保持原有的notificationChannels，如果没有则设置为默认值
        notificationChannels: (existing.notificationChannels as string[]) || ["system"],
        updatedAt: new Date(),
      })
      .where(eq(userReminderSettings.userId, userId));
  } else {
    // 创建新设置
    await db.insert(userReminderSettings).values({
      userId,
      enabled,
      reminderMinutes: reminderMinutes as any,
      notificationChannels: ["system"], // 默认只使用系统通知
    });
  }

  return { success: true };
}

/**
 * 为新创建的复习任务生成提醒
 */
export async function createRemindersForTask(
  userId: string,
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
      // 获取用户的通知渠道偏好
      const settings = await getUserReminderSettings(reminder.userId);
      const channels = settings.notificationChannels || ["system"];

      // 获取任务详情
      const [task] = await db
        .select()
        .from(reviewTasks)
        .where(eq(reviewTasks.id, reminder.taskId))
        .limit(1);

      if (!task) {
        console.error(`任务不存在 (ID: ${reminder.taskId})`);
        continue;
      }

      const taskInfo = {
        subject: task.subject,
        knowledgePoint: task.knowledgePoint || undefined,
        reason: task.reason,
        suggestedTime: task.suggestedTime,
      };

      let anySuccess = false;

      // 根据用户偏好发送多渠道通知
      for (const channel of channels) {
        try {
          let success = false;

          switch (channel) {
            case "system":
              // 系统通知（发送给项目所有者）
              success = await notifyOwner({
                title: "复习任务提醒",
                content: reminder.message,
              });
              break;

            case "email":
              // 邮件通知
              success = await sendReviewTaskReminderEmail(reminder.userId, taskInfo);
              break;

            case "wechat":
              // 微信通知
              success = await sendReviewTaskReminderWechat(reminder.userId, taskInfo);
              break;

            default:
              console.warn(`未知的通知渠道: ${channel}`);
          }

          if (success) {
            anySuccess = true;
            console.log(`[ReminderService] Sent via ${channel} for reminder ${reminder.id}`);
          }
        } catch (error) {
          console.error(`[ReminderService] Failed to send via ${channel}:`, error);
        }
      }

      // 只要有一个渠道发送成功，就标记为已发送
      if (anySuccess) {
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
