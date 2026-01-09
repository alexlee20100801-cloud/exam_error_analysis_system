/**
 * 导出模板服务
 * 提供多种预设模板用于导出错题
 */

import { getDb } from "./db";
import { errorQuestions, knowledgePoints } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

export interface ExportQuestion {
  id: number;
  title: string;
  content: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  subject: string;
  grade: string;
  difficulty: string;
  imageUrl?: string;
  knowledgePointNames?: string[];
  createdAt: string;
}

/**
 * 错题本模板 - 传统格式
 */
export function generateErrorBookTemplate(questions: ExportQuestion[]): string {
  const subjectMap: Record<string, string> = {
    chinese: '语文',
    math: '数学',
    english: '英语',
    physics: '物理',
    chemistry: '化学',
    biology: '生物',
    politics: '道法',
    history: '历史',
    geography: '地理'
  };

  const difficultyMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };

  let markdown = `# 错题本\n\n`;
  markdown += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n`;
  markdown += `> 共收录 ${questions.length} 道题目\n\n`;
  markdown += `---\n\n`;

  questions.forEach((q, index) => {
    markdown += `## ${index + 1}. ${q.title}\n\n`;
    markdown += `**学科：** ${subjectMap[q.subject] || q.subject} | `;
    markdown += `**难度：** ${difficultyMap[q.difficulty] || q.difficulty}\n\n`;
    
    if (q.knowledgePointNames && q.knowledgePointNames.length > 0) {
      markdown += `**知识点：** ${q.knowledgePointNames.join('、')}\n\n`;
    }

    markdown += `### 📝 题目内容\n\n`;
    markdown += `${q.content}\n\n`;

    if (q.imageUrl) {
      markdown += `![题目图片](${q.imageUrl})\n\n`;
    }

    markdown += `### ❌ 我的答案\n\n`;
    markdown += `${q.userAnswer || '（未填写）'}\n\n`;

    markdown += `### ✅ 正确答案\n\n`;
    markdown += `${q.correctAnswer}\n\n`;

    markdown += `### 💡 解析\n\n`;
    markdown += `${q.explanation}\n\n`;

    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * 复习卡片模板 - 简洁格式
 */
export function generateReviewCardTemplate(questions: ExportQuestion[]): string {
  const subjectMap: Record<string, string> = {
    chinese: '语文',
    math: '数学',
    english: '英语',
    physics: '物理',
    chemistry: '化学',
    biology: '生物',
    politics: '道法',
    history: '历史',
    geography: '地理'
  };

  let markdown = `# 复习卡片集\n\n`;
  markdown += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n`;
  markdown += `> 共 ${questions.length} 张卡片\n\n`;

  questions.forEach((q, index) => {
    markdown += `---\n\n`;
    markdown += `### 卡片 #${index + 1}\n\n`;
    markdown += `#### ${q.title}\n\n`;
    markdown += `<table>\n`;
    markdown += `<tr><td><strong>学科</strong></td><td>${subjectMap[q.subject] || q.subject}</td></tr>\n`;
    
    if (q.knowledgePointNames && q.knowledgePointNames.length > 0) {
      markdown += `<tr><td><strong>知识点</strong></td><td>${q.knowledgePointNames.join('、')}</td></tr>\n`;
    }
    
    markdown += `</table>\n\n`;
    markdown += `**题目：**\n\n`;
    markdown += `${q.content}\n\n`;
    markdown += `<details>\n`;
    markdown += `<summary><strong>查看答案</strong></summary>\n\n`;
    markdown += `**正确答案：** ${q.correctAnswer}\n\n`;
    markdown += `**解析：** ${q.explanation}\n\n`;
    markdown += `</details>\n\n`;
  });

  return markdown;
}

/**
 * 详细分析模板 - 完整报告
 */
