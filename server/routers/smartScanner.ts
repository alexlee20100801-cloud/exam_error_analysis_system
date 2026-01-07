import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  preprocessImage,
  autoEnhanceImage,
  smartCropImage,
  correctImageSkew,
  assessImageQuality,
  compareImageQuality,
  batchProcessImages,
} from "../imageEnhancementService";
import {
  extractContentEnhanced,
  extractAndMergeContentsEnhanced,
} from "../enhancedOcrService";
import { storagePut } from "../storage";
import {
  imagesToPdf,
  mergePdfs,
  splitPdf,
  addWatermarkToPdf,
  mergeIdCardImages,
  layoutIdCardOnA4,
} from "../documentConversionService";

/**
 * 智能扫描路由
 * 提供图像智能处理、OCR识别等功能
 */
export const smartScannerRouter = router({
  /**
   * 预处理图像（去阴影、增亮、校正倾斜、智能裁剪）
   */
  preprocessImage: protectedProcedure
    .input(
      z.object({
        imageData: z.string(), // base64编码的图片数据
        options: z
          .object({
            removeShadow: z.boolean().optional(),
            adjustBrightness: z.boolean().optional(),
            correctSkew: z.boolean().optional(),
            autoCrop: z.boolean().optional(),
            enhanceContrast: z.boolean().optional(),
            denoise: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 将base64转换为Buffer
      const imageBuffer = Buffer.from(
        input.imageData.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      // 预处理图像
      const result = await preprocessImage(imageBuffer, input.options);

      // 将处理后的图像转换为base64
      const processedImageBase64 = `data:image/jpeg;base64,${result.processedImage.toString("base64")}`;

      return {
        processedImage: processedImageBase64,
        quality: result.quality,
        appliedEnhancements: result.appliedEnhancements,
      };
    }),

  /**
   * 评估图像质量
   */
  assessQuality: protectedProcedure
    .input(
      z.object({
        imageData: z.string(),
      })
    )
    .query(async ({ input }) => {
      const imageBuffer = Buffer.from(
        input.imageData.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      return await assessImageQuality(imageBuffer);
    }),

  /**
   * 智能裁剪
   */
  smartCrop: protectedProcedure
    .input(
      z.object({
        imageData: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const imageBuffer = Buffer.from(
        input.imageData.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      const croppedBuffer = await smartCropImage(imageBuffer);
      const croppedBase64 = `data:image/jpeg;base64,${croppedBuffer.toString("base64")}`;

      return {
        croppedImage: croppedBase64,
      };
    }),

  /**
   * 校正倾斜
   */
  correctSkew: protectedProcedure
    .input(
      z.object({
        imageData: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const imageBuffer = Buffer.from(
        input.imageData.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      const correctedBuffer = await correctImageSkew(imageBuffer);
      const correctedBase64 = `data:image/jpeg;base64,${correctedBuffer.toString("base64")}`;

      return {
        correctedImage: correctedBase64,
      };
    }),

  /**
   * 增强OCR识别
   */
  recognizeText: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
        subject: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await extractContentEnhanced(input.imageUrl, input.subject);
    }),

  /**
   * 批量OCR识别
   */
  batchRecognize: protectedProcedure
    .input(
      z.object({
        imageUrls: z.array(z.string()),
        subject: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await extractAndMergeContentsEnhanced(
        input.imageUrls,
        input.subject
      );
    }),

  /**
   * 完整的智能扫描流程
   * 1. 图像预处理
   * 2. OCR识别
   * 3. 保存到S3
   */
  smartScan: protectedProcedure
    .input(
      z.object({
        imageData: z.string(),
        subject: z.string().optional(),
        userId: z.number(),
        autoEnhance: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      // 1. 将base64转换为Buffer
      const imageBuffer = Buffer.from(
        input.imageData.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      // 2. 图像预处理（如果启用）
      let processedBuffer = imageBuffer;
      let appliedEnhancements: string[] = [];
      let quality;

      if (input.autoEnhance) {
        const preprocessResult = await preprocessImage(imageBuffer, {
          removeShadow: true,
          adjustBrightness: true,
          correctSkew: true,
          autoCrop: true,
          enhanceContrast: true,
        });
        processedBuffer = preprocessResult.processedImage;
        appliedEnhancements = preprocessResult.appliedEnhancements;
        quality = preprocessResult.quality;
      } else {
        quality = await assessImageQuality(imageBuffer);
      }

      // 3. 上传处理后的图像到S3
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `scanned/${input.userId}/scan-${timestamp}-${randomSuffix}.jpg`;

      const uploadResult = await storagePut(
        fileKey,
        processedBuffer,
        "image/jpeg"
      );

      // 4. OCR识别
      const ocrResult = await extractContentEnhanced(
        uploadResult.url,
        input.subject
      );

      return {
        imageUrl: uploadResult.url,
        imageKey: fileKey,
        quality,
        appliedEnhancements,
        ocrResult,
      };
    }),

  /**
   * 批量智能扫描
   */
  batchSmartScan: protectedProcedure
    .input(
      z.object({
        images: z.array(z.string()), // base64数组
        subject: z.string().optional(),
        userId: z.number(),
        autoEnhance: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const imageData of input.images) {
        const result = await smartScannerRouter.createCaller({
          user: { id: input.userId } as any,
        } as any).smartScan({
          imageData,
          subject: input.subject,
          userId: input.userId,
          autoEnhance: input.autoEnhance,
        });

        results.push(result);
      }

      return {
        results,
        totalCount: results.length,
        successCount: results.filter((r) => r.ocrResult.success).length,
      };
    }),

  /**
   * 比较处理前后的图像质量
   */
  compareQuality: protectedProcedure
    .input(
      z.object({
        originalImage: z.string(),
        processedImage: z.string(),
      })
    )
    .query(async ({ input }) => {
      const originalBuffer = Buffer.from(
        input.originalImage.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      const processedBuffer = Buffer.from(
        input.processedImage.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      return await compareImageQuality(originalBuffer, processedBuffer);
    }),

  /**
   * 图片转PDF
   */
  imagesToPdf: protectedProcedure
    .input(
      z.object({
        images: z.array(z.string()), // base64数组
        options: z
          .object({
            quality: z.number().optional(),
            pageSize: z.enum(["A4", "A5", "Letter"]).optional(),
            orientation: z.enum(["portrait", "landscape"]).optional(),
          })
          .optional(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // 将base64转换为Buffer数组
      const imageBuffers = input.images.map((img) =>
        Buffer.from(img.replace(/^data:image\/\w+;base64,/, ""), "base64")
      );

      // 转换为PDF
      const pdfBuffer = await imagesToPdf(imageBuffers, input.options);

      // 上传到S3
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `converted/${input.userId}/pdf-${timestamp}-${randomSuffix}.pdf`;

      const uploadResult = await storagePut(fileKey, pdfBuffer, "application/pdf");

      return {
        pdfUrl: uploadResult.url,
        fileKey,
      };
    }),

  /**
   * 合并PDF
   */
  mergePdfs: protectedProcedure
    .input(
      z.object({
        pdfUrls: z.array(z.string()),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // 下载PDF文件
      const pdfBuffers = await Promise.all(
        input.pdfUrls.map(async (url) => {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        })
      );

      // 合并PDF
      const mergedPdfBuffer = await mergePdfs(pdfBuffers);

      // 上传到S3
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `merged/${input.userId}/merged-${timestamp}-${randomSuffix}.pdf`;

      const uploadResult = await storagePut(
        fileKey,
        mergedPdfBuffer,
        "application/pdf"
      );

      return {
        pdfUrl: uploadResult.url,
        fileKey,
      };
    }),

  /**
   * PDF添加水印
   */
  addWatermark: protectedProcedure
    .input(
      z.object({
        pdfUrl: z.string(),
        watermarkText: z.string(),
        options: z
          .object({
            opacity: z.number().optional(),
            fontSize: z.number().optional(),
            rotation: z.number().optional(),
          })
          .optional(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // 下载PDF
      const response = await fetch(input.pdfUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      // 添加水印
      const watermarkedPdfBuffer = await addWatermarkToPdf(
        pdfBuffer,
        input.watermarkText,
        input.options
      );

      // 上传到S3
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `watermarked/${input.userId}/watermarked-${timestamp}-${randomSuffix}.pdf`;

      const uploadResult = await storagePut(
        fileKey,
        watermarkedPdfBuffer,
        "application/pdf"
      );

      return {
        pdfUrl: uploadResult.url,
        fileKey,
      };
    }),

  /**
   * 证件图片拼接
   */
  mergeIdCardImages: protectedProcedure
    .input(
      z.object({
        frontImage: z.string(), // base64
        backImage: z.string(), // base64
        layout: z.enum(["horizontal", "vertical"]).optional(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const frontBuffer = Buffer.from(
        input.frontImage.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      const backBuffer = Buffer.from(
        input.backImage.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      // 拼接图片
      const mergedBuffer = await mergeIdCardImages(
        frontBuffer,
        backBuffer,
        input.layout
      );

      // 上传到S3
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `id-cards/${input.userId}/merged-${timestamp}-${randomSuffix}.jpg`;

      const uploadResult = await storagePut(fileKey, mergedBuffer, "image/jpeg");

      return {
        imageUrl: uploadResult.url,
        fileKey,
      };
    }),

  /**
   * 证件A4排版
   */
  layoutIdCardOnA4: protectedProcedure
    .input(
      z.object({
        frontImage: z.string(),
        backImage: z.string(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const frontBuffer = Buffer.from(
        input.frontImage.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      const backBuffer = Buffer.from(
        input.backImage.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      // A4排版
      const layoutBuffer = await layoutIdCardOnA4(frontBuffer, backBuffer);

      // 上传到S3
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `id-cards/${input.userId}/a4-layout-${timestamp}-${randomSuffix}.jpg`;

      const uploadResult = await storagePut(fileKey, layoutBuffer, "image/jpeg");

      return {
        imageUrl: uploadResult.url,
        fileKey,
      };
    }),
});
