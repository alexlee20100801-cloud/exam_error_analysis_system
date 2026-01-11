import { getDb } from '../db';
import { eq, and, desc, or, sql, inArray } from 'drizzle-orm';
import { 
  exportTemplatesEnhanced, 
  quickExportConfigs, 
  exportHistoryRecords,
  type ExportTemplateEnhanced,
  type NewExportTemplateEnhanced,
  type QuickExportConfig,
  type NewQuickExportConfig
} from '../../drizzle/export_template_enhanced_schema';
import { errorQuestions } from '../../drizzle/schema';
import { storagePut } from '../storage';

// ==================== 导出模板管理 ====================

/**
 * 创建导出模板
 */
export async function createExportTemplateEnhanced(
  userId: number, 
  data: Record<string, any>
): Promise<ExportTemplateEnhanced> {
  const db = getDb();
  
  // 如果设置为默认模板，先取消其他默认模板
  if (data.isDefault) {
    await db.update(exportTemplatesEnhanced)
      .set({ isDefault: false })
      .where(eq(exportTemplatesEnhanced.userId, userId));
  }
  
  const [template] = await db.insert(exportTemplatesEnhanced)
    .values({
      name: data.name || '未命名模板',
      userId,
      description: data.description,
      templateType: data.templateType,
      isDefault: data.isDefault || false,
      isPublic: data.isPublic || false,
      isSystemPreset: data.isSystemPreset || false,
      filterConfig: data.filterConfig,
      sortConfig: data.sortConfig,
      contentConfig: data.contentConfig,
      styleConfig: data.styleConfig,
      exportFormat: data.exportFormat || 'pdf',
      usageCount: 0,
    })
    .$returningId();
  
  // 获取完整记录
  const [result] = await db.select()
    .from(exportTemplatesEnhanced)
    .where(eq(exportTemplatesEnhanced.id, template.id))
    .limit(1);
  
  return result;
}

/**
 * 更新导出模板
 */
