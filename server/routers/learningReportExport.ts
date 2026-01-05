import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { exportReportToPDF, getReportData } from "../learningReportExportService";
import { readFileSync, unlinkSync } from "fs";
import { storagePut } from "../storage";

/**
 * 学习报告导出路由
 */
export const learningReportExportRouter = router({
  /**
   * 获取报告预览数据
   */
  getReportPreview: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const options = {
        userId: ctx.user.openId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      };

      const reportData = await getReportData(options);
      return reportData;
    }),

  /**
   * 导出学习报告为PDF
   */
  exportReport: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        includeCharts: z.boolean().default(true),
        includeDetails: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const options = {
        userId: ctx.user.openId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        includeCharts: input.includeCharts,
        includeDetails: input.includeDetails,
      };

      // 生成PDF
      const pdfPath = await exportReportToPDF(options, ctx.user.name || '学生');

      try {
        // 读取PDF文件
        const pdfBuffer = readFileSync(pdfPath);

        // 上传到S3
        const timestamp = Date.now();
        const fileName = `learning-report-${ctx.user.openId}-${timestamp}.pdf`;
        const { url } = await storagePut(
          `reports/${fileName}`,
          pdfBuffer,
          "application/pdf"
        );

        // 清理临时文件
        unlinkSync(pdfPath);

        return {
          success: true,
          url,
          fileName,
        };
      } catch (error) {
        // 清理临时文件
        try {
          unlinkSync(pdfPath);
        } catch {}

        throw new Error(`导出失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
});
