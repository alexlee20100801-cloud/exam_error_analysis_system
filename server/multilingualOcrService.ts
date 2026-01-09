import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

/**
 * 多语言OCR识别服务
 * 支持41种语言的文字识别
 */

export interface MultilingualOCRResult {
  success: boolean;
  text: string;
  detectedLanguages: string[]; // 检测到的语言列表
  confidence: number; // 识别置信度 0-1
  languageConfidence: Record<string, number>; // 每种语言的置信度
  error?: string;
}

export interface ComplexSceneOCRResult {
  success: boolean;
  content: string;
  sceneType: "table" | "handwriting" | "invoice" | "certificate" | "form" | "mixed";
  structuredData?: any; // 结构化数据（如表格、发票字段等）
  confidence: number;
  error?: string;
}

// 支持的语言列表（41种）
export const SUPPORTED_LANGUAGES = [
  "zh-CN", // 中文（简体）
  "zh-TW", // 中文（繁体）
  "en", // 英语
  "ja", // 日语
  "ko", // 韩语
  "es", // 西班牙语
  "fr", // 法语
  "de", // 德语
  "it", // 意大利语
  "pt", // 葡萄牙语
  "ru", // 俄语
  "ar", // 阿拉伯语
  "hi", // 印地语
  "th", // 泰语
  "vi", // 越南语
  "id", // 印尼语
  "ms", // 马来语
  "tr", // 土耳其语
  "pl", // 波兰语
  "nl", // 荷兰语
  "sv", // 瑞典语
  "da", // 丹麦语
  "fi", // 芬兰语
  "no", // 挪威语
  "cs", // 捷克语
  "hu", // 匈牙利语
  "ro", // 罗马尼亚语
  "bg", // 保加利亚语
  "el", // 希腊语
  "he", // 希伯来语
  "fa", // 波斯语
  "ur", // 乌尔都语
  "bn", // 孟加拉语
  "ta", // 泰米尔语
  "te", // 泰卢固语
  "mr", // 马拉地语
  "gu", // 古吉拉特语
  "kn", // 卡纳达语
  "ml", // 马拉雅拉姆语
  "si", // 僧伽罗语
  "my", // 缅甸语
];

/**
 * 多语言OCR识别
 * @param imageUrl 图片的公开访问URL
 * @param targetLanguages 目标语言列表（可选，为空则自动检测所有语言）
 */
