import { getDb } from "./db";
import { errorQuestions, knowledgePoints } from "../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { invokeLLM } from "./_core/llm";

const execAsync = promisify(exec);

/**
 * 增强导出服务 - 支持Word/PDF双格式、A4页面布局、AI自动美化
 */

export interface EnhancedExportFilter {
  userId: number;
  subjects?: string[];
  grades?: string[];
  knowledgePointIds?: number[];
  difficulties?: string[];
  isMastered?: boolean;
  errorQuestionIds?: number[];
}

export interface EnhancedExportOptions {
  format: 'word' | 'pdf'; // 导出格式
  includeAnswer?: boolean;
  includeExplanation?: boolean;
  includeAnalysis?: boolean;
  includeNotes?: boolean;
  includeImage?: boolean;
  pageSize?: 'A4' | 'Letter'; // 页面大小
  enableAILayout?: boolean; // 启用AI自动布局优化
}

export interface LayoutOptimization {
  title: string;
  fontSize: {
    title: string;
    heading: string;
    body: string;
  };
  spacing: {
    lineHeight: string;
    paragraphSpacing: string;
  };
  margins: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
}

/**
 * 使用AI优化文档布局
 */
async function optimizeLayoutWithAI(
  contentLength: number,
  questionCount: number,
  hasImages: boolean
): Promise<LayoutOptimization> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个专业的文档排版设计师，擅长为学习材料设计美观、易读的布局。"
        },
        {
          role: "user",
          content: `请为一份错题集文档设计最佳布局方案。

文档信息：
- 题目数量：${questionCount}道
- 内容长度：约${Math.ceil(contentLength / 500)}页
- 包含图片：${hasImages ? '是' : '否'}
- 页面大小：A4

请返回布局优化方案，包括字体大小、行距、段落间距、页边距、配色方案等。`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "layout_optimization",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              fontSize: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  heading: { type: "string" },
                  body: { type: "string" }
                },
                required: ["title", "heading", "body"],
                additionalProperties: false
              },
              spacing: {
                type: "object",
                properties: {
                  lineHeight: { type: "string" },
                  paragraphSpacing: { type: "string" }
                },
                required: ["lineHeight", "paragraphSpacing"],
                additionalProperties: false
              },
              margins: {
                type: "object",
                properties: {
                  top: { type: "string" },
                  bottom: { type: "string" },
                  left: { type: "string" },
                  right: { type: "string" }
                },
                required: ["top", "bottom", "left", "right"],
                additionalProperties: false
              },
              colors: {
                type: "object",
                properties: {
                  primary: { type: "string" },
                  secondary: { type: "string" },
                  text: { type: "string" }
                },
                required: ["primary", "secondary", "text"],
                additionalProperties: false
              }
            },
            required: ["title", "fontSize", "spacing", "margins", "colors"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("AI布局优化失败");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('[EnhancedExport] AI布局优化失败:', error);
    // 返回默认布局
    return {
      title: "错题集",
      fontSize: {
        title: "24pt",
        heading: "16pt",
        body: "12pt"
      },
      spacing: {
        lineHeight: "1.6",
        paragraphSpacing: "12pt"
      },
      margins: {
        top: "2.54cm",
        bottom: "2.54cm",
        left: "3.17cm",
        right: "3.17cm"
      },
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
        text: "#1e293b"
      }
    };
  }
}

/**
 * 生成增强Markdown内容（带AI优化布局）
 */
