import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { scheduledTasks, practicePools, errorQuestions, questions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 定时任务和错题转练习题功能测试
 */

describe("Scheduled Tasks and Practice Pools", () => {
  let testUserId: number;
  let testErrorQuestionId: number;

  beforeAll(async () => {
    // 使用测试用户ID
    testUserId = 1;
  });

  describe("Scheduled Tasks API", () => {
    it("should get all scheduled tasks", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.scheduledTasks.getAllTasks();
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.tasks)).toBe(true);
      
      // 应该至少有一个默认的题目生成任务
      const questionGenTask = result.tasks.find(
        (t: any) => t.taskName === "daily_question_generation"
      );
      expect(questionGenTask).toBeDefined();
      expect(questionGenTask?.taskType).toBe("generate_questions");
    });

    it("should create or update a scheduled task", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.scheduledTasks.upsertTask({
        taskName: "test_task",
        taskType: "cleanup",
        cronExpression: "0 3 * * *", // 每天凌晨3点
        isEnabled: true,
      });

      expect(result.success).toBe(true);
      expect(result.task).toBeDefined();
    });

    it("should deny non-admin users from accessing scheduled tasks", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      await expect(caller.scheduledTasks.getAllTasks()).rejects.toThrow("无权访问");
    });
  });

  describe("Practice Pools API", () => {
    beforeAll(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 创建测试错题
      const errorResult = await db.insert(errorQuestions).values({
        userId: testUserId,
        title: "测试错题",
        content: "这是一道测试错题",
        schoolLevel: "junior",
        subject: "math",
        grade: "junior1",
        difficulty: "medium",
        questionType: "choice",
        userAnswer: "A",
        correctAnswer: "B",
        knowledgePointIds: [1],
        tags: ["测试"],
      });

      testErrorQuestionId = errorResult[0].insertId;
    });

    it("should generate practice questions from error question", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.practicePools.generateFromError({
        errorQuestionId: testErrorQuestionId,
        count: 2,
      });

      expect(result.success).toBe(true);
      expect(result.generatedCount).toBeGreaterThan(0);
    }, 30000); // 增加超时到30秒，因为AI生成需要时间

    it("should get user practice pool", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.practicePools.getMyPracticePool({
        status: "pending",
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.practices)).toBe(true);
    });

    it("should get practice questions by error question", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.practicePools.getByErrorQuestion({
        errorQuestionId: testErrorQuestionId,
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.practices)).toBe(true);
    });

    it("should get practice stats", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.practicePools.getStats();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(typeof result.stats.total).toBe("number");
      expect(typeof result.stats.completed).toBe("number");
      expect(typeof result.stats.pending).toBe("number");
      expect(typeof result.stats.averageScore).toBe("number");
    });

    it("should complete a practice", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 获取一个待完成的练习
      const practices = await db
        .select()
        .from(practicePools)
        .where(eq(practicePools.userId, testUserId))
        .limit(1);

      if (practices.length === 0) {
        console.log("No practice found to complete, skipping test");
        return;
      }

      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.practicePools.completePractice({
        practicePoolId: practices[0].id,
        score: 85,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("should verify scheduled task is registered on server start", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tasks = await db
        .select()
        .from(scheduledTasks)
        .where(eq(scheduledTasks.taskName, "daily_question_generation"));

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].taskType).toBe("generate_questions");
      expect(tasks[0].cronExpression).toBe("0 2 * * *");
      expect(tasks[0].isEnabled).toBeTruthy();
    });

    it("should verify practice pool workflow", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. 创建错题
      const errorResult = await db.insert(errorQuestions).values({
        userId: testUserId,
        title: "工作流测试错题",
        content: "这是一道工作流测试错题",
        schoolLevel: "junior",
        subject: "math",
        grade: "junior2",
        difficulty: "medium",
        questionType: "choice",
        userAnswer: "A",
        correctAnswer: "B",
        knowledgePointIds: [1],
        tags: ["工作流测试"],
      });

      const errorId = errorResult[0].insertId;

      // 2. 为错题生成练习题
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "user", openId: "test", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const generateResult = await caller.practicePools.generateFromError({
        errorQuestionId: errorId,
        count: 1,
      });

      expect(generateResult.success).toBe(true);

      // 3. 查询生成的练习题
      const practiceResult = await caller.practicePools.getByErrorQuestion({
        errorQuestionId: errorId,
      });

      expect(practiceResult.success).toBe(true);
      expect(practiceResult.practices.length).toBeGreaterThan(0);

      // 4. 完成练习
      if (practiceResult.practices.length > 0) {
        const practice = practiceResult.practices[0];
        const completeResult = await caller.practicePools.completePractice({
          practicePoolId: practice.pool.id,
          score: 90,
        });

        expect(completeResult.success).toBe(true);
      }
    }, 30000); // 增加超时到30秒
  });
});
