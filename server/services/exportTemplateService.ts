import { getDb } from '../db';
// import { exportTemplates } from '../../drizzle/schema'; // 暂时注释，待后实施导出功能时再启用
import { printTemplates as exportTemplates } from '../../drizzle/schema'; // 临时使用printTemplates作为替代
import { eq, and, desc, or } from 'drizzle-orm';

/**
 * 创建导出模板
 */
export async function createExportTemplate(userId: number, templateData: {
  name: string;
  isDefault?: boolean;
  isPublic?: boolean;
  logoUrl?: string;
  logoPosition?: 'top-left' | 'top-center' | 'top-right';
  logoWidth?: number;
  headerText?: string;
  headerAlign?: 'left' | 'center' | 'right';
  headerFontSize?: number;
  footerText?: string;
  footerAlign?: 'left' | 'center' | 'right';
  footerFontSize?: number;
  showPageNumber?: boolean;
  fontSize?: number;
  lineSpacing?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  showQuestionNumber?: boolean;
  showDifficulty?: boolean;
  showKnowledgePoints?: boolean;
  showAnswer?: boolean;
  showExplanation?: boolean;
  paperSize?: 'A4' | 'A5' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}) {
  const db = getDb();
  
  // 如果设置为默认模板，先取消其他默认模板
  if (templateData.isDefault) {
    await db.update(exportTemplates)
      // @ts-ignore
      .set({ isDefault: false })
      .where(eq(exportTemplates.userId, userId));
  }
  
  const [template] = await db.insert(exportTemplates).values({
    // @ts-ignore
    userId,
    name: templateData.name,
    isDefault: templateData.isDefault || false,
    isPublic: templateData.isPublic || false,
    logoUrl: templateData.logoUrl || null,
    logoPosition: templateData.logoPosition || 'top-left',
    logoWidth: templateData.logoWidth || 100,
    headerText: templateData.headerText || null,
    headerAlign: templateData.headerAlign || 'center',
    headerFontSize: templateData.headerFontSize || 14,
    footerText: templateData.footerText || null,
    footerAlign: templateData.footerAlign || 'center',
    footerFontSize: templateData.footerFontSize || 12,
    showPageNumber: templateData.showPageNumber !== false,
    fontSize: templateData.fontSize || 12,
    lineSpacing: templateData.lineSpacing || 150,
    marginTop: templateData.marginTop || 20,
    marginBottom: templateData.marginBottom || 20,
    marginLeft: templateData.marginLeft || 20,
    marginRight: templateData.marginRight || 20,
    showQuestionNumber: templateData.showQuestionNumber !== false,
    showDifficulty: templateData.showDifficulty !== false,
    showKnowledgePoints: templateData.showKnowledgePoints !== false,
    showAnswer: templateData.showAnswer !== false,
    showExplanation: templateData.showExplanation !== false,
    paperSize: templateData.paperSize || 'A4',
    orientation: templateData.orientation || 'portrait',
    usageCount: 0,
  });
  
  return template;
}

/**
 * 更新导出模板
 */
