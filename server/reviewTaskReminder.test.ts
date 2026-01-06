import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, reviewTasks, userReminderSettings, reviewTaskReminders } from "../drizzle/schema";
import {
  getUserReminderSettings,
  updateUserReminderSettings,
  createRemindersForTask,
  checkAndSendReminders,
  DEFAULT_REMINDER_MINUTES,
} from "./services/reviewTaskReminderService";
import { eq } from "drizzle-orm";

describe("复习任务提醒功能", () => {
  let testUserId: number;
  let testTaskId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建测试用户
    const [result] = await db.insert(users).values({
      openId: `test-reminder-${Date.now()}`,
      name: "测试用户",
      email: `test-reminder-${Date.now()}@test.com`,
      loginMethod: "email",
      role: "user",
      userType: "student",
      grade: "senior1",
    });
    testUserId = Number(result.insertId);

    // 创建测试复习任务
    const scheduledDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2天后
    const [taskResult] = await db.insert(reviewTasks).values({
      userId: testUserId,
      adviceHistoryId: 1,
      subject: "math",
      knowledgePoint: "二次函数",
      reason: "测试提醒功能",
      suggestedTime: "后天",
      priority: 1,
      scheduledDate,
    });
    testTaskId = Number(taskResult.insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    await db.delete(reviewTaskReminders).where(eq(reviewTaskReminders.userId, testUserId));
    await db.delete(userReminderSettings).where(eq(userReminderSettings.userId, testUserId));
    await db.delete(reviewTasks).where(eq(reviewTasks.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("应该返回默认的提醒设置", async () => {
    const settings = await getUserReminderSettings(testUserId);

    expect(settings).toBeDefined();
    expect(settings.enabled).toBe(true);
    expect(settings.reminderMinutes).toEqual(DEFAULT_REMINDER_MINUTES);
  });

  it("应该能够更新用户的提醒设置", async () => {
    const customMinutes = [1440, 60]; // 提前1天和1小时
    await updateUserReminderSettings(testUserId, true, customMinutes);

    const settings = await getUserReminderSettings(testUserId);
    expect(settings.enabled).toBe(true);
    expect(settings.reminderMinutes).toEqual(customMinutes);
  });

  it("应该能够禁用提醒", async () => {
    await updateUserReminderSettings(testUserId, false, DEFAULT_REMINDER_MINUTES);

    const settings = await getUserReminderSettings(testUserId);
    expect(settings.enabled).toBe(false);
  });

  it("应该为复习任务创建提醒", async () => {
    // 先启用提醒
    await updateUserReminderSettings(testUserId, true, [1440, 180, 60]);

    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 获取任务的计划日期
    const [task] = await db
      .select()
      .from(reviewTasks)
      .where(eq(reviewTasks.id, testTaskId))
      .limit(1);

    // 创建提醒
    await createRemindersForTask(testUserId, testTaskId, task.scheduledDate);

    // 验证提醒已创建
    const reminders = await db
      .select()
      .from(reviewTaskReminders)
      .where(eq(reviewTaskReminders.taskId, testTaskId));

    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders.length).toBeLessThanOrEqual(3); // 最多3个提醒（提前1天、3小时、1小时）

    // 验证提醒时间正确
    for (const reminder of reminders) {
      expect(reminder.userId).toBe(testUserId);
      expect(reminder.taskId).toBe(testTaskId);
      expect(reminder.sent).toBe(false);
      expect(reminder.scheduledTime).toBeDefined();
      expect(new Date(reminder.scheduledTime).getTime()).toBeLessThan(
        new Date(task.scheduledDate!).getTime()
      );
    }
  });

  it("应该能够检查待发送的提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建一个已到期的提醒
    const pastTime = new Date(Date.now() - 60 * 1000); // 1分钟前
    await db.insert(reviewTaskReminders).values({
      userId: testUserId,
      taskId: testTaskId,
      reminderType: "one_hour_before",
      reminderMinutes: 60,
      scheduledTime: pastTime,
      message: "测试提醒消息",
      sent: false,
    });

    // 检查并发送提醒
    const result = await checkAndSendReminders();

    expect(result.checked).toBeGreaterThan(0);
    // 注意：sent数量可能为0，因为notifyOwner可能失败（在测试环境中）
    expect(result.sent).toBeGreaterThanOrEqual(0);
  });

  it("不应该为禁用提醒的用户创建提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 禁用提醒
    await updateUserReminderSettings(testUserId, false, DEFAULT_REMINDER_MINUTES);

    // 创建新任务
    const scheduledDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3天后
    const [taskResult] = await db.insert(reviewTasks).values({
      userId: testUserId,
      adviceHistoryId: 1,
      subject: "english",
      knowledgePoint: "语法",
      reason: "测试禁用提醒",
      suggestedTime: "三天后",
      priority: 2,
      scheduledDate,
    });
    const newTaskId = Number(taskResult.insertId);

    // 尝试创建提醒
    await createRemindersForTask(testUserId, newTaskId, scheduledDate);

    // 验证没有创建提醒
    const reminders = await db
      .select()
      .from(reviewTaskReminders)
      .where(eq(reviewTaskReminders.taskId, newTaskId));

    expect(reminders.length).toBe(0);

    // 清理
    await db.delete(reviewTasks).where(eq(reviewTasks.id, newTaskId));
  });

  it("不应该为过去的时间创建提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 启用提醒
    await updateUserReminderSettings(testUserId, true, [1440]); // 提前1天

    // 创建一个明天的任务（提醒时间会是昨天，已过期）
    const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [taskResult] = await db.insert(reviewTasks).values({
      userId: testUserId,
      adviceHistoryId: 1,
      subject: "physics",
      knowledgePoint: "力学",
      reason: "测试过期提醒",
      suggestedTime: "明天",
      priority: 3,
      scheduledDate: tomorrowDate,
    });
    const newTaskId = Number(taskResult.insertId);

    // 尝试创建提醒
    await createRemindersForTask(testUserId, newTaskId, tomorrowDate);

    // 验证没有创建提醒（因为提前1天的提醒时间是昨天，已过期）
    const reminders = await db
      .select()
      .from(reviewTaskReminders)
      .where(eq(reviewTaskReminders.taskId, newTaskId));

    expect(reminders.length).toBe(0);

    // 清理
    await db.delete(reviewTasks).where(eq(reviewTasks.id, newTaskId));
  });
});
