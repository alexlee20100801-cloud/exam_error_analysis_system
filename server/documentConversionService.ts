import { TRPCError } from "@trpc/server";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { storagePut } from "./storage";

/**
 * 文档格式转换服务
 * 支持PDF、Word、Excel、图片等格式的互转
 */

export interface ConversionOptions {
  quality?: number; // 图片质量 (1-100)
  pageSize?: "A4" | "A5" | "Letter";
  orientation?: "portrait" | "landscape";
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * 图片转PDF
 */
export async function imagesToPdf(
  imageBuffers: Buffer[],
  options: ConversionOptions = {}
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();

    // 页面尺寸（单位：点，1英寸=72点）
    const pageSizes = {
      A4: { width: 595, height: 842 },
      A5: { width: 420, height: 595 },
      Letter: { width: 612, height: 792 },
    };

    const pageSize = pageSizes[options.pageSize || "A4"];
    const margin = options.margin || { top: 50, right: 50, bottom: 50, left: 50 };

    for (const imageBuffer of imageBuffers) {
      // 获取图片尺寸
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // 将图片转换为JPEG格式
      const jpegBuffer = await image.jpeg({ quality: options.quality || 90 }).toBuffer();

      // 嵌入图片到PDF
      const pdfImage = await pdfDoc.embedJpg(jpegBuffer);

      // 计算图片在页面中的尺寸（保持宽高比）
      const availableWidth = pageSize.width - margin.left - margin.right;
      const availableHeight = pageSize.height - margin.top - margin.bottom;

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

      // 添加新页面
      const page = pdfDoc.addPage([pageSize.width, pageSize.height]);

      // 居中放置图片
      const x = margin.left + (availableWidth - imageWidth) / 2;
      const y = margin.bottom + (availableHeight - imageHeight) / 2;

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
    console.error("Error converting images to PDF:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to convert images to PDF",
    });
  }
}

/**
 * PDF转图片
 */
export async function pdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    // 注意：这需要使用外部工具如pdf-poppler或pdf2pic
    // 这里提供一个简化的实现框架
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "PDF to images conversion requires external dependencies",
    });
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to convert PDF to images",
    });
  }
}

/**
 * 合并多个PDF
 */
export async function mergePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
  try {
    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
  } catch (error) {
    console.error("Error merging PDFs:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to merge PDFs",
    });
  }
}

/**
 * 拆分PDF
 */
export async function splitPdf(
  pdfBuffer: Buffer,
  pageRanges: Array<{ start: number; end: number }>
): Promise<Buffer[]> {
  try {
    const pdf = await PDFDocument.load(pdfBuffer);
    const results: Buffer[] = [];

    for (const range of pageRanges) {
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(
        pdf,
        Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i - 1)
      );
      pages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      results.push(Buffer.from(pdfBytes));
    }

    return results;
  } catch (error) {
    console.error("Error splitting PDF:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to split PDF",
    });
  }
}

/**
 * 添加水印到PDF
 */
export async function addWatermarkToPdf(
  pdfBuffer: Buffer,
  watermarkText: string,
  options: {
    opacity?: number;
    fontSize?: number;
    rotation?: number;
    color?: { r: number; g: number; b: number };
  } = {}
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    const {
      opacity = 0.3,
      fontSize = 48,
      rotation = -45,
      color = { r: 0.5, g: 0.5, b: 0.5 },
    } = options;

    for (const page of pages) {
      const { width, height } = page.getSize();

      // 在页面中心添加水印
      page.drawText(watermarkText, {
        x: width / 2 - (watermarkText.length * fontSize) / 4,
        y: height / 2,
        size: fontSize,
        color: color,
        opacity: opacity,
        rotate: { angle: rotation, type: 1 },
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error adding watermark to PDF:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to add watermark to PDF",
    });
  }
}

/**
 * 证件图片自动拼接（正反面）
 */
export async function mergeIdCardImages(
  frontBuffer: Buffer,
  backBuffer: Buffer,
  layout: "horizontal" | "vertical" = "horizontal"
): Promise<Buffer> {
  try {
    const front = sharp(frontBuffer);
    const back = sharp(backBuffer);

    const frontMetadata = await front.metadata();
    const backMetadata = await back.metadata();

    // 调整图片大小使其一致
    const targetWidth = Math.max(frontMetadata.width || 0, backMetadata.width || 0);
    const targetHeight = Math.max(frontMetadata.height || 0, backMetadata.height || 0);

    const resizedFront = await front
      .resize(targetWidth, targetHeight, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    const resizedBack = await back
      .resize(targetWidth, targetHeight, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    if (layout === "horizontal") {
      // 水平拼接
      return await sharp({
        create: {
          width: targetWidth * 2 + 20, // 中间留20px间距
          height: targetHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite([
          { input: resizedFront, top: 0, left: 0 },
          { input: resizedBack, top: 0, left: targetWidth + 20 },
        ])
        .jpeg()
        .toBuffer();
    } else {
      // 垂直拼接
      return await sharp({
        create: {
          width: targetWidth,
          height: targetHeight * 2 + 20, // 中间留20px间距
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite([
          { input: resizedFront, top: 0, left: 0 },
          { input: resizedBack, top: targetHeight + 20, left: 0 },
        ])
        .jpeg()
        .toBuffer();
    }
  } catch (error) {
    console.error("Error merging ID card images:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to merge ID card images",
    });
  }
}

/**
 * 证件图片A4排版
 */
export async function layoutIdCardOnA4(
  frontBuffer: Buffer,
  backBuffer: Buffer
): Promise<Buffer> {
  try {
    // A4尺寸：210mm x 297mm，以300 DPI计算为 2480 x 3508 像素
    const a4Width = 2480;
    const a4Height = 3508;

    // 身份证标准尺寸：85.6mm x 54mm，以300 DPI计算为 1012 x 638 像素
    const idCardWidth = 1012;
    const idCardHeight = 638;

    const front = await sharp(frontBuffer)
      .resize(idCardWidth, idCardHeight, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    const back = await sharp(backBuffer)
      .resize(idCardWidth, idCardHeight, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    // 在A4纸上居中排列正反面
    const marginTop = (a4Height - idCardHeight * 2 - 100) / 2;
    const marginLeft = (a4Width - idCardWidth) / 2;

    return await sharp({
      create: {
        width: a4Width,
        height: a4Height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([
        { input: front, top: Math.round(marginTop), left: Math.round(marginLeft) },
        { input: back, top: Math.round(marginTop + idCardHeight + 100), left: Math.round(marginLeft) },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();
  } catch (error) {
    console.error("Error laying out ID card on A4:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to layout ID card on A4",
    });
  }
}
