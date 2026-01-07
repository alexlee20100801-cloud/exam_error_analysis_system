import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { 
  generateAdaptivePaper,
  generateRandomPractice,
  generateChapterPractice,
  generateTimedPractice,
  exportPaperToPDFEnhanced,
} from "../examPaperService";

export const smartExamPaperRouter = router({
  /**
   * 生成专属复习卷（基于薄弱点）
   */
  generateAdaptive: protectedProcedure
    .input(z.object({
      userId: z.string(),
      title: z.string(),
      subject: z.string(),
      grade: z.string(),
      questionCount: z.number().min(5).max(50),
      difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
    }))
    .mutation(async ({ input }) => {
      return await generateAdaptivePaper(input);
    }),

  /**
   * 随机练习模式
   */
  randomPractice: protectedProcedure
    .input(z.object({
      userId: z.string(),
      count: z.number().min(5).max(30),
      subject: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await generateRandomPractice(input.userId, input.count, input.subject);
    }),

  /**
   * 章节练习模式
   */
  chapterPractice: protectedProcedure
    .input(z.object({
      userId: z.string(),
      subject: z.string(),
      chapter: z.string(),
      count: z.number().min(5).max(30),
    }))
    .mutation(async ({ input }) => {
      return await generateChapterPractice(
        input.userId,
        input.subject,
        input.chapter,
        input.count
      );
    }),

  /**
   * 限时练习模式
   */
  timedPractice: protectedProcedure
    .input(z.object({
      userId: z.string(),
      subject: z.string(),
      timeLimit: z.number().min(10).max(120),
      questionCount: z.number().min(10).max(50),
      difficulty: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await generateTimedPractice(input);
    }),

  /**
   * 导出试卷为PDF（增强版）
   */
  exportToPDF: protectedProcedure
    .input(z.object({
      paperId: z.number(),
      userId: z.string(),
      includeAnswer: z.boolean(),
      includeAnalysis: z.boolean(),
      paperSize: z.enum(['A4', 'A3', 'Letter']),
      layout: z.enum(['single', 'double']),
    }))
    .mutation(async ({ input }) => {
      return await exportPaperToPDFEnhanced(input);
    }),
});
