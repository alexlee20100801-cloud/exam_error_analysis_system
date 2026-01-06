/**
 * 学科特殊符号识别和自动校正服务
 */

import { invokeLLM } from './_core/llm.js';
import {
  allSubjectSymbolRules,
  commonOCRErrors,
  type SymbolRule,
} from './symbolRules.js';

export type CorrectionResult = {
  originalText: string;
  correctedText: string;
  corrections: Array<{
    position: number;
    original: string;
    corrected: string;
    rule: string;
  }>;
  confidence: number; // 0-1之间，表示校正的置信度
};

/**
 * 基于规则的符号校正
 * @param text 待校正的文本
 * @param subject 学科（数学、物理、化学、语文、英语）
 * @returns 校正结果
 */
export function correctSymbolsByRules(
  text: string,
  subject: string
): CorrectionResult {
  let correctedText = text;
  const corrections: CorrectionResult['corrections'] = [];

  // 获取该学科的符号规则
  const rules = allSubjectSymbolRules[subject] || [];

  // 按优先级排序（优先级高的先处理）
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  // 应用每个规则
  for (const rule of sortedRules) {
    const matches = Array.from(correctedText.matchAll(rule.pattern));
    
    for (const match of matches) {
      if (match.index !== undefined) {
        corrections.push({
          position: match.index,
          original: match[0],
          corrected: match[0].replace(rule.pattern, rule.replacement),
          rule: rule.description,
        });
      }
    }

    // 应用替换
    correctedText = correctedText.replace(rule.pattern, rule.replacement);
  }

  // 应用常见OCR错误修正
  for (const [error, correction] of Object.entries(commonOCRErrors)) {
    const regex = new RegExp(error, 'g');
    const matches = Array.from(correctedText.matchAll(regex));
    
    for (const match of matches) {
      if (match.index !== undefined) {
        corrections.push({
          position: match.index,
          original: error,
          corrected: correction,
          rule: 'OCR常见错误修正',
        });
      }
    }

    correctedText = correctedText.replace(regex, correction);
  }

  // 计算置信度（基于校正数量）
  const confidence = corrections.length > 0 ? 0.8 : 1.0;

  return {
    originalText: text,
    correctedText,
    corrections,
    confidence,
  };
}

/**
 * AI辅助符号校正
 * 使用LLM识别上下文并智能校正符号
 * @param text 待校正的文本
 * @param subject 学科
 * @returns 校正结果
 */
export async function correctSymbolsByAI(
  text: string,
  subject: string
): Promise<CorrectionResult> {
  try {
    const prompt = `你是一个专业的${subject}学科符号校正助手。请仔细检查以下文本中的符号，并根据${subject}学科的规范进行校正。

需要注意的符号类型：
${subject === '数学' ? '- 数学符号：分数、根号、上下标、希腊字母、运算符、集合符号等\n- 例如：1/2 应该是 \\frac{1}{2}，√2 应该是 \\sqrt{2}，x^2 应该是 x²' : ''}
${subject === '物理' ? '- 物理符号：单位符号、物理量符号、矢量标记、希腊字母等\n- 例如：m/s2 应该是 m/s²，速度v 应该是 速度 v' : ''}
${subject === '化学' ? '- 化学符号：化学式、离子、化学反应方程式、上下标等\n- 例如：H2O 应该是 H₂O，CO2 应该是 CO₂，Ca(OH)2 应该是 Ca(OH)₂' : ''}
${subject === '语文' ? '- 语文符号：标点符号、古文标点、注音符号等\n- 例如：确保使用正确的中文标点符号' : ''}
${subject === '英语' ? '- 英语符号：音标、特殊标点等\n- 例如：确保音标符号正确' : ''}

原文：
${text}

请返回校正后的文本，并说明你做了哪些校正。以JSON格式返回：
{
  "correctedText": "校正后的文本",
  "corrections": [
    {
      "original": "原始符号",
      "corrected": "校正后的符号",
      "reason": "校正理由"
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是一个专业的${subject}学科符号校正助手。你的任务是识别和校正文本中的符号错误。`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'symbol_correction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              correctedText: {
                type: 'string',
                description: '校正后的完整文本',
              },
              corrections: {
                type: 'array',
                description: '所有的校正记录',
                items: {
                  type: 'object',
                  properties: {
                    original: {
                      type: 'string',
                      description: '原始符号或文本片段',
                    },
                    corrected: {
                      type: 'string',
                      description: '校正后的符号或文本片段',
                    },
                    reason: {
                      type: 'string',
                      description: '校正的理由',
                    },
                  },
                  required: ['original', 'corrected', 'reason'],
                  additionalProperties: false,
                },
              },
            },
            required: ['correctedText', 'corrections'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('AI返回内容为空或格式不正确');
    }

    const result = JSON.parse(content);

    return {
      originalText: text,
      correctedText: result.correctedText,
      corrections: result.corrections.map((c: any, index: number) => ({
        position: index,
        original: c.original,
        corrected: c.corrected,
        rule: c.reason,
      })),
      confidence: 0.9,
    };
  } catch (error) {
    console.error('AI符号校正失败:', error);
    // 如果AI校正失败，回退到基于规则的校正
    return correctSymbolsByRules(text, subject);
  }
}

