/**
 * 缓存预热自动调度服务
 * 负责在低峰期自动执行缓存预热任务
 */

import { db } from "../db";
import { warmupTasks } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  createWarmupTask,
  executeWarmupTask,
  autoWarmupHotContent,
} from "./cacheWarmupService";

/**
 * 检查当前是否为低峰期
 * 低峰期定义为凌晨2:00-5:00
 */
export function isOffPeakTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 2 && hour < 5;
}

/**
 * 获取下一次低峰期的时间
 */
export function getNextOffPeakTime(): Date {
  const now = new Date();
  const nextRun = new Date(now);
  
  // 设置为凌晨2:00
  nextRun.setHours(2, 0, 0, 0);
  
  // 如果当前时间已经过了今天的2:00,则设置为明天的2:00
  if (now.getHours() >= 5) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}

/**
 * 创建自动预热任务
 * @param taskName 任务名称
 * @param taskType 任务类型
 * @param targetConfig 目标配置
 * @param priority 优先级
 * @param scheduledAt 计划执行时间(可选,默认为下一个低峰期)
 */
export async function scheduleAutoWarmupTask(
  taskName: string,
  taskType: "knowledge_point" | "question_type" | "recommendation",
  targetConfig: any,
  priority: number = 5,
  scheduledAt?: Date
): Promise<number> {
  const scheduleTime = scheduledAt || getNextOffPeakTime();
  
  const taskId = await createWarmupTask(taskName, taskType, targetConfig, priority);
  
  // 更新任务的计划执行时间
  await db
    .update(warmupTasks)
    .set({ scheduledAt: scheduleTime })
    .where(eq(warmupTasks.id, taskId));
  
  return taskId;
}

/**
 * 执行所有待处理的预热任务
 * 仅在低峰期执行
 */
export async function runScheduledWarmupTasks(): Promise<{
  executed: number;
  failed: number;
  skipped: number;
}> {
  // 检查是否为低峰期
  if (!isOffPeakTime()) {
    console.log("当前不是低峰期,跳过预热任务执行");
    return { executed: 0, failed: 0, skipped: 0 };
  }
  
  // 获取所有待执行的任务
  const now = new Date();
  const pendingTasks = await db
    .select()
    .from(warmupTasks)
    .where(
      and(
        eq(warmupTasks.status, "pending"),
        // 仅执行计划时间已到的任务
      )
    )
    .limit(50); // 限制一次最多执行50个任务
  
  let executed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const task of pendingTasks) {
    // 检查任务是否应该执行
    if (task.scheduledAt && new Date(task.scheduledAt) > now) {
      skipped++;
      continue;
    }
    
    try {
      console.log(`开始执行预热任务: ${task.taskName} (ID: ${task.id})`);
      await executeWarmupTask(task.id);
      executed++;
      console.log(`预热任务执行成功: ${task.taskName}`);
    } catch (error) {
      failed++;
      console.error(`预热任务执行失败: ${task.taskName}`, error);
    }
  }
  
  return { executed, failed, skipped };
}

/**
 * 创建每日自动预热任务
 * 该任务会在每天低峰期自动执行
 */
export async function createDailyAutoWarmupTask(): Promise<number> {
  const taskName = `每日自动预热-${new Date().toISOString().split("T")[0]}`;
  const targetConfig = {
    description: "每日自动预热高频知识点和题目类型",
    topKnowledgePoints: 50,
    topQuestionTypes: 20,
  };
  
  return scheduleAutoWarmupTask(
    taskName,
    "recommendation",
    targetConfig,
    8 // 高优先级
  );
}

/**
 * 启动预热调度器
 * 该函数会定期检查并执行待处理的预热任务
 */
export function startWarmupScheduler(intervalMinutes: number = 30): NodeJS.Timeout {
  console.log(`缓存预热调度器已启动,检查间隔: ${intervalMinutes}分钟`);
  
  // 立即执行一次检查
  runScheduledWarmupTasks().then((result: any) => {
    console.log("初始预热任务检查完成:", result);
  });
  
  // 定期执行检查
  const intervalMs = intervalMinutes * 60 * 1000;
  return setInterval(async () => {
    try {
      const result = await runScheduledWarmupTasks();
      if (result.executed > 0 || result.failed > 0) {
        console.log("预热任务执行结果:", result);
      }
    } catch (error) {
      console.error("预热调度器执行出错:", error);
    }
  }, intervalMs);
}

/**
 * 停止预热调度器
 */
export function stopWarmupScheduler(timer: NodeJS.Timeout): void {
  clearInterval(timer);
  console.log("缓存预热调度器已停止");
}
