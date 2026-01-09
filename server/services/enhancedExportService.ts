/**
 * 增强的导出服务
 * 支持自定义页眉页脚、水印、纸张大小等高级选项
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, ImageRun, Header, Footer, TextWrappingType, TextWrappingSide, VerticalPositionAlign, HorizontalPositionAlign } from "docx";
import puppeteer from "puppeteer";
import { ErrorQuestion } from "../../drizzle/schema";

/**
 * 纸张大小配置
 */
export const PAPER_SIZES = {
  A4: { width: 11906, height: 16838 }, // A4: 210mm x 297mm
  A5: { width: 8391, height: 11906 }, // A5: 148mm x 210mm
  Letter: { width: 12240, height: 15840 }, // Letter: 8.5" x 11"
  Legal: { width: 12240, height: 20160 }, // Legal: 8.5" x 14"
};

/**
 * 导出配置选项
 */
export interface ExportOptions {
  // 页眉页脚
  header?: {
    enabled: boolean;
    leftText?: string;
    centerText?: string;
    rightText?: string;
  };
  footer?: {
    enabled: boolean;
    leftText?: string;
    centerText?: string;
    rightText?: string;
    showPageNumber?: boolean;
  };
  
  // 水印
  watermark?: {
    enabled: boolean;
    text?: string;
    imageUrl?: string;
    opacity?: number;
    fontSize?: number;
    rotation?: number;
  };
  
  // 纸张设置
  paperSize?: keyof typeof PAPER_SIZES;
  
  // 页边距 (单位: twips, 1440 twips = 1 inch)
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  
  // 字体设置
  font?: {
    name?: string;
    size?: number; // 单位: 半点 (half-points)
  };
}

/**
 * 默认导出配置
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  header: {
    enabled: false,
    centerText: "错题本",
  },
  footer: {
    enabled: true,
    centerText: "深圳初高中错题分析学习系统",
    showPageNumber: true,
  },
  watermark: {
    enabled: false,
    text: "仅供学习使用",
    opacity: 0.1,
    fontSize: 72,
    rotation: -45,
  },
  paperSize: "A4",
  margins: {
    top: 1440,
    bottom: 1440,
    left: 1440,
    right: 1440,
  },
  font: {
    name: "宋体",
    size: 22, // 11pt
  },
};

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
 * 创建页眉
 */
