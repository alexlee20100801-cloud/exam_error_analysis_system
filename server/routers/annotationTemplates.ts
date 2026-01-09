import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as templateService from "../services/annotationTemplateService";

export const annotationTemplatesRouter = router({
  // 获取公开模板列表
  getPublicTemplates: protectedProcedure
    .input(
      z.object({
        category: z.enum([
          "coordinate_system",
          "function_graph",
          "geometry",
          "physics_experiment",
          "chemistry_apparatus",
          "data_chart",
          "custom",
        ]).optional(),
        subject: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await templateService.getPublicTemplates(input);
    }),

  // 获取用户创建的模板
  getUserTemplates: protectedProcedure.query(async ({ ctx }) => {
    return await templateService.getUserTemplates(ctx.user.id);
  }),

  // 获取单个模板详情
  getTemplateById: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      return await templateService.getTemplateById(input.templateId);
    }),

  // 创建新模板
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        category: z.enum([
          "coordinate_system",
          "function_graph",
          "geometry",
          "physics_experiment",
          "chemistry_apparatus",
          "data_chart",
          "custom",
        ]),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        annotations: z.array(z.any()),
        subject: z.string(),
        isPublic: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await templateService.createTemplate({
        ...input,
        // @ts-ignore
        createdBy: ctx.user.id,
      });
    }),

  // 更新模板
  updateTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        annotations: z.array(z.any()).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId, ...data } = input;
      return await templateService.updateTemplate(
        templateId,
        // @ts-ignore
        ctx.user.id,
        data
      );
    }),

  // 删除模板
  deleteTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await templateService.deleteTemplate(
        input.templateId,
        ctx.user.id
      );
    }),

  // 应用模板（增加使用次数）
  applyTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input }) => {
      await templateService.incrementTemplateUsage(input.templateId);
      return { success: true };
    }),
});
