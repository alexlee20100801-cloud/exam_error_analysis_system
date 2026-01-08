import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as crawlerConfigService from "../services/crawlerConfigService";

export const crawlerConfigRouter = router({
  // 创建选择器规则
  createRule: protectedProcedure
    .input(
      z.object({
        websiteName: z.string(),
        websiteUrl: z.string().url(),
        ruleType: z.enum(["css_selector", "xpath", "regex"]),
        targetField: z.string(),
        selectorRule: z.string(),
        fallbackRule: z.string().optional(),
        priority: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      return await crawlerConfigService.createSelectorRule(input);
    }),

  // 获取所有选择器规则
  getRules: protectedProcedure
    .input(
      z.object({
        websiteName: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await crawlerConfigService.getAllSelectorRules(
        input.websiteName,
        input.isActive
      );
    }),

  // 获取单个选择器规则
  getRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await crawlerConfigService.getSelectorRuleById(input.id);
    }),

  // 更新选择器规则
  updateRule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        websiteName: z.string().optional(),
        websiteUrl: z.string().url().optional(),
        ruleType: z.enum(["css_selector", "xpath", "regex"]).optional(),
        targetField: z.string().optional(),
        selectorRule: z.string().optional(),
        fallbackRule: z.string().optional(),
        priority: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await crawlerConfigService.updateSelectorRule(id, updates);
    }),

  // 删除选择器规则
  deleteRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await crawlerConfigService.deleteSelectorRule(input.id);
      return { success: true };
    }),

  // 记录性能统计
  recordPerformance: protectedProcedure
    .input(
      z.object({
        ruleId: z.number(),
        websiteName: z.string(),
        success: z.boolean(),
        responseTime: z.number(),
        qualityScore: z.number().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await crawlerConfigService.updatePerformanceStat(
        input.ruleId,
        input.success,
        input.responseTime,
        input.qualityScore,
        input.errorMessage
      );
      return { success: true };
    }),

  // 获取性能统计
  getPerformanceStats: protectedProcedure
    .input(
      z.object({
        ruleId: z.number().optional(),
        websiteName: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await crawlerConfigService.getPerformanceStats(
        input.ruleId,
        input.websiteName
      );
    }),

  // 获取性能汇总
  getPerformanceSummary: protectedProcedure
    .input(
      z.object({
        websiteName: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await crawlerConfigService.getPerformanceSummary(input.websiteName);
    }),

  // 自动调优建议
  getAutoTuneSuggestions: protectedProcedure
    .input(
      z.object({
        websiteName: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await crawlerConfigService.autoTuneRules(input.websiteName);
    }),
});
