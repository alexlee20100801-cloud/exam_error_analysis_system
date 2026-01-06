import { invokeLLM } from "./_core/llm";
import { correctSymbolsHybrid } from './symbolCorrectionService.js';

/**
 * 增强OCR识别服务 - 支持图表、图片的高精度识别和还原
 */

export interface ImageElement {
  type: 'chart' | 'diagram' | 'photo' | 'formula_image';
  description: string;
  position: string; // 在题目中的位置描述
  url?: string; // 原始图片URL
}

export interface EnhancedOCRResult {
  success: boolean;
  content: string; // 纯文字内容
  correctedContent?: string; // 符号校正后的内容
  imageElements?: ImageElement[]; // 识别出的图表、图片元素
  tables?: Array<{
    content: string; // 表格的markdown格式
    position: string;
  }>;
  symbolCorrections?: Array<{
    original: string;
    corrected: string;
    rule: string;
  }>;
  error?: string;
}

/**
 * 增强OCR识别 - 识别文字、公式、图表、表格、图片
 * @param imageUrl 图片的公开访问URL
 * @param subject 学科（用于符号校正）
 * @returns 增强OCR识别结果
 */
export async function extractContentEnhanced(
  imageUrl: string,
  subject?: string
): Promise<EnhancedOCRResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的OCR识别助手，擅长识别学习材料中的各种内容类型。

请按照以下要求识别图片内容：
1. **文字内容**：准确识别所有文字，保持原有格式
2. **数学公式**：使用LaTeX格式（行内公式用$...$，独立公式用$$...$$）
3. **化学式**：使用LaTeX化学格式（\\ce{...}）
4. **表格**：使用markdown表格格式
5. **图表**：识别图表类型（柱状图、折线图、饼图、函数图像等），描述图表内容和数据
6. **图片/照片**：描述图片内容和在题目中的作用
7. **几何图形**：详细描述图形特征、标注、尺寸

请以JSON格式返回结果。`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请识别这张图片中的所有内容，包括文字、公式、图表、表格、图片等。

返回JSON格式：
{
  "text": "纯文字内容（包含LaTeX公式）",
  "imageElements": [
    {
      "type": "chart|diagram|photo|formula_image",
      "description": "详细描述",
      "position": "在题目中的位置"
    }
  ],
  "tables": [
    {
      "content": "markdown格式的表格",
      "position": "表格位置"
    }
  ]
}`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "enhanced_ocr_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              text: { 
                type: "string",
                description: "识别的纯文字内容，包含LaTeX格式的公式"
              },
              imageElements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { 
                      type: "string",
                      enum: ["chart", "diagram", "photo", "formula_image"]
                    },
                    description: { type: "string" },
                    position: { type: "string" }
                  },
                  required: ["type", "description", "position"],
                  additionalProperties: false
                }
              },
              tables: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    content: { type: "string" },
                    position: { type: "string" }
                  },
                  required: ["content", "position"],
                  additionalProperties: false
                }
              }
            },
            required: ["text", "imageElements", "tables"],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent || typeof messageContent !== 'string') {
      return {
        success: false,
        content: "",
        error: "LLM返回内容为空"
      };
    }

    const parsed = JSON.parse(messageContent);
    
    if (!parsed.text || !parsed.text.trim()) {
      return {
        success: false,
        content: "",
        error: "未能识别出图片中的文字内容"
      };
    }

    // 如果提供了学科，进行符号校正
    let correctedContent = parsed.text.trim();
    let symbolCorrections: Array<{ original: string; corrected: string; rule: string }> = [];
    
    if (subject) {
      try {
        const correctionResult = await correctSymbolsHybrid(parsed.text.trim(), subject);
        correctedContent = correctionResult.correctedText;
        symbolCorrections = correctionResult.corrections.map(c => ({
          original: c.original,
          corrected: c.corrected,
          rule: c.rule,
        }));
      } catch (error) {
        console.error('[EnhancedOCR] 符号校正失败:', error);
        // 符号校正失败不影响整体结果
      }
    }

    // 将图片元素添加原始URL
    const imageElements: ImageElement[] = (parsed.imageElements || []).map((elem: any) => ({
      ...elem,
      url: imageUrl
    }));

    return {
      success: true,
      content: parsed.text.trim(),
      correctedContent,
      imageElements,
      tables: parsed.tables || [],
      symbolCorrections: symbolCorrections.length > 0 ? symbolCorrections : undefined
    };
  } catch (error) {
    console.error("[EnhancedOCR] 识别失败:", error);
    return {
      success: false,
      content: "",
      error: error instanceof Error ? error.message : "增强OCR识别服务异常"
    };
  }
}

/**
 * 批量增强OCR识别
 * @param imageUrls 图片URL数组
 * @param subject 学科
 * @returns 增强OCR识别结果数组
 */
export async function extractContentsEnhanced(
  imageUrls: string[],
  subject?: string
): Promise<EnhancedOCRResult[]> {
  const results: EnhancedOCRResult[] = [];
  
  for (const imageUrl of imageUrls) {
    const result = await extractContentEnhanced(imageUrl, subject);
    results.push(result);
  }
  
  return results;
}

/**
 * 智能合并多张图片的增强OCR结果
 * @param imageUrls 图片URL数组
 * @param subject 学科
 * @returns 合并后的增强OCR结果
 */
export async function extractAndMergeContentsEnhanced(
  imageUrls: string[],
  subject?: string
): Promise<EnhancedOCRResult> {
  if (imageUrls.length === 0) {
    return {
      success: false,
      content: "",
      error: "没有提供图片"
    };
  }

  if (imageUrls.length === 1) {
    return await extractContentEnhanced(imageUrls[0], subject);
  }

  // 多张图片的情况，先分别识别
  const results = await extractContentsEnhanced(imageUrls, subject);
  
  // 检查是否有识别失败的
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    return {
      success: false,
      content: "",
      error: `有 ${failedResults.length} 张图片识别失败`
    };
  }

  // 合并所有识别结果
  const mergedContent = results
    .map((r, index) => `### 图片 ${index + 1}\n\n${r.correctedContent || r.content}`)
    .join("\n\n---\n\n");

  // 合并图表元素
  const allImageElements: ImageElement[] = [];
  const allTables: Array<{ content: string; position: string }> = [];
  
  results.forEach((r, index) => {
    if (r.imageElements) {
      allImageElements.push(...r.imageElements.map(elem => ({
        ...elem,
        position: `图片${index + 1} - ${elem.position}`
      })));
    }
    if (r.tables) {
      allTables.push(...r.tables.map(table => ({
        ...table,
        position: `图片${index + 1} - ${table.position}`
      })));
    }
  });

  return {
    success: true,
    content: mergedContent,
    correctedContent: mergedContent,
    imageElements: allImageElements.length > 0 ? allImageElements : undefined,
    tables: allTables.length > 0 ? allTables : undefined
  };
}
