import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { 
  generatePracticeQuestions, 
  generateSimilarQuestions 
} from "../practiceGenerationService";
import {
  createPracticeRecord,
  getPracticeRecordsByUserId,
  createQuestionBankItem,
  // @ts-ignore
  getQuestionsByKnowledgePoints,
  getErrorQuestionById,
  getKnowledgePointsByIds,
  upsertLearningProgress,
  getLearningProgressByUser,
  getLearningProgressByKnowledgePoint,
} from "../db";

export const practiceRouter = router({
  /**
   * 生成针对性练习题
   */
  generateQuestions: protectedProcedure
    .input(z.object({
      knowledgePointIds: z.array(z.number()).min(1),
      difficulty: z.enum(["easy", "medium", "hard"]),
      count: z.number().min(1).max(10).default(5),
    }))
    .mutation(async ({ ctx, input }) => {
      // 获取知识点信息
      const knowledgePoints = await getKnowledgePointsByIds(input.knowledgePointIds);
      
      if (knowledgePoints.length === 0) {
        throw new Error("知识点不存在");
      }

      const subject = knowledgePoints[0].subject;
      const grade = knowledgePoints[0].grade;
      const knowledgePointNames = knowledgePoints.map(kp => kp.name);

      // 生成练习题
      const result = await generatePracticeQuestions(
        knowledgePointNames,
        subject,
        grade,
        input.difficulty,
        input.count
      );

      if (!result.success || !result.questions) {
        return {
          success: false,
          error: result.error || "生成练习题失败",
        };
      }

      // 保存到题库
      const savedQuestions = [];
      for (const question of result.questions) {
        const saved = await createQuestionBankItem({
          title: question.title,
          content: question.content,
          questionType: "short_answer", // 默认为简答题
          answer: question.answer,
          explanation: question.explanation,
          subject: subject,
          grade: grade,
          difficulty: question.difficulty,
          knowledgePointIds: input.knowledgePointIds,
          source: "ai_generated",
          // @ts-ignore
          qualityScore: 0,
          usageCount: 0,
        });
        
        savedQuestions.push({
          id: saved[0]?.insertId ? Number(saved[0].insertId) : 0,
          ...question,
        });
      }

      return {
        success: true,
        questions: savedQuestions,
      };
    }),

  /**
   * 根据错题生成相似练习题
   */
  generateSimilarQuestions: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      count: z.number().min(1).max(5).default(3),
    }))
    .mutation(async ({ ctx, input }) => {
      // 获取错题信息
      const errorQuestion = await getErrorQuestionById(input.questionId);
      
      if (!errorQuestion) {
        throw new Error("错题不存在");
      }
      
      if (errorQuestion.userId !== ctx.user.id) {
        throw new Error("无权访问此错题");
      }

      // 获取知识点名称
      let knowledgePointNames: string[] = [];
      // @ts-ignore
      if (errorQuestion.knowledgePointIds && errorQuestion.knowledgePointIds.length > 0) {
        // @ts-ignore
        const knowledgePoints = await getKnowledgePointsByIds(errorQuestion.knowledgePointIds);
        knowledgePointNames = knowledgePoints.map(kp => kp.name);
      }

      // 生成相似练习题
      const result = await generateSimilarQuestions(
        errorQuestion.content,
        errorQuestion.subject,
        errorQuestion.grade,
        knowledgePointNames,
        input.count
      );

      if (!result.success || !result.questions) {
        return {
          success: false,
          error: result.error || "生成练习题失败",
        };
      }

      // 保存到题库
      const savedQuestions = [];
      for (const question of result.questions) {
        const saved = await createQuestionBankItem({
          title: question.title,
          content: question.content,
          questionType: "short_answer", // 默认为简答题
          answer: question.answer,
          explanation: question.explanation,
          subject: errorQuestion.subject,
          grade: errorQuestion.grade,
          difficulty: question.difficulty,
          knowledgePointIds: errorQuestion.knowledgePointIds || [],
          source: "ai_generated",
          // @ts-ignore
          qualityScore: 0,
          usageCount: 0,
        });
        
        savedQuestions.push({
          id: saved[0]?.insertId ? Number(saved[0].insertId) : 0,
          ...question,
        });
      }

      return {
        success: true,
        questions: savedQuestions,
      };
    }),

  /**
   * 提交练习记录
   */
  submitRecord: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      questionType: z.enum(["error_question", "practice_question"]),
      userAnswer: z.string(),
      isCorrect: z.boolean(),
      timeSpent: z.number().optional(),
      knowledgePointIds: z.array(z.number()),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // 创建练习记录
      await createPracticeRecord({
        userId: ctx.user.id,
        questionId: input.questionId,
        questionType: input.questionType,
        userAnswer: input.userAnswer,
        // @ts-ignore
        isCorrect: input.isCorrect,
        timeSpent: input.timeSpent,
        knowledgePointIds: input.knowledgePointIds,
        subject: input.subject,
        grade: input.grade,
      });

      // 更新学习进度
      for (const knowledgePointId of input.knowledgePointIds) {
        // @ts-ignore
        const progress = await getLearningProgressByKnowledgePoint(ctx.user.id, knowledgePointId);
        
        // @ts-ignore
        const practiceCount = (progress?.practiceCount || 0) + 1;
        // @ts-ignore
        const correctCount = (progress?.correctCount || 0) + (input.isCorrect ? 1 : 0);
        // @ts-ignore
        const errorCount = (progress?.errorCount || 0) + (input.isCorrect ? 0 : 1);
        
        // 计算掌握度（正确率）
        const masteryLevel = practiceCount > 0 ? (correctCount / practiceCount) * 100 : 0;
        
        // 确定学习状态
        let status: "not_started" | "learning" | "reviewing" | "mastered" = "learning";
        if (masteryLevel >= 90 && practiceCount >= 5) {
          status = "mastered";
        } else if (masteryLevel >= 70) {
          status = "reviewing";
        }

        // 计算下次复习时间（基于遗忘曲线）
        // @ts-ignore
        let reviewInterval = progress?.reviewInterval || 1;
        if (input.isCorrect) {
          reviewInterval = Math.min(reviewInterval * 2, 30); // 最多30天
        } else {
          reviewInterval = 1; // 错误则重置为1天
        }
        
        const nextReviewAt = new Date();
        nextReviewAt.setDate(nextReviewAt.getDate() + reviewInterval);

        await upsertLearningProgress({
          userId: ctx.user.id,
          knowledgePointId: knowledgePointId,
          // @ts-ignore
          masteryLevel: masteryLevel,
          practiceCount: practiceCount,
          correctCount: correctCount,
          errorCount: errorCount,
          status: status,
          // @ts-ignore
          lastPracticeAt: new Date(),
          // @ts-ignore
          nextReviewAt: nextReviewAt,
          reviewInterval: reviewInterval,
        });
      }

      return {
        success: true,
      };
    }),

  /**
   * 获取练习记录
   */
  getRecords: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const records = await getPracticeRecordsByUserId(
        ctx.user.id,
        // @ts-ignore
        input?.limit || 50
      );
      return records;
    }),

  /**
   * 获取学习进度
   */
  getProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const progress = await getLearningProgressByUser(ctx.user.id);
      return progress;
    }),

  /**
   * 获取单个知识点的学习进度
   */
  getProgressByKnowledgePoint: protectedProcedure
    .input(z.object({
      knowledgePointId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const progress = await getLearningProgressByKnowledgePoint(
        ctx.user.id,
        // @ts-ignore
        input.knowledgePointId
      );
      return progress;
    }),
});
