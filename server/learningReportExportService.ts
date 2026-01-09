import { getDb } from "./db";
import { errorQuestions, practiceRecords, errorReviewRecords } from "../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { SUBJECTS, SCHOOL_LEVELS, getSubjectName } from "../shared/subjects";

/**
 * 学习报告导出服务
 * 生成包含统计数据和可视化图表的学习报告PDF
 */

interface ReportOptions {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  includeCharts?: boolean;
  includeDetails?: boolean;
}

interface ReportData {
  summary: {
    totalErrors: number;
    analyzedErrors: number;
    masteredErrors: number;
    masteryRate: number;
    totalPractices: number;
    averageAccuracy: number;
    reviewCount: number;
  };
  bySubject: Record<string, {
    count: number;
    mastered: number;
    masteryRate: number;
  }>;
  byLevel: Record<string, number>;
  recentErrors: Array<{
    title: string;
    subject: string;
    grade: string;
    difficulty: string;
    createdAt: Date;
    isMastered: boolean;
  }>;
  knowledgePoints: Array<{
    name: string;
    mastery: number;
  }>;
  learningTrend: Array<{
    date: string;
    errorCount: number;
    practiceCount: number;
  }>;
}

/**
 * 获取学习报告数据
 */
export async function getReportData(options: ReportOptions): Promise<ReportData> {
  const { userId, startDate, endDate } = options;
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  // 构建日期过滤条件
  const dateConditions = [];
  if (startDate) {
    // @ts-ignore
    dateConditions.push(gte(errorQuestions.createdAt, startDate));
  }
  if (endDate) {
    // @ts-ignore
    dateConditions.push(lte(errorQuestions.createdAt, endDate));
  }

  // 获取错题数据
  let query = sql`SELECT * FROM ${errorQuestions} WHERE ${errorQuestions.userId} = ${userId}`;
  if (startDate) {
    query = sql`${query} AND ${errorQuestions.createdAt} >= ${startDate.toISOString()}`;
  }
  if (endDate) {
    query = sql`${query} AND ${errorQuestions.createdAt} <= ${endDate.toISOString()}`;
  }
  query = sql`${query} ORDER BY ${errorQuestions.createdAt} DESC`;
  
  const errors = await db.execute(query).then((result: any) => result.rows || []);

  // 统计总览
  const totalErrors = errors.length;
  const analyzedErrors = errors.filter((e: any) => e.isAnalyzed).length;
  const masteredErrors = errors.filter((e: any) => e.isMastered).length;
  const masteryRate = totalErrors > 0 ? Math.round((masteredErrors / totalErrors) * 100) : 0;

  // 按学科统计
  const bySubject: Record<string, { count: number; mastered: number; masteryRate: number }> = {};
  for (const error of errors) {
    if (!bySubject[error.subject]) {
      bySubject[error.subject] = { count: 0, mastered: 0, masteryRate: 0 };
    }
    bySubject[error.subject].count++;
    if (error.isMastered) {
      bySubject[error.subject].mastered++;
    }
  }
  
  // 计算各学科掌握率
  for (const subject in bySubject) {
    const data = bySubject[subject];
    data.masteryRate = data.count > 0 ? Math.round((data.mastered / data.count) * 100) : 0;
  }

  // 按年级统计
  const byLevel: Record<string, number> = {
    junior: 0,
    senior: 0,
  };
  for (const error of errors) {
    if (error.grade.startsWith('junior')) {
      byLevel.junior++;
    } else if (error.grade.startsWith('senior')) {
      byLevel.senior++;
    }
  }

  // 获取练习记录
  const practices = await db
    .select()
    .from(practiceRecords)
    .where(sql`${practiceRecords.userId} = ${userId}`);

  const totalPractices = practices.length;
  const averageAccuracy = practices.length > 0
    ? Math.round(practices.reduce((sum: number, p: any) => sum + (p.isCorrect ? 100 : 0), 0) / practices.length)
    : 0;

  // 获取复习记录
  const reviews = await db
    .select()
    .from(errorReviewRecords)
    .where(sql`${errorReviewRecords.userId} = ${userId}`);

  const reviewCount = reviews.length;

  // 最近错题
  const recentErrors = errors.slice(0, 10).map((e: any) => ({
    title: e.title,
    subject: e.subject,
    grade: e.grade,
    difficulty: e.difficulty || 'medium',
    createdAt: e.createdAt,
    isMastered: e.isMastered,
  }));

  // 知识点掌握度（从错题中提取）
  const knowledgePointsMap = new Map<string, { total: number; mastered: number }>();
  for (const error of errors) {
    if (error.knowledgePoints) {
      const points = typeof error.knowledgePoints === 'string' 
        ? JSON.parse(error.knowledgePoints) 
        : error.knowledgePoints;
      
      if (Array.isArray(points)) {
        for (const point of points) {
          if (!knowledgePointsMap.has(point)) {
            knowledgePointsMap.set(point, { total: 0, mastered: 0 });
          }
          const data = knowledgePointsMap.get(point)!;
          data.total++;
          if (error.isMastered) {
            data.mastered++;
          }
        }
      }
    }
  }

  const knowledgePoints = Array.from(knowledgePointsMap.entries())
    .map(([name, data]) => ({
      name,
      mastery: data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 8);

  // 学习趋势（最近30天）
  const learningTrend: Array<{ date: string; errorCount: number; practiceCount: number }> = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const errorCount = errors.filter((e: any) => 
      e.createdAt.toISOString().split('T')[0] === dateStr
    ).length;
    
    const practiceCount = practices.filter((p: any) => 
      p.createdAt.toISOString().split('T')[0] === dateStr
    ).length;
    
    learningTrend.push({ date: dateStr, errorCount, practiceCount });
  }

  return {
    summary: {
      totalErrors,
      analyzedErrors,
      masteredErrors,
      masteryRate,
      totalPractices,
      averageAccuracy,
      reviewCount,
    },
    bySubject,
    byLevel,
    recentErrors,
    knowledgePoints,
    learningTrend,
  };
}

/**
 * 生成Markdown格式的报告
 */
export function generateReportMarkdown(data: ReportData, userName: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let markdown = `# 学习报告

**学生姓名：** ${userName}  
**生成日期：** ${dateStr}

---

## 📊 学习总览

| 指标 | 数值 |
|------|------|
| 错题总数 | ${data.summary.totalErrors} 道 |
| 已分析 | ${data.summary.analyzedErrors} 道 |
| 已掌握 | ${data.summary.masteredErrors} 道 |
| 掌握率 | ${data.summary.masteryRate}% |
| 练习次数 | ${data.summary.totalPractices} 次 |
| 平均正确率 | ${data.summary.averageAccuracy}% |
| 复习次数 | ${data.summary.reviewCount} 次 |

---

## 📚 学科分布

`;

  // 学科统计表格
  markdown += `| 学科 | 错题数 | 已掌握 | 掌握率 |\n`;
  markdown += `|------|--------|--------|--------|\n`;
  
  for (const [subjectKey, subjectData] of Object.entries(data.bySubject)) {
    const subjectName = getSubjectName(subjectKey as any);
    markdown += `| ${subjectName} | ${subjectData.count} 道 | ${subjectData.mastered} 道 | ${subjectData.masteryRate}% |\n`;
  }

  markdown += `\n---\n\n## 🎓 年级分布\n\n`;
  markdown += `- **初中：** ${data.byLevel.junior} 道\n`;
  markdown += `- **高中：** ${data.byLevel.senior} 道\n`;

  // 知识点掌握度
  if (data.knowledgePoints.length > 0) {
    markdown += `\n---\n\n## 🎯 知识点掌握度\n\n`;
    markdown += `| 知识点 | 掌握度 |\n`;
    markdown += `|--------|--------|\n`;
    
    for (const kp of data.knowledgePoints) {
      markdown += `| ${kp.name} | ${kp.mastery}% |\n`;
    }
  }

  // 最近错题
  if (data.recentErrors.length > 0) {
    markdown += `\n---\n\n## 📝 最近错题\n\n`;
    
    for (const error of data.recentErrors) {
      const statusIcon = error.isMastered ? '✅' : '⏳';
      const difficultyText = error.difficulty === 'easy' ? '简单' : 
                            error.difficulty === 'hard' ? '困难' : '中等';
      markdown += `### ${statusIcon} ${error.title}\n\n`;
      markdown += `- **学科：** ${getSubjectName(error.subject as any)}\n`;
      markdown += `- **难度：** ${difficultyText}\n`;
      markdown += `- **日期：** ${error.createdAt.toLocaleDateString('zh-CN')}\n\n`;
    }
  }

  // 学习趋势
  markdown += `\n---\n\n## 📈 学习趋势（最近30天）\n\n`;
  markdown += `| 日期 | 新增错题 | 练习次数 |\n`;
  markdown += `|------|----------|----------|\n`;
  
  // 只显示有数据的日期
  const trendWithData = data.learningTrend.filter(t => t.errorCount > 0 || t.practiceCount > 0);
  for (const trend of trendWithData.slice(-10)) {
    const date = new Date(trend.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    markdown += `| ${date} | ${trend.errorCount} | ${trend.practiceCount} |\n`;
  }

  markdown += `\n---\n\n## 💡 学习建议\n\n`;
  
  // 根据数据生成学习建议
  const suggestions: string[] = [];
  
  if (data.summary.masteryRate < 50) {
    suggestions.push('当前掌握率较低，建议加强错题复习，特别关注薄弱知识点。');
  } else if (data.summary.masteryRate < 80) {
    suggestions.push('学习进度良好，继续保持错题整理和复习的习惯。');
  } else {
    suggestions.push('掌握率优秀！建议挑战更高难度的题目，进一步提升能力。');
  }
  
  // 找出最薄弱的学科
  const weakestSubject = Object.entries(data.bySubject)
    .sort((a, b) => a[1].masteryRate - b[1].masteryRate)[0];
  
  if (weakestSubject && weakestSubject[1].masteryRate < 70) {
    const subjectName = getSubjectName(weakestSubject[0] as any);
    suggestions.push(`${subjectName}是当前最薄弱的学科（掌握率${weakestSubject[1].masteryRate}%），建议重点复习相关知识点。`);
  }
  
  if (data.summary.reviewCount < data.summary.totalErrors * 0.3) {
    suggestions.push('复习次数较少，建议按照艾宾浩斯遗忘曲线定期复习错题，巩固记忆。');
  }
  
  for (const suggestion of suggestions) {
    markdown += `- ${suggestion}\n`;
  }

  markdown += `\n---\n\n*本报告由智能错题本系统自动生成*\n`;

  return markdown;
}

/**
 * 导出学习报告为PDF
 */
export async function exportReportToPDF(options: ReportOptions, userName: string): Promise<string> {
  // 获取报告数据
  const reportData = await getReportData(options);
  
  // 生成Markdown
  const markdown = generateReportMarkdown(reportData, userName);
  
  // 创建临时文件
  const timestamp = Date.now();
  const mdPath = join('/tmp', `learning-report-${timestamp}.md`);
  const pdfPath = join('/tmp', `learning-report-${timestamp}.pdf`);
  
  try {
    // 写入Markdown文件
    writeFileSync(mdPath, markdown, 'utf-8');
    
    // 使用manus-md-to-pdf转换为PDF
    execSync(`manus-md-to-pdf "${mdPath}" "${pdfPath}"`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    
    // 清理Markdown文件
    unlinkSync(mdPath);
    
    return pdfPath;
  } catch (error) {
    // 清理临时文件
    try {
      unlinkSync(mdPath);
    } catch {}
    
    throw new Error(`PDF生成失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
