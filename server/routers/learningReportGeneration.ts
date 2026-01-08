import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  generateLearningReport,
  getUserLearningReports,
  getLearningReportById,
} from "../learningReportService";

export const learningReportGenerationRouter = router({
  /**
   * 生成学习报告
   */
  generate: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(['weekly', 'monthly']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reportId = await generateLearningReport(ctx.user.id, input.reportType);
      return { reportId };
    }),

  /**
   * 获取用户的学习报告列表
   */
  getReports: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const reports = await getUserLearningReports(ctx.user.id, input?.limit);
      return reports;
    }),

  /**
   * 获取学习报告详情
   */
  getReportById: protectedProcedure
    .input(
      z.object({
        reportId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const report = await getLearningReportById(input.reportId, ctx.user.id);
      return report;
    }),
});
