import { db } from "../db";
import { crawlTasks, crawlSources } from "../../drizzle/crawler_question_db_schema";
import { eq, and, gte, lte, like, desc, sql } from "drizzle-orm";

/**
 * 爬虫管理服务
 * 提供爬虫任务管理、监控和日志查看功能
 */

export interface CrawlerTaskConfig {
  taskName: string;
  taskType: "manual" | "scheduled" | "retry";
  sourceId: number;
  sourceUrl?: string;
  sourceType?: string;
  targetSubject?: string;
  targetGrade?: string;
  scheduleType?: "once" | "daily" | "weekly" | "monthly";
  scheduleTime?: string;
  config?: Record<string, any>;
  maxRetries?: number;
  createdBy: number;
}

export interface CrawlerTaskStatus {
  id: number;
  taskName: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  progress: number; // 0-100
  startTime?: Date;
  endTime?: Date;
  duration?: number; // 秒
  itemsProcessed: number;
  itemsFailed: number;
  errorMessage?: string;
  logs: string[];
}

export interface CrawlerLog {
  id: number;
  taskId: number;
  level: "info" | "warning" | "error";
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 创建爬虫任务
 */
export async function createCrawlerTask(config: CrawlerTaskConfig) {
  const result = await db.insert(crawlTasks).values({
    taskType: config.taskType as any,
    sourceId: config.sourceId,
    duration: 0,
    status: "pending" as any,
    itemsProcessed: 0,
    itemsFailed: 0,
    itemsSucceeded: 0,
    itemsDuplicated: 0,
    maxRetries: config.maxRetries || 3,
    resultSummary: config.config ? JSON.stringify(config.config) : null,
  } as any);

  // 获取插入的ID
  const insertedId = Number(result[0].insertId);

  return {
    id: insertedId,
    ...config,
  };
}

/**
 * 获取爬虫任务列表
 */
export async function getCrawlerTasks(
  filters?: {
    status?: string;
    taskType?: string;
    sourceId?: number;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 20,
  offset: number = 0
) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(crawlTasks.status, filters.status as any));
  }

  if (filters?.taskType) {
    conditions.push(eq(crawlTasks.taskType, filters.taskType as any));
  }

  if (filters?.sourceId) {
    conditions.push(eq(crawlTasks.sourceId, filters.sourceId));
  }

  if (filters?.startDate) {
    conditions.push(gte(crawlTasks.createdAt, filters.startDate as any));
  }

  if (filters?.endDate) {
    conditions.push(lte(crawlTasks.createdAt, filters.endDate as any));
  }

  const tasks = await db
    .select()
    .from(crawlTasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(crawlTasks.createdAt))
    .limit(limit)
    .offset(offset);

  return tasks;
}

/**
 * 获取爬虫任务详情
 */
export async function getCrawlerTaskDetail(taskId: number) {
  const task = await db
    .select()
    .from(crawlTasks)
    .where(eq(crawlTasks.id, taskId))
    .limit(1);

  if (!task || !task[0]) {
    return null;
  }

  const taskData = task[0];
  // 解析resultSummary字段作为配置
  const config = taskData.resultSummary 
    ? (typeof taskData.resultSummary === 'string' 
        ? JSON.parse(taskData.resultSummary) 
        : taskData.resultSummary)
    : null;

  return {
    ...taskData,
    config,
  };
}

/**
 * 更新爬虫任务状态
 */
export async function updateCrawlerTaskStatus(
  taskId: number,
  status: {
    status?: "pending" | "running" | "completed" | "failed" | "paused";
    progress?: number;
    itemsProcessed?: number;
    itemsFailed?: number;
    errorMessage?: string;
    duration?: number;
  }
) {
  const updates: any = {};

  if (status.status) updates.status = status.status;
  if (status.progress !== undefined) updates.progress = status.progress;
  if (status.itemsProcessed !== undefined)
    updates.itemsProcessed = status.itemsProcessed;
  if (status.itemsFailed !== undefined) updates.itemsFailed = status.itemsFailed;
  if (status.errorMessage !== undefined)
    updates.errorMessage = status.errorMessage;
  if (status.duration !== undefined) updates.duration = status.duration;

  await db.update(crawlTasks).set(updates).where(eq(crawlTasks.id, taskId));
}

/**
 * 启动爬虫任务
 */
