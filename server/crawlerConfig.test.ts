import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import * as crawlerConfigService from "./services/crawlerConfigService";
import { crawlerSelectorRules, crawlerPerformanceStats } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("爬虫配置管理服务测试", () => {
  let testRuleId: number;

  beforeAll(async () => {
    // 清理测试数据
    await db.delete(crawlerPerformanceStats);
    await db.delete(crawlerSelectorRules);
  });

  afterAll(async () => {
    // 清理测试数据
    if (testRuleId) {
      await db.delete(crawlerPerformanceStats).where(eq(crawlerPerformanceStats.ruleId, testRuleId));
      await db.delete(crawlerSelectorRules).where(eq(crawlerSelectorRules.id, testRuleId));
    }
  });

  describe("选择器规则管理", () => {
    it("应该能够创建选择器规则", async () => {
      const newRule = await crawlerConfigService.createSelectorRule({
        websiteName: "测试网站",
        websiteUrl: "https://test.com",
        ruleType: "css_selector",
        targetField: "question_content",
        selectorRule: ".question-content",
        priority: 1,
      });

      expect(newRule).toBeDefined();
      testRuleId = newRule.insertId;
    });

    it("应该能够获取所有选择器规则", async () => {
      const rules = await crawlerConfigService.getAllSelectorRules();
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it("应该能够按网站名称筛选规则", async () => {
      const rules = await crawlerConfigService.getAllSelectorRules("测试网站");
      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].websiteName).toBe("测试网站");
    });

    it("应该能够获取单个选择器规则", async () => {
      const rule = await crawlerConfigService.getSelectorRuleById(testRuleId);
      expect(rule).toBeDefined();
      expect(rule.websiteName).toBe("测试网站");
      expect(rule.targetField).toBe("question_content");
    });

    it("应该能够更新选择器规则", async () => {
      const updatedRule = await crawlerConfigService.updateSelectorRule(testRuleId, {
        priority: 5,
        fallbackRule: ".fallback-selector",
      });

      expect(updatedRule).toBeDefined();
      expect(updatedRule.priority).toBe(5);
      expect(updatedRule.fallbackRule).toBe(".fallback-selector");
    });
  });

  describe("性能统计管理", () => {
    it("应该能够记录性能统计", async () => {
      const stat = await crawlerConfigService.recordPerformanceStat({
        ruleId: testRuleId,
        websiteName: "测试网站",
        totalAttempts: 1,
        successfulAttempts: 1,
        failedAttempts: 0,
        averageResponseTime: 500,
        dataQualityScore: "0.95",
      });

      expect(stat).toBeDefined();
    });

    it("应该能够更新性能统计", async () => {
      await crawlerConfigService.updatePerformanceStat(
        testRuleId,
        true,
        450,
        0.98,
        undefined
      );

      const stats = await crawlerConfigService.getPerformanceStats(testRuleId);
      expect(stats).toBeDefined();
      expect(stats.length).toBeGreaterThan(0);
    });

    it("应该能够获取性能汇总", async () => {
      const summary = await crawlerConfigService.getPerformanceSummary();
      expect(summary).toBeDefined();
      expect(Array.isArray(summary)).toBe(true);
      
      if (summary.length > 0) {
        const testWebsiteSummary = summary.find(s => s.websiteName === "测试网站");
        expect(testWebsiteSummary).toBeDefined();
        expect(testWebsiteSummary?.successRate).toBeDefined();
      }
    });
  });

  describe("自动调优功能", () => {
    it("应该能够生成调优建议", async () => {
      const suggestions = await crawlerConfigService.autoTuneRules("测试网站");
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("成功率低的规则应该收到优化建议", async () => {
      // 创建一个成功率低的规则
      const lowSuccessRule = await crawlerConfigService.createSelectorRule({
        websiteName: "低成功率网站",
        websiteUrl: "https://low-success.com",
        ruleType: "css_selector",
        targetField: "test_field",
        selectorRule: ".test",
        priority: 1,
      });

      const lowRuleId = lowSuccessRule.insertId;

      // 记录多次失败的统计
      await crawlerConfigService.recordPerformanceStat({
        ruleId: lowRuleId,
        websiteName: "低成功率网站",
        totalAttempts: 20,
        successfulAttempts: 5,
        failedAttempts: 15,
        averageResponseTime: 1000,
        dataQualityScore: "0.30",
      });

      // 更新规则的成功率
      await crawlerConfigService.updateSelectorRule(lowRuleId, {
        successRate: "25.00",
      });

      const suggestions = await crawlerConfigService.autoTuneRules("低成功率网站");
      expect(suggestions.length).toBeGreaterThan(0);
      
      const lowSuccessSuggestion = suggestions.find(s => s.ruleId === lowRuleId);
      expect(lowSuccessSuggestion).toBeDefined();
      expect(lowSuccessSuggestion?.suggestion).toContain("成功率过低");

      // 清理
      await db.delete(crawlerPerformanceStats).where(eq(crawlerPerformanceStats.ruleId, lowRuleId));
      await db.delete(crawlerSelectorRules).where(eq(crawlerSelectorRules.id, lowRuleId));
    });
  });

  describe("规则删除", () => {
    it("应该能够删除选择器规则", async () => {
      await crawlerConfigService.deleteSelectorRule(testRuleId);
      
      const deletedRule = await crawlerConfigService.getSelectorRuleById(testRuleId);
      expect(deletedRule).toBeUndefined();
    });
  });
});
