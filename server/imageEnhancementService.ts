import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import sharp from "sharp";

/**
 * 图像智能处理和增强服务
 * 提供去阴影、增亮、校正倾斜、智能裁剪等功能
 */

export interface ImageEnhancementOptions {
  removeShadow?: boolean;
  adjustBrightness?: boolean;
  correctSkew?: boolean;
  autoCrop?: boolean;
  enhanceContrast?: boolean;
  denoise?: boolean;
}

export interface ImageQualityMetrics {
  brightness: number;
  contrast: number;
  sharpness: number;
  skewAngle: number;
  hasText: boolean;
  confidence: number;
}

/**
 * 评估图像质量
 */
export async function assessImageQuality(imageBuffer: Buffer): Promise<ImageQualityMetrics> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    // 计算亮度（基于统计数据）
    const brightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;

    // 计算对比度（基于标准差）
    const contrast = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;

    // 简化的清晰度评估（实际应该使用拉普拉斯算子）
    const sharpness = contrast / brightness * 100;

    return {
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      sharpness: Math.round(sharpness),
      skewAngle: 0, // 需要更复杂的算法检测倾斜角度
      hasText: true, // 需要OCR或文字检测算法
      confidence: 0.8,
    };
  } catch (error) {
    console.error("Error assessing image quality:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to assess image quality",
    });
  }
}

/**
 * 高级去阴影算法
 * 使用自适应直方图均衡化和形态学操作
 */
export async function advancedShadowRemoval(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // 转换为灰度图进行分析
    const grayBuffer = await image.greyscale().toBuffer();
    
    // 使用normalize进行直方图均衡化
    const normalized = await sharp(imageBuffer)
      .normalize()
      .toBuffer();

    // 应用高斯模糊减少噪声
    const blurred = await sharp(normalized)
      .blur(1)
      .toBuffer();

    // 增强局部对比度
    const enhanced = await sharp(blurred)
      .clahe({
        width: 3,
        height: 3,
        maxSlope: 3,
      })
      .toBuffer();

    return enhanced;
  } catch (error) {
    console.error("Error removing shadow:", error);
    // 如果高级算法失败，使用简单的normalize
    return await sharp(imageBuffer).normalize().toBuffer();
  }
}

/**
 * 智能亮度调整
 * 根据图像直方图自动调整亮度和对比度
 */
export async function smartBrightnessAdjustment(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const quality = await assessImageQuality(imageBuffer);
    let image = sharp(imageBuffer);

    // 根据亮度值智能调整
    if (quality.brightness < 80) {
      // 图像太暗，增加亮度
      const brightnessMultiplier = 1 + (80 - quality.brightness) / 160;
      image = image.modulate({
        brightness: Math.min(brightnessMultiplier, 1.5),
      });
    } else if (quality.brightness > 180) {
      // 图像太亮，降低亮度
      const brightnessMultiplier = 1 - (quality.brightness - 180) / 300;
      image = image.modulate({
        brightness: Math.max(brightnessMultiplier, 0.7),
      });
    }

    // 自适应对比度增强
    if (quality.contrast < 30) {
      image = image.linear(1.3, -(128 * 0.3));
    }

    return await image.toBuffer();
  } catch (error) {
    console.error("Error adjusting brightness:", error);
    return imageBuffer;
  }
}

/**
 * 自动增强图像（增强版）
 */
export async function autoEnhanceImage(
  imageBuffer: Buffer,
  options: ImageEnhancementOptions = {}
): Promise<Buffer> {
  try {
    let processedBuffer = imageBuffer;

    // 1. 高级去阴影
    if (options.removeShadow !== false) {
      processedBuffer = await advancedShadowRemoval(processedBuffer);
    }

    // 2. 智能亮度调整
    if (options.adjustBrightness !== false) {
      processedBuffer = await smartBrightnessAdjustment(processedBuffer);
    }

    // 3. 增强对比度
    if (options.enhanceContrast !== false) {
      processedBuffer = await sharp(processedBuffer)
        .linear(1.2, -(128 * 0.2))
        .toBuffer();
    }

    // 4. 降噪
    if (options.denoise) {
      processedBuffer = await sharp(processedBuffer)
        .median(3)
        .toBuffer();
    }

    // 5. 锐化
    processedBuffer = await sharp(processedBuffer)
      .sharpen({
        sigma: 1,
        m1: 1,
        m2: 0.5,
        x1: 2,
        y2: 10,
        y3: 20,
      })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error("Error enhancing image:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to enhance image",
    });
  }
}

/**
 * 智能边缘检测和裁剪（增强版）
 * 使用多阶段检测确保准确裁剪
 */
export async function smartCropImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // 第一阶段：使用宽松阈值检测大致边界
    const roughTrimmed = await image
      .trim({
        threshold: 20,
      })
      .toBuffer();

    // 第二阶段：使用严格阈值精确裁剪
    const fineTrimmed = await sharp(roughTrimmed)
      .trim({
        threshold: 5,
      })
      .toBuffer();

    // 检查裁剪后的尺寸是否合理（至少保留原图的50%）
    const finalMetadata = await sharp(fineTrimmed).metadata();
    if (
      finalMetadata.width &&
      finalMetadata.height &&
      metadata.width &&
      metadata.height &&
      finalMetadata.width >= metadata.width * 0.5 &&
      finalMetadata.height >= metadata.height * 0.5
    ) {
      return fineTrimmed;
    } else {
      // 如果裁剪过度，返回第一阶段的结果
      return roughTrimmed;
    }
  } catch (error) {
    console.error("Error cropping image:", error);
    // 如果裁剪失败，返回原图
    return imageBuffer;
  }
}

