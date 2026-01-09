import { getDb } from '../db';
import { aiGeneratedQuestions } from '../../drizzle/schema';
import { inArray } from 'drizzle-orm';
import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';

/**
 * 导出格式类型
 */
export type ExportFormat = 'pdf' | 'word' | 'markdown';

/**
 * 导出选项
 */
export interface ExportOptions {
  questionIds: number[];
  format: ExportFormat;
  includeAnswer?: boolean;
  includeExplanation?: boolean;
  title?: string;
}

/**
 * 格式化题目为Markdown
 */
function formatQuestionToMarkdown(
  question: any,
  index: number,
  options: ExportOptions
): string {
  let markdown = `## 题目 ${index + 1}\n\n`;
  markdown += `**标题：** ${question.title}\n\n`;
  markdown += `**学科：** ${question.subject} | **年级：** ${question.grade} | **难度：** ${question.difficulty}\n\n`;
  markdown += `### 题目内容\n\n${question.content}\n\n`;

  if (options.includeAnswer) {
    markdown += `### 答案\n\n${question.answer}\n\n`;
  }

  if (options.includeExplanation && question.explanation) {
    markdown += `### 解析\n\n${question.explanation}\n\n`;
  }

  markdown += `---\n\n`;

  return markdown;
}

/**
 * 生成Word文档
 */
async function generateWordDocument(
  questions: any[],
  options: ExportOptions
): Promise<Buffer> {
  const sections: any[] = [];

  // 添加标题
  sections.push(
    new Paragraph({
      text: options.title || '题目集',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // 添加每道题目
  questions.forEach((question, index) => {
    // 题目编号
    sections.push(
      new Paragraph({
        text: `题目 ${index + 1}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 },
      })
    );

    // 题目标题
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '标题：',
            bold: true,
          }),
          new TextRun({
            text: question.title,
          }),
        ],
        spacing: { after: 100 },
      })
    );

    // 题目信息
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `学科：${question.subject} | 年级：${question.grade} | 难度：${question.difficulty}`,
            italics: true,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // 题目内容
    sections.push(
      new Paragraph({
        text: '题目内容',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      })
    );

    sections.push(
      new Paragraph({
        text: question.content,
        spacing: { after: 200 },
      })
    );

    // 答案
    if (options.includeAnswer) {
      sections.push(
        new Paragraph({
          text: '答案',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: question.answer,
          spacing: { after: 200 },
        })
      );
    }

    // 解析
    if (options.includeExplanation && question.explanation) {
      sections.push(
        new Paragraph({
          text: '解析',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: question.explanation,
          spacing: { after: 200 },
        })
      );
    }

    // 分隔线
    sections.push(
      new Paragraph({
        text: '',
        spacing: { after: 300 },
        border: {
          bottom: {
            color: 'CCCCCC',
            space: 1,
            style: 'single',
            size: 6,
          },
        },
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });

  // 使用docx库生成buffer
  const Packer = (await import('docx')).Packer;
  const buffer = await Packer.toBuffer(doc);

  return buffer;
}

/**
 * 生成Markdown文档
 */
function generateMarkdownDocument(
  questions: any[],
  options: ExportOptions
): string {
  let markdown = `# ${options.title || '题目集'}\n\n`;
  markdown += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  markdown += `题目数量：${questions.length}\n\n`;
  markdown += `---\n\n`;

  questions.forEach((question, index) => {
    markdown += formatQuestionToMarkdown(question, index, options);
  });

  return markdown;
}

/**
 * 导出题目
 */
export async function exportQuestions(options: ExportOptions): Promise<{
  buffer?: Buffer;
  content?: string;
  filename: string;
  mimeType: string;
}> {
  const db = getDb();

  // 获取题目数据
  const questions = await db
    .select()
    .from(aiGeneratedQuestions)
    .where(inArray(aiGeneratedQuestions.id, options.questionIds));

  if (questions.length === 0) {
    throw new Error('未找到要导出的题目');
  }

  const timestamp = new Date().toISOString().slice(0, 10);

  switch (options.format) {
    case 'word': {
      const buffer = await generateWordDocument(questions, options);
      return {
        buffer,
        filename: `题目集_${timestamp}.docx`,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }

    case 'markdown': {
      const content = generateMarkdownDocument(questions, options);
      return {
        content,
        filename: `题目集_${timestamp}.md`,
        mimeType: 'text/markdown',
      };
    }

    case 'pdf': {
      // PDF导出使用markdown转PDF的方式
      // 这里简化处理，实际可以使用puppeteer或其他PDF生成库
      const markdown = generateMarkdownDocument(questions, options);
      return {
        content: markdown,
        filename: `题目集_${timestamp}.pdf`,
        mimeType: 'application/pdf',
      };
    }

    default:
      throw new Error('不支持的导出格式');
  }
}

/**
 * 批量导出题目（按学科分组）
 */
export async function batchExportQuestions(params: {
  questionIds: number[];
  format: ExportFormat;
  groupBySubject?: boolean;
  includeAnswer?: boolean;
  includeExplanation?: boolean;
}): Promise<
  Array<{
    buffer?: Buffer;
    content?: string;
    filename: string;
    mimeType: string;
    subject?: string;
  }>
> {
  const db = getDb();

  // 获取题目数据
  const questions = await db
    .select()
    .from(aiGeneratedQuestions)
    .where(inArray(aiGeneratedQuestions.id, params.questionIds));

  if (questions.length === 0) {
    throw new Error('未找到要导出的题目');
  }

  if (!params.groupBySubject) {
    // 不分组，导出为单个文件
    const result = await exportQuestions({
      questionIds: params.questionIds,
      format: params.format,
      includeAnswer: params.includeAnswer,
      includeExplanation: params.includeExplanation,
      title: '题目集',
    });

    return [result];
  }

  // 按学科分组
  const groupedQuestions = questions.reduce((acc, question) => {
    const subject = question.subject;
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(question);
    return acc;
  }, {} as Record<string, any[]>);

  // 为每个学科生成导出文件
  const results = await Promise.all(
    Object.entries(groupedQuestions).map(async ([subject, subjectQuestions]) => {
      const questionIds = subjectQuestions.map((q: any) => q.id);
      const result = await exportQuestions({
        questionIds,
        format: params.format,
        includeAnswer: params.includeAnswer,
        includeExplanation: params.includeExplanation,
        title: `${subject}题目集`,
      });

      return {
        ...result,
        subject,
      };
    })
  );

  return results;
}