export async function startCrawlerTask(taskId: number) {
  await updateCrawlerTaskStatus(taskId, {
    status: "running",
    progress: 0,
    itemsProcessed: 0,
    itemsFailed: 0,
  });

  // 这里可以触发实际的爬虫执行逻辑
  // 例如：调用爬虫服务、发送消息队列等
}

/**
 * 暂停爬虫任务
 */
export async function pauseCrawlerTask(taskId: number) {
  await updateCrawlerTaskStatus(taskId, {
    status: "paused",
  });
}

/**
 * 恢复爬虫任务
 */
export async function resumeCrawlerTask(taskId: number) {
  const task = await getCrawlerTaskDetail(taskId);

  if (!task) {
    throw new Error("任务不存在");
  }

  // 注：数据库中没有paused状态，检查pending状态
  if (task.status !== "pending") {
    throw new Error("只能恢复待执行的任务");
  }

  await updateCrawlerTaskStatus(taskId, {
    status: "running",
  });
}

/**
 * 停止爬虫任务
 */
export async function stopCrawlerTask(taskId: number) {
  const task = await getCrawlerTaskDetail(taskId);

  if (!task) {
    throw new Error("任务不存在");
  }

  if (task.status === "completed" || task.status === "failed") {
    throw new Error("已完成的任务无法停止");
  }

  await updateCrawlerTaskStatus(taskId, {
    status: "failed",
    errorMessage: "任务被用户停止",
  });
}

/**
 * 删除爬虫任务
 */
export async function deleteCrawlerTask(taskId: number) {
  const task = await getCrawlerTaskDetail(taskId);

  if (!task) {
    throw new Error("任务不存在");
  }

  if (task.status === "running") {
    throw new Error("无法删除正在运行的任务");
  }

  await db.delete(crawlTasks).where(eq(crawlTasks.id, taskId));
}

/**
 * 获取爬虫任务统计信息
 */
export async function getCrawlerTaskStats() {
  const stats = await db.execute(sql`
    SELECT 
      status,
      COUNT(*) as count,
      AVG(progress) as avgProgress,
      SUM(itemsProcessed) as totalItemsProcessed,
      SUM(itemsFailed) as totalItemsFailed
    FROM crawl_tasks
    GROUP BY status
  `);

  return stats[0] || [];
}

/**
 * 获取爬虫数据源列表
 */
export async function getCrawlerSources(limit: number = 20, offset: number = 0) {
  const sources = await db
    .select()
    .from(crawlSources)
    .orderBy(desc(crawlSources.createdAt))
    .limit(limit)
    .offset(offset);

  return sources;
}

/**
 * 创建爬虫数据源
 */
export async function createCrawlerSource(data: {
  sourceName: string;
  sourceUrl: string;
  sourceType: "static_web" | "dynamic_web" | "api" | "file";
  description?: string;
  selectorConfig?: Record<string, any>;
  createdBy: number;
}) {
  const result = await db.insert(crawlSources).values({
    name: data.sourceName,
    websiteUrl: data.sourceUrl,
    sourceType: data.sourceType,
    description: data.description,
    selectorConfig: data.selectorConfig ? JSON.stringify(data.selectorConfig) : null,
  });

  // 获取插入的ID
  const insertedId = Number(result[0].insertId);

  return {
    id: insertedId,
    ...data,
  };
}

/**
 * 获取爬虫数据源详情
 */
export async function getCrawlerSourceDetail(sourceId: number) {
  const source = await db
    .select()
    .from(crawlSources)
    .where(eq(crawlSources.id, sourceId))
    .limit(1);

  if (!source || !source[0]) {
    return null;
  }

  const sourceData = source[0];
  // 解析JSON配置字段
  const selectorConfig = sourceData.selectorConfig
    ? (typeof sourceData.selectorConfig === 'string' 
        ? JSON.parse(sourceData.selectorConfig) 
        : sourceData.selectorConfig)
    : null;
  const paginationConfig = sourceData.paginationConfig
    ? (typeof sourceData.paginationConfig === 'string' 
        ? JSON.parse(sourceData.paginationConfig) 
        : sourceData.paginationConfig)
    : null;
  const authConfig = sourceData.authConfig
    ? (typeof sourceData.authConfig === 'string' 
        ? JSON.parse(sourceData.authConfig) 
        : sourceData.authConfig)
    : null;
  const contentExtractors = sourceData.contentExtractors
    ? (typeof sourceData.contentExtractors === 'string' 
        ? JSON.parse(sourceData.contentExtractors) 
        : sourceData.contentExtractors)
    : null;

  return {
    ...sourceData,
    selectorConfig,
    paginationConfig,
    authConfig,
    contentExtractors,
  };
}

