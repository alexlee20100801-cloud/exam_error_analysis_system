import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import * as exportService from '../services/questionExportService';
import { storagePut } from '../storage';

export const questionExportRouter = router({
  /**
   * 导出题目
   */
  exportQuestions: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()),
        format: z.enum(['pdf', 'word', 'markdown']),
        includeAnswer: z.boolean().optional(),
        includeExplanation: z.boolean().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await exportService.exportQuestions(input);

      // 上传到S3
      const fileKey = `exports/${ctx.user.id}/${Date.now()}-${result.filename}`;
      
      let uploadData: Buffer | string;
      if (result.buffer) {
        uploadData = result.buffer;
      } else if (result.content) {
        uploadData = result.content;
      } else {
        throw new Error('导出失败：无有效内容');
      }

      const { url } = await storagePut(fileKey, uploadData, result.mimeType);

      return {
        url,
        filename: result.filename,
        mimeType: result.mimeType,
      };
    }),

  /**
   * 批量导出题目
   */
  batchExport: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()),
        format: z.enum(['pdf', 'word', 'markdown']),
        groupBySubject: z.boolean().optional(),
        includeAnswer: z.boolean().optional(),
        includeExplanation: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results = await exportService.batchExportQuestions(input);

      // 上传所有文件到S3
      const uploadedFiles = await Promise.all(
        results.map(async (result) => {
          const fileKey = `exports/${ctx.user.id}/${Date.now()}-${result.filename}`;
          
          let uploadData: Buffer | string;
          if (result.buffer) {
            uploadData = result.buffer;
          } else if (result.content) {
            uploadData = result.content;
          } else {
            throw new Error('导出失败：无有效内容');
          }

          const { url } = await storagePut(fileKey, uploadData, result.mimeType);

          return {
            url,
            filename: result.filename,
            mimeType: result.mimeType,
            subject: result.subject,
          };
        })
      );

      return {
        files: uploadedFiles,
        total: uploadedFiles.length,
      };
    }),
});
