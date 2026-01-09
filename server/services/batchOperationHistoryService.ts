import { db } from "../db";
import {
  batchOperationHistory,
  errorQuestions,
  type NewBatchOperationHistory,
  type BatchOperationHistory,
} from "../../drizzle/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

/**
 * 批量操作历史记录服务
 * 记录所有批量操作并支持撤销功能
 */

/**
 * 记录批量操作历史
 */
export async function recordBatchOperation(params: {
  userId: number;
  operationType:
    | "batch_delete"
    | "batch_mark_mastered"
    | "batch_export"
    | "batch_update_difficulty"
    | "batch_add_tags"
    | "batch_update_subject"
    | "batch_update_grade";
  operationDescription: string;
  affectedIds: number[];
  beforeSnapshot?: any;
  afterSnapshot?: any;
  changeDetails?: any;
  canUndo?: boolean;
}) {
  const [record] = await db
    .insert(batchOperationHistory)
    .values({
      userId: params.userId,
      operationType: params.operationType,
      operationDescription: params.operationDescription,
      affectedCount: params.affectedIds.length,
      affectedIds: JSON.stringify(params.affectedIds),
      beforeSnapshot: params.beforeSnapshot ? JSON.stringify(params.beforeSnapshot) : null,
      afterSnapshot: params.afterSnapshot ? JSON.stringify(params.afterSnapshot) : null,
      changeDetails: params.changeDetails ? JSON.stringify(params.changeDetails) : null,
      canUndo: params.canUndo !== false ? 1 : 0,
      undoStatus: "none",
      createdAt: new Date(),
    })
    .$returningId();

  return record.id;
}

/**
 * 获取用户的批量操作历史
 */
