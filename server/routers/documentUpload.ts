import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as documentUploadService from "../documentUploadService";
import * as documentExportService from "../documentExportService";
import { batchTranslateText } from "../translationService";

/**
 * 文档上传和处理路由
 */
export const documentUploadRouter = router({
  /**
   * 上传文档
   */
  upload: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.enum(['image', 'pdf', 'word']),
      fileSize: z.number(),
      mimeType: z.string(),
      fileData: z.string(), // Base64编码的文件数据
    }))
    .mutation(async ({ ctx, input }) => {
      const fileBuffer = Buffer.from(input.fileData, 'base64');
      
      const result = await documentUploadService.uploadDocument({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileBuffer,
      });
      
      return result;
    }),
  
  /**
   * 获取用户的文档列表
   */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const documents = await documentUploadService.getUserDocuments(
        ctx.user.id,
        input.limit
      );
      
      return documents;
    }),
  
  /**
   * 获取文档详情
   */
  getById: protectedProcedure
    .input(z.object({
      documentId: z.number(),
    }))
    .query(async ({ input }) => {
      const document = await documentUploadService.getDocumentById(input.documentId);
      return document;
    }),
  
  /**
   * 创建框选区域
   */
  createRegion: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      regionType: z.enum(['text', 'formula', 'chart', 'table', 'image', 'mixed']),
      needsHandwritingRemoval: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await documentUploadService.createRegion(input);
      return result;
    }),
  
  /**
   * 获取文档的所有区域
   */
  getRegions: protectedProcedure
    .input(z.object({
      documentId: z.number(),
    }))
    .query(async ({ input }) => {
      const regions = await documentUploadService.getDocumentRegions(input.documentId);
      return regions;
    }),
  
  /**
   * 删除区域
   */
  deleteRegion: protectedProcedure
    .input(z.object({
      regionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await documentUploadService.deleteRegion(input.regionId);
      return result;
    }),
  
  /**
   * 识别区域内容
   */
  recognizeContent: protectedProcedure
    .input(z.object({
      regionId: z.number(),
      documentId: z.number(),
      imageUrl: z.string(),
      regionType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await documentUploadService.recognizeRegionContent(input);
      return result;
    }),
  
  /**
   * 获取区域的识别内容
   */
  getRegionContents: protectedProcedure
    .input(z.object({
      regionId: z.number(),
    }))
    .query(async ({ input }) => {
      const contents = await documentUploadService.getRegionContents(input.regionId);
      return contents;
    }),
  
  /**
   * 获取文档的所有识别内容
   */
  getDocumentContents: protectedProcedure
    .input(z.object({
      documentId: z.number(),
    }))
    .query(async ({ input }) => {
      const contents = await documentUploadService.getDocumentContents(input.documentId);
      return contents;
    }),
  
  /**
   * 更新识别内容（用户编辑）
   */
  updateContent: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      editedContent: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await documentUploadService.updateRecognizedContent(
        input.contentId,
        input.editedContent
      );
      return result;
    }),
  
  /**
   * 清除手写笔迹
   */
  removeHandwriting: protectedProcedure
    .input(z.object({
      regionId: z.number(),
      imageUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await documentUploadService.removeHandwriting(
        input.regionId,
        input.imageUrl
      );
      return result;
    }),
  
  /**
   * 更新文档状态
   */
  updateStatus: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      status: z.enum(['uploaded', 'region_selecting', 'processing', 'completed', 'failed']),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await documentUploadService.updateDocumentStatus(
        input.documentId,
        input.status,
        input.errorMessage
      );
      return result;
    }),
  
  /**
   * 导出文档
   */
  export: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      format: z.enum(['word', 'pdf', 'markdown', 'latex', 'json']),
      config: z.object({
        includeImages: z.boolean().optional(),
        includeMetadata: z.boolean().optional(),
        template: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await documentExportService.exportDocument({
        documentId: input.documentId,
        userId: ctx.user.id,
        format: input.format,
        config: input.config,
      });
      return result;
    }),
  
  /**
   * 批量翻译识别内容
   */
  batchTranslateContents: protectedProcedure
    .input(z.object({
      contentIds: z.array(z.number()),
      targetLanguage: z.string(),
      sourceLanguage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // 获取所有需要翻译的内容
      const contents = await Promise.all(
        input.contentIds.map(id => documentUploadService.getContentById(id))
      );
      
      // 提取文本内容
      const texts = contents.map(c => {
        if (!c) return '';
        // 根据内容类型提取文本
        if (c.contentType === 'text') {
          return c.recognizedContent;
        } else if (c.contentType === 'formula') {
          // 公式不翻译，返回原内容
          return c.recognizedContent;
        } else {
          return c.recognizedContent;
        }
      });
      
      // 批量翻译
      const translationResults = await batchTranslateText(
        texts,
        input.targetLanguage,
        input.sourceLanguage
      );
      
      // 更新数据库中的翻译内容
      const updatePromises = contents.map(async (content, index) => {
        if (!content) return null;
        
        const translationResult = translationResults.results[index];
        if (!translationResult.success) {
          return {
            contentId: content.id,
            success: false,
            error: translationResult.error,
          };
        }
        
        // 更新翻译内容
        await documentUploadService.updateTranslatedContent(
          content.id,
          translationResult.translatedText
        );
        
        return {
          contentId: content.id,
          success: true,
          translatedText: translationResult.translatedText,
        };
      });
      
      const results = await Promise.all(updatePromises);
      
      return {
        results: results.filter(r => r !== null),
        successCount: results.filter(r => r?.success).length,
        totalCount: input.contentIds.length,
      };
    }),
  
  /**
   * 获取导出历史
   */
  getExports: protectedProcedure
    .input(z.object({
      documentId: z.number().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.documentId) {
        const exports = await documentExportService.getDocumentExports(input.documentId);
        return exports;
      } else {
        const exports = await documentExportService.getUserExports(
          ctx.user.id,
          input.limit
        );
        return exports;
      }
    }),
});
