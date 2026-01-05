import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import { users, learningGoals, goalReminders, parentStudentRelations } from "../drizzle/schema";
import * as reminderService from "./goalReminderService";
import { eq } from "drizzle-orm";

describe("Goal Reminder Service", () => {
  let studentId: number;
  let parentId: number;
  let goalId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 清理测试数据
    await db.delete(goalReminders);
    await db.delete(learningGoals);
    await db.delete(parentStudentRelations);
    await db.delete(users);

    // 创建测试学生
    const studentResult = await db
      .insert(users)
      .values({
        openId: "test-student-openid",
        name: "测试学生",
        userType: "student",
        grade: "junior1",
      });
    studentId = Number(studentResult[0].insertId);

    // 创建测试家长
    const parentResult = await db
      .insert(users)
      .values({
        openId: "test-parent-openid",
        name: "测试家长",
        userType: "parent",
      });
    parentId = Number(parentResult[0].insertId);

    // 创建家长-学生关联
    await db.insert(parentStudentRelations).values({
      parentId,
      studentId,
      inviteCode: "TEST1234",
      acceptedAt: Date.now(),
    });

    // 创建测试学习目标
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const goalResult = await db
      .insert(learningGoals)
      .values({
        studentId,
        goalType: "error_count",
        targetValue: 5,
        currentValue: 0,
        startDate: now,
        endDate: tomorrow,
        period: "daily",
      });
    goalId = Number(goalResult[0].insertId);
  });

  it("应该检测到即将到期的目标并发送提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 更新目标截止日期为2小时后
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db
      .update(learningGoals)
      .set({ endDate: twoHoursLater })
      .where(eq(learningGoals.id, goalId));

    // 执行检查
    await reminderService.checkAndSendReminders();

    // 验证提醒已创建
    const reminders = await db
      .select()
      .from(goalReminders)
      .where(eq(goalReminders.goalId, goalId));

    expect(reminders.length).toBe(1);
    expect(reminders[0].reminderType).toBe("deadline_approaching");
    expect(reminders[0].parentId).toBe(parentId);
  });

  it("应该检测到进度落后的目标并发送提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 更新目标截止日期为12小时后，但进度为0
    const twelveHoursLater = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await db
      .update(learningGoals)
      .set({
        endDate: twelveHoursLater,
        currentValue: 0,
        targetValue: 10,
      })
      .where(eq(learningGoals.id, goalId));

    // 执行检查
    await reminderService.checkAndSendReminders();

    // 验证提醒已创建
    const reminders = await db
      .select()
      .from(goalReminders)
      .where(eq(goalReminders.goalId, goalId));

    expect(reminders.length).toBeGreaterThan(0);
    const progressReminder = reminders.find((r) => r.reminderType === "progress_behind");
    expect(progressReminder).toBeDefined();
  });

  it("应该检测到已完成的目标并发送祝贺提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 更新目标为已完成
    await db
      .update(learningGoals)
      .set({
        currentValue: 5,
        targetValue: 5,
        status: "completed",
      })
      .where(eq(learningGoals.id, goalId));

    // 执行检查
    await reminderService.checkAndSendReminders();

    // 验证提醒已创建
    const reminders = await db
      .select()
      .from(goalReminders)
      .where(eq(goalReminders.goalId, goalId));

    expect(reminders.length).toBeGreaterThan(0);
    const achievedReminder = reminders.find((r) => r.reminderType === "goal_achieved");
    expect(achievedReminder).toBeDefined();
  });

  it("应该检测到未完成的目标并发送提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 更新目标为已过期但未完成
    const pastDeadline = new Date(Date.now() - 1000);
    await db
      .update(learningGoals)
      .set({
        endDate: pastDeadline,
        currentValue: 2,
        targetValue: 5,
      })
      .where(eq(learningGoals.id, goalId));

    // 执行检查
    await reminderService.checkAndSendReminders();

    // 验证提醒已创建
    const reminders = await db
      .select()
      .from(goalReminders)
      .where(eq(goalReminders.goalId, goalId));

    expect(reminders.length).toBeGreaterThan(0);
    const failedReminder = reminders.find((r) => r.reminderType === "goal_failed");
    expect(failedReminder).toBeDefined();
  });

  it("应该获取家长的所有提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建多个提醒
    const sentTime = new Date();
    await db.insert(goalReminders).values([
      {
        goalId,
        parentId,
        studentId,
        reminderType: "deadline_approaching",
        message: "测试提醒1",
        read: false,
        sentAt: sentTime,
      },
      {
        goalId,
        parentId,
        studentId,
        reminderType: "progress_behind",
        message: "测试提醒2",
        read: false,
        sentAt: sentTime,
      },
    ]);

    // 获取提醒
    const reminders = await reminderService.getParentReminders(parentId);

    expect(reminders.length).toBe(2);
    expect(reminders[0].parentId).toBe(parentId);
  });

  it("应该标记提醒为已读", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建提醒
    const reminderResult = await db
      .insert(goalReminders)
      .values({
        goalId,
        parentId,
        studentId,
        reminderType: "deadline_approaching",
        message: "测试提醒",
        read: false,
        sentAt: new Date(),
      });
    const reminderId = Number(reminderResult[0].insertId);

    // 标记为已读
    const result = await reminderService.markReminderAsRead(reminderId);

    expect(result.success).toBe(true);

    // 验证已更新
    const [updated] = await db
      .select()
      .from(goalReminders)
      .where(eq(goalReminders.id, reminderId));

    expect(updated.read).toBe(true);
  });

  it("不应该为相同目标重复发送相同类型的提醒", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 更新目标截止日期为2小时后
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db
      .update(learningGoals)
      .set({ endDate: twoHoursLater })
      .where(eq(learningGoals.id, goalId));

    // 第一次检查
    await reminderService.checkAndSendReminders();

    // 第二次检查
    await reminderService.checkAndSendReminders();

    // 验证只有一个提醒
    const reminders = await db
      .select()
      .from(goalReminders)
      .where(eq(goalReminders.goalId, goalId));

    expect(reminders.length).toBe(1);
  });
});
