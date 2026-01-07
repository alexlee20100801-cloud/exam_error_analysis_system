import { describe, it, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";
import {
  preprocessImage,
  autoEnhanceImage,
  assessImageQuality,
} from "./imageEnhancementService";
import {
  imagesToPdf,
  mergeIdCardImages,
  layoutIdCardOnA4,
} from "./documentConversionService";

describe("智能扫描功能测试", () => {
  describe("图像预处理", () => {
    it("应该能够预处理图像", async () => {
      // 创建一个测试图像
      const testImage = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await preprocessImage(testImage, {
        removeShadow: true,
        adjustBrightness: true,
        enhanceContrast: true,
      });

      expect(result.processedImage).toBeInstanceOf(Buffer);
      expect(result.quality).toBeDefined();
      expect(result.quality.brightness).toBeGreaterThanOrEqual(0);
      expect(result.quality.contrast).toBeGreaterThanOrEqual(0);
      expect(result.quality.sharpness).toBeDefined();
      expect(result.appliedEnhancements).toBeInstanceOf(Array);
      expect(result.appliedEnhancements.length).toBeGreaterThan(0);
    });

    it("应该能够评估图像质量", async () => {
      const testImage = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const quality = await assessImageQuality(testImage);

      expect(quality).toBeDefined();
      expect(quality.brightness).toBeGreaterThanOrEqual(0);
      expect(quality.contrast).toBeGreaterThanOrEqual(0);
      expect(quality.sharpness).toBeDefined();
      expect(quality.brightness).toBeDefined();
      expect(quality.contrast).toBeDefined();
    });
  });

  describe("文档格式转换", () => {
    it("应该能够将图片转换为PDF", async () => {
      const testImage = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const pdfBuffer = await imagesToPdf([testImage], {
        pageSize: "A4",
        quality: 90,
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      // PDF文件应该以%PDF开头
      expect(pdfBuffer.toString("utf-8", 0, 4)).toBe("%PDF");
    });

    it("应该能够合并证件图片", async () => {
      const frontImage = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const backImage = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const mergedImage = await mergeIdCardImages(
        frontImage,
        backImage,
        "horizontal"
      );

      expect(mergedImage).toBeInstanceOf(Buffer);
      expect(mergedImage.length).toBeGreaterThan(0);

      // 验证合并后的图像尺寸
      const metadata = await sharp(mergedImage).metadata();
      expect(metadata.width).toBeGreaterThan(400);
    });

    it("应该能够将证件图片排版到A4", async () => {
      const frontImage = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const backImage = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const a4Layout = await layoutIdCardOnA4(frontImage, backImage);

      expect(a4Layout).toBeInstanceOf(Buffer);
      expect(a4Layout.length).toBeGreaterThan(0);

      // 验证A4尺寸
      const metadata = await sharp(a4Layout).metadata();
      expect(metadata.width).toBe(2480); // A4宽度 @ 300 DPI
      expect(metadata.height).toBe(3508); // A4高度 @ 300 DPI
    });
  });

  describe("图像增强", () => {
    it("应该能够自动增强图像", async () => {
      const testImage = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .jpeg()
        .toBuffer();

      const enhancedImage = await autoEnhanceImage(testImage);

      expect(enhancedImage).toBeInstanceOf(Buffer);
      expect(enhancedImage.length).toBeGreaterThan(0);
    });
  });
});