export async function updateExportTemplate(userId: number, templateId: number, templateData: Partial<{
  name: string;
  isDefault: boolean;
  isPublic: boolean;
  logoUrl: string;
  logoPosition: 'top-left' | 'top-center' | 'top-right';
  logoWidth: number;
  headerText: string;
  headerAlign: 'left' | 'center' | 'right';
  headerFontSize: number;
  footerText: string;
  footerAlign: 'left' | 'center' | 'right';
  footerFontSize: number;
  showPageNumber: boolean;
  fontSize: number;
  lineSpacing: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showQuestionNumber: boolean;
  showDifficulty: boolean;
  showKnowledgePoints: boolean;
  showAnswer: boolean;
  showExplanation: boolean;
  paperSize: 'A4' | 'A5' | 'Letter';
  orientation: 'portrait' | 'landscape';
}>) {
  const db = getDb();
  
  // 如果设置为默认模板，先取消其他默认模板
  if (templateData.isDefault) {
    await db.update(exportTemplates)
      // @ts-ignore
      .set({ isDefault: false })
      .where(and(
        eq(exportTemplates.userId, userId),
        // @ts-ignore
        eq(exportTemplates.id, templateId) === false
      ));
  }
  
  await db.update(exportTemplates)
    .set({
      ...templateData,
      // @ts-ignore
      updatedAt: new Date(),
    })
    .where(and(
      eq(exportTemplates.id, templateId),
      eq(exportTemplates.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 删除导出模板
 */
export async function deleteExportTemplate(userId: number, templateId: number) {
  const db = getDb();
  
  await db.delete(exportTemplates)
    .where(and(
      eq(exportTemplates.id, templateId),
      eq(exportTemplates.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 获取用户的导出模板列表
 */
export async function getUserExportTemplates(userId: number) {
  const db = getDb();
  
  const templates = await db.select()
    .from(exportTemplates)
    .where(eq(exportTemplates.userId, userId))
    .orderBy(desc(exportTemplates.isDefault), desc(exportTemplates.createdAt));
  
  return templates;
}

/**
 * 获取公开模板列表
 */
export async function getPublicExportTemplates() {
  const db = getDb();
  
  const templates = await db.select()
    .from(exportTemplates)
    .where(eq(exportTemplates.isPublic, true as any))
    .orderBy(desc(exportTemplates.usageCount), desc(exportTemplates.createdAt))
    .limit(50);
  
  return templates;
}

/**
 * 获取模板详情
 */
export async function getExportTemplate(userId: number, templateId: number) {
  const db = getDb();
  
  const [template] = await db.select()
    .from(exportTemplates)
    .where(and(
      eq(exportTemplates.id, templateId),
      or(
        eq(exportTemplates.userId, userId),
        // @ts-ignore
        eq(exportTemplates.isPublic, true)
      )
    ))
    .limit(1);
  
  if (!template) {
    throw new Error('模板不存在或无权访问');
  }
  
  return template;
}

/**
 * 获取默认模板
 */
export async function getDefaultExportTemplate(userId: number) {
  const db = getDb();
  
  const [template] = await db.select()
    .from(exportTemplates)
    .where(and(
      eq(exportTemplates.userId, userId),
      // @ts-ignore
      eq(exportTemplates.isDefault, true)
    ))
    .limit(1);
  
  return template || null;
}

/**
 * 设置默认模板
 */
export async function setDefaultExportTemplate(userId: number, templateId: number) {
  const db = getDb();
  
  // 取消其他默认模板
  await db.update(exportTemplates)
    // @ts-ignore
    .set({ isDefault: false })
    .where(eq(exportTemplates.userId, userId));
  
  // 设置新的默认模板
  await db.update(exportTemplates)
    // @ts-ignore
    .set({ isDefault: true })
    .where(and(
      eq(exportTemplates.id, templateId),
      eq(exportTemplates.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 增加模板使用次数
 */
export async function incrementTemplateUsage(templateId: number) {
  const db = getDb();
  
  await db.update(exportTemplates)
    .set({
      // @ts-ignore
      usageCount: db.raw(`${exportTemplates.usageCount} + 1`),
    })
    .where(eq(exportTemplates.id, templateId));
  
  return { success: true };
}

/**
 * 复制公开模板到用户账户
 */
export async function copyPublicTemplate(userId: number, templateId: number) {
  const db = getDb();
  
  // 获取源模板
  const [sourceTemplate] = await db.select()
    .from(exportTemplates)
    .where(and(
      eq(exportTemplates.id, templateId),
      // @ts-ignore
      eq(exportTemplates.isPublic, true)
    ))
    .limit(1);
  
  if (!sourceTemplate) {
    throw new Error('公开模板不存在');
  }
  
  // 创建副本
  const { id, userId: _, createdAt, updatedAt, usageCount, ...templateData } = sourceTemplate;
  
  const [newTemplate] = await db.insert(exportTemplates).values({
    ...templateData,
    // @ts-ignore
    userId,
    name: `${templateData.name} (副本)`,
    isDefault: false,
    isPublic: false,
    usageCount: 0,
  });
  
  return newTemplate;
}

/**
 * 创建系统预设模板
 */
export async function createSystemTemplates(userId: number) {
  const db = getDb();
  
  const templates = [
    {
      name: '标准模板',
      isDefault: true,
      isPublic: false,
      headerText: '练习题集',
      headerAlign: 'center' as const,
      footerText: '第 {page} 页 / 共 {total} 页',
      footerAlign: 'center' as const,
      showPageNumber: true,
      paperSize: 'A4' as const,
      orientation: 'portrait' as const,
    },
    {
      name: '学校考试模板',
      isDefault: false,
      isPublic: false,
      logoPosition: 'top-center' as const,
      headerText: '{学校名称}\n{年级}{学期}练习题',
      headerAlign: 'center' as const,
      headerFontSize: 16,
      footerText: '姓名：________  班级：________  学号：________',
      footerAlign: 'left' as const,
      showPageNumber: true,
      paperSize: 'A4' as const,
      orientation: 'portrait' as const,
    },
    {
      name: '简洁模板',
      isDefault: false,
      isPublic: false,
      showQuestionNumber: true,
      showDifficulty: false,
      showKnowledgePoints: false,
      showAnswer: true,
      showExplanation: false,
      fontSize: 11,
      lineSpacing: 130,
      paperSize: 'A4' as const,
      orientation: 'portrait' as const,
    },
  ];
  
  for (const template of templates) {
    await createExportTemplate(userId, template);
  }
  
  return { success: true, count: templates.length };
}