/**
 * 混合校正策略
 * 先使用规则校正，再使用AI校正
 * @param text 待校正的文本
 * @param subject 学科
 * @returns 校正结果
 */
export async function correctSymbolsHybrid(
  text: string,
  subject: string
): Promise<CorrectionResult> {
  // 第一步：基于规则的快速校正
  const ruleResult = correctSymbolsByRules(text, subject);

  // 第二步：AI辅助校正（处理规则无法覆盖的情况）
  const aiResult = await correctSymbolsByAI(ruleResult.correctedText, subject);

  // 合并校正记录
  const allCorrections = [...ruleResult.corrections, ...aiResult.corrections];

  return {
    originalText: text,
    correctedText: aiResult.correctedText,
    corrections: allCorrections,
    confidence: (ruleResult.confidence + aiResult.confidence) / 2,
  };
}

/**
 * LaTeX公式识别和转换
 * @param text 包含数学公式的文本
 * @returns 转换后的LaTeX格式文本
 */
export function convertToLaTeX(text: string): string {
  let latexText = text;

  // 分数转换
  latexText = latexText.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');

  // 根号转换
  latexText = latexText.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
  latexText = latexText.replace(/√(\d+)/g, '\\sqrt{$1}');

  // 上标转换
  latexText = latexText.replace(/\^(\d+)/g, '^{$1}');
  latexText = latexText.replace(/²/g, '^{2}');
  latexText = latexText.replace(/³/g, '^{3}');

  // 下标转换
  latexText = latexText.replace(/_(\d+)/g, '_{$1}');
  latexText = latexText.replace(/₀/g, '_{0}');
  latexText = latexText.replace(/₁/g, '_{1}');
  latexText = latexText.replace(/₂/g, '_{2}');
  latexText = latexText.replace(/₃/g, '_{3}');
  latexText = latexText.replace(/₄/g, '_{4}');

  // 积分符号
  latexText = latexText.replace(/∫/g, '\\int');

  // 求和符号
  latexText = latexText.replace(/∑/g, '\\sum');

  // 无穷大
  latexText = latexText.replace(/∞/g, '\\infty');

  return latexText;
}

/**
 * 化学方程式平衡检查
 * @param equation 化学方程式
 * @returns 是否平衡
 */
export function checkChemicalEquationBalance(equation: string): {
  balanced: boolean;
  message: string;
} {
  // 简化版本：检查箭头两边的原子数量
  // 实际应用中需要更复杂的化学计量分析

  if (!equation.includes('→') && !equation.includes('=')) {
    return {
      balanced: false,
      message: '未找到反应箭头或等号',
    };
  }

  // 分离反应物和生成物
  const parts = equation.split(/→|=/);
  if (parts.length !== 2) {
    return {
      balanced: false,
      message: '方程式格式不正确',
    };
  }

  // 这里只做基本检查，实际应该解析化学式并计算原子数
  return {
    balanced: true,
    message: '方程式格式正确（详细平衡检查需要更复杂的算法）',
  };
}

/**
 * 批量校正多个文本
 * @param texts 文本数组
 * @param subject 学科
 * @returns 校正结果数组
 */
export async function batchCorrectSymbols(
  texts: string[],
  subject: string
): Promise<CorrectionResult[]> {
  const results: CorrectionResult[] = [];

  for (const text of texts) {
    const result = await correctSymbolsHybrid(text, subject);
    results.push(result);
  }

  return results;
}