/**
 * 更新爬虫数据源
 */
export async function updateCrawlerSource(
  sourceId: number,
  data: {
    sourceName?: string;
    sourceUrl?: string;
    sourceType?: string;
    description?: string;
    crawlerConfig?: Record<string, any>;
  }
) {
  const updates: any = {};

  if (data.sourceName) updates.sourceName = data.sourceName;
  if (data.sourceUrl) updates.sourceUrl = data.sourceUrl;
  if (data.sourceType) updates.sourceType = data.sourceType;
  if (data.description !== undefined) updates.description = data.description;
  if (data.crawlerConfig)
    updates.crawlerConfig = JSON.stringify(data.crawlerConfig);

  await db.update(crawlSources).set(updates).where(eq(crawlSources.id, sourceId));
}

/**
 * 获取爬虫任务的执行日志
 */
export async function getCrawlerTaskLogs(
  taskId: number,
  level?: "info" | "warning" | "error",
  limit: number = 100,
  offset: number = 0
) {
  // 注意：实际的日志存储需要在schema中定义日志表
  // 这里是示例实现，实际使用时需要根据日志表的结构调整

  const conditions = [];

  // 这里应该查询日志表，但目前schema中可能没有定义
  // 可以使用内存缓存或外部日志系统（如ELK）

  return [];
}

/**
 * 添加爬虫任务日志
 */
export async function addCrawlerTaskLog(
  taskId: number,
  log: {
    level: "info" | "warning" | "error";
    message: string;
    metadata?: Record<string, any>;
  }
) {
  // 实现日志存储逻辑
  // 可以存储到数据库、文件或外部日志系统

  console.log(`[${log.level.toUpperCase()}] Task ${taskId}: ${log.message}`);

  if (log.metadata) {
    console.log("Metadata:", log.metadata);
  }
}

/**
 * 获取爬虫任务的性能指标
 */
export async function getCrawlerTaskMetrics(taskId: number) {
  const task = await getCrawlerTaskDetail(taskId);

  if (!task) {
    return null;
  }

  const duration = task.duration || 0;
  const itemsProcessed = task.itemsProcessed || 0;
  const itemsFailed = task.itemsFailed || 0;
  const successRate =
    itemsProcessed + itemsFailed > 0
      ? (itemsProcessed / (itemsProcessed + itemsFailed)) * 100
      : 0;
  const itemsPerSecond = duration > 0 ? itemsProcessed / duration : 0;

  return {
    taskId,
    duration,
    itemsProcessed,
    itemsFailed,
    successRate: Math.round(successRate * 100) / 100,
    itemsPerSecond: Math.round(itemsPerSecond * 100) / 100,
    status: task.status,
    progress: Math.round((task.itemsProcessed / (task.itemsProcessed + task.itemsFailed + 1)) * 100),
  };
}

/**
 * 批量启动爬虫任务
 */
export async function batchStartCrawlerTasks(taskIds: number[]) {
  for (const taskId of taskIds) {
    try {
      await startCrawlerTask(taskId);
    } catch (error) {
      console.error(`启动任务 ${taskId} 失败:`, error);
    }
  }
}

/**
 * 批量停止爬虫任务
 */
export async function batchStopCrawlerTasks(taskIds: number[]) {
  for (const taskId of taskIds) {
    try {
      await stopCrawlerTask(taskId);
    } catch (error) {
      console.error(`停止任务 ${taskId} 失败:`, error);
    }
  }
}

/**
 * 获取爬虫任务的执行历史
 */
export async function getCrawlerTaskHistory(
  taskId: number,
  limit: number = 50
) {
  // 获取任务的历史执行记录
  // 这需要在schema中定义执行历史表

  const task = await getCrawlerTaskDetail(taskId);

  if (!task) {
    return [];
  }

  return [
    {
      taskId,
      status: task.status,
      progress: Math.round((task.itemsProcessed / (task.itemsProcessed + task.itemsFailed + 1)) * 100),
      itemsProcessed: task.itemsProcessed,
      itemsFailed: task.itemsFailed,
      duration: task.duration,
      createdAt: task.createdAt,
    },
  ];
}
