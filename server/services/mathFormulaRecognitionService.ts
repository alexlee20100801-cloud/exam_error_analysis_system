import { invokeLLM } from '../_core/llm';

/**
 * 数学公式识别服务
 * 使用LLM视觉能力识别图片中的数学公式并转换为LaTeX格式
 */

// 公式识别结果接口
export interface FormulaRecognitionResult {
  originalText: string; // 原始文本
  latexText: string; // 转换后的LaTeX格式文本
  formulas: Formula[]; // 识别到的公式列表
  confidence: number; // 整体识别置信度 0-1
}

// 单个公式信息
export interface Formula {
  original: string; // 原始表达式
  latex: string; // LaTeX格式
  type: 'inline' | 'display' | 'chemical' | 'physics'; // 公式类型
  confidence: number; // 该公式的置信度
  position?: {
    // 公式在文本中的位置（可选）
    start: number;
    end: number;
  };
}

/**
 * 识别图片中的数学公式并转换为LaTeX
 * @param imageUrl 图片URL
 * @param subject 学科类型（用于优化识别）
 */
export async function recognizeFormulasFromImage(
  imageUrl: string,
  subject?: string
): Promise<FormulaRecognitionResult> {
  try {
    // 根据学科类型定制提示词
    const subjectHints: Record<string, string> = {
      math: '数学公式（如分数、根号、积分、求和、希腊字母、上下标等）',
      physics: '物理公式（如力学公式、电磁学公式、单位符号、矢量等）',
      chemistry: '化学方程式（如化学式、离子、化学反应、电子式等）',
    };

    const hint = subject && subjectHints[subject] ? subjectHints[subject] : '数学、物理、化学公式';

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是一个专业的数学公式识别专家。你的任务是：
1. 识别图片中的所有文字和公式
2. 将所有数学公式、化学方程式、物理公式转换为标准LaTeX格式
3. 保持文本的原始结构和顺序
4. 使用正确的LaTeX语法：
   - 行内公式使用 $...$ 包裹
   - 独立公式使用 $$...$$ 包裹
   - 化学方程式使用 $\\ce{...}$ 包裹
   - 分数使用 \\frac{分子}{分母}
   - 根号使用 \\sqrt{内容} 或 \\sqrt[n]{内容}
   - 上标使用 ^{内容}，下标使用 _{内容}
   - 希腊字母使用 \\alpha, \\beta, \\Delta 等
   - 求和使用 \\sum_{下标}^{上标}
   - 积分使用 \\int_{下界}^{上界}
5. 对于普通文字，保持原样不变`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请识别这张图片中的内容，特别注意${hint}。将所有公式转换为LaTeX格式，并保持文本的原始结构。`
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
          name: 'formula_recognition',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              originalText: {
                type: 'string',
                description: '原始识别的文本（未转换LaTeX）'
              },
              latexText: {
                type: 'string',
                description: '转换后的文本（所有公式已转为LaTeX格式）'
              },
              formulas: {
                type: 'array',
                description: '识别到的所有公式',
                items: {
                  type: 'object',
                  properties: {
                    original: { type: 'string', description: '原始表达式' },
                    latex: { type: 'string', description: 'LaTeX格式' },
                    type: {
                      type: 'string',
                      description: '公式类型',
                      enum: ['inline', 'display', 'chemical', 'physics']
                    },
                    confidence: {
                      type: 'number',
                      description: '识别置信度0-1'
                    }
                  },
                  required: ['original', 'latex', 'type', 'confidence'],
                  additionalProperties: false
                }
              },
              confidence: {
                type: 'number',
                description: '整体识别置信度0-1'
              }
            },
            required: ['originalText', 'latexText', 'formulas', 'confidence'],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0].message.content;
    const result = JSON.parse(typeof messageContent === 'string' ? messageContent : '{}');

    return {
      originalText: result.originalText || '',
      latexText: result.latexText || result.originalText || '',
      formulas: result.formulas || [],
      confidence: result.confidence || 0.8
    };
  } catch (error) {
    console.error('公式识别失败:', error);
    throw new Error('公式识别失败，请重试');
  }
}

/**
 * 识别纯文本中的数学表达式并转换为LaTeX
 * @param text 纯文本内容
 * @param subject 学科类型
 */
