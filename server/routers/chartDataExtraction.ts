import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { chartDataExtractions } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  extractTableDataFromImage,
  extractChartDataFromImage,
  smartExtractData,
  convertToCSV,
  convertToExcelFormat,
} from '../chartDataExtractionService';

export const chartDataExtractionRouter = router({
  // 提取图表数据（完整版）
  extract: protectedProcedure
    .input(z.object({
      imageUrl: z.string(),
      errorQuestionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await smartExtractData(input.imageUrl);
      return result;
    }),

  // 保存提取的数据
  save: protectedProcedure
    .input(z.object({
      errorQuestionId: z.number(),
      imageUrl: z.string(),
      data: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const existing = await db
        .select()
        .from(chartDataExtractions)
        .where(
          and(
            // @ts-ignore
            eq(chartDataExtractions.userId, ctx.user.id),
            eq(chartDataExtractions.errorQuestionId, input.errorQuestionId),
            eq(chartDataExtractions.imageUrl, input.imageUrl)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(chartDataExtractions)
          .set({
            extractedData: input.data,
            // @ts-ignore
            updatedAt: new Date(),
          })
          .where(eq(chartDataExtractions.id, existing[0].id));

        return { success: true, id: existing[0].id };
      } else {
        const result = await db.insert(chartDataExtractions).values({
          // @ts-ignore
          userId: ctx.user.id,
          errorQuestionId: input.errorQuestionId,
          imageUrl: input.imageUrl,
          extractedData: input.data,
        });

        // @ts-ignore
        return { success: true, id: Number(result.insertId) };
      }
    }),

  // 智能提取数据（自动识别类型）
  smartExtract: protectedProcedure
    .input(z.object({
      imageUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await smartExtractData(input.imageUrl);
      return result;
    }),

  // 提取表格数据
  extractTable: protectedProcedure
    .input(z.object({
      imageUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const tableData = await extractTableDataFromImage(input.imageUrl);
      return tableData;
    }),

  // 提取图表数据
  extractChart: protectedProcedure
    .input(z.object({
      imageUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const chartData = await extractChartDataFromImage(input.imageUrl);
      return chartData;
    }),

  // 转换为CSV格式
  convertToCSV: protectedProcedure
    .input(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    }))
    .mutation(async ({ input }) => {
      const csv = convertToCSV(input);
      return { csv };
    }),

  // 转换为Excel格式
  convertToExcel: protectedProcedure
    .input(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    }))
    .mutation(async ({ input }) => {
      const excelData = convertToExcelFormat(input);
      return { data: excelData };
    }),
});
