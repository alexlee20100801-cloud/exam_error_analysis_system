import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { analyzeErrorQuestion, matchKnowledgePoints } from "../aiAnalysisService";
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
});
