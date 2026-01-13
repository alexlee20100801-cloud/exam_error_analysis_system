/**
 * 错误日志服务 - 收集、存储和查询错误日志
 */

import { eq, and, desc, gte, lte, count } from "drizzle-orm";
import { errorLogs, monitoringAlerts } from "../drizzle/schema";
import { getDb } from "./db";
import type { NewErrorLog, ErrorLog } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

/**
 * 记录错误日志
 */
export async function logError(errorData: NewErrorLog): Promise<ErrorLog | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(errorLogs).values(errorData);
    const insertedId = result[0].insertId;
    
    // 获取插入的记录
    const logs = await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.id, Number(insertedId)));
    
    const log = logs[0];
    
    // 如果是严重错误，立即发送告警
    if (log && (log.severity === "high" || log.severity === "critical")) {
      await createErrorAlert(log);
    }
    
    return log || null;
  } catch (error) {
    console.error("Failed to log error:", error);
    return null;
  }
}

/**
 * 创建错误告警
 */
async function createErrorAlert(errorLog: ErrorLog): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const alertTitle = `${errorLog.severity.toUpperCase()} 错误: ${errorLog.errorType}`;
    const alertDescription = `
错误类型: ${errorLog.errorType}
错误代码: ${errorLog.errorCode || "N/A"}
消息: ${errorLog.message}
端点: ${errorLog.endpoint || "N/A"}
状态码: ${errorLog.statusCode || "N/A"}
时间: ${errorLog.createdAt}
    `.trim();

    await db.insert(monitoringAlerts).values({
      alertType: "ErrorThreshold",
      title: alertTitle,
      description: alertDescription,
      severity: errorLog.severity,
      sourceType: "ErrorLog",
      sourceId: errorLog.id,
      notificationSent: 0,
    });

    // 发送通知给管理员
    await notifyOwner({
      title: alertTitle,
      content: alertDescription,
    });
  } catch (error) {
    console.error("Failed to create error alert:", error);
  }
}

/**
 * 获取错误日志列表
 */
export async function getErrorLogs(
  userId?: number,
  severity?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ErrorLog[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [];
    if (userId) {
      conditions.push(eq(errorLogs.userId, userId));
    }
    if (severity) {
      conditions.push(eq(errorLogs.severity, severity));
    }

    return await db
      .select()
      .from(errorLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Failed to get error logs:", error);
    return [];
  }
}

/**
 * 获取错误日志统计
 */
export async function getErrorLogStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) return { total: 0, byType: {}, bySeverity: {} };

  try {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(errorLogs.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(errorLogs.createdAt, endDate));
    }

    // 获取总数
    const totalResult = await db
      .select({ count: count() })
      .from(errorLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = totalResult[0]?.count || 0;

    // 按类型统计
    const byTypeResult = await db
      .select({
        type: errorLogs.errorType,
        count: count(),
      })
      .from(errorLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(errorLogs.errorType);

    const byType: Record<string, number> = {};
    byTypeResult.forEach((row) => {
      byType[row.type] = row.count;
    });

    // 按严重程度统计
    const bySeverityResult = await db
      .select({
        severity: errorLogs.severity,
        count: count(),
      })
      .from(errorLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(errorLogs.severity);

    const bySeverity: Record<string, number> = {};
    bySeverityResult.forEach((row) => {
      bySeverity[row.severity] = row.count;
    });

    return { total, byType, bySeverity };
  } catch (error) {
    console.error("Failed to get error log stats:", error);
    return { total: 0, byType: {}, bySeverity: {} };
  }
}

/**
 * 解决错误日志
 */
export async function resolveErrorLog(
  errorId: number,
  resolvedBy: number,
  notes?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(errorLogs)
      .set({
        isResolved: 1,
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes: notes,
      })
      .where(eq(errorLogs.id, errorId));
    return true;
  } catch (error) {
    console.error("Failed to resolve error log:", error);
    return false;
  }
}

/**
 * 删除旧的错误日志（保留最近30天）
 */
export async function cleanupOldErrorLogs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(errorLogs)
      .where(lte(errorLogs.createdAt, thirtyDaysAgo));
    
    return result[0].affectedRows || 0;
  } catch (error) {
    console.error("Failed to cleanup old error logs:", error);
    return 0;
  }
}
