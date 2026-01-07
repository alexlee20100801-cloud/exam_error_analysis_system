import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

/**
 * 翻译服务
 * 支持多语言翻译、拍照翻译、文档翻译等
 */

export interface TranslationResult {
  success: boolean;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  error?: string;
}

export interface ImageTranslationResult extends TranslationResult {
  detectedText: string; // OCR识别的原文
  sceneType?: string; // 场景类型（菜单、商品包装、路牌等）
}

/**
 * 文本翻译
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "auto"
): Promise<TranslationResult> {
  try {
    const languageInstruction =
      sourceLanguage === "auto"
        ? `自动检测源语言并翻译为${targetLanguage}`
        : `从${sourceLanguage}翻译为${targetLanguage}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的翻译专家，擅长多语言翻译。

请提供准确、流畅、符合目标语言习惯的翻译。
保持原文的语气、风格和专业术语。`,
        },
        {
          role: "user",
          content: `请${languageInstruction}：

${text}

请返回翻译结果、源语言、目标语言和置信度。`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "translation_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              translatedText: {
                type: "string",
                description: "翻译后的文本",
              },
              sourceLanguage: {
                type: "string",
                description: "源语言（ISO 639-1代码）",
              },
              targetLanguage: {
                type: "string",
                description: "目标语言（ISO 639-1代码）",
              },
              confidence: {
                type: "number",
                description: "翻译置信度（0-1）",
              },
            },
            required: ["translatedText", "sourceLanguage", "targetLanguage", "confidence"],
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
      originalText: text,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Error translating text:", error);
    return {
      success: false,
      originalText: text,
      translatedText: "",
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 拍照翻译
 * 识别图片中的文字并翻译
 */
export async function translateImage(
  imageUrl: string,
  targetLanguage: string,
  sourceLanguage: string = "auto"
): Promise<ImageTranslationResult> {
  try {
    const languageInstruction =
      sourceLanguage === "auto"
        ? `自动检测源语言并翻译为${targetLanguage}`
        : `从${sourceLanguage}翻译为${targetLanguage}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的图像翻译专家，擅长识别图片中的文字并进行翻译。

常见场景包括：
- 餐厅菜单
- 商品包装
- 路牌指示
- 告示牌
- 书籍封面
- 广告海报

请准确识别文字并提供流畅的翻译。`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请识别这张图片中的文字，并${languageInstruction}。

请返回：
1. 识别出的原文
2. 翻译后的文本
3. 场景类型（menu/package/sign/notice/book/poster/other）
4. 源语言和目标语言
5. 置信度`,
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
          name: "image_translation_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              detectedText: {
                type: "string",
                description: "识别出的原文",
              },
              translatedText: {
                type: "string",
                description: "翻译后的文本",
              },
              sceneType: {
                type: "string",
                enum: ["menu", "package", "sign", "notice", "book", "poster", "other"],
                description: "场景类型",
              },
              sourceLanguage: {
                type: "string",
                description: "源语言（ISO 639-1代码）",
              },
              targetLanguage: {
                type: "string",
                description: "目标语言（ISO 639-1代码）",
              },
              confidence: {
                type: "number",
                description: "翻译置信度（0-1）",
              },
            },
            required: [
              "detectedText",
              "translatedText",
              "sceneType",
              "sourceLanguage",
              "targetLanguage",
              "confidence",
            ],
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
      originalText: result.detectedText,
      translatedText: result.translatedText,
      detectedText: result.detectedText,
      sceneType: result.sceneType,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Error translating image:", error);
    return {
      success: false,
      originalText: "",
      translatedText: "",
      detectedText: "",
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 文档翻译（保留格式）
 * 翻译文档内容但保留原有格式结构
 */
export async function translateDocument(
  content: string,
  targetLanguage: string,
  sourceLanguage: string = "auto",
  preserveFormat: boolean = true
): Promise<TranslationResult> {
  try {
    const formatInstruction = preserveFormat
      ? "请保留原文的格式结构（如标题、段落、列表、表格等）"
      : "可以调整格式以适应目标语言";

    const languageInstruction =
      sourceLanguage === "auto"
        ? `自动检测源语言并翻译为${targetLanguage}`
        : `从${sourceLanguage}翻译为${targetLanguage}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的文档翻译专家，擅长翻译各种类型的文档。

请提供准确、专业的翻译，${formatInstruction}。`,
        },
        {
          role: "user",
          content: `请${languageInstruction}以下文档：

${content}

请返回翻译结果、源语言、目标语言和置信度。`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_translation_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              translatedText: {
                type: "string",
                description: "翻译后的文档内容",
              },
              sourceLanguage: {
                type: "string",
                description: "源语言（ISO 639-1代码）",
              },
              targetLanguage: {
                type: "string",
                description: "目标语言（ISO 639-1代码）",
              },
              confidence: {
                type: "number",
                description: "翻译置信度（0-1）",
              },
            },
            required: ["translatedText", "sourceLanguage", "targetLanguage", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content_result = response.choices[0].message.content;
    if (!content_result || typeof content_result !== "string") {
      throw new Error("Invalid response from LLM");
    }

    const result = JSON.parse(content_result);

    return {
      success: true,
      originalText: content,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Error translating document:", error);
    return {
      success: false,
      originalText: content,
      translatedText: "",
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 批量文本翻译
 */
export async function batchTranslateText(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = "auto"
): Promise<TranslationResult[]> {
  const results = await Promise.all(
    texts.map((text) => translateText(text, targetLanguage, sourceLanguage))
  );
  return results;
}

/**
 * 批量图片翻译
 */
export async function batchTranslateImages(
  imageUrls: string[],
  targetLanguage: string,
  sourceLanguage: string = "auto"
): Promise<ImageTranslationResult[]> {
  const results = await Promise.all(
    imageUrls.map((url) => translateImage(url, targetLanguage, sourceLanguage))
  );
  return results;
}

/**
 * 支持的语言列表
 */
export const SUPPORTED_TRANSLATION_LANGUAGES = [
  { code: "zh-CN", name: "中文（简体）" },
  { code: "zh-TW", name: "中文（繁体）" },
  { code: "en", name: "英语" },
  { code: "ja", name: "日语" },
  { code: "ko", name: "韩语" },
  { code: "es", name: "西班牙语" },
  { code: "fr", name: "法语" },
  { code: "de", name: "德语" },
  { code: "it", name: "意大利语" },
  { code: "pt", name: "葡萄牙语" },
  { code: "ru", name: "俄语" },
  { code: "ar", name: "阿拉伯语" },
  { code: "hi", name: "印地语" },
  { code: "th", name: "泰语" },
  { code: "vi", name: "越南语" },
  { code: "id", name: "印尼语" },
  { code: "ms", name: "马来语" },
  { code: "tr", name: "土耳其语" },
];
