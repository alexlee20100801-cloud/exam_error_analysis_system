import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { parseDocument, ParsedContent } from '../services/documentParserService';
import { storagePut } from '../storage';
import { createErrorQuestion } from '../db';
import { errorQuestions } from '../../drizzle/schema';

/**
 * 文档上传和解析路由
 */
export const documentUploadRouter = router({
  /**
   * 上传并解析文档
   */
  uploadAndParse: protectedProcedure
    .input(
      z.object({
        fileData: z.string(), // Base64编码的文件数据
        fileName: z.string(),
        mimeType: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { fileData, fileName, mimeType } = input;
      const userId = ctx.user.id;

      try {
        // 将Base64数据转换为Buffer
        const fileBuffer = Buffer.from(fileData, 'base64');

        // 文件大小限制检查
        const maxSize = mimeType.startsWith('image/') ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 图片5MB，文档10MB
        if (fileBuffer.length > maxSize) {
          throw new Error(
            `文件大小超过限制（${mimeType.startsWith('image/') ? '5MB' : '10MB'}）`
          );
        }

        // 解析文档
        const parsedContent = await parseDocument(fileBuffer, mimeType);

        // 将原始文件上传到S3（可选，用于后续查看）
        const fileKey = `uploads/${userId}/${Date.now()}-${fileName}`;
        const { url: fileUrl } = await storagePut(fileKey, fileBuffer, mimeType);

        return {
          success: true,
          parsedContent,
          fileUrl,
          message: '文档解析成功'
        };
      } catch (error: any) {
        console.error('文档上传解析失败:', error);
        return {
          success: false,
          error: error.message || '文档解析失败',
          parsedContent: null,
          fileUrl: null
        };
      }
    }),

  /**
   * 保存校正后的内容为错题
   */
  saveAsErrorQuestion: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, '题目标题不能为空'),
        content: z.string().min(1, '题目内容不能为空'),
        userAnswer: z.string().optional(),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
        subject: z.enum([
          'chinese',
          'math',
          'english',
          'physics',
          'chemistry',
          'biology',
          'politics',
          'history',
          'geography'
        ]),
        grade: z.enum([
          'junior1',
          'junior2',
          'junior3',
          'senior1',
          'senior2',
          'senior3'
        ]),
        schoolLevel: z.enum(['junior', 'senior']),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        imageUrl: z.string().optional(), // 原始图片URL
        semester: z.enum(['first', 'second']).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // 插入错题记录
        const result = await createErrorQuestion({
          userId,
          title: input.title,
          content: input.content,
          userAnswer: input.userAnswer || null,
          correctAnswer: input.correctAnswer || null,
          detailedExplanation: input.explanation || null,
          subject: input.subject,
          grade: input.grade,
          schoolLevel: input.schoolLevel,
          difficulty: input.difficulty || 'medium',
          imageUrl: input.imageUrl || null,
          semester: input.semester || null,
          isAnalyzed: false,
          isMastered: false,
          reviewCount: 0
        });
        
        const questionId = result[0]?.insertId ? Number(result[0].insertId) : 0;

        return {
          success: true,
          questionId,
          message: '错题保存成功'
        };
      } catch (error: any) {
        console.error('保存错题失败:', error);
        throw new Error('保存错题失败，请重试');
      }
    })
});