function createHeader(options: ExportOptions): Header | undefined {
  if (!options.header?.enabled) return undefined;

  const children: Paragraph[] = [];
  
  const headerParts: TextRun[] = [];
  
  if (options.header.leftText) {
    headerParts.push(new TextRun(options.header.leftText));
  }
  
  if (options.header.centerText) {
    if (headerParts.length > 0) headerParts.push(new TextRun("    "));
    headerParts.push(new TextRun(options.header.centerText));
  }
  
  if (options.header.rightText) {
    if (headerParts.length > 0) headerParts.push(new TextRun("    "));
    headerParts.push(new TextRun(options.header.rightText));
  }

  children.push(
    new Paragraph({
      children: headerParts,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  return new Header({
    children,
  });
}

/**
 * 创建页脚
 */
function createFooter(options: ExportOptions): Footer | undefined {
  if (!options.footer?.enabled) return undefined;

  const children: Paragraph[] = [];
  
  const footerParts: TextRun[] = [];
  
  if (options.footer.leftText) {
    footerParts.push(new TextRun(options.footer.leftText));
  }
  
  if (options.footer.centerText) {
    if (footerParts.length > 0) footerParts.push(new TextRun("    "));
    footerParts.push(new TextRun(options.footer.centerText));
  }
  
  if (options.footer.rightText) {
    if (footerParts.length > 0) footerParts.push(new TextRun("    "));
    footerParts.push(new TextRun(options.footer.rightText));
  }
  
  if (options.footer.showPageNumber) {
    if (footerParts.length > 0) footerParts.push(new TextRun("    "));
    footerParts.push(new TextRun("第 "));
    footerParts.push(new TextRun({
      children: ["PAGE", "NUMPAGES"],
    }));
    footerParts.push(new TextRun(" 页"));
  }

  children.push(
    new Paragraph({
      children: footerParts,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    })
  );

  return new Footer({
    children,
  });
}

/**
 * 生成带高级选项的Word文档
 */
export async function generateEnhancedWordDocument(
  errorQuestions: Array<ErrorQuestion>,
  userName: string,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<Buffer> {
  // 合并配置
  const mergedOptions: ExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
    header: { ...DEFAULT_EXPORT_OPTIONS.header, ...options.header },
    footer: { ...DEFAULT_EXPORT_OPTIONS.footer, ...options.footer },
    watermark: { ...DEFAULT_EXPORT_OPTIONS.watermark, ...options.watermark },
    margins: { ...DEFAULT_EXPORT_OPTIONS.margins, ...options.margins },
    font: { ...DEFAULT_EXPORT_OPTIONS.font, ...options.font },
  };

  const sections = [];
  
  // 获取纸张大小
  const paperSize = PAPER_SIZES[mergedOptions.paperSize || "A4"];

  // 封面
  const coverChildren: Paragraph[] = [
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
  ];

  // 添加水印到封面
  if (mergedOptions.watermark?.enabled && mergedOptions.watermark.text) {
    coverChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: mergedOptions.watermark.text,
            font: mergedOptions.font?.name,
            size: mergedOptions.watermark.fontSize || 72,
            color: "CCCCCC",
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  coverChildren.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  sections.push({
    properties: {
      page: {
        width: paperSize.width,
        height: paperSize.height,
        margin: mergedOptions.margins,
      },
    },
    headers: {
      default: createHeader(mergedOptions),
    },
    footers: {
      default: createFooter(mergedOptions),
    },
    children: coverChildren,
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
            font: mergedOptions.font?.name,
            size: mergedOptions.font?.size,
          }),
          new TextRun({
            text: subjectNames[question.subject] || question.subject,
            font: mergedOptions.font?.name,
            size: mergedOptions.font?.size,
          }),
          new TextRun({
            text: "    ",
            font: mergedOptions.font?.name,
            size: mergedOptions.font?.size,
          }),
          new TextRun({
            text: "年级：",
            bold: true,
            font: mergedOptions.font?.name,
            size: mergedOptions.font?.size,
          }),
          new TextRun({
            text: gradeNames[question.grade] || question.grade,
            font: mergedOptions.font?.name,
            size: mergedOptions.font?.size,
          }),
          new TextRun({
            text: "    ",
            font: mergedOptions.font?.name,
            size: mergedOptions.font?.size,
          }),
          new TextRun({
            text: "难度：",
            bold: true,
            font: mergedOptions.font?.name,
            size: mergedOptions.font?.size,
          }),
          new TextRun({
            text: question.difficulty || "未知",
            font: mergedOptions.font?.name,
            size: mergedOptions.font?.size,
          }),
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

    // 笔记
    if (question.userNotes) {
      questionChildren.push(
        new Paragraph({
          text: "我的笔记",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      questionChildren.push(
        new Paragraph({
          text: question.userNotes,
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
      properties: {
        page: {
          width: paperSize.width,
          height: paperSize.height,
          margin: mergedOptions.margins,
        },
      },
      headers: {
        default: createHeader(mergedOptions),
      },
      footers: {
        default: createFooter(mergedOptions),
      },
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
 * 生成带高级选项的PDF文档
 */
export async function generateEnhancedPdfDocument(
  errorQuestions: Array<ErrorQuestion>,
  userName: string,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<Buffer> {
  // 合并配置
  const mergedOptions: ExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
    header: { ...DEFAULT_EXPORT_OPTIONS.header, ...options.header },
    footer: { ...DEFAULT_EXPORT_OPTIONS.footer, ...options.footer },
    watermark: { ...DEFAULT_EXPORT_OPTIONS.watermark, ...options.watermark },
    margins: { ...DEFAULT_EXPORT_OPTIONS.margins, ...options.margins },
    font: { ...DEFAULT_EXPORT_OPTIONS.font, ...options.font },
  };

  // 生成HTML内容
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: ${mergedOptions.paperSize === "A5" ? "A5" : mergedOptions.paperSize === "Letter" ? "letter" : mergedOptions.paperSize === "Legal" ? "legal" : "A4"};
          margin: ${(mergedOptions.margins?.top || 1440) / 1440}in ${(mergedOptions.margins?.right || 1440) / 1440}in ${(mergedOptions.margins?.bottom || 1440) / 1440}in ${(mergedOptions.margins?.left || 1440) / 1440}in;
        }
        
        body {
          font-family: "${mergedOptions.font?.name || "宋体"}", "SimSun", serif;
          font-size: ${(mergedOptions.font?.size || 22) / 2}pt;
          line-height: 1.6;
          color: #333;
        }
        
        .cover {
          text-align: center;
          padding-top: 200px;
          page-break-after: always;
        }
        
        .cover h1 {
          font-size: 36pt;
          margin-bottom: 40px;
        }
        
        .cover p {
          font-size: 14pt;
          margin: 10px 0;
        }
        
        .question {
          page-break-after: always;
          padding: 20px 0;
        }
        
        .question:last-child {
          page-break-after: auto;
        }
        
        .question h2 {
          font-size: 18pt;
          margin-bottom: 10px;
          color: #2563eb;
        }
        
        .question h3 {
          font-size: 14pt;
          margin-top: 15px;
          margin-bottom: 8px;
          color: #1e40af;
        }
        
        .question .info {
          margin-bottom: 15px;
          color: #666;
        }
        
        .question .content {
          margin-bottom: 15px;
          line-height: 1.8;
        }
        
        ${mergedOptions.watermark?.enabled ? `
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(${mergedOptions.watermark.rotation || -45}deg);
          font-size: ${mergedOptions.watermark.fontSize || 72}pt;
          color: rgba(0, 0, 0, ${mergedOptions.watermark.opacity || 0.1});
          z-index: -1;
          pointer-events: none;
          white-space: nowrap;
        }
        ` : ""}
        
        ${mergedOptions.header?.enabled ? `
        @page {
          @top-center {
            content: "${mergedOptions.header.centerText || ""}";
            font-size: 10pt;
            color: #666;
          }
        }
        ` : ""}
        
        ${mergedOptions.footer?.enabled ? `
        @page {
          @bottom-center {
            // @ts-ignore
            content: "${mergedOptions.footer.centerText || ""} ${mergedOptions.footer.showPageNumber ? "第 " + counter(page) + " 页" : ""}";
            font-size: 10pt;
            color: #666;
          }
        }
        ` : ""}
      </style>
    </head>
    <body>
      ${mergedOptions.watermark?.enabled && mergedOptions.watermark.text ? `
      <div class="watermark">${mergedOptions.watermark.text}</div>
      ` : ""}
      
      <div class="cover">
        <h1>错题本</h1>
        <p>学生：${userName}</p>
        <p>导出时间：${new Date().toLocaleDateString("zh-CN")}</p>
        <p>共 ${errorQuestions.length} 道错题</p>
      </div>
  `;

  // 添加错题列表
  errorQuestions.forEach((question, index) => {
    html += `
      <div class="question">
        <h2>第 ${index + 1} 题</h2>
        <div class="info">
          <strong>学科：</strong>${subjectNames[question.subject] || question.subject}
          &nbsp;&nbsp;&nbsp;&nbsp;
          <strong>年级：</strong>${gradeNames[question.grade] || question.grade}
          &nbsp;&nbsp;&nbsp;&nbsp;
          <strong>难度：</strong>${question.difficulty || "未知"}
        </div>
        
        <h3>题目内容</h3>
        <div class="content">${question.content || question.title}</div>
        
        ${question.userAnswer ? `
        <h3>我的答案</h3>
        <div class="content">${question.userAnswer}</div>
        ` : ""}
        
        ${question.userNotes ? `
        <h3>我的笔记</h3>
        <div class="content">${question.userNotes}</div>
        ` : ""}
      </div>
    `;
  });

  html += `
    </body>
    </html>
  `;

  // 使用Puppeteer生成PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: mergedOptions.paperSize === "A5" ? "A5" : mergedOptions.paperSize === "Letter" ? "Letter" : mergedOptions.paperSize === "Legal" ? "Legal" : "A4",
    printBackground: true,
    margin: {
      top: `${(mergedOptions.margins?.top || 1440) / 1440}in`,
      bottom: `${(mergedOptions.margins?.bottom || 1440) / 1440}in`,
      left: `${(mergedOptions.margins?.left || 1440) / 1440}in`,
      right: `${(mergedOptions.margins?.right || 1440) / 1440}in`,
    },
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
}