export async function generateEnhancedMarkdown(
  questions: any[],
  options: EnhancedExportOptions
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

  // 计算内容长度和是否包含图片
  const contentLength = questions.reduce((sum, q) => sum + (q.content?.length || 0), 0);
  const hasImages = questions.some(q => q.imageUrl);

  // 获取AI布局优化方案
  let layout: LayoutOptimization;
  if (options.enableAILayout) {
    layout = await optimizeLayoutWithAI(contentLength, questions.length, hasImages);
  } else {
    layout = {
      title: "错题集",
      fontSize: { title: "24pt", heading: "16pt", body: "12pt" },
      spacing: { lineHeight: "1.6", paragraphSpacing: "12pt" },
      margins: { top: "2.54cm", bottom: "2.54cm", left: "3.17cm", right: "3.17cm" },
      colors: { primary: "#2563eb", secondary: "#64748b", text: "#1e293b" }
    };
  }

  // 生成带样式的Markdown
  let markdown = `---
title: ${layout.title}
author: 深圳初高中错题分析学习系统
date: ${new Date().toLocaleDateString("zh-CN")}
geometry: margin=${layout.margins.top}
fontsize: ${layout.fontSize.body}
linestretch: ${layout.spacing.lineHeight}
---

# ${layout.title}

**导出时间**: ${new Date().toLocaleString("zh-CN")}  
**错题数量**: ${questions.length} 道  
**页面大小**: ${options.pageSize || 'A4'}

---

`;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    markdown += `## ${i + 1}. ${q.title}\n\n`;

    // 基本信息（使用表格美化）
    markdown += `| 属性 | 值 |\n`;
    markdown += `|------|----|\n`;
    markdown += `| 学科 | ${subjectMap[q.subject] || q.subject} |\n`;
    markdown += `| 年级 | ${gradeMap[q.grade] || q.grade} |\n`;
    if (q.difficulty) {
      markdown += `| 难度 | ${difficultyMap[q.difficulty] || q.difficulty} |\n`;
    }
    markdown += `\n`;

    // 关联知识点
    if (q.knowledgePointIds && Array.isArray(q.knowledgePointIds) && q.knowledgePointIds.length > 0) {
      const kps = await db
        .select()
        .from(knowledgePoints)
        .where(inArray(knowledgePoints.id, q.knowledgePointIds as number[]));

      if (kps.length > 0) {
        markdown += `**知识点**: ${kps.map((kp) => kp.name).join("、")}\n\n`;
      }
    }

    // 题目内容
    markdown += `### 📝 题目\n\n`;
    if (options.includeImage && q.imageUrl) {
      markdown += `![题目图片](${q.imageUrl})\n\n`;
    }
    markdown += `${q.content}\n\n`;

    // 用户答案
    if (q.userAnswer) {
      markdown += `### ✍️ 我的答案\n\n`;
      markdown += `> ${q.userAnswer}\n\n`;
    }

    // 正确答案
    if (options.includeAnswer && q.correctAnswer) {
      markdown += `### ✅ 正确答案\n\n`;
      markdown += `> ${q.correctAnswer}\n\n`;
    }

    // 详细解析
    if (options.includeExplanation && q.detailedExplanation) {
      markdown += `### 💡 详细解析\n\n`;
      markdown += `${q.detailedExplanation}\n\n`;
    }

    // AI分析
    if (options.includeAnalysis && q.errorAnalysis) {
      markdown += `### 🤖 AI错误分析\n\n`;
      markdown += `${q.errorAnalysis}\n\n`;
    }

    // 用户笔记
    if (options.includeNotes && q.userNotes) {
      markdown += `### 📔 我的笔记\n\n`;
      markdown += `${q.userNotes}\n\n`;
    }

    // 分页符（每题后分页，避免跨页）
    if (i < questions.length - 1) {
      markdown += `\\newpage\n\n`;
    }
  }

  return markdown;
}

/**
 * 将Markdown转换为PDF（A4格式）
 */
export async function convertMarkdownToPdfEnhanced(
  markdown: string,
  options: EnhancedExportOptions
): Promise<string> {
  try {
    const timestamp = Date.now();
    const mdPath = path.join("/tmp", `enhanced-export-${timestamp}.md`);
    const pdfPath = path.join("/tmp", `enhanced-export-${timestamp}.pdf`);

    // 写入Markdown文件
    await writeFile(mdPath, markdown, "utf-8");

    // 使用manus-md-to-pdf命令转换为PDF（A4格式）
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
 * 将Markdown转换为Word（A4格式）
 */
export async function convertMarkdownToWordEnhanced(
  markdown: string,
  options: EnhancedExportOptions
): Promise<string> {
  try {
    const timestamp = Date.now();
    const mdPath = path.join("/tmp", `enhanced-export-${timestamp}.md`);
    const docxPath = path.join("/tmp", `enhanced-export-${timestamp}.docx`);

    // 写入Markdown文件
    await writeFile(mdPath, markdown, "utf-8");

    // 使用pandoc转换为Word（A4格式）
    await execAsync(`pandoc ${mdPath} -o ${docxPath} --reference-doc=/dev/null`);

    // 删除临时Markdown文件
    await unlink(mdPath);

    return docxPath;
  } catch (error) {
    console.error("Markdown转Word失败:", error);
    throw new Error("Word生成失败");
  }
}

/**
 * 导出错题（增强版）
 */
export async function exportErrorQuestionsEnhanced(
  filter: EnhancedExportFilter,
  options: EnhancedExportOptions
): Promise<string> {
  try {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 获取筛选后的错题
    const conditions = [eq(errorQuestions.userId, filter.userId)];

    if (filter.errorQuestionIds && filter.errorQuestionIds.length > 0) {
      conditions.push(inArray(errorQuestions.id, filter.errorQuestionIds));
    } else {
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
        conditions.push(eq(errorQuestions.isMastered, filter.isMastered));
      }
    }

    let questions = await db
      .select()
      .from(errorQuestions)
      .where(and(...conditions))
      .orderBy(errorQuestions.createdAt);

    if (questions.length === 0) {
      throw new Error("没有符合条件的错题");
    }

    // 生成增强Markdown内容
    const markdown = await generateEnhancedMarkdown(questions, options);

    // 根据格式转换
    if (options.format === 'pdf') {
      return await convertMarkdownToPdfEnhanced(markdown, options);
    } else {
      return await convertMarkdownToWordEnhanced(markdown, options);
    }
  } catch (error) {
    console.error("增强导出失败:", error);
    throw error;
  }
}
