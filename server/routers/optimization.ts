import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  recordAiClassificationMetric,
  getAiClassificationMetricsHistory,
  calculateAiClassificationTrend,
  recordPaperAlgorithmMetric,
  getPaperAlgorithmMetricsHistory,
  calculatePaperAlgorithmTrend,
  getWeightParametersComparison,
  recordCrawlerPerformanceMetric,
  getCrawlerPerformanceMetricsHistory,
  createAlertRule,
  getActiveAlertRules,
  updateAlertRule,
  deleteAlertRule,
  checkMetricAlerts,
  getPendingAlerts,
  acknowledgeAlert,
  resolveAlert,
  generateWeeklyReport,
  getWeeklyReports,
  logScheduledTask,
  getScheduledTaskLogs,
  getScheduledTaskStats,
} from "../optimizationService";

export const optimizationRouter = router({
  // ==================== AI分类性能 ====================
  
  /**
   * 记录AI分类性能指标
   */
  recordAiClassificationMetric: protectedProcedure
    .input(
      z.object({
        promptVersionId: z.number(),
        accuracy: z.number().min(0).max(1),
        precision: z.number().min(0).max(1).optional(),
        recall: z.number().min(0).max(1).optional(),
        f1Score: z.number().min(0).max(1).optional(),
        testSampleCount: z.number(),
        confusionMatrix: z.any().optional(),
        errorCases: z.any().optional(),
        avgResponseTime: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // @ts-ignore
      return await recordAiClassificationMetric(input);
    }),

  /**
   * 获取AI分类性能历史
   */
  getAiClassificationMetricsHistory: protectedProcedure
    .input(
      z.object({
        promptVersionId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getAiClassificationMetricsHistory(
        input.promptVersionId,
        input.startDate,
        input.endDate,
        input.limit
      );
    }),

  /**
   * 获取AI分类准确率趋势
   */
  getAiClassificationTrend: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ input }) => {
      return await calculateAiClassificationTrend(input.days);
    }),

  // ==================== 组卷算法性能 ====================

  /**
   * 记录组卷算法性能指标
   */
  recordPaperAlgorithmMetric: protectedProcedure
    .input(
      z.object({
        configId: z.number(),
        avgSatisfactionScore: z.number().min(1).max(5).optional(),
        knowledgeCoverageScore: z.number().optional(),
        difficultyDistributionScore: z.number().optional(),
        questionTypeVarietyScore: z.number().optional(),
        generationSuccessRate: z.number().min(0).max(1).optional(),
        avgGenerationTime: z.number().optional(),
        feedbackCount: z.number(),
        feedbackDistribution: z.any().optional(),
        weightParameters: z.any().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // @ts-ignore
      return await recordPaperAlgorithmMetric(input);
    }),

  /**
   * 获取组卷算法性能历史
   */
  getPaperAlgorithmMetricsHistory: protectedProcedure
    .input(
      z.object({
        configId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getPaperAlgorithmMetricsHistory(
        input.configId,
        input.startDate,
        input.endDate,
        input.limit
      );
    }),

  /**
   * 获取组卷算法满意度趋势
   */
  getPaperAlgorithmTrend: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ input }) => {
      return await calculatePaperAlgorithmTrend(input.days);
    }),

  /**
   * 获取权重参数对比数据
   */
  getWeightParametersComparison: protectedProcedure
    .input(z.object({ configIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      return await getWeightParametersComparison(input.configIds);
    }),

  // ==================== 爬虫性能 ====================

  /**
   * 记录爬虫性能指标
   */
  recordCrawlerPerformanceMetric: protectedProcedure
    .input(
      z.object({
        selectorRuleId: z.number(),
        successRate: z.number().min(0).max(1),
        avgDataQualityScore: z.number().optional(),
        totalAttempts: z.number(),
        successfulAttempts: z.number(),
        failedAttempts: z.number(),
        avgResponseTime: z.number().optional(),
        errorTypes: z.any().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // @ts-ignore
      return await recordCrawlerPerformanceMetric(input);
    }),

  /**
   * 获取爬虫性能历史
   */
  getCrawlerPerformanceMetricsHistory: protectedProcedure
    .input(
      z.object({
        selectorRuleId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getCrawlerPerformanceMetricsHistory(
        input.selectorRuleId,
        input.startDate,
        input.endDate,
        input.limit
      );
    }),

  // ==================== 告警管理 ====================

  /**
   * 创建告警规则
   */
  createAlertRule: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        metricType: z.enum(["ai_classification", "paper_algorithm", "crawler_performance"]),
        metricName: z.string(),
        operator: z.enum(["<", "<=", ">", ">=", "=="]),
        threshold: z.number(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        notificationChannels: z.any(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // @ts-ignore
      return await createAlertRule({
        ...input,
        createdBy: ctx.user.id,
      });
    }),

  /**
   * 获取所有活跃的告警规则
   */
  getActiveAlertRules: protectedProcedure.query(async () => {
    return await getActiveAlertRules();
  }),

  /**
   * 更新告警规则
   */
  updateAlertRule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        operator: z.enum(["<", "<=", ">", ">=", "=="]).optional(),
        threshold: z.number().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        notificationChannels: z.any().optional(),
        isActive: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      // @ts-ignore
      return await updateAlertRule(id, updates);
    }),

  /**
   * 删除告警规则
   */
  deleteAlertRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteAlertRule(input.id);
    }),

  /**
   * 获取待处理的告警
   */
  getPendingAlerts: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return await getPendingAlerts(input.limit);
    }),

  /**
   * 确认告警
   */
  acknowledgeAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await acknowledgeAlert(input.alertId, ctx.user.id);
    }),

  /**
   * 解决告警
   */
  resolveAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        notes: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await resolveAlert(input.alertId, ctx.user.id, input.notes);
    }),

  // ==================== 周报生成 ====================

  /**
   * 生成周报
   */
  generateWeeklyReport: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(["ai_classification", "paper_algorithm", "crawler_performance", "comprehensive"]),
        weekStartDate: z.date(),
        weekEndDate: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await generateWeeklyReport(
        input.reportType,
        input.weekStartDate,
        input.weekEndDate,
        ctx.user.id
      );
    }),

  /**
   * 获取周报列表
   */
  getWeeklyReports: protectedProcedure
    .input(
      z.object({
        reportType: z.string().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getWeeklyReports(input.reportType, input.limit);
    }),

  // ==================== 定时任务日志 ====================

  /**
   * 记录定时任务执行日志
   */
  logScheduledTask: protectedProcedure
    .input(
      z.object({
        taskName: z.string(),
        taskType: z.enum([
          "performance_evaluation",
          "weekly_report_generation",
          "alert_check",
          "cache_warmup",
          "ab_test_decision",
        ]),
        status: z.enum(["success", "failed", "partial"]),
        duration: z.number().optional(),
        details: z.any().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await logScheduledTask(input);
    }),

  /**
   * 获取定时任务执行历史
   */
  getScheduledTaskLogs: protectedProcedure
    .input(
      z.object({
        taskType: z.string().optional(),
        status: z.enum(["success", "failed", "partial"]).optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getScheduledTaskLogs(input.taskType, input.status, input.limit);
    }),

  /**
   * 获取定时任务统计
   */
  getScheduledTaskStats: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ input }) => {
      return await getScheduledTaskStats(input.days);
    }),
});