export async function getUserBatchOperationHistory(
  userId: number,
  options: {
    operationType?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { operationType, limit = 50, offset = 0 } = options;

  let query = db
    .select()
    .from(batchOperationHistory)
    .where(eq(batchOperationHistory.userId, userId))
    .orderBy(desc(batchOperationHistory.createdAt))
    .limit(limit)
    .offset(offset);

  if (operationType) {
    // @ts-ignore
    query = query.where(
      and(
        eq(batchOperationHistory.userId, userId),
        eq(batchOperationHistory.operationType, operationType as any)
      )
    );
  }

  const records = await query;

  // 解析JSON字段
  return records.map((record: any) => ({
    ...record,
    affectedIds: JSON.parse(record.affectedIds as string),
    beforeSnapshot: record.beforeSnapshot ? JSON.parse(record.beforeSnapshot as string) : null,
    afterSnapshot: record.afterSnapshot ? JSON.parse(record.afterSnapshot as string) : null,
    changeDetails: record.changeDetails ? JSON.parse(record.changeDetails as string) : null,
  }));
}

/**
 * 获取批量操作历史详情
 */
export async function getBatchOperationDetail(operationId: number, userId: number) {
  const [record] = await db
    .select()
    .from(batchOperationHistory)
    .where(
      and(eq(batchOperationHistory.id, operationId), eq(batchOperationHistory.userId, userId))
    )
    .limit(1);

  if (!record) {
    throw new Error("操作记录不存在");
  }

  return {
    ...record,
    affectedIds: JSON.parse(record.affectedIds as string),
    beforeSnapshot: record.beforeSnapshot ? JSON.parse(record.beforeSnapshot as string) : null,
    afterSnapshot: record.afterSnapshot ? JSON.parse(record.afterSnapshot as string) : null,
    changeDetails: record.changeDetails ? JSON.parse(record.changeDetails as string) : null,
  };
}

/**
 * 撤销批量删除操作
 */
async function undoBatchDelete(record: BatchOperationHistory, userId: number) {
  const affectedIds = JSON.parse(record.affectedIds as string) as number[];
  const beforeSnapshot = record.beforeSnapshot ? JSON.parse(record.beforeSnapshot as string) : null;

  if (!beforeSnapshot || !Array.isArray(beforeSnapshot)) {
    throw new Error("无法撤销:缺少操作前的数据快照");
  }

  // 恢复被删除的记录
  for (const item of beforeSnapshot) {
    await db.insert(errorQuestions).values({
      ...item,
      id: undefined, // 让数据库自动生成新ID
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(),
    });
  }

  return beforeSnapshot.length;
}

/**
 * 撤销批量标记掌握操作
 */
async function undoBatchMarkMastered(record: BatchOperationHistory, userId: number) {
  const affectedIds = JSON.parse(record.affectedIds as string) as number[];
  const beforeSnapshot = record.beforeSnapshot ? JSON.parse(record.beforeSnapshot as string) : null;

  if (!beforeSnapshot) {
    throw new Error("无法撤销:缺少操作前的数据快照");
  }

  // 恢复掌握度状态
  for (const item of beforeSnapshot) {
    await db
      .update(errorQuestions)
      .set({
        masteryLevel: item.masteryLevel,
        // @ts-ignore
        updatedAt: new Date(),
      })
      .where(eq(errorQuestions.id, item.id));
  }

  return affectedIds.length;
}

/**
 * 撤销批量更新难度操作
 */
async function undoBatchUpdateDifficulty(record: BatchOperationHistory, userId: number) {
  const affectedIds = JSON.parse(record.affectedIds as string) as number[];
  const beforeSnapshot = record.beforeSnapshot ? JSON.parse(record.beforeSnapshot as string) : null;

  if (!beforeSnapshot) {
    throw new Error("无法撤销:缺少操作前的数据快照");
  }

  // 恢复难度设置
  for (const item of beforeSnapshot) {
    await db
      .update(errorQuestions)
      .set({
        difficulty: item.difficulty,
        // @ts-ignore
        updatedAt: new Date(),
      })
      .where(eq(errorQuestions.id, item.id));
  }

  return affectedIds.length;
}

/**
 * 撤销批量添加标签操作
 */
async function undoBatchAddTags(record: BatchOperationHistory, userId: number) {
  const affectedIds = JSON.parse(record.affectedIds as string) as number[];
  const beforeSnapshot = record.beforeSnapshot ? JSON.parse(record.beforeSnapshot as string) : null;

  if (!beforeSnapshot) {
    throw new Error("无法撤销:缺少操作前的数据快照");
  }

  // 恢复标签状态
  for (const item of beforeSnapshot) {
    await db
      .update(errorQuestions)
      .set({
        tags: item.tags,
        // @ts-ignore
        updatedAt: new Date(),
      })
      .where(eq(errorQuestions.id, item.id));
  }

  return affectedIds.length;
}

/**
 * 撤销批量更新科目操作
 */
async function undoBatchUpdateSubject(record: BatchOperationHistory, userId: number) {
  const affectedIds = JSON.parse(record.affectedIds as string) as number[];
  const beforeSnapshot = record.beforeSnapshot ? JSON.parse(record.beforeSnapshot as string) : null;

  if (!beforeSnapshot) {
    throw new Error("无法撤销:缺少操作前的数据快照");
  }

  // 恢复科目设置
  for (const item of beforeSnapshot) {
    await db
      .update(errorQuestions)
      .set({
        subject: item.subject,
        // @ts-ignore
        updatedAt: new Date(),
      })
      .where(eq(errorQuestions.id, item.id));
  }

  return affectedIds.length;
}

/**
 * 撤销批量更新年级操作
 */
async function undoBatchUpdateGrade(record: BatchOperationHistory, userId: number) {
  const affectedIds = JSON.parse(record.affectedIds as string) as number[];
  const beforeSnapshot = record.beforeSnapshot ? JSON.parse(record.beforeSnapshot as string) : null;

  if (!beforeSnapshot) {
    throw new Error("无法撤销:缺少操作前的数据快照");
  }

  // 恢复年级设置
  for (const item of beforeSnapshot) {
    await db
      .update(errorQuestions)
      .set({
        schoolLevel: item.schoolLevel,
        // @ts-ignore
        updatedAt: new Date(),
      })
      .where(eq(errorQuestions.id, item.id));
  }

  return affectedIds.length;
}

/**
 * 撤销批量操作
 */
export async function undoBatchOperation(operationId: number, userId: number) {
  // 获取操作记录
  const [record] = await db
    .select()
    .from(batchOperationHistory)
    .where(
      and(eq(batchOperationHistory.id, operationId), eq(batchOperationHistory.userId, userId))
    )
    .limit(1);

  if (!record) {
    throw new Error("操作记录不存在");
  }

  if (record.canUndo === 0) {
    throw new Error("该操作不支持撤销");
  }

  if (record.undoStatus === "undone") {
    throw new Error("该操作已经被撤销");
  }

  let restoredCount = 0;

  // 根据操作类型执行相应的撤销逻辑
  switch (record.operationType) {
    case "batch_delete":
      restoredCount = await undoBatchDelete(record, userId);
      break;
    case "batch_mark_mastered":
      restoredCount = await undoBatchMarkMastered(record, userId);
      break;
    case "batch_update_difficulty":
      restoredCount = await undoBatchUpdateDifficulty(record, userId);
      break;
    case "batch_add_tags":
      restoredCount = await undoBatchAddTags(record, userId);
      break;
    case "batch_update_subject":
      restoredCount = await undoBatchUpdateSubject(record, userId);
      break;
    case "batch_update_grade":
      restoredCount = await undoBatchUpdateGrade(record, userId);
      break;
    case "batch_export":
      throw new Error("导出操作无法撤销");
    default:
      throw new Error(`不支持的操作类型: ${record.operationType}`);
  }

  // 更新撤销状态
  await db
    .update(batchOperationHistory)
    .set({
      undoStatus: "undone",
      undoAt: new Date(),
      undoByUserId: userId,
      updatedAt: new Date(),
    })
    .where(eq(batchOperationHistory.id, operationId));

  return {
    success: true,
    restoredCount,
    message: `已成功撤销操作,恢复了 ${restoredCount} 条记录`,
  };
}

/**
 * 获取批量操作统计数据
 */
export async function getBatchOperationStatistics(userId: number) {
  // 统计各类操作的数量
  const allOperations = await db
    .select()
    .from(batchOperationHistory)
    .where(eq(batchOperationHistory.userId, userId));

  const stats = {
    totalOperations: allOperations.length,
    byType: {} as Record<string, number>,
    totalAffectedRecords: 0,
    undoneOperations: 0,
  };

  for (const op of allOperations) {
    // 按类型统计
    stats.byType[op.operationType] = (stats.byType[op.operationType] || 0) + 1;

    // 统计影响的记录数
    stats.totalAffectedRecords += op.affectedCount;

    // 统计撤销的操作数
    if (op.undoStatus === "undone") {
      stats.undoneOperations++;
    }
  }

  return stats;
}

/**
 * 清理过期的批量操作历史
 * @param daysToKeep 保留天数,默认90天
 */
export async function cleanupOldBatchOperationHistory(daysToKeep: number = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(batchOperationHistory)
    .where(and(eq(batchOperationHistory.createdAt, cutoffDate)));

  return {
    success: true,
    // @ts-ignore
    deletedCount: result.rowsAffected || 0,
    message: `已清理 ${daysToKeep} 天前的批量操作历史`,
  };
}
