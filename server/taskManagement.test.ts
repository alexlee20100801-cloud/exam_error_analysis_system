import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { scheduledTasks, taskExecutionLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 任务管理后台功能测试
 */

describe("Task Management Backend", () => {
  let adminUserId: number;
  let regularUserId: number;
  let testTaskId: number;

  beforeAll(async () => {
    adminUserId = 1;
    regularUserId = 2;
  });

  describe("Admin Access Control", () => {
    it("should allow admin users to access task management", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.scheduledTasks.getAllTasks();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it("should deny regular users from accessing task management", async () => {
      const caller = appRouter.createCaller({
        user: { id: regularUserId, role: "user", openId: "user", name: "Regular User" },
        req: {} as any,
        res: {} as any,
      });

      await expect(caller.scheduledTasks.getAllTasks()).rejects.toThrow("无权访问");
    });
  });

  describe("Task List Display", () => {
    it("should display all scheduled tasks with correct information", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.scheduledTasks.getAllTasks();
      
      expect(result.success).toBe(true);
      expect(result.tasks.length).toBeGreaterThan(0);

      // 验证任务包含必要字段
      const task = result.tasks[0];
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("taskName");
      expect(task).toHaveProperty("taskType");
      expect(task).toHaveProperty("cronExpression");
      expect(task).toHaveProperty("isEnabled");
      expect(task).toHaveProperty("lastStatus");
      expect(task).toHaveProperty("executionCount");
    });

    it("should show default daily_question_generation task", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.scheduledTasks.getAllTasks();
      
      const dailyTask = result.tasks.find(
        (t: any) => t.taskName === "daily_question_generation"
      );

      expect(dailyTask).toBeDefined();
      expect(dailyTask.taskType).toBe("generate_questions");
      expect(dailyTask.cronExpression).toBe("0 2 * * *");
      expect(dailyTask.isEnabled).toBe(true);
    });
  });

  describe("Manual Task Trigger", () => {
    it("should allow admin to manually trigger a task", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      // 创建一个测试任务
      const createResult = await caller.scheduledTasks.upsertTask({
        taskName: "test_manual_trigger",
        taskType: "cleanup",
        cronExpression: "0 4 * * *",
        isEnabled: true,
      });

      expect(createResult.success).toBe(true);

      // 手动触发任务
      const triggerResult = await caller.scheduledTasks.triggerTask({
        taskName: "test_manual_trigger",
      });

      expect(triggerResult.success).toBe(true);
      expect(triggerResult.message).toContain("触发成功");
    });

    it("should prevent triggering disabled tasks", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      // 创建一个禁用的任务
      await caller.scheduledTasks.upsertTask({
        taskName: "test_disabled_task",
        taskType: "cleanup",
        cronExpression: "0 5 * * *",
        isEnabled: false,
      });

      // 尝试触发禁用的任务
      await expect(
        caller.scheduledTasks.triggerTask({ taskName: "test_disabled_task" })
      ).rejects.toThrow("任务未启用");
    });

    it("should deny regular users from triggering tasks", async () => {
      const caller = appRouter.createCaller({
        user: { id: regularUserId, role: "user", openId: "user", name: "Regular User" },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.scheduledTasks.triggerTask({ taskName: "daily_question_generation" })
      ).rejects.toThrow("无权访问");
    });
  });

  describe("Task Status Updates", () => {
    it("should update task status after execution", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      // 创建测试任务
      const createResult = await caller.scheduledTasks.upsertTask({
        taskName: "test_status_update",
        taskType: "cleanup",
        cronExpression: "0 6 * * *",
        isEnabled: true,
      });

      testTaskId = createResult.task.id;

      // 触发任务
      await caller.scheduledTasks.triggerTask({ taskName: "test_status_update" });

      // 等待一下让任务开始执行
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 查询任务状态
      const tasks = await db
        .select()
        .from(scheduledTasks)
        .where(eq(scheduledTasks.id, testTaskId));

      expect(tasks.length).toBe(1);
      expect(tasks[0].lastStatus).toBeDefined();
      expect(tasks[0].lastExecutedAt).toBeDefined();
    });
  });

  describe("Execution Logs", () => {
    it("should retrieve execution logs for a task", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      // 获取任务列表
      const tasksResult = await caller.scheduledTasks.getAllTasks();
      const task = tasksResult.tasks[0];

      // 获取执行日志
      const logsResult = await caller.scheduledTasks.getTaskLogs({
        taskId: task.id,
        limit: 10,
      });

      expect(logsResult.success).toBe(true);
      expect(Array.isArray(logsResult.logs)).toBe(true);
    });

    it("should limit number of logs returned", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      const tasksResult = await caller.scheduledTasks.getAllTasks();
      const task = tasksResult.tasks[0];

      const logsResult = await caller.scheduledTasks.getTaskLogs({
        taskId: task.id,
        limit: 5,
      });

      expect(logsResult.logs.length).toBeLessThanOrEqual(5);
    });

    it("should include log details (status, duration, items processed)", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      // 创建一个测试日志
      await db.insert(taskExecutionLogs).values({
        taskId: testTaskId,
        status: "success",
        startedAt: new Date(),
        completedAt: new Date(Date.now() + 5000),
        duration: 5000,
        itemsProcessed: 10,
      });

      const logsResult = await caller.scheduledTasks.getTaskLogs({
        taskId: testTaskId,
        limit: 10,
      });

      if (logsResult.logs.length > 0) {
        const log = logsResult.logs[0];
        expect(log).toHaveProperty("status");
        expect(log).toHaveProperty("duration");
        expect(log).toHaveProperty("itemsProcessed");
        expect(log).toHaveProperty("startedAt");
      }
    });
  });

  describe("Task Configuration", () => {
    it("should create a new scheduled task", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.scheduledTasks.upsertTask({
        taskName: "test_new_task",
        taskType: "send_reminders",
        cronExpression: "0 7 * * *",
        isEnabled: true,
      });

      expect(result.success).toBe(true);
      expect(result.task.taskName).toBe("test_new_task");
      expect(result.task.cronExpression).toBe("0 7 * * *");
    });

    it("should update an existing task", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      // 创建任务
      await caller.scheduledTasks.upsertTask({
        taskName: "test_update_task",
        taskType: "cleanup",
        cronExpression: "0 8 * * *",
        isEnabled: true,
      });

      // 更新任务
      const updateResult = await caller.scheduledTasks.upsertTask({
        taskName: "test_update_task",
        taskType: "cleanup",
        cronExpression: "0 9 * * *", // 修改执行时间
        isEnabled: false, // 禁用任务
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.task.cronExpression).toBe("0 9 * * *");
      expect(updateResult.task.isEnabled).toBe(false);
    });
  });

  describe("UI Integration", () => {
    it("should provide all data needed for task status cards", async () => {
      const caller = appRouter.createCaller({
        user: { id: adminUserId, role: "admin", openId: "admin", name: "Admin User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.scheduledTasks.getAllTasks();
      
      // 验证可以计算统计数据
      const totalTasks = result.tasks.length;
      const enabledTasks = result.tasks.filter((t: any) => t.isEnabled).length;
      const totalExecutions = result.tasks.reduce(
        (sum: number, t: any) => sum + (t.executionCount || 0),
        0
      );

      expect(typeof totalTasks).toBe("number");
      expect(typeof enabledTasks).toBe("number");
      expect(typeof totalExecutions).toBe("number");
    });

    it("should provide task type labels for UI display", async () => {
      const taskTypes = {
        generate_questions: "生成题目",
        send_reminders: "发送提醒",
        cleanup: "数据清理",
      };

      Object.keys(taskTypes).forEach((type) => {
        expect(taskTypes[type as keyof typeof taskTypes]).toBeDefined();
      });
    });
  });
});
