import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getSchoolLevelFromGrade } from "../utils/schoolLevelHelper";
import { errorQuestions } from "../../drizzle/schema";
import { getDb } from "../db";
import { 
  createErrorQuestion, 
  getErrorQuestionsByUserId,
  getErrorQuestionById,
  updateErrorQuestion,
  getErrorQuestionsBySubjectAndGrade
} from "../db";
import { extractTextFromImage, extractAndMergeTextFromImages } from "../ocrService";
import { storagePut } from "../storage";
import { createReviewReminder } from "../services/reviewReminderService";

export const errorQuestionsRouter = router({
  /**
   * 创建错题（手动输入）
   */
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(500),
      content: z.string().min(1),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      userAnswer: z.string().optional(),
      userNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const schoolLevel = getSchoolLevelFromGrade(input.grade);
      const result = await createErrorQuestion({
        userId: ctx.user.id,
        title: input.title,
        content: input.content,
        schoolLevel,
        subject: input.subject,
        grade: input.grade,
        difficulty: input.difficulty,
        userAnswer: input.userAnswer,
        userNotes: input.userNotes,
        isAnalyzed: false,
        isMastered: false,
        reviewCount: 0,
      });

      const questionId = result[0]?.insertId ? Number(result[0].insertId) : 0;

      // 自动创建学习提醒
      if (questionId > 0) {
        await createReviewReminder(ctx.user.id, questionId, "error_question");
      }

      return {
        success: true,
        questionId,
      };
    }),

  /**
   * 上传图片并OCR识别创建错题
   */
  createFromImage: protectedProcedure
    .input(z.object({
      imageBase64: z.string(), // base64编码的图片
      title: z.string().min(1).max(500),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
      userAnswer: z.string().optional(),
      userNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. 上传图片到S3
        const imageBuffer = Buffer.from(input.imageBase64.split(',')[1] || input.imageBase64, 'base64');
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const fileKey = `error-questions/${ctx.user.id}/${Date.now()}-${randomSuffix}.jpg`;
        
        const { url: imageUrl, key: imageKey } = await storagePut(
          fileKey,
          imageBuffer,
          "image/jpeg"
        );

        // 2. OCR识别图片内容
        const ocrResult = await extractTextFromImage(imageUrl);
        
        if (!ocrResult.success) {
          return {
            success: false,
            error: ocrResult.error || "OCR识别失败",
          };
        }

        // 3. 创建错题记录
        const schoolLevel = getSchoolLevelFromGrade(input.grade);
        const result = await createErrorQuestion({
          userId: ctx.user.id,
          title: input.title,
          content: ocrResult.content,
          imageUrl: imageUrl,
          imageKey: imageKey,
          schoolLevel,
          subject: input.subject,
          grade: input.grade,
          userAnswer: input.userAnswer,
          userNotes: input.userNotes,
          isAnalyzed: false,
          isMastered: false,
          reviewCount: 0,
        });

        return {
          success: true,
          questionId: result[0]?.insertId ? Number(result[0].insertId) : 0,
          ocrContent: ocrResult.content,
        };
      } catch (error) {
        console.error("[ErrorQuestions] 创建错题失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "创建错题失败",
        };
      }
    }),

  /**
   * 获取用户的错题列表
   */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const questions = await getErrorQuestionsByUserId(
        ctx.user.id, 
        input?.limit || 50
      );
      return questions;
    }),

  /**
   * 按板块筛选错题
   */
  listBySchoolLevel: protectedProcedure
    .input(z.object({
      schoolLevel: z.enum(["junior", "senior"]),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      return await db
        .select()
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, ctx.user.id),
            eq(errorQuestions.schoolLevel, input.schoolLevel)
          )
        )
        .orderBy(desc(errorQuestions.createdAt))
        .limit(input.limit);
    }),

  /**
   * 按板块和学科筛选错题
   */
  listBySchoolLevelAndSubject: protectedProcedure
    .input(z.object({
      schoolLevel: z.enum(["junior", "senior"]),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      return await db
        .select()
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, ctx.user.id),
            eq(errorQuestions.schoolLevel, input.schoolLevel),
            eq(errorQuestions.subject, input.subject)
          )
        )
        .orderBy(desc(errorQuestions.createdAt))
        .limit(input.limit);
    }),

  /**
   * 按学科和年级筛选错题
   */
  listBySubjectAndGrade: protectedProcedure
    .input(z.object({
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
    }))
    .query(async ({ ctx, input }) => {
      const questions = await getErrorQuestionsBySubjectAndGrade(
        ctx.user.id,
        input.subject,
        input.grade
      );
      return questions;
    }),

  /**
   * 获取单个错题详情
   */
  getById: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const question = await getErrorQuestionById(input.questionId);
      
      if (!question) {
        throw new Error("错题不存在");
      }
      
      if (question.userId !== ctx.user.id) {
        throw new Error("无权访问此错题");
      }
      
      return question;
    }),

  /**
   * 更新错题信息
   */
  update: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      title: z.string().min(1).max(500).optional(),
      content: z.string().optional(),
      userAnswer: z.string().optional(),
      userNotes: z.string().optional(),
      isMastered: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证权限
      const question = await getErrorQuestionById(input.questionId);
      if (!question || question.userId !== ctx.user.id) {
        throw new Error("无权修改此错题");
      }

      const { questionId, ...updates } = input;
      await updateErrorQuestion(questionId, updates);

      return {
        success: true,
      };
    }),

  /**
   * 标记错题为已掌握
   */
  markAsMastered: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const question = await getErrorQuestionById(input.questionId);
      if (!question || question.userId !== ctx.user.id) {
        throw new Error("无权修改此错题");
      }

      await updateErrorQuestion(input.questionId, {
        isMastered: true,
        lastReviewedAt: new Date(),
      });

      return {
        success: true,
      };
    }),

  /**
   * 增加错题复习次数
   */
  incrementReviewCount: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const question = await getErrorQuestionById(input.questionId);
      if (!question || question.userId !== ctx.user.id) {
        throw new Error("无权修改此错题");
      }

      await updateErrorQuestion(input.questionId, {
        reviewCount: (question.reviewCount || 0) + 1,
        lastReviewedAt: new Date(),
      });

      return {
        success: true,
        reviewCount: (question.reviewCount || 0) + 1,
      };
    }),

  /**
   * 收藏错题
   */
  toggleFavorite: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const question = await getErrorQuestionById(input.questionId);
      if (!question || question.userId !== ctx.user.id) {
        throw new Error("无权修改此错题");
      }

      const newFavoriteStatus = !question.isFavorite;
      await updateErrorQuestion(input.questionId, {
        isFavorite: newFavoriteStatus,
      });

      return {
        success: true,
        isFavorite: newFavoriteStatus,
      };
    }),

  /**
   * 获取收藏的错题数量
   */
  getFavoriteCount: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const questions = await db
        .select()
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, ctx.user.id),
            eq(errorQuestions.isFavorite, true)
          )
        );

      return {
        count: questions.length,
      };
    }),

  /**
   * 更新错题笔记
   */
  updateNotes: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        userNotes: z.string().optional(),
        noteImages: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      // 验证错题属于当前用户
      const questions = await db
        .select()
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.id, input.questionId),
            eq(errorQuestions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (questions.length === 0) {
        throw new Error("错题不存在或无权访问");
      }

      // 更新笔记
      await db
        .update(errorQuestions)
        .set({
          userNotes: input.userNotes,
          noteImages: input.noteImages,
          updatedAt: new Date(),
        })
        .where(eq(errorQuestions.id, input.questionId));

      return {
        success: true,
      };
    }),
});
