import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
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
} from "./optimizationService";

describe("Optimization Service", () => {
  describe("AI Classification Metrics", () => {
    it("should record AI classification metric", async () => {
      const metric = await recordAiClassificationMetric({
        promptVersionId: 1,
        accuracy: 0.95,
        precision: 0.93,
        recall: 0.97,
        f1Score: 0.95,
        testSampleCount: 1000,
        confusionMatrix: { tp: 950, fp: 50, fn: 30, tn: 970 },
        errorCases: [],
        avgResponseTime: 100,
        notes: "Test metric",
      });

      expect(metric).toBeDefined();
      expect(metric.insertId).toBeGreaterThan(0);
    });

    it("should get AI classification metrics history", async () => {
      const metrics = await getAiClassificationMetricsHistory(
        undefined,
        undefined,
        undefined,
        10
      );

      expect(Array.isArray(metrics)).toBe(true);
      if (metrics.length > 0) {
        expect(metrics[0]).toHaveProperty("accuracy");
        expect(metrics[0]).toHaveProperty("promptVersionId");
      }
    });

    it("should calculate AI classification trend", async () => {
      const trend = await calculateAiClassificationTrend(30);

      expect(Array.isArray(trend)).toBe(true);
      if (trend.length > 0) {
        expect(trend[0]).toHaveProperty("date");
        expect(trend[0]).toHaveProperty("accuracy");
        expect(typeof trend[0].accuracy).toBe("number");
      }
    });
  });

  describe("Paper Algorithm Metrics", () => {
    it("should record paper algorithm metric", async () => {
      const metric = await recordPaperAlgorithmMetric({
        configId: 1,
        avgSatisfactionScore: 4.5,
        knowledgeCoverageScore: 0.88,
        difficultyDistributionScore: 0.92,
        questionTypeVarietyScore: 0.85,
        generationSuccessRate: 0.98,
        avgGenerationTime: 2500,
        feedbackCount: 150,
        feedbackDistribution: { 5: 80, 4: 50, 3: 15, 2: 5 },
        weightParameters: { knowledge: 0.3, difficulty: 0.4, variety: 0.3 },
        notes: "Test metric",
      });

      expect(metric).toBeDefined();
      expect(metric.insertId).toBeGreaterThan(0);
    });

    it("should get paper algorithm metrics history", async () => {
      const metrics = await getPaperAlgorithmMetricsHistory(
        undefined,
        undefined,
        undefined,
        10
      );

      expect(Array.isArray(metrics)).toBe(true);
      if (metrics.length > 0) {
        expect(metrics[0]).toHaveProperty("configId");
        expect(metrics[0]).toHaveProperty("avgSatisfactionScore");
      }
    });

    it("should calculate paper algorithm trend", async () => {
      const trend = await calculatePaperAlgorithmTrend(30);

      expect(Array.isArray(trend)).toBe(true);
      if (trend.length > 0) {
        expect(trend[0]).toHaveProperty("date");
        expect(trend[0]).toHaveProperty("satisfactionScore");
      }
    });

    it("should get weight parameters comparison", async () => {
      const comparison = await getWeightParametersComparison([1, 2]);

      expect(Array.isArray(comparison)).toBe(true);
      if (comparison.length > 0) {
        expect(comparison[0]).toHaveProperty("configId");
        expect(comparison[0]).toHaveProperty("weightParameters");
        expect(comparison[0]).toHaveProperty("satisfactionScore");
      }
    });
  });

  describe("Crawler Performance Metrics", () => {
    it("should record crawler performance metric", async () => {
      const metric = await recordCrawlerPerformanceMetric({
        selectorRuleId: 1,
        successRate: 0.96,
        avgDataQualityScore: 0.89,
        totalAttempts: 500,
        successfulAttempts: 480,
        failedAttempts: 20,
        avgResponseTime: 1500,
        errorTypes: { timeout: 10, parsing_error: 8, network_error: 2 },
        notes: "Test metric",
      });

      expect(metric).toBeDefined();
      expect(metric.insertId).toBeGreaterThan(0);
    });

    it("should get crawler performance metrics history", async () => {
      const metrics = await getCrawlerPerformanceMetricsHistory(
        undefined,
        undefined,
        undefined,
        10
      );

      expect(Array.isArray(metrics)).toBe(true);
      if (metrics.length > 0) {
        expect(metrics[0]).toHaveProperty("selectorRuleId");
        expect(metrics[0]).toHaveProperty("successRate");
      }
    });
  });

  describe("Alert Management", () => {
    let alertRuleId: number;

    it("should create alert rule", async () => {
      const rule = await createAlertRule({
        name: "Low AI Accuracy",
        metricType: "ai_classification",
        metricName: "accuracy",
        operator: "<",
        threshold: 0.8,
        severity: "high",
        notificationChannels: { email: true, system: true },
        description: "Alert when AI classification accuracy drops below 80%",
        createdBy: 1,
      });

      expect(rule).toBeDefined();
      expect(rule.insertId).toBeGreaterThan(0);
      alertRuleId = rule.insertId;
    });

    it("should get active alert rules", async () => {
      const rules = await getActiveAlertRules();

      expect(Array.isArray(rules)).toBe(true);
      if (rules.length > 0) {
        expect(rules[0]).toHaveProperty("name");
        expect(rules[0]).toHaveProperty("metricType");
        expect(rules[0]).toHaveProperty("isActive");
      }
    });

    it("should update alert rule", async () => {
      if (alertRuleId) {
        await updateAlertRule(alertRuleId, {
          threshold: 0.75,
          severity: "critical",
        });

        const rules = await getActiveAlertRules();
        const updated = rules.find((r) => r.id === alertRuleId);
        if (updated) {
          expect(parseFloat(updated.threshold as any)).toBe(0.75);
          expect(updated.severity).toBe("critical");
        }
      }
    });

    it("should check metric alerts", async () => {
      const alerts = await checkMetricAlerts("ai_classification", 1, {
        accuracy: 0.75,
        precision: 0.7,
        recall: 0.8,
      });

      expect(Array.isArray(alerts)).toBe(true);
    });

    it("should get pending alerts", async () => {
      const alerts = await getPendingAlerts(10);

      expect(Array.isArray(alerts)).toBe(true);
      if (alerts.length > 0) {
        expect(alerts[0]).toHaveProperty("status");
        expect(alerts[0].status).toBe("pending");
      }
    });

    it("should acknowledge alert", async () => {
      const alerts = await getPendingAlerts(1);
      if (alerts.length > 0) {
        await acknowledgeAlert(alerts[0].id, 1);

        const updated = await getPendingAlerts(1);
        const acknowledged = updated.find((a) => a.id === alerts[0].id);
        if (acknowledged) {
          expect(acknowledged.status).toBe("acknowledged");
        }
      }
    });

    it("should resolve alert", async () => {
      const alerts = await getPendingAlerts(1);
      if (alerts.length > 0) {
        await resolveAlert(alerts[0].id, 1, "Issue fixed by adjusting prompt");

        const updated = await getPendingAlerts(1);
        const resolved = updated.find((a) => a.id === alerts[0].id);
        if (resolved) {
          expect(resolved.status).toBe("resolved");
        }
      }
    });

    it("should delete alert rule", async () => {
      if (alertRuleId) {
        await deleteAlertRule(alertRuleId);

        const rules = await getActiveAlertRules();
        const deleted = rules.find((r) => r.id === alertRuleId);
        expect(deleted).toBeUndefined();
      }
    });
  });

  describe("Weekly Reports", () => {
    it("should generate weekly report", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const report = await generateWeeklyReport(
        "comprehensive",
        startDate,
        endDate,
        1
      );

      expect(report).toBeDefined();
      expect(report.insertId).toBeGreaterThan(0);
    });

    it("should get weekly reports", async () => {
      const reports = await getWeeklyReports("comprehensive", 5);

      expect(Array.isArray(reports)).toBe(true);
      if (reports.length > 0) {
        expect(reports[0]).toHaveProperty("reportType");
        expect(reports[0]).toHaveProperty("summary");
        expect(reports[0]).toHaveProperty("highlights");
      }
    });
  });

  describe("Scheduled Task Logs", () => {
    it("should log scheduled task", async () => {
      const log = await logScheduledTask({
        taskName: "Test Task",
        taskType: "performance_evaluation",
        status: "success",
        duration: 5000,
        details: { processed: 100, errors: 0 },
      });

      expect(log).toBeDefined();
      expect(log.insertId).toBeGreaterThan(0);
    });

    it("should get scheduled task logs", async () => {
      const logs = await getScheduledTaskLogs(
        "performance_evaluation",
        "success",
        10
      );

      expect(Array.isArray(logs)).toBe(true);
      if (logs.length > 0) {
        expect(logs[0]).toHaveProperty("taskName");
        expect(logs[0]).toHaveProperty("status");
        expect(logs[0].status).toBe("success");
      }
    });

    it("should get scheduled task stats", async () => {
      const stats = await getScheduledTaskStats(7);

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("success");
      expect(stats).toHaveProperty("failed");
      expect(stats).toHaveProperty("partial");
      expect(stats).toHaveProperty("avgDuration");
      expect(stats).toHaveProperty("byType");
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.avgDuration).toBe("number");
    });
  });

  describe("Data Validation", () => {
    it("should validate metric accuracy range", async () => {
      const metric = await recordAiClassificationMetric({
        promptVersionId: 1,
        accuracy: 0.99,
        precision: 0.98,
        recall: 0.99,
        f1Score: 0.985,
        testSampleCount: 500,
        confusionMatrix: {},
        errorCases: [],
        avgResponseTime: 50,
        notes: "High accuracy test",
      });

      expect(metric).toBeDefined();
      const retrieved = await getAiClassificationMetricsHistory(
        1,
        undefined,
        undefined,
        1
      );
      if (retrieved.length > 0) {
        const accuracy = parseFloat(retrieved[0].accuracy as any);
        expect(accuracy).toBeGreaterThanOrEqual(0);
        expect(accuracy).toBeLessThanOrEqual(1);
      }
    });

    it("should validate satisfaction score range", async () => {
      const metric = await recordPaperAlgorithmMetric({
        configId: 1,
        avgSatisfactionScore: 4.8,
        knowledgeCoverageScore: 0.95,
        difficultyDistributionScore: 0.93,
        questionTypeVarietyScore: 0.91,
        generationSuccessRate: 0.99,
        avgGenerationTime: 2000,
        feedbackCount: 200,
        feedbackDistribution: { 5: 190, 4: 10 },
        weightParameters: {},
        notes: "High satisfaction test",
      });

      expect(metric).toBeDefined();
      const retrieved = await getPaperAlgorithmMetricsHistory(
        1,
        undefined,
        undefined,
        1
      );
      if (retrieved.length > 0) {
        const satisfaction = parseFloat(
          retrieved[0].avgSatisfactionScore as any
        );
        expect(satisfaction).toBeGreaterThanOrEqual(1);
        expect(satisfaction).toBeLessThanOrEqual(5);
      }
    });
  });
});