export async function updateExportTemplateEnhanced(
  userId: number,
  templateId: number,
  data: Record<string, any>
): Promise<{ success: boolean }> {
  const db = getDb();
  
  // 如果设置为默认模板，先取消其他默认模板
  if (data.isDefault) {
    await db.update(exportTemplatesEnhanced)
      .set({ isDefault: false })
      .where(and(
        eq(exportTemplatesEnhanced.userId, userId),
        sql`${exportTemplatesEnhanced.id} != ${templateId}`
      ));
  }
  
  await db.update(exportTemplatesEnhanced)
    .set(data)
    .where(and(
      eq(exportTemplatesEnhanced.id, templateId),
      eq(exportTemplatesEnhanced.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 删除导出模板
 */
export async function deleteExportTemplateEnhanced(
  userId: number,
  templateId: number
): Promise<{ success: boolean }> {
  const db = getDb();
  
  // 先删除关联的快速导出配置
  await db.delete(quickExportConfigs)
    .where(and(
      eq(quickExportConfigs.templateId, templateId),
      eq(quickExportConfigs.userId, userId)
    ));
  
  // 删除模板
  await db.delete(exportTemplatesEnhanced)
    .where(and(
      eq(exportTemplatesEnhanced.id, templateId),
      eq(exportTemplatesEnhanced.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 获取用户的导出模板列表
 */
export async function getUserExportTemplatesEnhanced(userId: number): Promise<ExportTemplateEnhanced[]> {
  const db = getDb();
  
  return await db.select()
    .from(exportTemplatesEnhanced)
    .where(eq(exportTemplatesEnhanced.userId, userId))
    .orderBy(desc(exportTemplatesEnhanced.isDefault), desc(exportTemplatesEnhanced.usageCount));
}

/**
 * 获取公开模板列表
 */
export async function getPublicExportTemplatesEnhanced(): Promise<ExportTemplateEnhanced[]> {
  const db = getDb();
  
  return await db.select()
    .from(exportTemplatesEnhanced)
    .where(eq(exportTemplatesEnhanced.isPublic, true))
    .orderBy(desc(exportTemplatesEnhanced.usageCount))
    .limit(50);
}

/**
 * 获取系统预设模板
 */
export async function getSystemPresetTemplates(): Promise<ExportTemplateEnhanced[]> {
  const db = getDb();
  
  return await db.select()
    .from(exportTemplatesEnhanced)
    .where(eq(exportTemplatesEnhanced.isSystemPreset, true))
    .orderBy(exportTemplatesEnhanced.name);
}

/**
 * 获取模板详情
 */
export async function getExportTemplateEnhancedById(
  userId: number,
  templateId: number
): Promise<ExportTemplateEnhanced | null> {
  const db = getDb();
  
  const [template] = await db.select()
    .from(exportTemplatesEnhanced)
    .where(and(
      eq(exportTemplatesEnhanced.id, templateId),
      or(
        eq(exportTemplatesEnhanced.userId, userId),
        eq(exportTemplatesEnhanced.isPublic, true),
        eq(exportTemplatesEnhanced.isSystemPreset, true)
      )
    ))
    .limit(1);
  
  return template || null;
}

/**
 * 获取默认模板
 */
export async function getDefaultExportTemplateEnhanced(userId: number): Promise<ExportTemplateEnhanced | null> {
  const db = getDb();
  
  const [template] = await db.select()
    .from(exportTemplatesEnhanced)
    .where(and(
      eq(exportTemplatesEnhanced.userId, userId),
      eq(exportTemplatesEnhanced.isDefault, true)
    ))
    .limit(1);
  
  return template || null;
}

/**
 * 设置默认模板
 */
export async function setDefaultExportTemplateEnhanced(
  userId: number,
  templateId: number
): Promise<{ success: boolean }> {
  const db = getDb();
  
  // 取消其他默认模板
  await db.update(exportTemplatesEnhanced)
    .set({ isDefault: false })
    .where(eq(exportTemplatesEnhanced.userId, userId));
  
  // 设置新的默认模板
  await db.update(exportTemplatesEnhanced)
    .set({ isDefault: true })
    .where(and(
      eq(exportTemplatesEnhanced.id, templateId),
      eq(exportTemplatesEnhanced.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 复制模板
 */
export async function copyExportTemplateEnhanced(
  userId: number,
  templateId: number,
  newName?: string
): Promise<ExportTemplateEnhanced> {
  const db = getDb();
  
  // 获取源模板
  const [sourceTemplate] = await db.select()
    .from(exportTemplatesEnhanced)
    .where(and(
      eq(exportTemplatesEnhanced.id, templateId),
      or(
        eq(exportTemplatesEnhanced.userId, userId),
        eq(exportTemplatesEnhanced.isPublic, true),
        eq(exportTemplatesEnhanced.isSystemPreset, true)
      )
    ))
    .limit(1);
  
  if (!sourceTemplate) {
    throw new Error('模板不存在或无权访问');
  }
  
  // 创建副本
  const { id, userId: _, createdAt, updatedAt, usageCount, lastUsedAt, ...templateData } = sourceTemplate;
  
  return await createExportTemplateEnhanced(userId, {
    ...templateData,
    name: newName || `${templateData.name} (副本)`,
    isDefault: false,
    isPublic: false,
    isSystemPreset: false,
  });
}

/**
 * 增加模板使用次数
 */
export async function incrementTemplateUsageEnhanced(templateId: number): Promise<void> {
  const db = getDb();
  
  await db.update(exportTemplatesEnhanced)
    .set({
      usageCount: sql`${exportTemplatesEnhanced.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(exportTemplatesEnhanced.id, templateId));
}

// ==================== 快速导出配置管理 ====================

/**
 * 创建快速导出配置
 */
export async function createQuickExportConfig(
  userId: number,
  data: Omit<NewQuickExportConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'usageCount' | 'lastUsedAt'>
): Promise<QuickExportConfig> {
  const db = getDb();
  
  const [config] = await db.insert(quickExportConfigs)
    .values({
      ...data,
      userId,
      usageCount: 0,
    })
    .$returningId();
  
  const [result] = await db.select()
    .from(quickExportConfigs)
    .where(eq(quickExportConfigs.id, config.id))
    .limit(1);
  
  return result;
}

/**
 * 获取用户的快速导出配置列表
 */
export async function getUserQuickExportConfigs(userId: number): Promise<QuickExportConfig[]> {
  const db = getDb();
  
  return await db.select()
    .from(quickExportConfigs)
    .where(eq(quickExportConfigs.userId, userId))
    .orderBy(quickExportConfigs.displayOrder);
}

/**
 * 更新快速导出配置
 */
export async function updateQuickExportConfig(
  userId: number,
  configId: number,
  data: Partial<Omit<NewQuickExportConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean }> {
  const db = getDb();
  
  await db.update(quickExportConfigs)
    .set(data)
    .where(and(
      eq(quickExportConfigs.id, configId),
      eq(quickExportConfigs.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 删除快速导出配置
 */
export async function deleteQuickExportConfig(
  userId: number,
  configId: number
): Promise<{ success: boolean }> {
  const db = getDb();
  
  await db.delete(quickExportConfigs)
    .where(and(
      eq(quickExportConfigs.id, configId),
      eq(quickExportConfigs.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 增加快速导出配置使用次数
 */
export async function incrementQuickExportUsage(configId: number): Promise<void> {
  const db = getDb();
  
  await db.update(quickExportConfigs)
    .set({
      usageCount: sql`${quickExportConfigs.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(quickExportConfigs.id, configId));
}

// ==================== 一键导出功能 ====================

/**
 * 使用模板一键导出
 */
export async function quickExportWithTemplate(
  userId: number,
  templateId: number,
  questionIds?: number[]
): Promise<{
  success: boolean;
  content?: string;
  filename?: string;
  format?: string;
  downloadUrl?: string;
  error?: string;
}> {
  const db = getDb();
  
  try {
    // 获取模板
    const template = await getExportTemplateEnhancedById(userId, templateId);
    if (!template) {
      return { success: false, error: '模板不存在' };
    }
    
    // 增加使用次数
    await incrementTemplateUsageEnhanced(templateId);
    
    // 构建查询条件
    let query = db.select().from(errorQuestions).where(eq(errorQuestions.userId, userId));
    
    // 应用筛选条件
    const filterConfig = template.filterConfig as any;
    if (filterConfig) {
      const conditions = [eq(errorQuestions.userId, userId)];
      
      if (filterConfig.subjects?.length > 0) {
        conditions.push(inArray(errorQuestions.subject, filterConfig.subjects));
      }
      
      if (filterConfig.grades?.length > 0) {
        conditions.push(inArray(errorQuestions.grade, filterConfig.grades));
      }
      
      if (filterConfig.difficulties?.length > 0) {
        conditions.push(inArray(errorQuestions.difficulty, filterConfig.difficulties));
      }
      
      query = db.select().from(errorQuestions).where(and(...conditions));
    }
    
    // 如果指定了题目ID，则只导出这些题目
    if (questionIds && questionIds.length > 0) {
      query = db.select().from(errorQuestions).where(and(
        eq(errorQuestions.userId, userId),
        inArray(errorQuestions.id, questionIds)
      ));
    }
    
    const questions = await query;
    
    if (questions.length === 0) {
      return { success: false, error: '没有符合条件的题目' };
    }
    
    // 生成导出内容
    const content = generateExportContent(questions, template);
    const timestamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    const format = template.exportFormat || 'pdf';
    const filename = `${template.name}_${timestamp}.${format === 'word' ? 'docx' : format}`;
    
    // 记录导出历史
    await db.insert(exportHistoryRecords).values({
      userId,
      templateId,
      exportType: 'error_questions',
      exportFormat: format,
      questionCount: questions.length,
      configSnapshot: {
        filterConfig: template.filterConfig,
        contentConfig: template.contentConfig,
        styleConfig: template.styleConfig,
      },
      status: 'completed',
    });
    
    return {
      success: true,
      content,
      filename,
      format,
      downloadUrl: `data:text/${format === 'markdown' ? 'markdown' : 'plain'};charset=utf-8,${encodeURIComponent(content)}`,
    };
  } catch (error: any) {
    console.error('一键导出失败:', error);
    return { success: false, error: error.message || '导出失败' };
  }
}

/**
 * 生成导出内容
 */
function generateExportContent(questions: any[], template: ExportTemplateEnhanced): string {
  const contentConfig = template.contentConfig as any || {};
  const styleConfig = template.styleConfig as any || {};
  
  const subjectMap: Record<string, string> = {
    chinese: '语文', math: '数学', english: '英语',
    physics: '物理', chemistry: '化学', biology: '生物',
    politics: '政治', history: '历史', geography: '地理',
  };
  
  const difficultyMap: Record<string, string> = {
    easy: '简单', medium: '中等', hard: '困难',
  };
  
  let content = '';
  
  // 添加标题
  if (styleConfig.headerText) {
    content += `# ${styleConfig.headerText}\n\n`;
  } else {
    content += `# ${template.name}\n\n`;
  }
  
  content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
  content += `题目数量：${questions.length}\n\n`;
  content += '---\n\n';
  
  // 按学科分组（如果配置了）
  if (contentConfig.groupBySubject) {
    const groupedQuestions = questions.reduce((acc, q) => {
      const subject = q.subject || 'other';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(q);
      return acc;
    }, {} as Record<string, any[]>);
    
    for (const [subject, subjectQuestions] of Object.entries(groupedQuestions)) {
      content += `## ${subjectMap[subject] || subject}\n\n`;
      content += formatQuestions(subjectQuestions as any[], contentConfig, subjectMap, difficultyMap);
    }
  } else {
    content += formatQuestions(questions, contentConfig, subjectMap, difficultyMap);
  }
  
  // 添加页脚
  if (styleConfig.footerText) {
    content += `\n---\n\n${styleConfig.footerText}\n`;
  }
  
  return content;
}

/**
 * 格式化题目列表
 */
function formatQuestions(
  questions: any[],
  contentConfig: any,
  subjectMap: Record<string, string>,
  difficultyMap: Record<string, string>
): string {
  let content = '';
  
  questions.forEach((q, index) => {
    // 题号
    if (contentConfig.showQuestionNumber !== false) {
      content += `### 第 ${index + 1} 题\n\n`;
    }
    
    // 元信息
    const metaInfo: string[] = [];
    if (contentConfig.showDifficulty !== false && q.difficulty) {
      metaInfo.push(`难度：${difficultyMap[q.difficulty] || q.difficulty}`);
    }
    if (q.subject) {
      metaInfo.push(`学科：${subjectMap[q.subject] || q.subject}`);
    }
    if (metaInfo.length > 0) {
      content += `> ${metaInfo.join(' | ')}\n\n`;
    }
    
    // 题目内容
    content += `**题目：**\n\n${q.content || q.title || '无内容'}\n\n`;
    
    // 图片
    if (q.imageUrl) {
      content += `![题目图片](${q.imageUrl})\n\n`;
    }
    
    // 答案
    if (contentConfig.showAnswer !== false && q.answer) {
      content += `**答案：**\n\n${q.answer}\n\n`;
    }
    
    // 解析
    if (contentConfig.showExplanation !== false && q.explanation) {
      content += `**解析：**\n\n${q.explanation}\n\n`;
    }
    
    // 错因分析
    if (contentConfig.showErrorAnalysis && q.errorAnalysis) {
      content += `**错因分析：**\n\n${q.errorAnalysis}\n\n`;
    }
    
    // 学习笔记
    if (contentConfig.showStudyNotes && q.notes) {
      content += `**学习笔记：**\n\n${q.notes}\n\n`;
    }
    
    content += '---\n\n';
  });
  
  return content;
}

// ==================== 系统预设模板 ====================

/**
 * 初始化系统预设模板
 */
export async function initializeSystemPresetTemplates(): Promise<void> {
  const db = getDb();
  
  // 检查是否已存在系统预设模板
  const existing = await db.select()
    .from(exportTemplatesEnhanced)
    .where(eq(exportTemplatesEnhanced.isSystemPreset, true))
    .limit(1);
  
  if (existing.length > 0) {
    return; // 已存在，不重复创建
  }
  
  const presetTemplates = [
    {
      name: '标准错题本',
      description: '适合日常复习的标准错题本格式',
      templateType: 'error_book' as const,
      isSystemPreset: true,
      isPublic: true,
      contentConfig: {
        showQuestionNumber: true,
        showDifficulty: true,
        showKnowledgePoints: true,
        showAnswer: true,
        showExplanation: true,
        showErrorAnalysis: true,
        showSimilarQuestions: false,
        showStudyNotes: true,
        showReviewHistory: false,
        groupBySubject: true,
        groupByKnowledgePoint: false,
      },
      styleConfig: {
        paperSize: 'A4' as const,
        orientation: 'portrait' as const,
        marginTop: 20,
        marginBottom: 20,
        marginLeft: 20,
        marginRight: 20,
        fontSize: 12,
        lineSpacing: 150,
        headerText: '错题本',
        headerAlign: 'center' as const,
        headerFontSize: 16,
        footerText: '',
        footerAlign: 'center' as const,
        footerFontSize: 12,
        showPageNumber: true,
        logoPosition: 'top-left' as const,
        logoWidth: 100,
      },
      exportFormat: 'pdf' as const,
    },
    {
      name: '简洁复习卡片',
      description: '只显示题目和答案，适合快速复习',
      templateType: 'review_card' as const,
      isSystemPreset: true,
      isPublic: true,
      contentConfig: {
        showQuestionNumber: true,
        showDifficulty: false,
        showKnowledgePoints: false,
        showAnswer: true,
        showExplanation: false,
        showErrorAnalysis: false,
        showSimilarQuestions: false,
        showStudyNotes: false,
        showReviewHistory: false,
        groupBySubject: false,
        groupByKnowledgePoint: false,
      },
      styleConfig: {
        paperSize: 'A4' as const,
        orientation: 'portrait' as const,
        marginTop: 15,
        marginBottom: 15,
        marginLeft: 15,
        marginRight: 15,
        fontSize: 11,
        lineSpacing: 130,
        headerText: '复习卡片',
        headerAlign: 'center' as const,
        headerFontSize: 14,
        footerText: '',
        footerAlign: 'center' as const,
        footerFontSize: 10,
        showPageNumber: true,
        logoPosition: 'top-left' as const,
        logoWidth: 80,
      },
      exportFormat: 'pdf' as const,
    },
    {
      name: '详细分析报告',
      description: '包含完整的错因分析和学习建议',
      templateType: 'analysis_report' as const,
      isSystemPreset: true,
      isPublic: true,
      contentConfig: {
        showQuestionNumber: true,
        showDifficulty: true,
        showKnowledgePoints: true,
        showAnswer: true,
        showExplanation: true,
        showErrorAnalysis: true,
        showSimilarQuestions: true,
        showStudyNotes: true,
        showReviewHistory: true,
        groupBySubject: true,
        groupByKnowledgePoint: true,
      },
      styleConfig: {
        paperSize: 'A4' as const,
        orientation: 'portrait' as const,
        marginTop: 25,
        marginBottom: 25,
        marginLeft: 25,
        marginRight: 25,
        fontSize: 12,
        lineSpacing: 160,
        headerText: '学习分析报告',
        headerAlign: 'center' as const,
        headerFontSize: 18,
        footerText: '',
        footerAlign: 'center' as const,
        footerFontSize: 12,
        showPageNumber: true,
        logoPosition: 'top-center' as const,
        logoWidth: 120,
      },
      exportFormat: 'pdf' as const,
    },
    {
      name: '考试模拟卷',
      description: '模拟考试格式，隐藏答案和解析',
      templateType: 'exam_paper' as const,
      isSystemPreset: true,
      isPublic: true,
      contentConfig: {
        showQuestionNumber: true,
        showDifficulty: false,
        showKnowledgePoints: false,
        showAnswer: false,
        showExplanation: false,
        showErrorAnalysis: false,
        showSimilarQuestions: false,
        showStudyNotes: false,
        showReviewHistory: false,
        groupBySubject: false,
        groupByKnowledgePoint: false,
      },
      styleConfig: {
        paperSize: 'A4' as const,
        orientation: 'portrait' as const,
        marginTop: 30,
        marginBottom: 30,
        marginLeft: 25,
        marginRight: 25,
        fontSize: 12,
        lineSpacing: 180,
        headerText: '模拟测试',
        headerAlign: 'center' as const,
        headerFontSize: 20,
        footerText: '姓名：________  班级：________  得分：________',
        footerAlign: 'left' as const,
        footerFontSize: 12,
        showPageNumber: true,
        logoPosition: 'top-center' as const,
        logoWidth: 100,
      },
      exportFormat: 'pdf' as const,
    },
  ];
  
  // 使用系统用户ID（0）创建预设模板
  for (const template of presetTemplates) {
    await db.insert(exportTemplatesEnhanced).values({
      ...template,
      userId: 0, // 系统用户
      isDefault: false,
    });
  }
}

// ==================== 导出历史管理 ====================

/**
 * 获取用户的导出历史
 */
export async function getUserExportHistory(
  userId: number,
  limit = 50
): Promise<any[]> {
  const db = getDb();
  
  return await db.select()
    .from(exportHistoryRecords)
    .where(eq(exportHistoryRecords.userId, userId))
    .orderBy(desc(exportHistoryRecords.createdAt))
    .limit(limit);
}

/**
 * 获取导出统计
 */
export async function getExportStatistics(userId: number): Promise<{
  totalExports: number;
  totalQuestions: number;
  favoriteFormat: string;
  mostUsedTemplate: string | null;
}> {
  const db = getDb();
  
  const history = await db.select()
    .from(exportHistoryRecords)
    .where(eq(exportHistoryRecords.userId, userId));
  
  const totalExports = history.length;
  const totalQuestions = history.reduce((sum, h) => sum + (h.questionCount || 0), 0);
  
  // 统计最常用的格式
  const formatCounts: Record<string, number> = {};
  history.forEach(h => {
    formatCounts[h.exportFormat] = (formatCounts[h.exportFormat] || 0) + 1;
  });
  const favoriteFormat = Object.entries(formatCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'pdf';
  
  // 获取最常用的模板
  const templateCounts: Record<number, number> = {};
  history.forEach(h => {
    if (h.templateId) {
      templateCounts[h.templateId] = (templateCounts[h.templateId] || 0) + 1;
    }
  });
  const mostUsedTemplateId = Object.entries(templateCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  let mostUsedTemplate: string | null = null;
  if (mostUsedTemplateId) {
    const [template] = await db.select()
      .from(exportTemplatesEnhanced)
      .where(eq(exportTemplatesEnhanced.id, parseInt(mostUsedTemplateId)))
      .limit(1);
    mostUsedTemplate = template?.name || null;
  }
  
  return {
    totalExports,
    totalQuestions,
    favoriteFormat,
    mostUsedTemplate,
  };
}
