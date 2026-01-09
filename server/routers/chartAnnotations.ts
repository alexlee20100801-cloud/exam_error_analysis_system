import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { chartAnnotations } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const chartAnnotationsRouter = router({
  // 保存图表标注
  save: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
        imageUrl: z.string(),
        annotations: z.array(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // 检查是否已存在该错题的标注
      const existing = await db
        .select()
        .from(chartAnnotations)
        .where(
          and(
            // @ts-ignore
            eq(chartAnnotations.userId, ctx.user.id),
            eq(chartAnnotations.errorQuestionId, input.errorQuestionId),
            eq(chartAnnotations.imageUrl, input.imageUrl)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 更新现有标注
        await db
          .update(chartAnnotations)
          .set({
            annotations: input.annotations,
            // @ts-ignore
            updatedAt: new Date(),
          })
          .where(eq(chartAnnotations.id, existing[0].id));

        return { success: true, id: existing[0].id };
      } else {
        // 创建新标注
        const result = await db.insert(chartAnnotations).values({
          // @ts-ignore
          userId: ctx.user.id,
          errorQuestionId: input.errorQuestionId,
          imageUrl: input.imageUrl,
          annotations: input.annotations,
        });

        // @ts-ignore
        return { success: true, id: Number(result.insertId) };
      }
    }),

  // 获取图表标注
  get: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
        imageUrl: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const result = await db
        .select()
        .from(chartAnnotations)
        .where(
          and(
            // @ts-ignore
            eq(chartAnnotations.userId, ctx.user.id),
            eq(chartAnnotations.errorQuestionId, input.errorQuestionId),
            eq(chartAnnotations.imageUrl, input.imageUrl)
          )
        )
        .limit(1);

      return result[0] || null;
    }),

  // 获取错题的所有图表标注
  listByQuestion: protectedProcedure
    .input(z.object({ errorQuestionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const result = await db
        .select()
        .from(chartAnnotations)
        .where(
          and(
            // @ts-ignore
            eq(chartAnnotations.userId, ctx.user.id),
            eq(chartAnnotations.errorQuestionId, input.errorQuestionId)
          )
        )
        .orderBy(desc(chartAnnotations.updatedAt));

      return result;
    }),

  // 删除图表标注
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db
        .delete(chartAnnotations)
        .where(
          // @ts-ignore
          and(eq(chartAnnotations.id, input.id), eq(chartAnnotations.userId, ctx.user.id))
        );

      return { success: true };
    }),
});
