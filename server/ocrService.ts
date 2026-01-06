import { invokeLLM } from "./_core/llm";

/**
 * OCR识别服务 - 使用LLM的视觉能力从图片中提取题目文字
 */

import { correctSymbolsHybrid } from './symbolCorrectionService.js';

export interface OCRResult {
  success: boolean;
  content: string;
  correctedContent?: string; // 符号校正后的内容
  symbolCorrections?: Array<{
    original: string;
    corrected: string;
    rule: string;
  }>;
  error?: string;
}

/**
 * 从图片URL中提取题目文字内容
 * @param imageUrl 图片的公开访问URL
 * @returns OCR识别结果
 */
export async function extractTextFromImage(imageUrl: string): Promise<OCRResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个专业的OCR识别助手。请准确识别图片中的题目内容，包括题干、选项、图表等所有文字信息。保持原有格式和结构，使用markdown格式输出。"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请识别这张图片中的题目内容，包括题干、选项、公式、图表说明等所有文字。请保持原有格式，使用markdown格式输出。"
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
      ]
    });

    const messageContent = response.choices[0]?.message?.content;
    const extractedText = typeof messageContent === 'string' ? messageContent : "";
    
    if (!extractedText.trim()) {
      return {
        success: false,
        content: "",
        error: "未能识别出图片中的文字内容"
      };
    }

    return {
      success: true,
      content: extractedText.trim(),
      correctedContent: extractedText.trim() // 默认与原内容相同，需要调用correctWithSymbols才会校正
    };
  } catch (error) {
    console.error("[OCR] 识别失败:", error);
    return {
      success: false,
      content: "",
      error: error instanceof Error ? error.message : "OCR识别服务异常"
    };
  }
}

/**
 * 批量OCR识别多张图片
 * @param imageUrls 图片URL数组
 * @returns OCR识别结果数组
 */
export async function extractTextFromImages(imageUrls: string[]): Promise<OCRResult[]> {
  const results: OCRResult[] = [];
  
  for (const imageUrl of imageUrls) {
    const result = await extractTextFromImage(imageUrl);
    results.push(result);
  }
  
  return results;
}

/**
 * 智能合并多张图片的OCR结果
 * @param imageUrls 图片URL数组（通常是同一题目的多张图片）
 * @returns 合并后的文字内容
 */
export async function extractAndMergeTextFromImages(imageUrls: string[]): Promise<OCRResult> {
  if (imageUrls.length === 0) {
    return {
      success: false,
      content: "",
      error: "没有提供图片"
    };
  }

  if (imageUrls.length === 1) {
    return await extractTextFromImage(imageUrls[0]);
  }

  // 多张图片的情况，先分别识别
  const results = await extractTextFromImages(imageUrls);
  
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
    .map((r, index) => `### 图片 ${index + 1}\n\n${r.content}`)
    .join("\n\n---\n\n");

  return {
    success: true,
    content: mergedContent
  };
}

/**
 * OCR识别并自动校正符号
 * @param imageUrl 图片的公开访问URL
 * @param subject 学科（数学、物理、化学、语文、英语）
 * @returns OCR识别和符号校正结果
 */
export async function extractTextWithSymbolCorrection(
  imageUrl: string,
  subject: string
): Promise<OCRResult> {
  try {
    // 第一步：OCR识别
    const ocrResult = await extractTextFromImage(imageUrl);
    
    if (!ocrResult.success || !ocrResult.content) {
      return ocrResult;
    }

    // 第二步：符号校正
    const correctionResult = await correctSymbolsHybrid(
      ocrResult.content,
      subject
    );

    return {
      success: true,
      content: ocrResult.content,
      correctedContent: correctionResult.correctedText,
      symbolCorrections: correctionResult.corrections.map(c => ({
        original: c.original,
        corrected: c.corrected,
        rule: c.rule,
      })),
    };
  } catch (error) {
    console.error('[OCR] 识别或符号校正失败:', error);
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'OCR识别服务异常',
    };
  }
}

/**
 * 批量OCR识别并校正符号
 * @param imageUrls 图片URL数组
 * @param subject 学科
 * @returns OCR识别和符号校正结果数组
 */
export async function extractTextsWithSymbolCorrection(
  imageUrls: string[],
  subject: string
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];

  for (const imageUrl of imageUrls) {
    const result = await extractTextWithSymbolCorrection(imageUrl, subject);
    results.push(result);
  }

  return results;
}
