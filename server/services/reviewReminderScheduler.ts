import cron from "node-cron";
import { db } from "../db";
import { reviewReminderSettings } from "../../drizzle/learning_analytics_schema";
import { scheduledTaskLogs } from "../../drizzle/optimization_schema";
import { errorReviewRecords } from "../../drizzle/schema";
import { userNotifications } from "../../drizzle/notification_schema";
import { eq, and, lte } from "drizzle-orm";

// 调度器状态
let schedulerRunning = false;
let cronTask: ReturnType<typeof cron.schedule> | null = null;

// 获取当前时间的HH:MM格式
function getCurrentTimeHHMM(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 检查是否是周末
function isWeekendDay(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

// 执行复习提醒检查
async function checkAndSendReminders(): Promise<{ notified: number; errors: number }> {
  const currentTime = getCurrentTimeHHMM();
  const isWeekend = isWeekendDay();
  let notifiedCount = 0;
  let errorCount = 0;

  try {
    // 查找需要发送提醒的用户设置
    const settingsToNotify = await db
      .select()
      .from(reviewReminderSettings)
      .where(and(
        eq(reviewReminderSettings.isEnabled, 1),
        eq(reviewReminderSettings.reminderTime, currentTime)
      ));

    for (const setting of settingsToNotify) {
      // 检查周末设置
      if (isWeekend && setting.remindOnWeekends === 0) {
        continue;
      }

      try {
        // 查找待复习的错题
        const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const pendingQuestions = await db
          .select()
          .from(errorReviewRecords)
          .where(and(
            eq(errorReviewRecords.userId, setting.userId),
            lte(errorReviewRecords.nextReviewAt, nowStr),
            eq(errorReviewRecords.isCompleted, 0)
          ))
          .limit(setting.maxDailyReminders);

        if (pendingQuestions.length > 0) {
          // 创建通知
          await db.insert(userNotifications).values({
            userId: setting.userId,
            title: "复习提醒",
            content: `您有 ${pendingQuestions.length} 道错题需要复习，快来巩固知识吧！`,
            type: "review_reminder",
            isRead: 0,
          });
          notifiedCount++;
        }
      } catch (err) {
        console.error(`Failed to send reminder to user ${setting.userId}:`, err);
        errorCount++;
      }
    }

    // 记录任务执行日志
    await db.insert(scheduledTaskLogs).values({
      taskType: "alert_check",
      taskName: "复习提醒检查",
      status: "success",
      executionTime: new Date(),
      duration: 0,
      details: JSON.stringify({ notified: notifiedCount, errors: errorCount }),
    });

  } catch (err) {
    console.error("Review reminder check failed:", err);
    errorCount++;
    
    // 记录失败日志
    await db.insert(scheduledTaskLogs).values({
      taskType: "alert_check",
      taskName: "复习提醒检查",
      status: "failed",
      executionTime: new Date(),
      duration: 0,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
  }

  return { notified: notifiedCount, errors: errorCount };
}

// 启动调度器
export function startReviewReminderScheduler(): void {
  if (schedulerRunning) {
    console.log("[ReviewReminderScheduler] Already running");
    return;
  }

  // 每分钟检查一次
  cronTask = cron.schedule("* * * * *", async () => {
    console.log(`[ReviewReminderScheduler] Checking reminders at ${new Date().toISOString()}`);
    const result = await checkAndSendReminders();
    console.log(`[ReviewReminderScheduler] Sent ${result.notified} reminders, ${result.errors} errors`);
  });

  schedulerRunning = true;
  console.log("[ReviewReminderScheduler] Started");
}

// 停止调度器
export function stopReviewReminderScheduler(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
  schedulerRunning = false;
  console.log("[ReviewReminderScheduler] Stopped");
}

// 获取调度器状态
export function getSchedulerStatus(): { running: boolean; lastCheck?: string } {
  return {
    running: schedulerRunning,
  };
}

// 手动触发检查
export async function triggerReminderCheck(): Promise<{ notified: number; errors: number }> {
  return await checkAndSendReminders();
}
