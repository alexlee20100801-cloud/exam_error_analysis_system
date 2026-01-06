/**
 * 初始化推送任务定时任务
 * 创建每日执行的推送任务检查
 */

import { drizzle } from "drizzle-orm/mysql2";
import { scheduledTasks } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

async function initPushTask() {
  try {
    console.log("[InitPushTask] Starting initialization...");

    // 检查是否已存在推送任务
    const existing = await db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.taskName, "execute_push_tasks"));

    if (existing.length > 0) {
      console.log("[InitPushTask] Push task already exists, skipping creation");
      return;
    }

    // 创建推送任务（每小时检查一次）
    await db.insert(scheduledTasks).values({
      taskName: "execute_push_tasks",
      taskType: "execute_push_tasks",
      cronExpression: "0 * * * *", // 每小时的第0分钟执行
      isEnabled: true,
    });

    console.log("[InitPushTask] Push task created successfully");
    console.log("[InitPushTask] Task will run every hour at minute 0");
  } catch (error) {
    console.error("[InitPushTask] Failed to initialize push task:", error);
    throw error;
  }
}

initPushTask()
  .then(() => {
    console.log("[InitPushTask] Initialization completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[InitPushTask] Initialization failed:", error);
    process.exit(1);
  });
