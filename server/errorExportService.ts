import { getDb } from "./db";
import { errorQuestions, knowledgePoints } from "../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export interface ExportFilter {
  userId: string;
  subjects?: string[];
  grades?: string[];
  knowledgePointIds?: number[];
  difficulties?: string[];
  isMastered?: boolean;
  errorQuestionIds?: number[]; // 指定导出的错题ID列表
}

export interface ExportOptions {
  includeAnswer?: boolean;
  includeExplanation?: boolean;
  includeAnalysis?: boolean;
  includeNotes?: boolean;
  includeImage?: boolean;
}

/**
 * 根据筛选条件获取错题列表
 */
export async function getFilteredErrorQuestions(filter: ExportFilter) {
  const db = await getDb();
  if (!db) return [];

  try {
    // @ts-ignore
    const conditions = [eq(errorQuestions.userId, filter.userId)];

    // 如果指定了错题ID列表，直接按ID筛选
    if (filter.errorQuestionIds && filter.errorQuestionIds.length > 0) {
      conditions.push(inArray(errorQuestions.id, filter.errorQuestionIds));
    } else {
      // 否则按其他条件筛选
      if (filter.subjects && filter.subjects.length > 0) {
        conditions.push(inArray(errorQuestions.subject, filter.subjects as any));
      }

      if (filter.grades && filter.grades.length > 0) {
        conditions.push(inArray(errorQuestions.grade, filter.grades as any));
      }

      if (filter.difficulties && filter.difficulties.length > 0) {
        conditions.push(inArray(errorQuestions.difficulty, filter.difficulties as any));
      }

      if (filter.isMastered !== undefined) {
        // @ts-ignore
        conditions.push(eq(errorQuestions.isMastered, filter.isMastered));
      }
    }

    let query = db
      .select()
      .from(errorQuestions)
      .where(and(...conditions))
      .orderBy(errorQuestions.createdAt);

    let questions = await query;

    // 如果指定了知识点筛选，需要额外过滤
    if (filter.knowledgePointIds && filter.knowledgePointIds.length > 0) {
      questions = questions.filter((q) => {
        if (!q.knowledgePointIds || !Array.isArray(q.knowledgePointIds)) {
          return false;
        }
        return filter.knowledgePointIds!.some((id) =>
          (q.knowledgePointIds as number[]).includes(id)
        );
      });
    }

    return questions;
  } catch (error) {
    console.error("获取筛选错题失败:", error);
    return [];
  }
}

/**
 * 生成Markdown格式的错题集内容
 */
export async function generateErrorQuestionsMarkdown(
  questions: any[],
  options: ExportOptions
): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  const subjectMap: Record<string, string> = {
    chinese: "语文",
    math: "数学",
    english: "英语",
    physics: "物理",
    chemistry: "化学",
    biology: "生物",
    politics: "政治",
    history: "历史",
    geography: "地理",
  };

  const gradeMap: Record<string, string> = {
    junior1: "初一",
    junior2: "初二",
    junior3: "初三",
    senior1: "高一",
    senior2: "高二",
    senior3: "高三",
  };

  const difficultyMap: Record<string, string> = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  };

  let markdown = `# 错题集\n\n`;
  markdown += `**导出时间**: ${new Date().toLocaleString("zh-CN")}\n\n`;
  markdown += `**错题数量**: ${questions.length} 道\n\n`;
  markdown += `---\n\n`;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    markdown += `## ${i + 1}. ${q.title}\n\n`;

    // 基本信息
    markdown += `**学科**: ${subjectMap[q.subject] || q.subject}  `;
    markdown += `**年级**: ${gradeMap[q.grade] || q.grade}  `;
    if (q.difficulty) {
      markdown += `**难度**: ${difficultyMap[q.difficulty] || q.difficulty}  `;
    }
    markdown += `\n\n`;

    // 关联知识点
    if (q.knowledgePointIds && Array.isArray(q.knowledgePointIds) && q.knowledgePointIds.length > 0) {
      const kps = await db
        .select()
        .from(knowledgePoints)
        .where(inArray(knowledgePoints.id, q.knowledgePointIds as number[]));

      if (kps.length > 0) {
        markdown += `**知识点**: ${kps.map((kp: any) => kp.name).join("、")}\n\n`;
      }
    }

    // 题目内容
    markdown += `### 题目\n\n`;
    if (options.includeImage && q.imageUrl) {
      markdown += `![题目图片](${q.imageUrl})\n\n`;
    }
    markdown += `${q.content}\n\n`;

    // 用户答案
    if (q.userAnswer) {
      markdown += `### 我的答案\n\n`;
      markdown += `${q.userAnswer}\n\n`;
    }

    // 正确答案
    if (options.includeAnswer && q.correctAnswer) {
      markdown += `### 正确答案\n\n`;
      markdown += `${q.correctAnswer}\n\n`;
    }

    // 详细解析
    if (options.includeExplanation && q.detailedExplanation) {
      markdown += `### 详细解析\n\n`;
      markdown += `${q.detailedExplanation}\n\n`;
    }

    // AI分析
    if (options.includeAnalysis && q.errorAnalysis) {
      markdown += `### 错误分析\n\n`;
      markdown += `${q.errorAnalysis}\n\n`;
    }

    // 用户笔记
    if (options.includeNotes && q.userNotes) {
      markdown += `### 我的笔记\n\n`;
      markdown += `${q.userNotes}\n\n`;
    }

    markdown += `---\n\n`;
  }

  return markdown;
}

/**
 * 将Markdown转换为PDF
 */
export async function convertMarkdownToPdf(markdown: string): Promise<string> {
  try {
    // 生成临时文件路径
    const timestamp = Date.now();
    const mdPath = path.join("/tmp", `error-questions-${timestamp}.md`);
    const pdfPath = path.join("/tmp", `error-questions-${timestamp}.pdf`);

    // 写入Markdown文件
    await writeFile(mdPath, markdown, "utf-8");

    // 使用manus-md-to-pdf命令转换为PDF
    await execAsync(`manus-md-to-pdf ${mdPath} ${pdfPath}`);

    // 删除临时Markdown文件
    await unlink(mdPath);

    return pdfPath;
  } catch (error) {
    console.error("Markdown转PDF失败:", error);
    throw new Error("PDF生成失败");
  }
}

/**
 * 导出错题为PDF
 */
export async function exportErrorQuestionsToPdf(
  filter: ExportFilter,
  options: ExportOptions
): Promise<string> {
  try {
    // 获取筛选后的错题
    const questions = await getFilteredErrorQuestions(filter);

    if (questions.length === 0) {
      throw new Error("没有符合条件的错题");
    }

    // 生成Markdown内容
    const markdown = await generateErrorQuestionsMarkdown(questions, options);

    // 转换为PDF
    const pdfPath = await convertMarkdownToPdf(markdown);

    return pdfPath;
  } catch (error) {
    console.error("导出错题PDF失败:", error);
    throw error;
  }
}
