import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users, aiAdviceHistory, reviewTasks } from "../drizzle/schema";
import {
  saveAdviceAndCreateTasks,
  getUserReviewTasks,
  getLatestAdviceWithTasks,
  toggleTaskCompletion,
  getReviewCompletionStats,
} from "./services/reviewTaskService";
import type { LearningAdvice } from "./services/aiLearningAdviceService";

describe("复习任务管理功能测试", () => {
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建测试用户
    const [result] = await db.insert(users).values({
      openId: `test_review_tasks_${Date.now()}`,
      name: "测试用户",
      email: "test@example.com",
      role: "user",
      userType: "student",
      grade: "junior1",
    });

    testUserId = Number(result.insertId);
  });

  it("应该成功保存AI建议并创建复习任务", async () => {
    const mockAdvice: LearningAdvice = {
      overallAssessment: "测试评估",
      learningTips: [
        {
          title: "测试建议",
          content: "这是一条测试建议",
          priority: "high",
        },
      ],
      reviewPlan: [
        {
          subject: "数学",
          knowledgePoint: "二次函数",
          reason: "需要重点复习",
          suggestedTime: "今天",
          priority: 1,
        },
        {
          subject: "物理",
          knowledgePoint: "力学",
          reason: "难度较高",
          suggestedTime: "明天",
          priority: 2,
        },
      ],
      weaknesses: [],
      encouragement: "加油！",
    };

    const adviceHistoryId = await saveAdviceAndCreateTasks(
      testUserId,
      mockAdvice,
      10,
      60
    );

    expect(adviceHistoryId).toBeGreaterThan(0);

    // 验证任务已创建
    const tasks = await getUserReviewTasks(testUserId);
    expect(tasks.length).toBe(2);
    expect(tasks[0].subject).toBe("数学");
    expect(tasks[1].subject).toBe("物理");
  });

  it("应该正确获取用户的所有复习任务", async () => {
    const tasks = await getUserReviewTasks(testUserId);

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0]).toHaveProperty("id");
    expect(tasks[0]).toHaveProperty("subject");
    expect(tasks[0]).toHaveProperty("completed");
  });

  it("应该正确获取最新的AI建议及其任务", async () => {
    const result = await getLatestAdviceWithTasks(testUserId);

    expect(result).toBeDefined();
    expect(result?.advice).toBeDefined();
    expect(result?.tasks).toBeDefined();
    expect(result?.tasks.length).toBeGreaterThan(0);
  });

  it("应该成功切换任务完成状态", async () => {
    const tasks = await getUserReviewTasks(testUserId);
    const taskId = tasks[0].id;
    const originalStatus = tasks[0].completed;

    // 切换状态
    const result = await toggleTaskCompletion(taskId, testUserId);

    expect(result.completed).toBe(!originalStatus);
    expect(result.taskId).toBe(taskId);

    // 再次切换回原状态
    const result2 = await toggleTaskCompletion(taskId, testUserId);
    expect(result2.completed).toBe(originalStatus);
  });

  it("应该正确计算复习完成率统计", async () => {
    const stats = await getReviewCompletionStats(testUserId);

    expect(stats).toBeDefined();
    expect(stats.totalTasks).toBeGreaterThan(0);
    expect(stats.completionRate).toBeGreaterThanOrEqual(0);
    expect(stats.completionRate).toBeLessThanOrEqual(100);
    expect(stats.subjectStats).toBeDefined();
    expect(Array.isArray(stats.subjectStats)).toBe(true);
  });

  it("应该正确计算分学科完成率", async () => {
    const tasks = await getUserReviewTasks(testUserId);
    
    // 标记第一个任务为完成
    if (tasks.length > 0) {
      await toggleTaskCompletion(tasks[0].id, testUserId);
    }

    const stats = await getReviewCompletionStats(testUserId);

    expect(stats.completedTasks).toBeGreaterThan(0);
    expect(stats.subjectStats.length).toBeGreaterThan(0);

    // 验证每个学科统计的数据结构
    stats.subjectStats.forEach((subjectStat) => {
      expect(subjectStat).toHaveProperty("subject");
      expect(subjectStat).toHaveProperty("total");
      expect(subjectStat).toHaveProperty("completed");
      expect(subjectStat).toHaveProperty("completionRate");
      expect(subjectStat.completionRate).toBeGreaterThanOrEqual(0);
      expect(subjectStat.completionRate).toBeLessThanOrEqual(100);
    });
  });

  it("应该处理没有任务的情况", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建一个新用户（没有任务）
    const [result] = await db.insert(users).values({
      openId: `test_no_tasks_${Date.now()}`,
      name: "无任务用户",
      email: "notasks@example.com",
      role: "user",
      userType: "student",
      grade: "junior1",
    });

    const newUserId = Number(result.insertId);

    const stats = await getReviewCompletionStats(newUserId);

    expect(stats.totalTasks).toBe(0);
    expect(stats.completedTasks).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.subjectStats.length).toBe(0);
  });

  it("应该正确解析建议时间并设置计划日期", async () => {
    const tasks = await getUserReviewTasks(testUserId);

    expect(tasks.length).toBeGreaterThan(0);

    // 验证任务有计划日期
    tasks.forEach((task) => {
      if (task.scheduledDate) {
        expect(task.scheduledDate).toBeInstanceOf(Date);
      }
    });
  });

  it("应该按优先级排序复习任务", async () => {
    const result = await getLatestAdviceWithTasks(testUserId);

    if (result && result.tasks.length > 1) {
      // 验证任务按优先级排序
      for (let i = 0; i < result.tasks.length - 1; i++) {
        expect(result.tasks[i].priority).toBeLessThanOrEqual(result.tasks[i + 1].priority);
      }
    }
  });

  it("应该在完成任务时记录完成时间", async () => {
    const tasks = await getUserReviewTasks(testUserId, false); // 只获取未完成的任务

    if (tasks.length > 0) {
      const taskId = tasks[0].id;
      
      // 标记为完成
      const result = await toggleTaskCompletion(taskId, testUserId);

      expect(result.completed).toBe(true);
      expect(result.completedAt).toBeDefined();
      expect(result.completedAt).toBeInstanceOf(Date);
    }
  });
});
