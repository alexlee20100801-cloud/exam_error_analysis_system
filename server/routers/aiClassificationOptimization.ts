import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as aiClassificationOptimizationService from "../services/aiClassificationOptimizationService";

export const aiClassificationOptimizationRouter = router({
  // 添加测试样本
  addTestSample: protectedProcedure
    .input(
      z.object({
        questionContent: z.string(),
        questionImage: z.string().optional(),
        expectedSubject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
        expectedGrade: z.enum(["grade7", "grade8", "grade9", "grade10", "grade11", "grade12"]),
        expectedDifficulty: z.enum(["easy", "medium", "hard"]),
        expectedKnowledgePoints: z.array(z.string()).optional(),
        dataSource: z.enum(["user_feedback", "manual_annotation", "expert_review"]),
        annotatedBy: z.number().optional(),
        confidence: z.number().min(0).max(1).default(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // @ts-ignore
      return await aiClassificationOptimizationService.addTestSample({
        ...input,
        expectedKnowledgePoints: input.expectedKnowledgePoints ? JSON.stringify(input.expectedKnowledgePoints) : null,
      });
    }),

  // 获取所有测试样本
  getTestSamples: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        grade: z.string().optional(),
        dataSource: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await aiClassificationOptimizationService.getAllTestSamples(input);
    }),

  // 删除测试样本
  deleteTestSample: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await aiClassificationOptimizationService.deleteTestSample(input.id);
      return { success: true };
    }),

  // 创建prompt版本
  createPromptVersion: protectedProcedure
    .input(
      z.object({
        versionName: z.string(),
        promptType: z.enum(["classification", "analysis", "recommendation"]),
        promptContent: z.string(),
        systemMessage: z.string().optional(),
        temperature: z.number().min(0).max(2).default(0.7),
        maxTokens: z.number().default(2000),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await aiClassificationOptimizationService.createPromptVersion({
        ...input,
        temperature: input.temperature.toString(),
        createdBy: ctx.user?.id,
      });
    }),

  // 获取所有prompt版本
  getPromptVersions: protectedProcedure
    .input(
      z.object({
        promptType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await aiClassificationOptimizationService.getAllPromptVersions(input.promptType);
    }),

  // 获取激活的prompt版本
  getActivePromptVersion: protectedProcedure
    .input(
      z.object({
        promptType: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await aiClassificationOptimizationService.getActivePromptVersion(input.promptType);
    }),

  // 激活prompt版本
  activatePromptVersion: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        promptType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await aiClassificationOptimizationService.activatePromptVersion(
        input.id,
        input.promptType
      );
    }),

  // 更新prompt版本
  updatePromptVersion: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        versionName: z.string().optional(),
        promptContent: z.string().optional(),
        systemMessage: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await aiClassificationOptimizationService.updatePromptVersion(id, {
        ...updates,
        temperature: updates.temperature?.toString(),
      });
    }),

  // 评估prompt版本
  evaluatePromptVersion: protectedProcedure
    .input(
      z.object({
        promptVersionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await aiClassificationOptimizationService.evaluatePromptVersion(
        input.promptVersionId
      );
    }),

  // 获取评估历史
  getEvaluationHistory: protectedProcedure
    .input(
      z.object({
        promptVersionId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await aiClassificationOptimizationService.getEvaluationHistory(
        input.promptVersionId
      );
    }),

  // 获取优化建议
  getOptimizationSuggestions: protectedProcedure
    .input(
      z.object({
        promptVersionId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await aiClassificationOptimizationService.generatePromptOptimizationSuggestions(
        input.promptVersionId
      );
    }),
});
