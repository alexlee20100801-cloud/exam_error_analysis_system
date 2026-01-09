import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { analyzeErrorQuestion, matchKnowledgePoints, analyzeQuestionDetailed } from "../aiAnalysisService";
import { 
  getErrorQuestionById, 
  updateErrorQuestion,
  getKnowledgePointsBySubjectAndGrade 
} from "../db";

export const aiAnalysisRouter = router({
  /**
   * 分析错题
   */
  analyzeQuestion: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 获取错题信息
      const question = await getErrorQuestionById(input.questionId);
      
      if (!question) {
        throw new Error("错题不存在");
      }
      
      if (question.userId !== ctx.user.id) {
        throw new Error("无权分析此错题");
      }

      // 调用AI分析服务
      const analysisResult = await analyzeErrorQuestion(
        question.content,
        question.subject,
        question.grade,
        question.userAnswer || undefined
      );

      if (!analysisResult.success) {
        return {
          success: false,
          error: analysisResult.error || "AI分析失败",
        };
      }

      // 获取标准知识点库
      const standardKnowledgePoints = await getKnowledgePointsBySubjectAndGrade(
        question.subject,
        question.grade
      );

      // 匹配知识点
      let knowledgePointIds: number[] = [];
      if (analysisResult.knowledgePoints && analysisResult.knowledgePoints.length > 0) {
        knowledgePointIds = await matchKnowledgePoints(
          analysisResult.knowledgePoints,
          question.subject,
          question.grade,
          standardKnowledgePoints
        );
      }

      // 更新错题记录
      await updateErrorQuestion(input.questionId, {
        errorAnalysis: analysisResult.errorAnalysis,
        correctAnswer: analysisResult.correctAnswer,
        detailedExplanation: analysisResult.detailedExplanation,
        knowledgePointIds: knowledgePointIds,
        difficulty: analysisResult.difficulty,
        // @ts-ignore
        isAnalyzed: true,
      });

      return {
        success: true,
        analysis: {
          errorAnalysis: analysisResult.errorAnalysis,
          correctAnswer: analysisResult.correctAnswer,
          detailedExplanation: analysisResult.detailedExplanation,
          knowledgePoints: analysisResult.knowledgePoints,
          knowledgePointIds: knowledgePointIds,
          difficulty: analysisResult.difficulty,
        },
      };
    }),

  /**
   * 批量分析错题
   */
  analyzeMultipleQuestions: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()).min(1).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const questionId of input.questionIds) {
        try {
          const question = await getErrorQuestionById(questionId);
          
          if (!question || question.userId !== ctx.user.id) {
            results.push({
              questionId,
              success: false,
              error: "错题不存在或无权访问",
            });
            continue;
          }

          const analysisResult = await analyzeErrorQuestion(
            question.content,
            question.subject,
            question.grade,
            question.userAnswer || undefined
          );

          if (!analysisResult.success) {
            results.push({
              questionId,
              success: false,
              error: analysisResult.error,
            });
            continue;
          }

          const standardKnowledgePoints = await getKnowledgePointsBySubjectAndGrade(
            question.subject,
            question.grade
          );

          let knowledgePointIds: number[] = [];
          if (analysisResult.knowledgePoints && analysisResult.knowledgePoints.length > 0) {
            knowledgePointIds = await matchKnowledgePoints(
              analysisResult.knowledgePoints,
              question.subject,
              question.grade,
              standardKnowledgePoints
            );
          }

          await updateErrorQuestion(questionId, {
            errorAnalysis: analysisResult.errorAnalysis,
            correctAnswer: analysisResult.correctAnswer,
            detailedExplanation: analysisResult.detailedExplanation,
            knowledgePointIds: knowledgePointIds,
            difficulty: analysisResult.difficulty,
            // @ts-ignore
            isAnalyzed: true,
          });

          results.push({
            questionId,
            success: true,
          });
        } catch (error) {
          results.push({
            questionId,
            success: false,
            error: error instanceof Error ? error.message : "分析失败",
          });
        }
      }

      return {
        results,
        successCount: results.filter(r => r.success).length,
        failCount: results.filter(r => !r.success).length,
      };
    }),

  /**
   * 深度分析错题（增强版）
   */
  analyzeQuestionDetailed: protectedProcedure
    .input(z.object({
      questionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const question = await getErrorQuestionById(input.questionId);
      
      if (!question) {
        throw new Error("错题不存在");
      }
      
      if (question.userId !== ctx.user.id) {
        throw new Error("无权分析此错题");
      }

      let correctAnswer = question.correctAnswer;
      if (!correctAnswer) {
        const basicAnalysis = await analyzeErrorQuestion(
          question.content,
          question.subject,
          question.grade,
          question.userAnswer || undefined
        );
        if (basicAnalysis.success && basicAnalysis.correctAnswer) {
          correctAnswer = basicAnalysis.correctAnswer;
          await updateErrorQuestion(input.questionId, {
            correctAnswer: correctAnswer,
          });
        }
      }

      if (!correctAnswer) {
        return {
          success: false,
          error: "无法获取正确答案"
        };
      }

      const detailedResult = await analyzeQuestionDetailed(
        question.content,
        question.userAnswer || "未提供学生答案",
        correctAnswer,
        question.subject,
        question.grade
      );

      if (!detailedResult.success) {
        return {
          success: false,
          error: detailedResult.error
        };
      }

      const aiKnowledgePoints = detailedResult.analysis?.knowledgePoints.map(kp => kp.name) || [];
      const standardKnowledgePoints = await getKnowledgePointsBySubjectAndGrade(
        question.subject,
        question.grade
      );

      let knowledgePointIds: number[] = [];
      if (aiKnowledgePoints.length > 0 && standardKnowledgePoints.length > 0) {
        knowledgePointIds = await matchKnowledgePoints(
          aiKnowledgePoints,
          question.subject,
          question.grade,
          standardKnowledgePoints
        );
      }

      await updateErrorQuestion(input.questionId, {
        errorAnalysis: detailedResult.analysis?.errorAnalysis,
        correctAnswer: correctAnswer,
        detailedExplanation: detailedResult.analysis?.solvingStrategy,
        detailedAnalysis: JSON.stringify(detailedResult.analysis),
        knowledgePointIds: knowledgePointIds,
        difficulty: detailedResult.analysis?.difficulty,
        // @ts-ignore
        isAnalyzed: true,
      });

      return {
        success: true,
        analysis: detailedResult.analysis,
        knowledgePointIds: knowledgePointIds,
      };
    }),
});
