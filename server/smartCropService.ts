/**
 * AI智能框选建议服务
 * 使用LLM视觉能力自动识别题目边界
 */

import { invokeLLM } from './_core/llm';

export interface DetectedArea {
  x: number; // 相对位置 0-100%
  y: number;
  width: number;
  height: number;
  label: string; // 区域标签，如"题目1"、"选项A"等
  confidence: number; // 置信度 0-1
}

export interface SmartCropResult {
  areas: DetectedArea[];
  totalQuestions: number;
  questionType?: 'choice' | 'fill' | 'answer' | 'mixed';
  suggestions?: string; // AI的额外建议
}

/**
 * 使用AI分析图片并推荐框选区域
 */
export async function detectQuestionAreas(imageUrl: string): Promise<SmartCropResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是一个专业的试卷分析助手。你的任务是分析试卷图片，识别其中的题目边界和结构。

请仔细观察图片中的：
1. 题目编号（如1.、2.、（1）等）
2. 题目类型（选择题、填空题、解答题等）
3. 题目边界（题目开始和结束的位置）
4. 选项位置（如果是选择题）
5. 答题区域（如果有）

返回JSON格式的分析结果，包含每个题目的位置信息（使用百分比坐标，0-100）。`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请分析这张试卷图片，识别所有题目的位置和边界。返回每个题目的框选区域（使用图片宽高的百分比坐标）。'
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
          name: 'question_detection',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              areas: {
                type: 'array',
                description: '检测到的题目区域列表',
                items: {
                  type: 'object',
                  properties: {
                    x: {
                      type: 'number',
                      description: '区域左上角X坐标（百分比，0-100）'
                    },
                    y: {
                      type: 'number',
                      description: '区域左上角Y坐标（百分比，0-100）'
                    },
                    width: {
                      type: 'number',
                      description: '区域宽度（百分比，0-100）'
                    },
                    height: {
                      type: 'number',
                      description: '区域高度（百分比，0-100）'
                    },
                    label: {
                      type: 'string',
                      description: '区域标签，如"题目1"、"选项A"等'
                    },
                    confidence: {
                      type: 'number',
                      description: '置信度（0-1）'
                    }
                  },
                  required: ['x', 'y', 'width', 'height', 'label', 'confidence'],
                  additionalProperties: false
                }
              },
              totalQuestions: {
                type: 'number',
                description: '检测到的题目总数'
              },
              questionType: {
                type: 'string',
                description: '主要题型：choice（选择题）、fill（填空题）、answer（解答题）、mixed（混合）',
                enum: ['choice', 'fill', 'answer', 'mixed']
              },
              suggestions: {
                type: 'string',
                description: 'AI的额外建议，如题目布局特点、框选注意事项等'
              }
            },
            required: ['areas', 'totalQuestions'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI返回内容为空');
    }

    // @ts-ignore
    const result: SmartCropResult = JSON.parse(content);

    // 验证和过滤结果
    result.areas = result.areas.filter(area => {
      // 过滤掉明显不合理的区域
      return (
        area.x >= 0 && area.x <= 100 &&
        area.y >= 0 && area.y <= 100 &&
        area.width > 0 && area.width <= 100 &&
        area.height > 0 && area.height <= 100 &&
        area.confidence >= 0.3 // 只保留置信度大于0.3的区域
      );
    });

    return result;
  } catch (error) {
    console.error('AI智能框选失败:', error);
    throw new Error('AI智能框选失败，请稍后重试');
  }
}

/**
 * 优化框选区域（合并重叠区域、调整边界等）
 */
export function optimizeCropAreas(areas: DetectedArea[]): DetectedArea[] {
  // 按Y坐标排序
  const sorted = [...areas].sort((a, b) => a.y - b.y);

  // 合并高度重叠的区域（可能是同一题的不同部分）
  const merged: DetectedArea[] = [];
  let current: DetectedArea | null = null;

  for (const area of sorted) {
    if (!current) {
      current = { ...area };
      continue;
    }

    // 检查是否重叠
    const currentBottom = current.y + current.height;
    const areaBottom = area.y + area.height;
    const overlap = Math.min(currentBottom, areaBottom) - Math.max(current.y, area.y);
    const overlapRatio = overlap / Math.min(current.height, area.height);

    if (overlapRatio > 0.5) {
      // 合并区域
      const newY = Math.min(current.y, area.y);
      const newBottom = Math.max(currentBottom, areaBottom);
      const newX = Math.min(current.x, area.x);
      const newRight = Math.max(current.x + current.width, area.x + area.width);

      current = {
        x: newX,
        y: newY,
        width: newRight - newX,
        height: newBottom - newY,
        label: current.label,
        confidence: Math.max(current.confidence, area.confidence)
      };
    } else {
      merged.push(current);
      current = { ...area };
    }
  }

  if (current) {
    merged.push(current);
  }

  return merged;
}

/**
 * 根据题型推荐最佳框选策略
 */
export function recommendCropStrategy(questionType: string): string {
  switch (questionType) {
    case 'choice':
      return '建议：选择题建议分别框选题目和选项区域，以便更准确地识别每个选项的内容。';
    case 'fill':
      return '建议：填空题建议框选完整的题目区域，包括题干和填空位置。';
    case 'answer':
      return '建议：解答题建议框选完整的题目和答题区域，确保包含所有手写内容。';
    case 'mixed':
      return '建议：混合题型建议根据每道题的实际情况分别框选，可以使用模板快速框选常见题型。';
    default:
      return '建议：根据题目类型选择合适的框选方式，确保框选区域完整且清晰。';
  }
}
