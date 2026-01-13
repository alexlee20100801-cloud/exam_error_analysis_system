import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as terminologyService from "../terminologyService";

export const terminologyManagementRouter = router({
  // ==================== 术语管理 ====================
  
  // 获取术语列表
  getTerminologyList: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      language: z.enum(["japanese", "korean"]).optional(),
      reviewStatus: z.enum(["pending", "reviewed", "approved", "rejected"]).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return await terminologyService.getTerminologyList(input);
    }),
  
  // 获取术语详情
  getTerminologyById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await terminologyService.getTerminologyById(input.id);
    }),
  
  // 创建术语
  createTerminology: protectedProcedure
    .input(z.object({
      category: z.enum(["general", "math", "physics", "chemistry", "biology", "chinese", "english", "history", "geography", "politics"]),
      subCategory: z.string().optional(),
      termChinese: z.string().min(1),
      termJapanese: z.string().optional(),
      termKorean: z.string().optional(),
      termEnglish: z.string().optional(),
      descriptionChinese: z.string().optional(),
      descriptionJapanese: z.string().optional(),
      descriptionKorean: z.string().optional(),
      descriptionEnglish: z.string().optional(),
      exampleChinese: z.string().optional(),
      exampleJapanese: z.string().optional(),
      exampleKorean: z.string().optional(),
      exampleEnglish: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await terminologyService.createTerminology({
        ...input,
        createdBy: ctx.user.id,
      });
    }),
  
  // 更新术语
  updateTerminology: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        category: z.enum(["general", "math", "physics", "chemistry", "biology", "chinese", "english", "history", "geography", "politics"]).optional(),
        subCategory: z.string().optional(),
        termChinese: z.string().optional(),
        termJapanese: z.string().optional(),
        termKorean: z.string().optional(),
        termEnglish: z.string().optional(),
        descriptionChinese: z.string().optional(),
        descriptionJapanese: z.string().optional(),
        descriptionKorean: z.string().optional(),
        descriptionEnglish: z.string().optional(),
        exampleChinese: z.string().optional(),
        exampleJapanese: z.string().optional(),
        exampleKorean: z.string().optional(),
        exampleEnglish: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await terminologyService.updateTerminology(input.id, input.data);
      return { success: true };
    }),
  
  // 删除术语
  deleteTerminology: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await terminologyService.deleteTerminology(input.id);
      return { success: true };
    }),
  
  // ==================== 校对功能 ====================
  
  // 提交校对
  submitReview: protectedProcedure
    .input(z.object({
      terminologyId: z.number(),
      language: z.enum(["japanese", "korean"]),
      action: z.enum(["approved", "corrected", "rejected"]),
      newTerm: z.string().optional(),
      newDescription: z.string().optional(),
      reviewNotes: z.string().optional(),
      isNativeSpeaker: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      return await terminologyService.submitTerminologyReview({
        ...input,
        reviewerId: ctx.user.id,
        reviewerName: ctx.user.name || undefined,
      });
    }),
  
  // 获取校对历史
  getReviewHistory: publicProcedure
    .input(z.object({ terminologyId: z.number() }))
    .query(async ({ input }) => {
      return await terminologyService.getReviewHistory(input.terminologyId);
    }),
  
  // 获取待校对统计
  getPendingReviewStats: publicProcedure
    .query(async () => {
      return await terminologyService.getPendingReviewStats();
    }),
  
  // ==================== 验证功能 ====================
  
  // 开始验证批次
  startValidation: protectedProcedure
    .input(z.object({
      category: z.string(),
      language: z.enum(["japanese", "korean"]),
    }))
    .mutation(async ({ input, ctx }) => {
      return await terminologyService.startTerminologyValidation({
        ...input,
        validatorId: ctx.user.id,
        validatorName: ctx.user.name || undefined,
      });
    }),
  
  // 更新验证进度
  updateValidationProgress: protectedProcedure
    .input(z.object({
      batchId: z.string(),
      validatedTerms: z.number().optional(),
      correctedTerms: z.number().optional(),
      pendingTerms: z.number().optional(),
      validationScore: z.number().optional(),
      issues: z.string().optional(),
      recommendations: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { batchId, ...data } = input;
      await terminologyService.updateValidationProgress(batchId, data);
      return { success: true };
    }),
  
  // 完成验证
  completeValidation: protectedProcedure
    .input(z.object({
      batchId: z.string(),
      validationScore: z.number(),
      issues: z.string().optional(),
      recommendations: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { batchId, ...data } = input;
      await terminologyService.completeValidation(batchId, data);
      return { success: true };
    }),
  
  // 获取验证历史
  getValidationHistory: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      language: z.enum(["japanese", "korean"]).optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      return await terminologyService.getValidationHistory(input);
    }),
  
  // ==================== 数据导入 ====================
  
  // 导入数学术语
  importMathTerminology: protectedProcedure
    .mutation(async () => {
      return await terminologyService.importMathTerminology();
    }),
  
  // 导入物理术语
  importPhysicsTerminology: protectedProcedure
    .mutation(async () => {
      return await terminologyService.importPhysicsTerminology();
    }),
  
  // 导入化学术语
  importChemistryTerminology: protectedProcedure
    .mutation(async () => {
      return await terminologyService.importChemistryTerminology();
    }),
  
  // 导入所有术语
  importAllTerminology: protectedProcedure
    .mutation(async () => {
      return await terminologyService.importAllTerminology();
    }),
});
