import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getSchoolLevelFromGrade } from "../utils/schoolLevelHelper";
import { errorQuestions, errorQuestionTagRelations } from "../../drizzle/schema";
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
import { analyzeErrorQuestion } from "../services/errorAnalysisService";
import { transformErrorQuestion } from "../transformers";
import { getErrorQuestionsBySchoolLevel } from "../db";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const errorQuestionsRouter = router({
  /**
   * 上传图片并OCR识别（仅上传和识别，不保存）
   */
  uploadWithOCR: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. 上传图片到S3
        const imageBuffer = Buffer.from(input.imageBase64.split(',')[1] || input.imageBase64, 'base64');
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const fileKey = `error-questions/${ctx.user.id}/${Date.now()}-${randomSuffix}.jpg`;
        
        const { url: imageUrl } = await storagePut(
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
            imageUrl,
          };
        }

        return {
          success: true,
          imageUrl,
          ocrText: ocrResult.content,
        };
      } catch (error) {
        console.error("[ErrorQuestions] OCR识别失败:", error);
        throw new Error(error instanceof Error ? error.message : "OCR识别失败");
      }
    }),

  /**
   * 创建错题（手动输入）
   */
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(500),
      content: z.string().min(1),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
      schoolLevel: z.enum(["junior", "senior"]),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      userAnswer: z.string().optional(),
      userNotes: z.string().optional(),
      imageUrl: z.string().optional(),
      imageKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await createErrorQuestion({
        userId: ctx.user.id,
        title: input.title,
        content: input.content,
        schoolLevel: input.schoolLevel,
        subject: input.subject,
        grade: input.grade,
        difficulty: input.difficulty,
        userAnswer: input.userAnswer,
        userNotes: input.userNotes,
        imageUrl: input.imageUrl,
        imageKey: input.imageKey,
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
      return questions.map(transformErrorQuestion);
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
      
      const questions = await db
        .select()
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, ctx.user.id),
            sql`${errorQuestions.schoolLevel} = ${input.schoolLevel}`
          )
        )
        .orderBy(desc(errorQuestions.createdAt))
        .limit(input.limit);
      return questions.map(transformErrorQuestion);
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
      
      const questions = await db
        .select()
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, ctx.user.id),
            sql`${errorQuestions.schoolLevel} = ${input.schoolLevel}`,
            sql`${errorQuestions.subject} = ${input.subject}`
          )
        )
        .orderBy(desc(errorQuestions.createdAt))
        .limit(input.limit);
      return questions.map(transformErrorQuestion);
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
      return questions.map(transformErrorQuestion);
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
      
      return transformErrorQuestion(question);
    }),

  /**
   * AI分析错题
   */
  analyze: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证权限
      const question = await getErrorQuestionById(input.questionId);
      if (!question || question.userId !== ctx.user.id) {
        throw new Error("无权分析此错题");
      }

      // 调用AI分析服务
      const analysisResult = await analyzeErrorQuestion(
        question.content,
        question.subject,
        question.grade,
        question.userAnswer || undefined
      );

      if (!analysisResult.success || !analysisResult.analysis) {
        throw new Error(analysisResult.error || "AI分析失败");
      }

      const { analysis } = analysisResult;

      // 更新错题记录
      const db = await getDb();
      if (!db) {
        throw new Error("数据库连接失败");
      }

      await db
        .update(errorQuestions)
        .set({
          errorAnalysis: analysis.errorReason,
          correctAnswer: analysis.correctAnswer,
          detailedExplanation: analysis.detailedExplanation,
          detailedAnalysis: analysis.studyAdvice,
          difficulty: analysis.difficulty,
          knowledgePointIds: JSON.stringify(analysis.knowledgePoints),
          isAnalyzed: 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(errorQuestions.id, input.questionId));

      return {
        success: true,
        analysis,
      };
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
   * 删除错题
   */
  delete: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      // 验证错题属于当前用户
      const question = await getErrorQuestionById(input.questionId);
      if (!question || question.userId !== ctx.user.id) {
        throw new Error("错题不存在或无权删除");
      }

      // 删除错题（级联删除会自动处理相关记录）
      await db
        .delete(errorQuestions)
        .where(eq(errorQuestions.id, input.questionId));

      return {
        success: true,
      };
    }),

  /**
   * 批量删除错题
   */
  batchDelete: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      let successCount = 0;
      let failCount = 0;

      // 逐个验证并删除
      for (const questionId of input.questionIds) {
        try {
          const question = await getErrorQuestionById(questionId);
          if (question && question.userId === ctx.user.id) {
            await db
              .delete(errorQuestions)
              .where(eq(errorQuestions.id, questionId));
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      return {
        success: true,
        successCount,
        failCount,
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

  /**
   * 批量标记为已掌握
   */
  batchMarkMastered: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      let successCount = 0;
      let failCount = 0;

      // 逐个验证并更新
      for (const questionId of input.questionIds) {
        try {
          const question = await getErrorQuestionById(questionId);
          if (question && question.userId === ctx.user.id) {
            await db
              .update(errorQuestions)
              .set({ isMastered: true, updatedAt: new Date() })
              .where(eq(errorQuestions.id, questionId));
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      return {
        success: true,
        successCount,
        failCount,
      };
    }),

  /**
   * 批量修改难度
   */
  batchUpdateDifficulty: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
      difficulty: z.enum(["easy", "medium", "hard"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      let successCount = 0;
      let failCount = 0;

      // 逐个验证并更新
      for (const questionId of input.questionIds) {
        try {
          const question = await getErrorQuestionById(questionId);
          if (question && question.userId === ctx.user.id) {
            await db
              .update(errorQuestions)
              .set({ difficulty: input.difficulty, updatedAt: new Date() })
              .where(eq(errorQuestions.id, questionId));
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      return {
        success: true,
        successCount,
        failCount,
      };
    }),

  /**
   * 批量添加标签
   */
  batchAddTag: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
      tagId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      let successCount = 0;
      let failCount = 0;

      // 导入标签关系表
      const { errorQuestionTagRelations } = await import("../../drizzle/schema");

      // 逐个验证并添加标签
      for (const questionId of input.questionIds) {
        try {
          const question = await getErrorQuestionById(questionId);
          if (question && question.userId === ctx.user.id) {
            // 检查是否已存在该标签关系
            const existing = await db
              .select()
              .from(errorQuestionTagRelations)
              .where(
                and(
                  eq(errorQuestionTagRelations.errorQuestionId, questionId),
                  eq(errorQuestionTagRelations.tagId, input.tagId)
                )
              )
              .limit(1);

            if (existing.length === 0) {
              await db.insert(errorQuestionTagRelations).values({
                errorQuestionId: questionId,
                tagId: input.tagId,
              });
            }
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      return {
        success: true,
        successCount,
        failCount,
      };
    }),

  /**
   * 批量导出错题数据
   */
  batchExport: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
      format: z.enum(["json", "csv"]).default("json"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      const questions = [];
      
      // 逐个验证并获取错题数据
      for (const questionId of input.questionIds) {
        try {
          const question = await getErrorQuestionById(questionId);
          if (question && question.userId === ctx.user.id) {
            questions.push(question);
          }
        } catch (error) {
          console.error(`Failed to fetch question ${questionId}:`, error);
        }
      }

      return {
        success: true,
        questions,
        format: input.format,
      };
    }),
});
