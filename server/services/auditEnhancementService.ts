/**
 * 批量操作审计增强服务
 * 添加操作前后数据对比视图,支持导出审计报告
 */

import { db } from "../db";
import { batchOperationHistory, errorQuestions } from "../../drizzle/schema";
import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";

export interface DataSnapshot {
  id: number;
  [key: string]: any;
}

export interface ChangeDetail {
  recordId: number;
  field: string;
  oldValue: any;
  newValue: any;
  changeType: "added" | "modified" | "deleted";
}

export interface AuditReport {
  operationId: number;
  operationType: string;
  operationDescription: string;
  operatorUserId: number;
  operationTime: Date;
  affectedCount: number;
  changes: ChangeDetail[];
  summary: {
    totalChanges: number;
    addedCount: number;
    modifiedCount: number;
    deletedCount: number;
    affectedFields: string[];
  };
}

export async function captureDataSnapshot(
  tableName: string,
  recordIds: number[]
): Promise<DataSnapshot[]> {
  if (tableName === "error_questions") {
    const records = await db
      .select()
      .from(errorQuestions)
      .where(inArray(errorQuestions.id, recordIds));

    return records.map((record) => ({
      id: record.id,
      userId: record.userId,
      subject: record.subject,
      schoolLevel: record.schoolLevel,
      difficulty: record.difficulty,
      masteryLevel: record.masteryLevel,
      reviewCount: record.reviewCount,
      lastReviewedAt: record.lastReviewedAt,
      tags: record.tags,
      notes: record.notes,
      isDeleted: record.isDeleted,
    }));
  }

  throw new Error(`不支持的表名: ${tableName}`);
}

export function compareSnapshots(
  beforeSnapshot: DataSnapshot[],
  afterSnapshot: DataSnapshot[]
): ChangeDetail[] {
  const changes: ChangeDetail[] = [];
  const beforeMap = new Map(beforeSnapshot.map((s) => [s.id, s]));
  const afterMap = new Map(afterSnapshot.map((s) => [s.id, s]));

  for (const [id, beforeData] of beforeMap.entries()) {
    const afterData = afterMap.get(id);

    if (!afterData) {
      changes.push({
        recordId: id,
        field: "_record",
        oldValue: beforeData,
        newValue: null,
        changeType: "deleted",
      });
    } else {
      for (const field of Object.keys(beforeData)) {
        if (field === "id") continue;

        const oldValue = beforeData[field];
        const newValue = afterData[field];

        const oldValueStr = typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue);
        const newValueStr = typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue);

        if (oldValueStr !== newValueStr) {
          changes.push({
            recordId: id,
            field,
            oldValue,
            newValue,
            changeType: "modified",
          });
        }
      }
    }
  }

  for (const [id, afterData] of afterMap.entries()) {
    if (!beforeMap.has(id)) {
      changes.push({
        recordId: id,
        field: "_record",
        oldValue: null,
        newValue: afterData,
        changeType: "added",
      });
    }
  }

  return changes;
}

export async function recordBatchOperationEnhanced(
  userId: number,
  operationType: string,
  operationDescription: string,
  affectedIds: number[],
  beforeSnapshot: DataSnapshot[],
  afterSnapshot: DataSnapshot[]
) {
  const changeDetails = compareSnapshots(beforeSnapshot, afterSnapshot);

  const [result] = await db.insert(batchOperationHistory).values({
    userId,
    operationType: operationType as any,
    operationDescription,
    affectedCount: affectedIds.length,
    affectedIds: affectedIds,
    beforeSnapshot: beforeSnapshot,
    afterSnapshot: afterSnapshot,
    changeDetails: changeDetails,
    canUndo: 1,
    undoStatus: "none",
  });

  return {
    operationId: result.insertId,
    changeCount: changeDetails.length,
  };
}

export async function getOperationComparisonView(operationId: number) {
  const [operation] = await db
    .select()
    .from(batchOperationHistory)
    .where(eq(batchOperationHistory.id, operationId))
    .limit(1);

  if (!operation) {
    throw new Error("操作记录不存在");
  }

  const beforeSnapshot = operation.beforeSnapshot as DataSnapshot[];
  const afterSnapshot = operation.afterSnapshot as DataSnapshot[];
  const changeDetails = operation.changeDetails as ChangeDetail[];

  const summary = {
    totalChanges: changeDetails.length,
    addedCount: changeDetails.filter((c) => c.changeType === "added").length,
    modifiedCount: changeDetails.filter((c) => c.changeType === "modified").length,
    deletedCount: changeDetails.filter((c) => c.changeType === "deleted").length,
    affectedFields: [...new Set(changeDetails.map((c) => c.field))].filter((f) => f !== "_record"),
  };

  return {
    operation: {
      id: operation.id,
      type: operation.operationType,
      description: operation.operationDescription,
      userId: operation.userId,
      time: operation.createdAt,
      affectedCount: operation.affectedCount,
    },
    beforeSnapshot,
    afterSnapshot,
    changes: changeDetails,
    summary,
  };
}