export async function recognizeMultilingualText(
  imageUrl: string,
  targetLanguages?: string[]
): Promise<MultilingualOCRResult> {
  try {
    const languageList = targetLanguages?.length
      ? targetLanguages.join(", ")
      : "自动检测所有支持的语言";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的多语言OCR识别专家，支持识别41种语言的文字内容。

支持的语言包括：中文（简繁体）、英语、日语、韩语、西班牙语、法语、德语、意大利语、葡萄牙语、俄语、阿拉伯语、印地语、泰语、越南语、印尼语、马来语、土耳其语、波兰语、荷兰语、瑞典语、丹麦语、芬兰语、挪威语、捷克语、匈牙利语、罗马尼亚语、保加利亚语、希腊语、希伯来语、波斯语、乌尔都语、孟加拉语、泰米尔语、泰卢固语、马拉地语、古吉拉特语、卡纳达语、马拉雅拉姆语、僧伽罗语、缅甸语等。

请准确识别图片中的所有文字，保持原有格式和排版，并检测使用的语言。`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请识别这张图片中的文字内容。目标语言：${languageList}

请返回：
1. 识别出的完整文字内容
2. 检测到的语言列表
3. 每种语言的识别置信度
4. 整体识别置信度`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "multilingual_ocr_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "识别出的完整文字内容",
              },
              detectedLanguages: {
                type: "array",
                description: "检测到的语言列表（ISO 639-1代码）",
                items: {
                  type: "string",
                },
              },
              languageConfidence: {
                type: "object",
                description: "每种语言的识别置信度（0-1）",
                additionalProperties: {
                  type: "number",
                },
              },
              confidence: {
                type: "number",
                description: "整体识别置信度（0-1）",
              },
            },
            required: ["text", "detectedLanguages", "languageConfidence", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      throw new Error("Invalid response from LLM");
    }

    const result = JSON.parse(content);

    return {
      success: true,
      text: result.text,
      detectedLanguages: result.detectedLanguages,
      confidence: result.confidence,
      languageConfidence: result.languageConfidence,
    };
  } catch (error) {
    console.error("Error in multilingual OCR:", error);
    return {
      success: false,
      text: "",
      detectedLanguages: [],
      confidence: 0,
      languageConfidence: {},
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 复杂场景OCR识别
 * 支持表格、手写体、发票、证件、表单等复杂场景
 */
export async function recognizeComplexScene(
  imageUrl: string,
  sceneType?: "table" | "handwriting" | "invoice" | "certificate" | "form" | "auto"
): Promise<ComplexSceneOCRResult> {
  try {
    const sceneHint = sceneType === "auto" || !sceneType 
      ? "自动检测场景类型" 
      : `场景类型：${sceneType}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的复杂场景OCR识别专家，擅长识别以下场景：

1. **表格**：准确识别表格结构、单元格内容、合并单元格等
2. **手写体**：识别手写文字，包括潦草字迹
3. **发票**：识别发票的各个字段（发票号、日期、金额、税额等）
4. **证件**：识别身份证、驾驶证、护照等证件信息
5. **表单**：识别表单的字段名和填写内容
6. **混合场景**：包含多种类型内容的复杂文档

请准确识别内容并提取结构化数据。`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请识别这张图片中的内容。${sceneHint}

请返回：
1. 场景类型（table/handwriting/invoice/certificate/form/mixed）
2. 识别出的文字内容
3. 结构化数据（如表格数据、发票字段、证件信息等）
4. 识别置信度`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "complex_scene_ocr_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sceneType: {
                type: "string",
                enum: ["table", "handwriting", "invoice", "certificate", "form", "mixed"],
                description: "检测到的场景类型",
              },
              content: {
                type: "string",
                description: "识别出的完整文字内容",
              },
              structuredData: {
                type: "object",
                description: "结构化数据（表格、发票字段、证件信息等）",
                additionalProperties: true,
              },
              confidence: {
                type: "number",
                description: "识别置信度（0-1）",
              },
            },
            required: ["sceneType", "content", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      throw new Error("Invalid response from LLM");
    }

    const result = JSON.parse(content);

    return {
      success: true,
      content: result.content,
      sceneType: result.sceneType,
      structuredData: result.structuredData,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Error in complex scene OCR:", error);
    return {
      success: false,
      content: "",
      sceneType: "mixed",
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 批量多语言OCR识别
 */
export async function batchRecognizeMultilingual(
  imageUrls: string[],
  targetLanguages?: string[]
): Promise<MultilingualOCRResult[]> {
  const results = await Promise.all(
    imageUrls.map((url: any) => recognizeMultilingualText(url, targetLanguages))
  );
  return results;
}

/**
 * 批量复杂场景OCR识别
 */
export async function batchRecognizeComplexScene(
  imageUrls: string[],
  sceneType?: "table" | "handwriting" | "invoice" | "certificate" | "form" | "auto"
): Promise<ComplexSceneOCRResult[]> {
  const results = await Promise.all(
    imageUrls.map((url: any) => recognizeComplexScene(url, sceneType))
  );
  return results;
}

/**
 * 手写体识别专用函数
 * 针对手写体进行优化
 */
export async function recognizeHandwriting(imageUrl: string): Promise<{
  success: boolean;
  text: string;
  confidence: number;
  isLegible: boolean; // 是否清晰可读
  suggestions?: string[]; // 不确定字符的可能选项
  error?: string;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的手写体识别专家，擅长识别各种手写文字，包括潦草字迹。

请尽可能准确地识别手写内容，对于不确定的字符，提供可能的选项。`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请识别这张图片中的手写文字。

请返回：
1. 识别出的文字内容
2. 识别置信度
3. 字迹是否清晰可读
4. 不确定字符的可能选项（如果有）`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "handwriting_recognition_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "识别出的手写文字",
              },
              confidence: {
                type: "number",
                description: "识别置信度（0-1）",
              },
              isLegible: {
                type: "boolean",
                description: "字迹是否清晰可读",
              },
              suggestions: {
                type: "array",
                description: "不确定字符的可能选项",
                items: {
                  type: "string",
                },
              },
            },
            required: ["text", "confidence", "isLegible"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      throw new Error("Invalid response from LLM");
    }

    const result = JSON.parse(content);

    return {
      success: true,
      text: result.text,
      confidence: result.confidence,
      isLegible: result.isLegible,
      suggestions: result.suggestions,
    };
  } catch (error) {
    console.error("Error in handwriting recognition:", error);
    return {
      success: false,
      text: "",
      confidence: 0,
      isLegible: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 表格识别专用函数
 * 提取表格结构和数据
 */
export async function recognizeTable(imageUrl: string): Promise<{
  success: boolean;
  markdown: string; // Markdown格式的表格
  data: string[][]; // 二维数组格式的表格数据
  headers: string[]; // 表头
  rowCount: number;
  columnCount: number;
  confidence: number;
  error?: string;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的表格识别专家，擅长识别各种表格结构和内容。

请准确识别表格的：
1. 表头（如果有）
2. 行数和列数
3. 每个单元格的内容
4. 合并单元格的情况`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请识别这张图片中的表格。

请返回：
1. Markdown格式的表格
2. 二维数组格式的表格数据
3. 表头（如果有）
4. 行数和列数
5. 识别置信度`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "table_recognition_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              markdown: {
                type: "string",
                description: "Markdown格式的表格",
              },
              data: {
                type: "array",
                description: "二维数组格式的表格数据",
                items: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },
              headers: {
                type: "array",
                description: "表头",
                items: {
                  type: "string",
                },
              },
              rowCount: {
                type: "number",
                description: "行数",
              },
              columnCount: {
                type: "number",
                description: "列数",
              },
              confidence: {
                type: "number",
                description: "识别置信度（0-1）",
              },
            },
            required: ["markdown", "data", "headers", "rowCount", "columnCount", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      throw new Error("Invalid response from LLM");
    }

    const result = JSON.parse(content);

    return {
      success: true,
      markdown: result.markdown,
      data: result.data,
      headers: result.headers,
      rowCount: result.rowCount,
      columnCount: result.columnCount,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Error in table recognition:", error);
    return {
      success: false,
      markdown: "",
      data: [],
      headers: [],
      rowCount: 0,
      columnCount: 0,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
