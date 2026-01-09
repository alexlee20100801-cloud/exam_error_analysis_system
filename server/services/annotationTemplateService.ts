import { getDb } from "../db";
import { annotationTemplates } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { PRESET_TEMPLATES, type AnnotationTemplate, type TemplateCategory } from "../types/annotationTemplate";

/**
 * 初始化预设模板（仅在首次运行时）
 */
export async function initializePresetTemplates(systemUserId: string) {
  const db = getDb();
  
  // 检查是否已经初始化
  const existingTemplates = await db
    .select()
    .from(annotationTemplates)
    .where(eq(annotationTemplates.createdBy, systemUserId))
    .limit(1);
  
  if (existingTemplates.length > 0) {
    return; // 已初始化，跳过
  }
  
  // 插入预设模板
  for (const template of PRESET_TEMPLATES) {
    await db.insert(annotationTemplates).values({
      ...template,
      createdBy: systemUserId,
      usageCount: 0,
    });
  }
}

/**
 * 获取所有公开模板
 */
export async function getPublicTemplates(filters?: {
  category?: TemplateCategory;
  subject?: string;
}) {
  const db = getDb();
  
  let query = db
    .select()
    .from(annotationTemplates)
    .where(eq(annotationTemplates.isPublic, true))
    .$dynamic();
  
  if (filters?.category) {
    query = query.where(sql`${annotationTemplates.category} = ${filters.category}`);
  }
  
  if (filters?.subject) {
    query = query.where(sql`${annotationTemplates.subject} = ${filters.subject}`);
  }
  
  const templates = await query.orderBy(desc(annotationTemplates.usageCount));
  
  return templates;
}

/**
 * 获取用户创建的模板
 */
export async function getUserTemplates(userId: number) {
  const db = getDb();
  
  const templates = await db
    .select()
    .from(annotationTemplates)
    .where(eq(annotationTemplates.createdBy, userId))
    .orderBy(desc(annotationTemplates.createdAt));
  
  return templates;
}

/**
 * 根据ID获取模板
 */
export async function getTemplateById(templateId: number) {
  const db = getDb();
  
  const template = await db
    .select()
    .from(annotationTemplates)
    .where(eq(annotationTemplates.id, templateId))
    .limit(1);
  
  return template[0] || null;
}

/**
 * 创建新模板
 */
export async function createTemplate(data: {
  name: string;
  category: TemplateCategory;
  description?: string;
  thumbnailUrl?: string;
  annotations: any[];
  subject: string;
  isPublic: boolean;
  createdBy: string;
}) {
  const db = getDb();
  
  const result = await db.insert(annotationTemplates).values({
    ...data,
    usageCount: 0,
  });
  
  return result;
}

/**
 * 更新模板
 */
export async function updateTemplate(
  templateId: number,
  userId: string,
  data: {
    name?: string;
    description?: string;
    thumbnailUrl?: string;
    annotations?: any[];
    isPublic?: boolean;
  }
) {
  const db = getDb();
  
  // 验证权限
  const template = await getTemplateById(templateId);
  if (!template || template.createdBy !== userId) {
    throw new Error("无权限修改此模板");
  }
  
  const result = await db
    .update(annotationTemplates)
    .set(data)
    .where(eq(annotationTemplates.id, templateId));
  
  return result;
}

/**
 * 删除模板
 */
export async function deleteTemplate(templateId: number, userId: number) {
  const db = getDb();
  
  // 验证权限
  const template = await getTemplateById(templateId);
  if (!template || template.createdBy !== userId) {
    throw new Error("无权限删除此模板");
  }
  
  const result = await db
    .delete(annotationTemplates)
    .where(eq(annotationTemplates.id, templateId));
  
  return result;
}

/**
 * 增加模板使用次数
 */
export async function incrementTemplateUsage(templateId: number) {
  const db = getDb();
  
  const template = await getTemplateById(templateId);
  if (!template) {
    return;
  }
  
  await db
    .update(annotationTemplates)
    .set({ usageCount: (template.usageCount || 0) + 1 })
    .where(eq(annotationTemplates.id, templateId));
}
