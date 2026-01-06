/**
 * 智能组卷API路由
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { smartPaperGenerationService } from "../services/smart-paper-generation.service";

// 题型分布配置schema
const questionTypeDistributionSchema = z.object({
  type: z.enum(["single_choice", "multiple_choice", "fill_blank", "short_answer", "essay"]),
  count: z.number().int().min(1),
  scorePerQuestion: z.number().min(0.5),
});

// 组卷配置schema
const paperGenerationConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  grade: z.string(),
  subject: z.string(),
  knowledgePointIds: z.array(z.number()).optional(),
  knowledgePointCoverage: z.enum(["all", "partial"]).optional(),
  difficultyDistribution: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  }),
  questionTypeDistribution: z.array(questionTypeDistributionSchema),
  totalScore: z.number().min(1),
  timeLimit: z.number().optional(),
  avoidDuplicateKnowledgePoints: z.boolean().optional(),
  prioritizeRecentQuestions: z.boolean().optional(),
});

export const smartPaperRouter = router({
  /**
   * 生成试卷
   */
  generate: protectedProcedure
    .input(paperGenerationConfigSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await smartPaperGenerationService.generatePaper(input as any);
        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "生成试卷失败",
        };
      }
    }),

  /**
   * 评估试卷质量
   */
  evaluateQuality: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
    }))
    .query(async ({ input }) => {
      try {
        const result = await smartPaperGenerationService.evaluatePaperQuality(input.questionIds);
        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "评估试卷质量失败",
        };
      }
    }),

  /**
   * 获取推荐的组卷配置
   */
  getRecommendedConfig: protectedProcedure
    .input(z.object({
      grade: z.string(),
      subject: z.string(),
      examType: z.enum(["midterm", "final", "monthly", "practice"]).optional(),
    }))
    .query(async ({ input }) => {
      // 根据年级、学科和考试类型返回推荐的组卷配置
      const { grade, subject, examType = "practice" } = input;
      
      // 基础配置模板
      const baseConfig = {
        title: `${grade}-${subject}${examType === "practice" ? "练习" : "考试"}试卷`,
        grade,
        subject,
        difficultyDistribution: {
          easy: 30,
          medium: 50,
          hard: 20,
        },
        totalScore: 100,
        timeLimit: 90,
        avoidDuplicateKnowledgePoints: true,
        prioritizeRecentQuestions: true,
      };
      
      // 根据考试类型调整配置
      if (examType === "final") {
        baseConfig.difficultyDistribution = {
          easy: 25,
          medium: 50,
          hard: 25,
        };
        baseConfig.timeLimit = 120;
      } else if (examType === "midterm") {
        baseConfig.difficultyDistribution = {
          easy: 30,
          medium: 45,
          hard: 25,
        };
        baseConfig.timeLimit = 100;
      }
      
      // 根据学科调整题型分布
      let questionTypeDistribution;
      if (subject === "math" || subject === "physics" || subject === "chemistry") {
        questionTypeDistribution = [
          { type: "single_choice", count: 10, scorePerQuestion: 3 },
          { type: "fill_blank", count: 5, scorePerQuestion: 4 },
          { type: "short_answer", count: 4, scorePerQuestion: 8 },
          { type: "essay", count: 2, scorePerQuestion: 12 },
        ];
      } else if (subject === "chinese" || subject === "english") {
        questionTypeDistribution = [
          { type: "single_choice", count: 15, scorePerQuestion: 2 },
          { type: "fill_blank", count: 5, scorePerQuestion: 3 },
          { type: "short_answer", count: 3, scorePerQuestion: 10 },
          { type: "essay", count: 1, scorePerQuestion: 25 },
        ];
      } else {
        // 其他学科（政治、历史、地理、生物）
        questionTypeDistribution = [
          { type: "single_choice", count: 20, scorePerQuestion: 2 },
          { type: "multiple_choice", count: 5, scorePerQuestion: 3 },
          { type: "short_answer", count: 4, scorePerQuestion: 8 },
          { type: "essay", count: 1, scorePerQuestion: 15 },
        ];
      }
      
      return {
        success: true,
        data: {
          ...baseConfig,
          questionTypeDistribution,
        },
      };
    }),
});