export async function recognizeFormulasFromText(
  text: string,
  subject?: string
): Promise<FormulaRecognitionResult> {
  try {
    const subjectHints: Record<string, string> = {
      math: '数学公式',
      physics: '物理公式',
      chemistry: '化学方程式',
    };

    const hint = subject && subjectHints[subject] ? subjectHints[subject] : '数学、物理、化学公式';

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是一个专业的数学公式转换专家。你的任务是将文本中的数学表达式转换为标准LaTeX格式。
规则：
1. 识别所有数学表达式、化学方程式、物理公式
2. 将它们转换为LaTeX格式
3. 行内公式使用 $...$，独立公式使用 $$...$$
4. 化学方程式使用 $\\ce{...}$
5. 保持文本的原始结构`
        },
        {
          role: 'user',
          content: `请将以下文本中的${hint}转换为LaTeX格式：\n\n${text}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'text_formula_recognition',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              originalText: { type: 'string', description: '原始文本' },
              latexText: { type: 'string', description: '转换后的LaTeX文本' },
              formulas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original: { type: 'string' },
                    latex: { type: 'string' },
                    type: { type: 'string', enum: ['inline', 'display', 'chemical', 'physics'] },
                    confidence: { type: 'number' }
                  },
                  required: ['original', 'latex', 'type', 'confidence'],
                  additionalProperties: false
                }
              },
              confidence: { type: 'number' }
            },
            required: ['originalText', 'latexText', 'formulas', 'confidence'],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0].message.content;
    const result = JSON.parse(typeof messageContent === 'string' ? messageContent : '{}');

    return {
      originalText: result.originalText || text,
      latexText: result.latexText || text,
      formulas: result.formulas || [],
      confidence: result.confidence || 0.8
    };
  } catch (error) {
    console.error('文本公式识别失败:', error);
    // 如果识别失败，返回原文本
    return {
      originalText: text,
      latexText: text,
      formulas: [],
      confidence: 0
    };
  }
}

/**
 * 验证LaTeX公式的语法正确性（基础检查）
 */
export function validateLatexSyntax(latex: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查括号匹配
  const brackets = [
    { open: '{', close: '}' },
    { open: '(', close: ')' },
    { open: '[', close: ']' }
  ];

  for (const bracket of brackets) {
    const openCount = (latex.match(new RegExp(`\\${bracket.open}`, 'g')) || []).length;
    const closeCount = (latex.match(new RegExp(`\\${bracket.close}`, 'g')) || []).length;
    if (openCount !== closeCount) {
      errors.push(`括号不匹配: ${bracket.open}${bracket.close}`);
    }
  }

  // 检查常见的LaTeX命令
  const commonCommands = [
    'frac',
    'sqrt',
    'sum',
    'int',
    'alpha',
    'beta',
    'gamma',
    'Delta',
    'theta',
    'pi',
    'ce' // 化学方程式
  ];

  // 检查是否有未闭合的命令
  const commandPattern = /\\([a-zA-Z]+)/g;
  const matches = latex.match(commandPattern);
  if (matches) {
    for (const match of matches) {
      const cmd = match.substring(1);
      if (commonCommands.includes(cmd)) {
        // 检查命令后是否有参数
        const cmdIndex = latex.indexOf(match);
        const afterCmd = latex.substring(cmdIndex + match.length).trim();
        if (cmd === 'frac' && !afterCmd.startsWith('{')) {
          errors.push(`\\frac 命令缺少参数`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 高亮显示文本中的公式（用于前端展示）
 */
export function highlightFormulas(text: string, formulas: Formula[]): string {
  let highlightedText = text;

  // 按位置倒序排列，避免替换时位置偏移
  const sortedFormulas = [...formulas].sort((a, b) => {
    if (!a.position || !b.position) return 0;
    return b.position.start - a.position.start;
  });

  for (const formula of sortedFormulas) {
    if (formula.position) {
      const before = highlightedText.substring(0, formula.position.start);
      const after = highlightedText.substring(formula.position.end);
      highlightedText = `${before}<mark class="formula-highlight">${formula.latex}</mark>${after}`;
    }
  }

  return highlightedText;
}
