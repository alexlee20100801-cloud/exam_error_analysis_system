import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as ocrEnhancedService from '../services/ocrEnhancedService';

export const ocrEnhancedRouter = router({
  // ==================== 边框检测 ====================
  
  // 检测图片边框
  detectBorder: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      imageKey: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await ocrEnhancedService.detectBorder(
        ctx.user.id,
        input.imageUrl,
        input.imageKey
      );
    }),
  
  // 获取裁剪建议
  getCropSuggestion: protectedProcedure
    .input(z.object({
      borderRecordId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // 这里需要先获取边框检测记录
      // 简化实现，直接返回建议
      return {
        shouldCrop: true,
        needsPerspectiveCorrection: false,
        confidence: 85,
      };
    }),
  
  // ==================== 手写识别增强 ====================
  
  // 增强手写识别
  enhanceHandwriting: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      imageKey: z.string().optional(),
      subject: z.string().optional(),
      contrastEnhancement: z.boolean().optional(),
      noiseReduction: z.boolean().optional(),
      mathSymbolEnhancement: z.boolean().optional(),
      chemicalFormulaEnhancement: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await ocrEnhancedService.enhanceHandwritingRecognition(
        ctx.user.id,
        input.imageUrl,
        input.imageKey,
        {
          subject: input.subject,
          contrastEnhancement: input.contrastEnhancement,
          noiseReduction: input.noiseReduction,
          mathSymbolEnhancement: input.mathSymbolEnhancement,
          chemicalFormulaEnhancement: input.chemicalFormulaEnhancement,
        }
      );
    }),
  
  // ==================== 一站式处理 ====================
  
  // 一站式OCR增强处理
  processImage: protectedProcedure
    .input(z.object({
      imageUrl: z.string(), // 支持URL或base64
      imageKey: z.string().optional(),
      autoBorderDetection: z.boolean().optional(),
      autoPerspectiveCorrection: z.boolean().optional(),
      handwritingMode: z.boolean().optional(),
      subject: z.string().optional(),
      mathSymbolEnhancement: z.boolean().optional(),
      chemicalFormulaEnhancement: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await ocrEnhancedService.processImageWithEnhancement(
        ctx.user.id,
        input.imageUrl,
        input.imageKey,
        {
          autoBorderDetection: input.autoBorderDetection,
          autoPerspectiveCorrection: input.autoPerspectiveCorrection,
          handwritingMode: input.handwritingMode,
          subject: input.subject,
          mathSymbolEnhancement: input.mathSymbolEnhancement,
          chemicalFormulaEnhancement: input.chemicalFormulaEnhancement,
        }
      );
    }),
  
  // OCR测试图片上传和验证
  testOcrWithImage: protectedProcedure
    .input(z.object({
      imageBase64: z.string(), // base64编码的图片
      testType: z.enum(['border', 'handwriting', 'full']).optional(),
      config: z.object({
        autoBorderDetection: z.boolean().optional(),
        borderDetectionSensitivity: z.enum(['low', 'medium', 'high']).optional(),
        autoPerspectiveCorrection: z.boolean().optional(),
        handwritingMode: z.boolean().optional(),
        mathSymbolEnhancement: z.boolean().optional(),
        chemicalFormulaEnhancement: z.boolean().optional(),
        subject: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await ocrEnhancedService.testOcrWithImage(
        ctx.user.id,
        input.imageBase64,
        input.testType || 'full',
        input.config
      );
    }),
  
  // ==================== 配置管理 ====================
  
  // 获取OCR配置
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      return await ocrEnhancedService.getUserOcrConfig(ctx.user.id);
    }),
  
  // 更新OCR配置
  updateConfig: protectedProcedure
    .input(z.object({
      autoBorderDetection: z.boolean().optional(),
      borderDetectionSensitivity: z.enum(['low', 'medium', 'high']).optional(),
      autoPerspectiveCorrection: z.boolean().optional(),
      autoContrastEnhancement: z.boolean().optional(),
      autoNoiseReduction: z.boolean().optional(),
      autoBinarization: z.boolean().optional(),
      handwritingMode: z.boolean().optional(),
      mathSymbolEnhancement: z.boolean().optional(),
      chemicalFormulaEnhancement: z.boolean().optional(),
      defaultSubject: z.enum([
        'chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'
      ]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await ocrEnhancedService.upsertOcrConfig(ctx.user.id, input);
    }),
  
  // ==================== 批量处理 ====================
  
  // 创建批量处理任务
  createBatch: protectedProcedure
    .input(z.object({
      batchName: z.string().min(1).max(100),
      totalImages: z.number().min(1),
      config: z.object({
        autoBorderDetection: z.boolean().optional(),
        autoPerspectiveCorrection: z.boolean().optional(),
        autoContrastEnhancement: z.boolean().optional(),
        autoNoiseReduction: z.boolean().optional(),
        handwritingMode: z.boolean().optional(),
        subject: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await ocrEnhancedService.createOcrBatch(
        ctx.user.id,
        input.batchName,
        input.totalImages,
        input.config
      );
    }),
  
  // 获取批量处理历史
  getBatches: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      return await ocrEnhancedService.getUserOcrBatches(ctx.user.id, input?.limit);
    }),
  
  // ==================== 统计 ====================
  
  // 获取OCR处理统计
  getStatistics: protectedProcedure
    .query(async ({ ctx }) => {
      return await ocrEnhancedService.getOcrStatistics(ctx.user.id);
    }),
});
