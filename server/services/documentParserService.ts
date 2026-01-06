import mammoth from 'mammoth';

import { storagePut, storageGet } from '../storage';
import { invokeLLM } from '../_core/llm';
import { recognizeFormulasFromImage, recognizeFormulasFromText, type Formula } from './mathFormulaRecognitionService';
import { extractContentEnhanced, type ImageElement } from '../enhancedOcrService';

/**
 * 文档解析服务
 * 支持图片OCR、Word文档、PDF文档解析
 */

// 解析结果接口
export interface ParsedContent {
  rawText: string; // 原始文本
  structuredData: {
    title?: string; // 题目标题
    content?: string; // 题目内容
    userAnswer?: string; // 用户答案
    correctAnswer?: string; // 正确答案
    explanation?: string; // 详细解析
    subject?: string; // 学科
    difficulty?: 'easy' | 'medium' | 'hard'; // 难度
  };
  confidence: number; // 识别置信度 0-1
  fileType: 'image' | 'word' | 'pdf';
  formulas?: Formula[]; // 识别到的公式列表
  hasFormulas?: boolean; // 是否包含公式
  imageElements?: ImageElement[]; // 识别到的图表、图片元素
  tables?: Array<{ content: string; position: string }>; // 识别到的表格
}

/**
 * 解析图片（OCR识别 + 公式识别）
 * 使用LLM的视觉能力识别图片中的文字内容并自动转换公式为LaTeX格式
 */
export async function parseImage(imageBuffer: Buffer, mimeType: string): Promise<ParsedContent> {
  try {
    // 上传图片到S3获取URL
    const { url: imageUrl } = await storagePut(
      `temp/ocr/${Date.now()}.${mimeType.split('/')[1]}`,
      imageBuffer,
      mimeType
    );

    // 首先使用增强OCR识别图表、表格等元素
    const enhancedResult = await extractContentEnhanced(imageUrl);
    
    // 然后使用LLM的视觉能力识别图片内容（带公式识别）
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是一个专业的错题识别助手。请仔细识别图片中的题目内容，包括题目、答案、解析等信息。
重要：所有数学公式、化学方程式、物理公式必须转换为LaTeX格式：
- 行内公式使用 $...$ 包裹
- 独立公式使用 $$...$$ 包裹
- 化学方程式使用 $\\ce{...}$ 包裹
- 分数: \\frac{分子}{分母}
- 根号: \\sqrt{内容}
- 上下标: x^{2}, x_{1}
- 希腊字母: \\alpha, \\beta, \\Delta
- 求和: \\sum_{i=1}^{n}
- 积分: \\int_{a}^{b}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别这张图片中的错题信息，提取题目标题、题目内容、用户答案、正确答案、详细解析。所有公式必须转换为LaTeX格式。如果图片中没有某些信息，请留空。'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'error_question_ocr',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '题目标题' },
              content: { type: 'string', description: '题目内容（公式已转为LaTeX）' },
              userAnswer: { type: 'string', description: '用户答案（公式已转为LaTeX）' },
              correctAnswer: { type: 'string', description: '正确答案（公式已转为LaTeX）' },
              explanation: { type: 'string', description: '详细解析（公式已转为LaTeX）' },
              rawText: { type: 'string', description: '原始识别文本（未转换LaTeX）' },
              confidence: { type: 'number', description: '识别置信度0-1' },
              hasFormulas: { type: 'boolean', description: '是否包含数学公式' }
            },
            required: ['rawText', 'confidence', 'hasFormulas'],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0].message.content;
    const result = JSON.parse(typeof messageContent === 'string' ? messageContent : '{}');

    // 如果包含公式，进一步识别公式详情
    let formulas: Formula[] = [];
    if (result.hasFormulas) {
      try {
        const formulaResult = await recognizeFormulasFromImage(imageUrl);
        formulas = formulaResult.formulas;
      } catch (error) {
        console.warn('公式识别失败，但OCR识别成功:', error);
      }
    }

    return {
      rawText: result.rawText || '',
      structuredData: {
        title: result.title || undefined,
        content: result.content || undefined,
        userAnswer: result.userAnswer || undefined,
        correctAnswer: result.correctAnswer || undefined,
        explanation: result.explanation || undefined
      },
      confidence: result.confidence || 0.8,
      fileType: 'image',
      formulas,
      hasFormulas: result.hasFormulas || false,
      imageElements: enhancedResult.success ? enhancedResult.imageElements : undefined,
      tables: enhancedResult.success ? enhancedResult.tables : undefined
    };
  } catch (error) {
    console.error('图片OCR识别失败:', error);
    throw new Error('图片识别失败，请重试');
  }
}