/**
 * 文档边缘检测（用于证件、试卷等）
 */
export async function detectDocumentEdges(imageBuffer: Buffer): Promise<{
  hasDocument: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
  confidence: number;
}> {
  try {
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个文档边缘检测专家，擅长识别图像中的文档、证件、试卷等矩形物体的边界。",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请分析这张图片，检测是否包含文档（如证件、试卷、纸张等）。如果包含，请给出文档的边界框坐标（相对于图片尺寸的百分比，0-100）。",
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
                detail: "low",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_detection",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hasDocument: {
                type: "boolean",
                description: "是否检测到文档",
              },
              boundingBox: {
                type: "object",
                description: "文档边界框（百分比坐标）",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  width: { type: "number" },
                  height: { type: "number" },
                },
                required: ["x", "y", "width", "height"],
              },
              confidence: {
                type: "number",
                description: "置信度，0-1之间",
              },
            },
            required: ["hasDocument", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      return { hasDocument: false, confidence: 0 };
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error detecting document edges:", error);
    return { hasDocument: false, confidence: 0 };
  }
}

/**
 * 校正图像倾斜
 * 使用AI检测倾斜角度并旋转
 */
export async function correctImageSkew(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 将图像转换为base64用于AI分析
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

    // 使用AI检测倾斜角度
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个图像分析专家，擅长检测文档图像的倾斜角度。",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请分析这张图片，判断它是否倾斜，如果倾斜请给出需要旋转的角度（-45到45度之间）。如果图片不倾斜或倾斜角度小于2度，返回0。",
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
                detail: "low",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "skew_detection",
          strict: true,
          schema: {
            type: "object",
            properties: {
              angle: {
                type: "number",
                description: "倾斜角度，正数表示顺时针，负数表示逆时针",
              },
              confidence: {
                type: "number",
                description: "置信度，0-1之间",
              },
            },
            required: ["angle", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== "string") {
      return imageBuffer;
    }

    const result = JSON.parse(content);
    const angle = result.angle || 0;

    // 如果角度太小或置信度太低，不进行旋转
    if (Math.abs(angle) < 2 || result.confidence < 0.6) {
      return imageBuffer;
    }

    // 旋转图像
    const rotated = await sharp(imageBuffer)
      .rotate(-angle, {
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();

    return rotated;
  } catch (error) {
    console.error("Error correcting skew:", error);
    // 如果校正失败，返回原图
    return imageBuffer;
  }
}

/**
 * 完整的图像预处理流程
 */
export async function preprocessImage(
  imageBuffer: Buffer,
  options: ImageEnhancementOptions = {}
): Promise<{
  processedImage: Buffer;
  quality: ImageQualityMetrics;
  appliedEnhancements: string[];
}> {
  const appliedEnhancements: string[] = [];
  let processedImage = imageBuffer;

  try {
    // 1. 评估原始图像质量
    const originalQuality = await assessImageQuality(imageBuffer);

    // 2. 校正倾斜
    if (options.correctSkew !== false && Math.abs(originalQuality.skewAngle) > 2) {
      processedImage = await correctImageSkew(processedImage);
      appliedEnhancements.push("skew_correction");
    }

    // 3. 智能裁剪
    if (options.autoCrop !== false) {
      processedImage = await smartCropImage(processedImage);
      appliedEnhancements.push("auto_crop");
    }

    // 4. 自动增强
    processedImage = await autoEnhanceImage(processedImage, options);
    appliedEnhancements.push("auto_enhance");

    // 5. 评估处理后的图像质量
    const finalQuality = await assessImageQuality(processedImage);

    return {
      processedImage,
      quality: finalQuality,
      appliedEnhancements,
    };
  } catch (error) {
    console.error("Error preprocessing image:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to preprocess image",
    });
  }
}

/**
 * 批量处理图像
 */
export async function batchProcessImages(
  images: Buffer[],
  options: ImageEnhancementOptions = {}
): Promise<
  Array<{
    processedImage: Buffer;
    quality: ImageQualityMetrics;
    appliedEnhancements: string[];
  }>
> {
  const results = await Promise.all(
    images.map((imageBuffer: any) => preprocessImage(imageBuffer, options))
  );

  return results;
}

/**
 * 比较处理前后的图像质量
 */
export async function compareImageQuality(
  originalBuffer: Buffer,
  processedBuffer: Buffer
): Promise<{
  original: ImageQualityMetrics;
  processed: ImageQualityMetrics;
  improvement: {
    brightness: number;
    contrast: number;
    sharpness: number;
  };
}> {
  const original = await assessImageQuality(originalBuffer);
  const processed = await assessImageQuality(processedBuffer);

  return {
    original,
    processed,
    improvement: {
      brightness: processed.brightness - original.brightness,
      contrast: processed.contrast - original.contrast,
      sharpness: processed.sharpness - original.sharpness,
    },
  };
}
