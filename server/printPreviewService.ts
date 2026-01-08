import { db } from "./db";
import { printTemplates, printHistory, errorQuestions } from "../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * 打印预览服务
 * 提供打印模板管理和打印历史记录功能
 */

/**
 * 创建打印模板
 */
export async function createPrintTemplate(userId: number, template: {
  name: string;
  layout?: string;
  fontSize?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  includeAiAnalysis?: boolean;
  includeAnswer?: boolean;
  includeExplanation?: boolean;
  includeKnowledgePoints?: boolean;
  includeImage?: boolean;
  headerText?: string;
  footerText?: string;
  showPageNumber?: boolean;
  paperSize?: string;
  orientation?: string;
  isDefault?: boolean;
}) {
  // 如果设置为默认模板，先取消其他默认模板
  if (template.isDefault) {
    await db.update(printTemplates)
      .set({ isDefault: false })
      .where(eq(printTemplates.userId, userId));
  }

  const [newTemplate] = await db.insert(printTemplates).values({
    userId,
    ...template,
  });

  return newTemplate;
}

/**
 * 获取用户的打印模板列表
 */
export async function getUserPrintTemplates(userId: number) {
  return db.select()
    .from(printTemplates)
    .where(eq(printTemplates.userId, userId))
    .orderBy(desc(printTemplates.isDefault), desc(printTemplates.createdAt));
}

/**
 * 获取用户的默认打印模板
 */
export async function getDefaultPrintTemplate(userId: number) {
  const templates = await db.select()
    .from(printTemplates)
    .where(and(
      eq(printTemplates.userId, userId),
      eq(printTemplates.isDefault, true)
    ))
    .limit(1);

  return templates[0] || null;
}

/**
 * 获取打印模板详情
 */
export async function getPrintTemplateById(templateId: number, userId: number) {
  const templates = await db.select()
    .from(printTemplates)
    .where(and(
      eq(printTemplates.id, templateId),
      eq(printTemplates.userId, userId)
    ))
    .limit(1);

  return templates[0] || null;
}

/**
 * 更新打印模板
 */
export async function updatePrintTemplate(
  templateId: number,
  userId: number,
  updates: Partial<{
    name: string;
    layout: string;
    fontSize: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    includeAiAnalysis: boolean;
    includeAnswer: boolean;
    includeExplanation: boolean;
    includeKnowledgePoints: boolean;
    includeImage: boolean;
    headerText: string | null;
    footerText: string | null;
    showPageNumber: boolean;
    paperSize: string;
    orientation: string;
    isDefault: boolean;
  }>
) {
  // 如果设置为默认模板，先取消其他默认模板
  if (updates.isDefault) {
    await db.update(printTemplates)
      .set({ isDefault: false })
      .where(eq(printTemplates.userId, userId));
  }

  await db.update(printTemplates)
    .set(updates)
    .where(and(
      eq(printTemplates.id, templateId),
      eq(printTemplates.userId, userId)
    ));
}

/**
 * 删除打印模板
 */
export async function deletePrintTemplate(templateId: number, userId: number) {
  await db.delete(printTemplates)
    .where(and(
      eq(printTemplates.id, templateId),
      eq(printTemplates.userId, userId)
    ));
}

/**
 * 获取打印预览数据
 * 返回错题列表和模板配置
 */
export async function getPrintPreviewData(userId: number, questionIds: number[], templateId?: number) {
  // 获取错题数据
  const questions = await db.select()
    .from(errorQuestions)
    .where(and(
      eq(errorQuestions.userId, userId),
      inArray(errorQuestions.id, questionIds)
    ));

  // 获取模板配置
  let template;
  if (templateId) {
    template = await getPrintTemplateById(templateId, userId);
  } else {
    template = await getDefaultPrintTemplate(userId);
  }

  // 如果没有模板，使用默认配置
  if (!template) {
    template = {
      layout: 'single',
      fontSize: 14,
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 20,
      marginRight: 20,
      includeAiAnalysis: true,
      includeAnswer: true,
      includeExplanation: true,
      includeKnowledgePoints: true,
      includeImage: true,
      headerText: null,
      footerText: null,
      showPageNumber: true,
      paperSize: 'A4',
      orientation: 'portrait',
    };
  }

  return {
    questions,
    template,
  };
}

/**
 * 记录打印历史
 */
export async function recordPrintHistory(userId: number, data: {
  templateId?: number;
  questionIds: number[];
  exportType: string;
  fileUrl?: string;
  fileSize?: number;
  configSnapshot: any;
}) {
  const [history] = await db.insert(printHistory).values({
    userId,
    templateId: data.templateId || null,
    questionIds: JSON.stringify(data.questionIds),
    questionCount: data.questionIds.length,
    configSnapshot: JSON.stringify(data.configSnapshot),
    exportType: data.exportType,
    fileUrl: data.fileUrl || null,
    fileSize: data.fileSize || null,
  });

  return history;
}

/**
 * 获取用户的打印历史
 */
export async function getUserPrintHistory(userId: number, limit = 20, offset = 0) {
  const history = await db.select()
    .from(printHistory)
    .where(eq(printHistory.userId, userId))
    .orderBy(desc(printHistory.createdAt))
    .limit(limit)
    .offset(offset);

  return history;
}

/**
 * 获取打印历史统计
 */
export async function getPrintHistoryStats(userId: number) {
  const result = await db.select({
    totalPrints: sql<number>`COUNT(*)`,
    totalQuestions: sql<number>`SUM(${printHistory.questionCount})`,
    pdfExports: sql<number>`SUM(CASE WHEN ${printHistory.exportType} = 'pdf' THEN 1 ELSE 0 END)`,
    wordExports: sql<number>`SUM(CASE WHEN ${printHistory.exportType} = 'word' THEN 1 ELSE 0 END)`,
    directPrints: sql<number>`SUM(CASE WHEN ${printHistory.exportType} = 'print' THEN 1 ELSE 0 END)`,
  })
  .from(printHistory)
  .where(eq(printHistory.userId, userId));

  return result[0] || {
    totalPrints: 0,
    totalQuestions: 0,
    pdfExports: 0,
    wordExports: 0,
    directPrints: 0,
  };
}
