/**
 * 性能监控服务 - 追踪API响应时间和系统性能
 */

import { eq, and, desc, gte, lte, count, avg, max, min } from "drizzle-orm";
import { apiPerformanceLogs, systemResourceLogs, monitoringAlerts } from "../drizzle/schema";
import { getDb } from "./db";
import type { NewApiPerformanceLog, NewSystemResourceLog, ApiPerformanceLog } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

/**
 * 记录API性能数据
 */
export async function logApiPerformance(
  performanceData: NewApiPerformanceLog
): Promise<ApiPerformanceLog | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(apiPerformanceLogs).values(performanceData);
    const insertedId = result[0].insertId;

    // 获取插入的记录
    const logs = await db
      .select()
      .from(apiPerformanceLogs)
      .where(eq(apiPerformanceLogs.id, Number(insertedId)));

    const log = logs[0];

    // 如果响应时间过长或出错，创建告警
    if (log) {
      if (log.responseTime > 5000) {
        // 响应时间超过5秒
        await createPerformanceAlert(
          `API响应缓慢: ${log.endpoint}`,
          `端点: ${log.endpoint}\n方法: ${log.method}\n响应时间: ${log.responseTime}ms`,
          "high"
        );
      }
      if (log.isError) {
        // API错误
        await createPerformanceAlert(
          `API错误: ${log.endpoint}`,
          `端点: ${log.endpoint}\n方法: ${log.method}\n状态码: ${log.statusCode}\n错误: ${log.errorMessage}`,
          "high"
        );
      }
    }

    return log || null;
  } catch (error) {
    console.error("Failed to log API performance:", error);
    return null;
  }
}

/**
 * 记录系统资源数据
 */
export async function logSystemResources(
  resourceData: NewSystemResourceLog
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(systemResourceLogs).values(resourceData);

    // 检查资源使用情况
    const cpuUsage = Number(resourceData.cpuUsage) || 0;
    const memoryUsage = Number(resourceData.memoryUsage) || 0;
    const diskUsage = Number(resourceData.diskUsage) || 0;

    if (cpuUsage > 80) {
      await createPerformanceAlert(
        "CPU使用率过高",
        `当前CPU使用率: ${cpuUsage}%`,
        "high"
      );
    }

    if (memoryUsage > 85) {
      await createPerformanceAlert(
        "内存使用率过高",
        `当前内存使用率: ${memoryUsage}%`,
        "high"
      );
    }

    if (diskUsage > 90) {
      await createPerformanceAlert(
        "磁盘使用率过高",
        `当前磁盘使用率: ${diskUsage}%`,
        "critical"
      );
    }
  } catch (error) {
    console.error("Failed to log system resources:", error);
  }
}

/**
 * 创建性能告警
 */
async function createPerformanceAlert(
  title: string,
  description: string,
  severity: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(monitoringAlerts).values({
      alertType: "PerformanceDegradation",
      title,
      description,
      severity,
      sourceType: "PerformanceLog",
      notificationSent: 0,
    });

    // 发送通知给管理员
    await notifyOwner({
      title,
      content: description,
    });
  } catch (error) {
    console.error("Failed to create performance alert:", error);
  }
}

/**
 * 获取API性能统计
 */
export async function getApiPerformanceStats(
  endpoint?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
}> {
  const db = await getDb();
  if (!db)
    return {
      totalRequests: 0,
      errorCount: 0,
      errorRate: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
    };

  try {
    const conditions = [];
    if (endpoint) {
      conditions.push(eq(apiPerformanceLogs.endpoint, endpoint));
    }
    if (startDate) {
      conditions.push(gte(apiPerformanceLogs.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(apiPerformanceLogs.createdAt, endDate));
    }

    // 获取总请求数
    const totalResult = await db
      .select({ count: count() })
      .from(apiPerformanceLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const totalRequests = totalResult[0]?.count || 0;

    // 获取错误数
    const errorConditions = [...conditions, eq(apiPerformanceLogs.isError, 1)];
    const errorResult = await db
      .select({ count: count() })
      .from(apiPerformanceLogs)
      .where(and(...errorConditions));
    const errorCount = errorResult[0]?.count || 0;

    // 获取响应时间统计
    const statsResult = await db
      .select({
        avgTime: avg(apiPerformanceLogs.responseTime),
        maxTime: max(apiPerformanceLogs.responseTime),
        minTime: min(apiPerformanceLogs.responseTime),
      })
      .from(apiPerformanceLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const stats = statsResult[0];

    return {
      totalRequests,
      errorCount,
      errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
      avgResponseTime: stats?.avgTime ? Number(stats.avgTime) : 0,
      maxResponseTime: stats?.maxTime ? Number(stats.maxTime) : 0,
      minResponseTime: stats?.minTime ? Number(stats.minTime) : 0,
    };
  } catch (error) {
    console.error("Failed to get API performance stats:", error);
    return {
      totalRequests: 0,
      errorCount: 0,
      errorRate: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
    };
  }
}

/**
 * 获取最近的API性能日志
 */
export async function getRecentApiPerformanceLogs(
  limit: number = 100
): Promise<ApiPerformanceLog[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(apiPerformanceLogs)
      .orderBy(desc(apiPerformanceLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get recent API performance logs:", error);
    return [];
  }
}

/**
 * 删除旧的性能日志（保留最近7天）
 */
export async function cleanupOldPerformanceLogs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(apiPerformanceLogs)
      .where(lte(apiPerformanceLogs.createdAt, sevenDaysAgo));

    return result[0].affectedRows || 0;
  } catch (error) {
    console.error("Failed to cleanup old performance logs:", error);
    return 0;
  }
}
