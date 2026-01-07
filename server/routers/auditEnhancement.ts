/**
 * 批量操作审计增强路由
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getOperationComparisonView,
  generateAuditReport,
  exportAuditReportToCSV,
  exportChangeDetailsToCSV,
  analyzeOperationImpact,
} from "../services/auditEnhancementService";

export const auditEnhancementRouter = router({
  /**
   * 获取操作的详细对比视图
   */
  getComparisonView: protectedProcedure
    .input(
      z.object({
        operationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const comparisonView = await getOperationComparisonView(input.operationId);
      return comparisonView;
    }),

  /**
   * 生成审计报告
   */
  generateReport: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        userId: z.number().optional(),
        operationType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const report = await generateAuditReport(input);
      return report;
    }),

  /**
   * 导出审计报告为CSV
   */
  exportReportCSV: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        userId: z.number().optional(),
        operationType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const report = await generateAuditReport(input);
      const csv = exportAuditReportToCSV(report);
      
      return {
        csv,
        filename: `audit_report_${new Date().toISOString().split('T')[0]}.csv`,
      };
    }),

  /**
   * 导出操作变更详情为CSV
   */
  exportChangeDetailsCSV: protectedProcedure
    .input(
      z.object({
        operationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const comparisonView = await getOperationComparisonView(input.operationId);
      const csv = exportChangeDetailsToCSV(input.operationId, comparisonView.changes);
      
      return {
        csv,
        filename: `operation_${input.operationId}_changes.csv`,
      };
    }),

  /**
   * 分析操作影响范围
   */
  analyzeImpact: protectedProcedure
    .input(
      z.object({
        operationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const impact = await analyzeOperationImpact(input.operationId);
      return impact;
    }),
});
