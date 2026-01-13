import { getDb } from "./db";
import { eq, and, desc, gte, lte, lt, sql, isNull } from "drizzle-orm";
import {
  exportHistoryRecords,
  type NewExportHistoryRecord
} from "../drizzle/schema";
import { storageDelete } from "./storage";

const db = getDb();

// 默认过期天数
const DEFAULT_EXPIRY_DAYS = 30;

// ==================== 导出历史记录管理 ====================

/**
 * 创建导出历史记录
 */
export async function createExportHistory(data: NewExportHistoryRecord & {
  expiryDays?: number;
}) {
  const { expiryDays = DEFAULT_EXPIRY_DAYS, ...recordData } = data;
  
  // 计算过期时间
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  
  const [result] = await db.insert(exportHistoryRecords).values({
    ...recordData,
    expiresAt,
  });
  
  return result;
}

/**
 * 获取用户导出历史列表
 */
export async function getUserExportHistory(userId: number, options: {
  exportType?: string;
  exportFormat?: string;
  status?: string;
  includeExpired?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
} = {}) {
  const {
    exportType,
    exportFormat,
    status,
    includeExpired = false,
    startDate,
    endDate,
    limit = 50,
    offset = 0
  } = options;
  
  let query = db.select().from(exportHistoryRecords);
  
  const conditions = [eq(exportHistoryRecords.userId, userId)];
  
  if (exportType) {
    conditions.push(eq(exportHistoryRecords.exportType, exportType as any));
  }
  if (exportFormat) {
    conditions.push(eq(exportHistoryRecords.exportFormat, exportFormat as any));
  }
  if (status) {
    conditions.push(eq(exportHistoryRecords.status, status as any));
  }
  if (!includeExpired) {
    conditions.push(eq(exportHistoryRecords.isExpired, false));
  }
  if (startDate) {
    conditions.push(gte(exportHistoryRecords.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(exportHistoryRecords.createdAt, endDate));
  }
  
  query = query.where(and(...conditions)) as any;
  
  return await query
    .orderBy(desc(exportHistoryRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * 获取导出历史记录详情
 */
export async function getExportHistoryById(id: number, userId?: number) {
  const conditions = [eq(exportHistoryRecords.id, id)];
  if (userId) {
    conditions.push(eq(exportHistoryRecords.userId, userId));
  }
  
  const [record] = await db
    .select()
    .from(exportHistoryRecords)
    .where(and(...conditions));
  
  return record;
}

/**
 * 更新导出历史记录
 */
export async function updateExportHistory(id: number, data: Partial<NewExportHistoryRecord>) {
  await db
    .update(exportHistoryRecords)
    .set(data)
    .where(eq(exportHistoryRecords.id, id));
}

/**
 * 记录下载
 */
export async function recordDownload(id: number) {
  const record = await getExportHistoryById(id);
  if (!record) return null;
  
  await db
    .update(exportHistoryRecords)
    .set({
      downloadCount: record.downloadCount + 1,
      lastDownloadAt: new Date(),
    })
    .where(eq(exportHistoryRecords.id, id));
  
  return { success: true, downloadCount: record.downloadCount + 1 };
}

/**
 * 检查文件是否可下载
 */
export async function checkFileAvailability(id: number, userId: number) {
  const record = await getExportHistoryById(id, userId);
  
  if (!record) {
    return { available: false, reason: "记录不存在" };
  }
  
  if (record.status !== "completed") {
    return { available: false, reason: "导出尚未完成" };
  }
  
  if (record.isExpired) {
    return { available: false, reason: "文件已过期" };
  }
  
  if (!record.fileUrl) {
    return { available: false, reason: "文件不存在" };
  }
  
  // 检查是否即将过期（7天内）
  const warningDays = 7;
  const warningDate = new Date(Date.now() + warningDays * 24 * 60 * 60 * 1000);
  const isExpiringSoon = record.expiresAt && new Date(record.expiresAt) < warningDate;
  
  return {
    available: true,
    fileUrl: record.fileUrl,
    fileName: record.fileName,
    fileSize: record.fileSize,
    expiresAt: record.expiresAt,
    isExpiringSoon,
    daysUntilExpiry: record.expiresAt
      ? Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : null,
  };
}

// ==================== 过期清理功能 ====================

/**
 * 获取已过期的记录
 */
export async function getExpiredRecords(limit: number = 100) {
  return await db
    .select()
    .from(exportHistoryRecords)
    .where(and(
      lt(exportHistoryRecords.expiresAt, new Date()),
      eq(exportHistoryRecords.isExpired, false),
      eq(exportHistoryRecords.status, "completed")
    ))
    .limit(limit);
}

/**
 * 标记记录为已过期
 */
export async function markAsExpired(id: number) {
  await db
    .update(exportHistoryRecords)
    .set({ isExpired: true })
    .where(eq(exportHistoryRecords.id, id));
}

/**
 * 清理过期文件
 */
export async function cleanupExpiredFile(id: number) {
  const record = await getExportHistoryById(id);
  if (!record || !record.fileKey) return { success: false, reason: "记录不存在或无文件" };
  
  try {
    // 从S3删除文件
    await storageDelete(record.fileKey);
    
    // 更新记录
    await db
      .update(exportHistoryRecords)
      .set({
        isExpired: true,
        cleanedAt: new Date(),
        fileUrl: null,
        fileKey: null,
      })
      .where(eq(exportHistoryRecords.id, id));
    
    return { success: true };
  } catch (error: any) {
    console.error(`清理文件失败 [${id}]:`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * 批量清理过期文件
 */
export async function batchCleanupExpiredFiles(limit: number = 50) {
  const expiredRecords = await getExpiredRecords(limit);
  
  const results = {
    total: expiredRecords.length,
    success: 0,
    failed: 0,
    errors: [] as { id: number; error: string }[],
  };
  
  for (const record of expiredRecords) {
    const result = await cleanupExpiredFile(record.id);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({ id: record.id, error: result.reason || "未知错误" });
    }
  }
  
  return results;
}

/**
 * 获取清理统计
 */
export async function getCleanupStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // 总记录数
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(exportHistoryRecords);
  
  // 已过期记录数
  const [expiredResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(exportHistoryRecords)
    .where(eq(exportHistoryRecords.isExpired, true));
  
  // 待清理记录数
  const [pendingCleanupResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(exportHistoryRecords)
    .where(and(
      lt(exportHistoryRecords.expiresAt, now),
      eq(exportHistoryRecords.isExpired, false)
    ));
  
  // 已清理记录数（最近30天）
  const [cleanedResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(exportHistoryRecords)
    .where(and(
      gte(exportHistoryRecords.cleanedAt, thirtyDaysAgo),
      eq(exportHistoryRecords.isExpired, true)
    ));
  
  // 计算节省的存储空间
  const [savedSpaceResult] = await db
    .select({ totalSize: sql<number>`COALESCE(SUM(file_size), 0)` })
    .from(exportHistoryRecords)
    .where(and(
      gte(exportHistoryRecords.cleanedAt, thirtyDaysAgo),
      eq(exportHistoryRecords.isExpired, true)
    ));
  
  return {
    totalRecords: totalResult?.count || 0,
    expiredRecords: expiredResult?.count || 0,
    pendingCleanup: pendingCleanupResult?.count || 0,
    cleanedLast30Days: cleanedResult?.count || 0,
    savedStorageBytes: savedSpaceResult?.totalSize || 0,
    savedStorageMB: Math.round((savedSpaceResult?.totalSize || 0) / (1024 * 1024) * 100) / 100,
  };
}

// ==================== 统计功能 ====================

/**
 * 获取用户导出统计
 */
export async function getUserExportStats(userId: number) {
  const records = await db
    .select()
    .from(exportHistoryRecords)
    .where(eq(exportHistoryRecords.userId, userId));
  
  const stats = {
    totalExports: records.length,
    byType: {
      error_questions: 0,
      exam_paper: 0,
      learning_report: 0,
      custom: 0,
    } as Record<string, number>,
    byFormat: {
      pdf: 0,
      word: 0,
      markdown: 0,
      html: 0,
    } as Record<string, number>,
    byStatus: {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    } as Record<string, number>,
    totalDownloads: 0,
    totalFileSize: 0,
    expiredCount: 0,
  };
  
  for (const record of records) {
    stats.byType[record.exportType] = (stats.byType[record.exportType] || 0) + 1;
    stats.byFormat[record.exportFormat] = (stats.byFormat[record.exportFormat] || 0) + 1;
    stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;
    stats.totalDownloads += record.downloadCount;
    stats.totalFileSize += record.fileSize || 0;
    if (record.isExpired) stats.expiredCount++;
  }
  
  return stats;
}

/**
 * 获取系统导出统计（管理员用）
 */
export async function getSystemExportStats(days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const records = await db
    .select()
    .from(exportHistoryRecords)
    .where(gte(exportHistoryRecords.createdAt, startDate));
  
  // 按日期分组统计
  const dailyStats: Record<string, { exports: number; downloads: number; fileSize: number }> = {};
  
  for (const record of records) {
    const date = new Date(record.createdAt).toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { exports: 0, downloads: 0, fileSize: 0 };
    }
    dailyStats[date].exports++;
    dailyStats[date].downloads += record.downloadCount;
    dailyStats[date].fileSize += record.fileSize || 0;
  }
  
  return {
    period: { start: startDate, end: new Date() },
    totalExports: records.length,
    totalDownloads: records.reduce((sum, r) => sum + r.downloadCount, 0),
    totalFileSize: records.reduce((sum, r) => sum + (r.fileSize || 0), 0),
    successRate: records.length > 0
      ? Math.round(records.filter(r => r.status === "completed").length / records.length * 100)
      : 0,
    dailyStats,
  };
}

// ==================== 辅助函数 ====================

/**
 * 延长文件过期时间
 */
export async function extendExpiry(id: number, userId: number, additionalDays: number = 30) {
  const record = await getExportHistoryById(id, userId);
  if (!record) return { success: false, reason: "记录不存在" };
  if (record.isExpired) return { success: false, reason: "文件已过期且已被清理" };
  
  const currentExpiry = record.expiresAt ? new Date(record.expiresAt) : new Date();
  const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + additionalDays * 24 * 60 * 60 * 1000);
  
  await db
    .update(exportHistoryRecords)
    .set({ expiresAt: newExpiry })
    .where(eq(exportHistoryRecords.id, id));
  
  return { success: true, newExpiresAt: newExpiry };
}

/**
 * 删除导出历史记录（包括文件）
 */
export async function deleteExportHistory(id: number, userId: number) {
  const record = await getExportHistoryById(id, userId);
  if (!record) return { success: false, reason: "记录不存在" };
  
  // 如果有文件，先删除文件
  if (record.fileKey && !record.isExpired) {
    try {
      await storageDelete(record.fileKey);
    } catch (error) {
      console.error(`删除文件失败 [${id}]:`, error);
    }
  }
  
  // 删除记录
  await db.delete(exportHistoryRecords).where(eq(exportHistoryRecords.id, id));
  
  return { success: true };
}
