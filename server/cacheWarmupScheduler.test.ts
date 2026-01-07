import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isOffPeakTime,
  getNextOffPeakTime,
  scheduleAutoWarmupTask,
} from "./services/cacheWarmupScheduler";
import { db } from "./db";
import { warmupTasks } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("缓存预热自动调度", () => {
  describe("isOffPeakTime", () => {
    it("应该在凌晨2-5点返回true", () => {
      // Mock当前时间为凌晨3点
      vi.setSystemTime(new Date("2026-01-08T03:00:00"));
      expect(isOffPeakTime()).toBe(true);
    });

    it("应该在其他时间返回false", () => {
      // Mock当前时间为上午10点
      vi.setSystemTime(new Date("2026-01-08T10:00:00"));
      expect(isOffPeakTime()).toBe(false);
    });
  });

  describe("getNextOffPeakTime", () => {
    it("应该返回下一个凌晨2点", () => {
      // Mock当前时间为上午10点
      vi.setSystemTime(new Date("2026-01-08T10:00:00"));
      const nextTime = getNextOffPeakTime();
      
      expect(nextTime.getHours()).toBe(2);
      expect(nextTime.getMinutes()).toBe(0);
      expect(nextTime.getSeconds()).toBe(0);
      
      // 应该是明天的2点
      expect(nextTime.getDate()).toBe(9);
    });

    it("应该在凌晨1点时返回当天的2点", () => {
      // Mock当前时间为凌晨1点
      vi.setSystemTime(new Date("2026-01-08T01:00:00"));
      const nextTime = getNextOffPeakTime();
      
      expect(nextTime.getHours()).toBe(2);
      expect(nextTime.getDate()).toBe(8); // 当天
    });
  });

  describe("scheduleAutoWarmupTask", () => {
    beforeEach(async () => {
      // 清理测试数据
      await db.delete(warmupTasks).where(eq(warmupTasks.taskName, "测试预热任务"));
    });

    it("应该成功创建自动调度的预热任务", async () => {
      const taskId = await scheduleAutoWarmupTask(
        "测试预热任务",
        "knowledge_point",
        { topN: 10 },
        5
      );

      expect(taskId).toBeGreaterThan(0);

      // 验证任务已创建
      const [task] = await db
        .select()
        .from(warmupTasks)
        .where(eq(warmupTasks.id, taskId))
        .limit(1);

      expect(task).toBeDefined();
      expect(task.taskName).toBe("测试预热任务");
      expect(task.taskType).toBe("knowledge_point");
      expect(task.priority).toBe(5);
      expect(task.scheduledAt).toBeDefined();
    });

    it("应该将任务计划在低峰期执行", async () => {
      // Mock当前时间为上午10点
      vi.setSystemTime(new Date("2026-01-08T10:00:00"));

      const taskId = await scheduleAutoWarmupTask(
        "测试预热任务2",
        "recommendation",
        { topN: 20 },
        8
      );

      const [task] = await db
        .select()
        .from(warmupTasks)
        .where(eq(warmupTasks.id, taskId))
        .limit(1);

      const scheduledTime = new Date(task.scheduledAt!);
      
      // 应该计划在凌晨2点
      expect(scheduledTime.getHours()).toBe(2);
      expect(scheduledTime.getMinutes()).toBe(0);
    });
  });
});
