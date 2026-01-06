import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { getDb } from "../db";
import { favorites, errorQuestions, questions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 导出格式
 */
export type ExportFormat = "pdf" | "word";

/**
 * 导出选项
 */
export interface ExportOptions {
  userId: number;
  format: ExportFormat;
  questionType?: "error_question" | "practice_question" | "question";
}

/**
 * 题目数据
 */
interface QuestionData {
  title: string;
  content: string;
  correctAnswer: string;
  subject?: string;
  difficulty?: string;
  knowledgePoint?: string;
  createdAt: Date;
}

/**
 * 获取收藏的题目数据
 */
async function getFavoriteQuestions(
  userId: number,
  questionType?: "error_question" | "practice_question" | "question"
): Promise<QuestionData[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 查询收藏列表
  const favList = questionType
    ? await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.questionType, questionType)))
    : await db
        .select()
        .from(favorites)
        .where(eq(favorites.userId, userId));

  // 获取题目详情
  const questionsData: QuestionData[] = [];

  for (const fav of favList) {
    let questionDetail: any = null;

    if (fav.questionType === "error_question") {
      const [errQ] = await db
        .select()
        .from(errorQuestions)
        .where(eq(errorQuestions.id, fav.questionId))
        .limit(1);
      questionDetail = errQ;
    } else if (fav.questionType === "practice_question" || fav.questionType === "question") {
      const [q] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, fav.questionId))
        .limit(1);
      questionDetail = q;
    }

    if (questionDetail) {
      questionsData.push({
        title: questionDetail.title || "题目",
        content: questionDetail.content || "",
        correctAnswer: questionDetail.correctAnswer || "",
        subject: questionDetail.subject,
        difficulty: questionDetail.difficulty,
        knowledgePoint: questionDetail.knowledgePoint,
        createdAt: fav.createdAt,
      });
    }
  }

  return questionsData;
}

/**
 * 导出为PDF
 */
export async function exportToPDF(options: ExportOptions): Promise<Buffer> {
  const questions = await getFavoriteQuestions(options.userId, options.questionType);

  // 创建PDF文档
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]); // A4尺寸
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  // 标题（使用英文避免中文编码问题）
  page.drawText("My Question Bank - Favorites", {
    x: 50,
    y: yPosition,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 30;

  // 日期
  page.drawText(`Export Date: ${new Date().toISOString().split("T")[0]}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  yPosition -= 40;

  // 遍历题目
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // 检查是否需要新页面
    if (yPosition < 150) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }

    // 题目序号和标题（过滤中文字符）
    const safeTitle = q.title.replace(/[^\x00-\x7F]/g, "?");
    page.drawText(`${i + 1}. ${safeTitle}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 25;

    // 题目内容（过滤中文字符）
    const safeContent = q.content.replace(/[^\x00-\x7F]/g, "?");
    const contentLines = wrapText(safeContent, 80);
    for (const line of contentLines) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 18;
    }

    yPosition -= 10;

    // 正确答案（过滤中文字符）
    const safeAnswer = q.correctAnswer.replace(/[^\x00-\x7F]/g, "?");
    page.drawText(`Answer: ${safeAnswer}`, {
      x: 50,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: rgb(0, 0.5, 0),
    });

    yPosition -= 20;

    // 元信息
    const metadata: string[] = [];
    if (q.subject) metadata.push(`Subject: ${q.subject}`);
    if (q.difficulty) metadata.push(`Difficulty: ${q.difficulty}`);
    if (q.knowledgePoint) metadata.push(`Knowledge: ${q.knowledgePoint}`);

    if (metadata.length > 0) {
      page.drawText(metadata.join(" | "), {
        x: 50,
        y: yPosition,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 20;
    }

    // 分隔线
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    yPosition -= 30;
  }

  // 生成PDF字节
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * 导出为Word
 */
export async function exportToWord(options: ExportOptions): Promise<Buffer> {
  const questions = await getFavoriteQuestions(options.userId, options.questionType);

  // 创建Word文档
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // 标题
          new Paragraph({
            text: "My Question Bank - Favorites",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Export Date: ${new Date().toISOString().split("T")[0]}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // 题目列表
          ...questions.flatMap((q, i) => [
          // 题目序号和标题
          new Paragraph({
            children: [
              new TextRun({
                text: `Question ${i + 1}: ${q.title}`,
                bold: true,
                size: 28,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),

          // 题目内容
          new Paragraph({
            text: q.content,
            spacing: { after: 100 },
          }),

          // 正确答案
          new Paragraph({
            children: [
              new TextRun({
                text: "Answer: ",
                bold: true,
                color: "008000",
              }),
              new TextRun({
                text: q.correctAnswer,
                color: "008000",
              }),
            ],
            spacing: { after: 100 },
          }),

          // 元信息
          ...(q.subject || q.difficulty || q.knowledgePoint
            ? [
                new Paragraph({
                  children: [
                    ...(q.subject
                      ? [
                          new TextRun({
                            text: `Subject: ${q.subject}  `,
                            size: 20,
                            color: "808080",
                          }),
                        ]
                      : []),
                    ...(q.difficulty
                      ? [
                          new TextRun({
                            text: `Difficulty: ${q.difficulty}  `,
                            size: 20,
                            color: "808080",
                          }),
                        ]
                      : []),
                    ...(q.knowledgePoint
                      ? [
                          new TextRun({
                            text: `Knowledge: ${q.knowledgePoint}`,
                            size: 20,
                            color: "808080",
                          }),
                        ]
                      : []),
                  ],
                  spacing: { after: 200 },
                }),
              ]
            : []),

            // 分隔线（使用边框）
            new Paragraph({
              text: "",
              border: {
                bottom: {
                  color: "CCCCCC",
                  space: 1,
                  style: "single",
                  size: 6,
                },
              },
              spacing: { after: 200 },
            }),
          ]),
        ],
      },
    ],
  });

  // 生成Word字节
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * 导出收藏题目
 */
export async function exportFavorites(options: ExportOptions): Promise<Buffer> {
  if (options.format === "pdf") {
    return await exportToPDF(options);
  } else if (options.format === "word") {
    return await exportToWord(options);
  } else {
    throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * 文本换行辅助函数
 */
function wrapText(text: string, maxLength: number): string[] {
  const lines: string[] = [];
  let currentLine = "";

  for (const char of text) {
    if (currentLine.length >= maxLength) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
