import { TRPCError } from "@trpc/server";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { invokeLLM } from "./_core/llm";

/**
 * 证件处理服务
 * 支持身份证、驾驶证、护照等证件的识别和处理
 */

export interface CertificateInfo {
  type: "id_card" | "driver_license" | "passport" | "other";
  side?: "front" | "back"; // 正面或反面
  fields: Record<string, string>; // 证件字段（如姓名、证件号等）
  confidence: number;
}

export interface CertificateMergeResult {
  mergedImage: Buffer;
  layout: "horizontal" | "vertical";
  width: number;
  height: number;
}

/**
 * 识别证件类型和信息
 */
export async function recognizeCertificate(imageUrl: string): Promise<CertificateInfo> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一个专业的证件识别专家，擅长识别各种证件类型和提取证件信息。

支持的证件类型：
1. 身份证（front/back）
2. 驾驶证（front/back）
3. 护照
4. 其他证件

请准确识别证件类型、正反面，并提取所有可见的字段信息。`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请识别这张证件图片。

请返回：
1. 证件类型（id_card/driver_license/passport/other）
2. 正反面（front/back，如果适用）
3. 提取的字段信息（如姓名、证件号、地址等）
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
          name: "certificate_recognition_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["id_card", "driver_license", "passport", "other"],
                description: "证件类型",
              },
              side: {
                type: "string",
                enum: ["front", "back"],
                description: "正面或反面",
              },
              fields: {
                type: "object",
                description: "提取的字段信息",
                additionalProperties: {
                  type: "string",
                },
              },
              confidence: {
                type: "number",
                description: "识别置信度（0-1）",
              },
            },
            required: ["type", "fields", "confidence"],
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
      type: result.type,
      side: result.side,
      fields: result.fields,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Error recognizing certificate:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to recognize certificate",
    });
  }
}

/**
 * 自动拼接证件正反面
 * 支持横向和纵向拼接
 */
export async function mergeCertificateImages(
  frontBuffer: Buffer,
  backBuffer: Buffer,
  layout: "horizontal" | "vertical" = "horizontal"
): Promise<CertificateMergeResult> {
  try {
    const frontImage = sharp(frontBuffer);
    const backImage = sharp(backBuffer);

    const frontMetadata = await frontImage.metadata();
    const backMetadata = await backImage.metadata();

    if (!frontMetadata.width || !frontMetadata.height || !backMetadata.width || !backMetadata.height) {
      throw new Error("Invalid image metadata");
    }

    // 调整图片大小使其一致
    const targetWidth = Math.max(frontMetadata.width, backMetadata.width);
    const targetHeight = Math.max(frontMetadata.height, backMetadata.height);

    const resizedFront = await frontImage
      .resize(targetWidth, targetHeight, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();

    const resizedBack = await backImage
      .resize(targetWidth, targetHeight, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();

    let mergedImage: Buffer;
    let width: number;
    let height: number;

    if (layout === "horizontal") {
      // 横向拼接
      width = targetWidth * 2;
      height = targetHeight;

      mergedImage = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite([
          { input: resizedFront, left: 0, top: 0 },
          { input: resizedBack, left: targetWidth, top: 0 },
        ])
        .jpeg({ quality: 95 })
        .toBuffer();
    } else {
      // 纵向拼接
      width = targetWidth;
      height = targetHeight * 2;

      mergedImage = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite([
          { input: resizedFront, left: 0, top: 0 },
          { input: resizedBack, left: 0, top: targetHeight },
        ])
        .jpeg({ quality: 95 })
        .toBuffer();
    }

    return {
      mergedImage,
      layout,
      width,
      height,
    };
  } catch (error) {
    console.error("Error merging certificate images:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to merge certificate images",
    });
  }
}

/**
 * 证件A4排版导出
 * 将证件图片排版到A4纸上
 */
export async function layoutCertificateOnA4(
  certificateBuffer: Buffer,
  options: {
    copies?: number; // 打印份数（在一页上重复）
    includeMargin?: boolean;
  } = {}
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();

    // A4尺寸（单位：点，1英寸=72点）
    const A4_WIDTH = 595;
    const A4_HEIGHT = 842;
    const MARGIN = options.includeMargin !== false ? 50 : 0;

    const copies = options.copies || 1;

    // 获取证件图片尺寸
    const image = sharp(certificateBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image metadata");
    }

    // 将图片转换为JPEG
    const jpegBuffer = await image.jpeg({ quality: 95 }).toBuffer();
    const pdfImage = await pdfDoc.embedJpg(jpegBuffer);

    // 计算证件在A4纸上的尺寸
    const availableWidth = A4_WIDTH - 2 * MARGIN;
    const availableHeight = A4_HEIGHT - 2 * MARGIN;

    const imageAspectRatio = pdfImage.width / pdfImage.height;
    const availableAspectRatio = availableWidth / availableHeight;

    let imageWidth, imageHeight;

    if (imageAspectRatio > availableAspectRatio) {
      // 图片更宽，按宽度缩放
      imageWidth = availableWidth;
      imageHeight = availableWidth / imageAspectRatio;
    } else {
      // 图片更高，按高度缩放
      imageHeight = availableHeight;
      imageWidth = availableHeight * imageAspectRatio;
    }

    // 如果需要多份，计算布局
    if (copies > 1) {
      // 简单实现：纵向排列
      const singleHeight = imageHeight;
      const totalHeight = singleHeight * copies + MARGIN * (copies - 1);

      if (totalHeight <= availableHeight) {
        // 可以在一页上放下所有份数
        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

        for (let i = 0; i < copies; i++) {
          const y = A4_HEIGHT - MARGIN - (i + 1) * singleHeight - i * MARGIN;
          const x = MARGIN + (availableWidth - imageWidth) / 2;

          page.drawImage(pdfImage, {
            x,
            y,
            width: imageWidth,
            height: imageHeight,
          });
        }
      } else {
        // 需要多页
        for (let i = 0; i < copies; i++) {
          const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
          const x = MARGIN + (availableWidth - imageWidth) / 2;
          const y = MARGIN + (availableHeight - imageHeight) / 2;

          page.drawImage(pdfImage, {
            x,
            y,
            width: imageWidth,
            height: imageHeight,
          });
        }
      }
    } else {
      // 单份，居中放置
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      const x = MARGIN + (availableWidth - imageWidth) / 2;
      const y = MARGIN + (availableHeight - imageHeight) / 2;

      page.drawImage(pdfImage, {
        x,
        y,
        width: imageWidth,
        height: imageHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error laying out certificate on A4:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to layout certificate on A4",
    });
  }
}

/**
 * 批量证件识别
 */
export async function batchRecognizeCertificates(
  imageUrls: string[]
): Promise<CertificateInfo[]> {
  const results = await Promise.all(imageUrls.map((url: any) => recognizeCertificate(url)));
  return results;
}

/**
 * 智能证件处理
 * 自动检测证件正反面并拼接
 */
export async function smartProcessCertificate(
  imageUrls: string[]
): Promise<{
  certificates: Array<{
    type: string;
    frontUrl: string;
    backUrl?: string;
    mergedBuffer?: Buffer;
    info: CertificateInfo;
  }>;
}> {
  try {
    // 识别所有图片
    const recognitionResults = await Promise.all(
      imageUrls.map(async (url, index) => ({
        url,
        index,
        info: await recognizeCertificate(url),
      }))
    );

    // 按证件类型分组
    const groupedByType: Record<string, typeof recognitionResults> = {};

    for (const result of recognitionResults) {
      const key = result.info.type;
      if (!groupedByType[key]) {
        groupedByType[key] = [];
      }
      groupedByType[key].push(result);
    }

    // 处理每组证件
    const certificates: Array<{
      type: string;
      frontUrl: string;
      backUrl?: string;
      mergedBuffer?: Buffer;
      info: CertificateInfo;
    }> = [];

    for (const [type, group] of Object.entries(groupedByType)) {
      // 查找正反面
      const front = group.find((item) => item.info.side === "front");
      const back = group.find((item) => item.info.side === "back");

      if (front && back) {
        // 有正反面，进行拼接
        // 注意：这里需要下载图片，简化实现暂时跳过
        certificates.push({
          type,
          frontUrl: front.url,
          backUrl: back.url,
          info: front.info,
        });
      } else if (front) {
        // 只有正面
        certificates.push({
          type,
          frontUrl: front.url,
          info: front.info,
        });
      } else if (group.length > 0) {
        // 没有明确的正反面标识，使用第一张
        certificates.push({
          type,
          frontUrl: group[0].url,
          info: group[0].info,
        });
      }
    }

    return { certificates };
  } catch (error) {
    console.error("Error in smart certificate processing:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to process certificates",
    });
  }
}
