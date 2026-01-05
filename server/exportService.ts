/**
 * 错题导出服务
 * 支持导出为PDF和Word文档
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, ImageRun } from "docx";
import puppeteer from "puppeteer";
import { ErrorQuestion } from "../drizzle/schema";

/**
 * 导出筛选条件
 */
export interface ExportFilter {
  subject?: string;
  grade?: string;
  startDate?: Date;
  endDate?: Date;
  isMastered?: boolean;
}

/**
 * 学科中文名映射
 */
const subjectNames: Record<string, string> = {
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

/**
 * 年级中文名映射
 */
const gradeNames: Record<string, string> = {
  junior1: "初一",
  junior2: "初二",
  junior3: "初三",
  senior1: "高一",
  senior2: "高二",
  senior3: "高三",
};

/**
 * 生成Word文档
 */
export async function generateWordDocument(
  errorQuestions: Array<ErrorQuestion>,
  userName: string
): Promise<Buffer> {
  const sections = [];

  // 封面
  sections.push({
    properties: {},
    children: [
      new Paragraph({
        text: "错题本",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 3000, after: 1000 },
      }),
      new Paragraph({
        text: `学生：${userName}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 500 },
      }),
      new Paragraph({
        text: `导出时间：${new Date().toLocaleDateString("zh-CN")}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 500 },
      }),
      new Paragraph({
        text: `共 ${errorQuestions.length} 道错题`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 3000 },
      }),
      new Paragraph({
        children: [new PageBreak()],
      }),
    ],
  });

  // 错题列表
  for (let i = 0; i < errorQuestions.length; i++) {
    const question = errorQuestions[i];
    const questionNumber = i + 1;

    const questionChildren: Paragraph[] = [];

    // 题目标题
    questionChildren.push(
      new Paragraph({
        text: `第 ${questionNumber} 题`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // 基本信息
    questionChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "学科：",
            bold: true,
          }),
          new TextRun(subjectNames[question.subject] || question.subject),
          new TextRun("    "),
          new TextRun({
            text: "年级：",
            bold: true,
          }),
          new TextRun(gradeNames[question.grade] || question.grade),
          new TextRun("    "),
          new TextRun({
            text: "难度：",
            bold: true,
          }),
          new TextRun(question.difficulty || "未知"),
        ],
        spacing: { after: 200 },
      })
    );

    // 题目内容
    questionChildren.push(
      new Paragraph({
        text: "题目内容",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    questionChildren.push(
      new Paragraph({
        text: question.content || question.title,
        spacing: { after: 200 },
      })
    );

    // 我的答案
    if (question.userAnswer) {
      questionChildren.push(
        new Paragraph({
          text: "我的答案",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      questionChildren.push(
        new Paragraph({
          text: question.userAnswer,
          spacing: { after: 200 },
        })
      );
    }

    // 正确答案
    if (question.correctAnswer) {
      questionChildren.push(
        new Paragraph({
          text: "正确答案",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      questionChildren.push(
        new Paragraph({
          text: question.correctAnswer,
          spacing: { after: 200 },
        })
      );
    }

    // AI分析
    if (question.errorAnalysis) {
      questionChildren.push(
        new Paragraph({
          text: "错误分析",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      questionChildren.push(
        new Paragraph({
          text: question.errorAnalysis,
          spacing: { after: 200 },
        })
      );
    }

    // 详细解析
    if (question.detailedExplanation) {
      questionChildren.push(
        new Paragraph({
          text: "详细解析",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      questionChildren.push(
        new Paragraph({
          text: question.detailedExplanation,
          spacing: { after: 200 },
        })
      );
    }

    // 添加分页符（除了最后一题）
    if (i < errorQuestions.length - 1) {
      questionChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    sections.push({
      properties: {},
      children: questionChildren,
    });
  }

  // 创建文档
  const doc = new Document({
    sections,
  });

  // 生成Buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * 生成PDF文档（使用Puppeteer）
 */
export async function generatePDFDocument(
  errorQuestions: Array<ErrorQuestion>,
  userName: string
): Promise<Buffer> {
  // 生成HTML内容
  const html = generateHTMLContent(errorQuestions, userName);

  // 使用Puppeteer生成PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * 生成HTML内容
 */
function generateHTMLContent(
  errorQuestions: Array<ErrorQuestion>,
  userName: string
): string {
  const questionsHTML = errorQuestions
    .map((question, index) => {
      const questionNumber = index + 1;
      return `
        <div class="question" ${index < errorQuestions.length - 1 ? 'style="page-break-after: always;"' : ''}>
          <h2>第 ${questionNumber} 题</h2>
          <div class="meta">
            <span><strong>学科：</strong>${subjectNames[question.subject] || question.subject}</span>
            <span><strong>年级：</strong>${gradeNames[question.grade] || question.grade}</span>
            <span><strong>难度：</strong>${question.difficulty || '未知'}</span>
          </div>
          
          <div class="section">
            <h3>题目内容</h3>
            <p>${escapeHTML(question.content || question.title)}</p>
          </div>
          
          ${
            question.userAnswer
              ? `
          <div class="section">
            <h3>我的答案</h3>
            <p>${escapeHTML(question.userAnswer)}</p>
          </div>
          `
              : ''
          }
          
          ${
            question.correctAnswer
              ? `
          <div class="section">
            <h3>正确答案</h3>
            <p class="correct-answer">${escapeHTML(question.correctAnswer)}</p>
          </div>
          `
              : ''
          }
          
          ${
            question.errorAnalysis
              ? `
          <div class="section">
            <h3>错误分析</h3>
            <p>${escapeHTML(question.errorAnalysis)}</p>
          </div>
          `
              : ''
          }
          
          ${
            question.detailedExplanation
              ? `
          <div class="section">
            <h3>详细解析</h3>
            <p>${escapeHTML(question.detailedExplanation)}</p>
          </div>
          `
              : ''
          }
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>错题本 - ${userName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #fff;
        }
        
        .cover {
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          page-break-after: always;
        }
        
        .cover h1 {
          font-size: 48px;
          margin-bottom: 40px;
          color: #2563eb;
        }
        
        .cover p {
          font-size: 18px;
          margin: 10px 0;
          color: #666;
        }
        
        .question {
          padding: 20px 0;
        }
        
        .question h2 {
          font-size: 24px;
          color: #1e40af;
          margin-bottom: 15px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
        }
        
        .meta {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          padding: 10px;
          background: #f3f4f6;
          border-radius: 5px;
        }
        
        .meta span {
          font-size: 14px;
        }
        
        .section {
          margin: 20px 0;
        }
        
        .section h3 {
          font-size: 18px;
          color: #374151;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .section p {
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
          padding: 10px;
          background: #f9fafb;
          border-left: 3px solid #d1d5db;
          border-radius: 3px;
        }
        
        .correct-answer {
          background: #dcfce7 !important;
          border-left-color: #16a34a !important;
        }
        
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="cover">
        <h1>错题本</h1>
        <p><strong>学生：</strong>${escapeHTML(userName)}</p>
        <p><strong>导出时间：</strong>${new Date().toLocaleDateString('zh-CN')}</p>
        <p><strong>共 ${errorQuestions.length} 道错题</strong></p>
      </div>
      
      ${questionsHTML}
    </body>
    </html>
  `;
}

/**
 * HTML转义
 */
function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}
