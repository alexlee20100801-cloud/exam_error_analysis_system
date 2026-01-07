import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createCropTemplate,
  getUserCropTemplates,
  getCropTemplatesByCategory,
  getCropTemplateById,
  updateCropTemplate,
  deleteCropTemplate,
  incrementTemplateUsage,
  getPublicCropTemplates,
} from "../cropTemplatesService";

export const cropTemplatesRouter = router({
  /**
   * 创建新的框选模板
   */
  create: protectedProcedure
    .input(
      z.object({
        templateName: z.string().min(1).max(255),
        description: z.string().optional(),
        regions: z.array(
          z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
            label: z.string().optional(),
          })
        ),
        thumbnailUrl: z.string().optional(),
        category: z.enum(['choice', 'blank', 'short_answer', 'calculation', 'essay', 'custom']).default('custom'),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await createCropTemplate({
        userId: ctx.user.id,
        templateName: input.templateName,
        description: input.description,
        regions: input.regions,
        thumbnailUrl: input.thumbnailUrl,
        category: input.category,
        isPublic: input.isPublic ? 1 : 0,
      });
      return template;
    }),

  /**
   * 获取用户的所有模板
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserCropTemplates(ctx.user.id);
  }),

  /**
   * 按类别获取模板
   */
  listByCategory: protectedProcedure
    .input(
      z.object({
        category: z.enum(['choice', 'blank', 'short_answer', 'calculation', 'essay', 'custom']),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getCropTemplatesByCategory(ctx.user.id, input.category);
    }),

  /**
   * 获取模板详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getCropTemplateById(input.id, ctx.user.id);
    }),

  /**
   * 更新模板
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        templateName: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        regions: z
          .array(
            z.object({
              x: z.number(),
              y: z.number(),
              width: z.number(),
              height: z.number(),
              label: z.string().optional(),
            })
          )
          .optional(),
        thumbnailUrl: z.string().optional(),
        category: z.enum(['choice', 'blank', 'short_answer', 'calculation', 'essay', 'custom']).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, isPublic, ...rest } = input;
      const updateData = {
        ...rest,
        ...(isPublic !== undefined && { isPublic: isPublic ? 1 : 0 }),
      };
      return await updateCropTemplate(id, ctx.user.id, updateData);
    }),

  /**
   * 删除模板
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteCropTemplate(input.id, ctx.user.id);
      return { success };
    }),

  /**
   * 应用模板（增加使用次数）
   */
  applyTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await incrementTemplateUsage(input.id);
      return { success: true };
    }),

  /**
   * 获取公共模板
   */
  listPublic: protectedProcedure.query(async () => {
    return await getPublicCropTemplates();
  }),
});