/**
 * 解析Word文档（带公式识别）
 */
export async function parseWord(fileBuffer: Buffer): Promise<ParsedContent> {
  try {
    // 使用mammoth提取Word文档的纯文本
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const rawText = result.value;

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Word文档内容为空');
    }

    // 使用LLM智能分析文档内容并结构化（已包含公式识别）
    const structuredData = await analyzeTextContent(rawText);

    // 尝试识别文本中的公式
    let formulas: Formula[] = [];
    let hasFormulas = false;
    try {
      const formulaResult = await recognizeFormulasFromText(rawText);
      formulas = formulaResult.formulas;
      hasFormulas = formulas.length > 0;
    } catch (error) {
      console.warn('Word文档公式识别失败:', error);
    }

    return {
      rawText,
      structuredData,
      confidence: 0.9,
      fileType: 'word',
      formulas,
      hasFormulas
    };
  } catch (error) {
    console.error('Word文档解析失败:', error);
    throw new Error('Word文档解析失败，请确保文件格式正确');
  }
}

/**
 * 解析PDF文档（带公式识别）
 */
export async function parsePDF(fileBuffer: Buffer): Promise<ParsedContent> {
  try {
    // 动态导入pdf-parse
    const { PDFParse } = await import('pdf-parse');
    // 使用pdf-parse提取PDF文本
    const parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText();
    const rawText = result.text;

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('PDF文档内容为空或为扫描版（暂不支持）');
    }

    // 使用LLM智能分析文档内容并结构化（已包含公式识别）
    const structuredData = await analyzeTextContent(rawText);

    // 尝试识别文本中的公式
    let formulas: Formula[] = [];
    let hasFormulas = false;
    try {
      const formulaResult = await recognizeFormulasFromText(rawText);
      formulas = formulaResult.formulas;
      hasFormulas = formulas.length > 0;
    } catch (error) {
      console.warn('PDF文档公式识别失败:', error);
    }

    return {
      rawText,
      structuredData,
      confidence: 0.85,
      fileType: 'pdf',
      formulas,
      hasFormulas
    };
  } catch (error) {
    console.error('PDF文档解析失败:', error);
    throw new Error('PDF文档解析失败，请确保文件格式正确或非扫描版');
  }
}

/**
 * 使用LLM智能分析文本内容并结构化（带公式识别）
 */
async function analyzeTextContent(rawText: string): Promise<ParsedContent['structuredData']> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是一个专业的错题分析助手。请从文本中提取错题的关键信息，包括题目、答案、解析等。
重要：所有数学公式、化学方程式、物理公式必须转换为LaTeX格式：
- 行内公式使用 $...$ 包裹
- 独立公式使用 $$...$$ 包裹
- 化学方程式使用 $\\ce{...}$ 包裹`
        },
        {
          role: 'user',
          content: `请分析以下文本内容，提取错题信息：\n\n${rawText}\n\n请提取：题目标题、题目内容、用户答案、正确答案、详细解析、学科、难度。所有公式必须转换为LaTeX格式。如果某些信息不存在，请留空。`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'error_question_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '题目标题' },
              content: { type: 'string', description: '题目内容（公式已转为LaTeX）' },
              userAnswer: { type: 'string', description: '用户答案（公式已转为LaTeX）' },
              correctAnswer: { type: 'string', description: '正确答案（公式已转为LaTeX）' },
              explanation: { type: 'string', description: '详细解析（公式已转为LaTeX）' },
              subject: { type: 'string', description: '学科（语文/数学/英语/物理/化学/生物/历史/地理/道法）' },
              difficulty: { type: 'string', description: '难度（easy/medium/hard）' }
            },
            required: [],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0].message.content;
    const result = JSON.parse(typeof messageContent === 'string' ? messageContent : '{}');

    return {
      title: result.title || undefined,
      content: result.content || undefined,
      userAnswer: result.userAnswer || undefined,
      correctAnswer: result.correctAnswer || undefined,
      explanation: result.explanation || undefined,
      subject: result.subject || undefined,
      difficulty: result.difficulty as 'easy' | 'medium' | 'hard' || undefined
    };
  } catch (error) {
    console.error('文本内容分析失败:', error);
    // 如果AI分析失败，返回空结构
    return {};
  }
}

/**
 * 统一的文档解析入口
 */
export async function parseDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ParsedContent> {
  // 根据MIME类型选择解析方法
  if (mimeType.startsWith('image/')) {
    return parseImage(fileBuffer, mimeType);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return parseWord(fileBuffer);
  } else if (mimeType === 'application/pdf') {
    return parsePDF(fileBuffer);
  } else {
    throw new Error(`不支持的文件类型: ${mimeType}`);
  }
}
