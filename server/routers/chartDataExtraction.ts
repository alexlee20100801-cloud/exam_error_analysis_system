import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  extractTableDataFromImage,
  extractChartDataFromImage,
  smartExtractData,
  convertToCSV,
  convertToExcelFormat,
} from '../chartDataExtractionService';

export const chartDataExtractionRouter = router({
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
