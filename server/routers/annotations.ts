import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  getAnnotationsByItem,
  getAnnotationsByImageUrl,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  batchDeleteAnnotations,
} from '../db';

export const annotationsRouter = router({
  // 获取指定项目的所有标注
  getByItem: protectedProcedure
    .input(z.object({
      itemType: z.enum(['error_question', 'practice_pool', 'question_bank', 'real_exam']),
      itemId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const annotations = await getAnnotationsByItem(ctx.user.id, input.itemType, input.itemId);
      return annotations;
    }),

  // 获取指定图片的所有标注
  getByImageUrl: protectedProcedure
    .input(z.object({
      imageUrl: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const annotations = await getAnnotationsByImageUrl(ctx.user.id, input.imageUrl);
      return annotations;
    }),

  // 创建标注
  create: protectedProcedure
    .input(z.object({
      itemType: z.enum(['error_question', 'practice_pool', 'question_bank', 'real_exam']),
      itemId: z.number(),
      imageUrl: z.string(),
      annotationType: z.enum(['marker', 'arrow', 'text', 'highlight', 'rectangle', 'circle']),
      annotationData: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        radius: z.number().optional(),
        text: z.string().optional(),
        color: z.string().optional(),
        fontSize: z.number().optional(),
        startX: z.number().optional(),
        startY: z.number().optional(),
        endX: z.number().optional(),
        endY: z.number().optional(),
      }),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await createAnnotation({
        userId: ctx.user.id,
        itemType: input.itemType,
        itemId: input.itemId,
        imageUrl: input.imageUrl,
        annotationType: input.annotationType,
        annotationData: input.annotationData,
        color: input.color || '#FF0000',
      });
      return { success: true, id: Number(result.insertId) };
    }),

  // 更新标注
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      annotationData: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        radius: z.number().optional(),
        text: z.string().optional(),
        color: z.string().optional(),
        fontSize: z.number().optional(),
        startX: z.number().optional(),
        startY: z.number().optional(),
        endX: z.number().optional(),
        endY: z.number().optional(),
      }).optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};
      if (input.annotationData) updateData.annotationData = input.annotationData;
      if (input.color) updateData.color = input.color;

      await updateAnnotation(input.id, updateData);
      return { success: true };
    }),

  // 删除标注
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await deleteAnnotation(input.id);
      return { success: true };
    }),

  // 批量删除标注
  batchDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      await batchDeleteAnnotations(input.ids);
      return { success: true };
    }),
});