export function generateDetailedAnalysisTemplate(questions: ExportQuestion[]): string {
  const subjectMap: Record<string, string> = {
    chinese: '语文',
    math: '数学',
    english: '英语',
    physics: '物理',
    chemistry: '化学',
    biology: '生物',
    politics: '道法',
    history: '历史',
    geography: '地理'
  };

  const difficultyMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };

  // 统计分析
  const subjectCount: Record<string, number> = {};
  const difficultyCount: Record<string, number> = {};
  const knowledgePointCount: Record<string, number> = {};

  questions.forEach(q => {
    subjectCount[q.subject] = (subjectCount[q.subject] || 0) + 1;
    difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
    
    if (q.knowledgePointNames) {
      q.knowledgePointNames.forEach(kp => {
        knowledgePointCount[kp] = (knowledgePointCount[kp] || 0) + 1;
      });
    }
  });

  let markdown = `# 错题详细分析报告\n\n`;
  markdown += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

  // 总体统计
  markdown += `## 📊 总体统计\n\n`;
  markdown += `- **错题总数：** ${questions.length} 道\n`;
  markdown += `- **涉及学科：** ${Object.keys(subjectCount).length} 个\n`;
  markdown += `- **涉及知识点：** ${Object.keys(knowledgePointCount).length} 个\n\n`;

  // 学科分布
  markdown += `### 学科分布\n\n`;
  markdown += `| 学科 | 题目数量 | 占比 |\n`;
  markdown += `|------|----------|------|\n`;
  Object.entries(subjectCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([subject, count]) => {
      const percentage = ((count / questions.length) * 100).toFixed(1);
      markdown += `| ${subjectMap[subject] || subject} | ${count} | ${percentage}% |\n`;
    });
  markdown += `\n`;

  // 难度分布
  markdown += `### 难度分布\n\n`;
  markdown += `| 难度 | 题目数量 | 占比 |\n`;
  markdown += `|------|----------|------|\n`;
  Object.entries(difficultyCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([difficulty, count]) => {
      const percentage = ((count / questions.length) * 100).toFixed(1);
      markdown += `| ${difficultyMap[difficulty] || difficulty} | ${count} | ${percentage}% |\n`;
    });
  markdown += `\n`;

  // 高频知识点
  if (Object.keys(knowledgePointCount).length > 0) {
    markdown += `### 高频知识点（Top 10）\n\n`;
    markdown += `| 知识点 | 出现次数 |\n`;
    markdown += `|--------|----------|\n`;
    Object.entries(knowledgePointCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([kp, count]) => {
        markdown += `| ${kp} | ${count} |\n`;
      });
    markdown += `\n`;
  }

  // 详细题目列表
  markdown += `---\n\n`;
  markdown += `## 📚 详细题目列表\n\n`;

  questions.forEach((q, index) => {
    markdown += `### ${index + 1}. ${q.title}\n\n`;
    
    markdown += `| 属性 | 值 |\n`;
    markdown += `|------|----|\n`;
    markdown += `| 学科 | ${subjectMap[q.subject] || q.subject} |\n`;
    markdown += `| 难度 | ${difficultyMap[q.difficulty] || q.difficulty} |\n`;
    
    if (q.knowledgePointNames && q.knowledgePointNames.length > 0) {
      markdown += `| 知识点 | ${q.knowledgePointNames.join('、')} |\n`;
    }
    
    markdown += `| 收录时间 | ${new Date(q.createdAt).toLocaleDateString('zh-CN')} |\n\n`;

    markdown += `**题目内容：**\n\n`;
    markdown += `${q.content}\n\n`;

    if (q.imageUrl) {
      markdown += `![题目图片](${q.imageUrl})\n\n`;
    }

    markdown += `**我的答案：**\n\n`;
    markdown += `${q.userAnswer || '（未填写）'}\n\n`;

    markdown += `**正确答案：**\n\n`;
    markdown += `${q.correctAnswer}\n\n`;

    markdown += `**详细解析：**\n\n`;
    markdown += `${q.explanation}\n\n`;

    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * 获取题目详细信息（包含知识点）
 */
export async function getQuestionsWithDetails(questionIds: number[]): Promise<ExportQuestion[]> {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  const questions = await db
    .select()
    .from(errorQuestions)
    .where(inArray(errorQuestions.id, questionIds));

  const result: ExportQuestion[] = [];

  for (const q of questions) {
    const exportQ: ExportQuestion = {
      id: q.id,
      title: q.title || '',
      content: q.content || '',
      userAnswer: q.userAnswer || '',
      correctAnswer: q.correctAnswer || '',
      // @ts-ignore
      explanation: q.explanation || '',
      subject: q.subject,
      grade: q.grade,
      difficulty: q.difficulty,
      imageUrl: q.imageUrl || undefined,
      createdAt: q.createdAt
    };

    // 获取知识点名称
    if (q.knowledgePointIds) {
      try {
        const kpIds = JSON.parse(q.knowledgePointIds as string) as number[];
        if (kpIds.length > 0) {
          const kps = await db
            .select()
            .from(knowledgePoints)
            .where(inArray(knowledgePoints.id, kpIds));
          exportQ.knowledgePointNames = kps.map(kp => kp.name);
        }
      } catch (e) {
        // 忽略JSON解析错误
      }
    }

    result.push(exportQ);
  }

  return result;
}