export async function generateAuditReport(
  filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: number;
    operationType?: string;
  }
): Promise<AuditReport[]> {
  let query = db.select().from(batchOperationHistory);

  const conditions = [];
  if (filters.startDate) {
    conditions.push(gte(batchOperationHistory.createdAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(batchOperationHistory.createdAt, filters.endDate));
  }
  if (filters.userId) {
    conditions.push(eq(batchOperationHistory.userId, filters.userId));
  }
  if (filters.operationType) {
    conditions.push(eq(batchOperationHistory.operationType, filters.operationType as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const operations = await query.orderBy(desc(batchOperationHistory.createdAt));

  return operations.map((op) => {
    const changeDetails = (op.changeDetails as ChangeDetail[]) || [];
    
    return {
      operationId: op.id,
      operationType: op.operationType,
      operationDescription: op.operationDescription,
      operatorUserId: op.userId,
      operationTime: op.createdAt,
      affectedCount: op.affectedCount,
      changes: changeDetails,
      summary: {
        totalChanges: changeDetails.length,
        addedCount: changeDetails.filter((c) => c.changeType === "added").length,
        modifiedCount: changeDetails.filter((c) => c.changeType === "modified").length,
        deletedCount: changeDetails.filter((c) => c.changeType === "deleted").length,
        affectedFields: [...new Set(changeDetails.map((c) => c.field))].filter((f) => f !== "_record"),
      },
    };
  });
}

export function exportAuditReportToCSV(reports: AuditReport[]): string {
  const headers = ["操作ID", "操作类型", "操作描述", "操作人ID", "操作时间", "影响记录数", "变更总数", "新增数", "修改数", "删除数", "涉及字段"];

  const rows = reports.map((report) => [
    report.operationId,
    report.operationType,
    report.operationDescription,
    report.operatorUserId,
    report.operationTime.toISOString(),
    report.affectedCount,
    report.summary.totalChanges,
    report.summary.addedCount,
    report.summary.modifiedCount,
    report.summary.deletedCount,
    report.summary.affectedFields.join("; "),
  ]);

  return [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
}

export function exportChangeDetailsToCSV(operationId: number, changes: ChangeDetail[]): string {
  const headers = ["操作ID", "记录ID", "字段名", "变更类型", "旧值", "新值"];

  const rows = changes.map((change) => [
    operationId,
    change.recordId,
    change.field,
    change.changeType,
    typeof change.oldValue === "object" ? JSON.stringify(change.oldValue) : String(change.oldValue || ""),
    typeof change.newValue === "object" ? JSON.stringify(change.newValue) : String(change.newValue || ""),
  ]);

  return [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
}

export async function analyzeOperationImpact(operationId: number) {
  const comparisonView = await getOperationComparisonView(operationId);

  const riskFactors = [];
  let riskLevel: "low" | "medium" | "high" = "low";

  if (comparisonView.summary.deletedCount > 0) {
    riskFactors.push(`删除了${comparisonView.summary.deletedCount}条记录`);
    riskLevel = "high";
  }

  if (comparisonView.operation.affectedCount > 100) {
    riskFactors.push(`影响了${comparisonView.operation.affectedCount}条记录`);
    if (riskLevel === "low") riskLevel = "medium";
  }

  const criticalFields = ["masteryLevel", "difficulty", "isDeleted"];
  const modifiedCriticalFields = comparisonView.summary.affectedFields.filter((f) => criticalFields.includes(f));
  if (modifiedCriticalFields.length > 0) {
    riskFactors.push(`修改了关键字段: ${modifiedCriticalFields.join(", ")}`);
    if (riskLevel === "low") riskLevel = "medium";
  }

  return {
    operationId,
    riskLevel,
    riskFactors,
    impact: {
      affectedRecords: comparisonView.operation.affectedCount,
      totalChanges: comparisonView.summary.totalChanges,
      deletions: comparisonView.summary.deletedCount,
      modifications: comparisonView.summary.modifiedCount,
      additions: comparisonView.summary.addedCount,
    },
    recommendation: riskLevel === "high" ? "建议仔细审查此操作,必要时进行撤销" : riskLevel === "medium" ? "建议验证操作结果是否符合预期" : "操作风险较低",
  };
}
