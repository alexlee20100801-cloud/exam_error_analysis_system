/**
 * 预热任务智能优化功能测试
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import {
  warmupTasks,
  knowledgePointHotness,
  questionTypeHotness,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  generateIntelligentWarmupRecommendations,
  analyzeOptimalWarmupTiming,
  recordWarmupEffectiveness,
  analyzeHistoricalWarmupEffectiveness,
  analyzeCacheCoverage,
} from "./services/warmupIntelligenceService";

describe("预热任务智能优化功能", () => {
  let testKnowledgePointId: number;
  let testWarmupTaskId: number;

  beforeAll(async () => {
    // 创建测试数据 - 热门知识点
    const [kpResult] = await db.insert(knowledgePointHotness).values({
      knowledgePointId: 9999,
      knowledgePointName: "测试知识点-二次函数",
      subject: "数学",
      schoolLevel: "junior",
      accessCount: 150,
      analysisCount: 80,
      questionCount: 200,
      hotnessScore: 85.5,
      lastAccessAt: new Date(),
      statisticsDate: new Date(),
    });
    testKnowledgePointId = kpResult.insertId;

    // 创建测试数据 - 题目类型热度
    await db.insert(questionTypeHotness).values({
      subject: "数学",
      schoolLevel: "junior",
      difficulty: "medium",
      questionTypePattern: JSON.stringify({ type: "choice", hasImage: true }),
      occurrenceCount: 120,
      analysisCount: 60,
      hotnessScore: 75.0,
      statisticsDate: new Date(),
    });

    // 创建测试数据 - 历史预热任务
    const [taskResult] = await db.insert(warmupTasks).values({
      taskName: "测试预热任务",
      taskType: "knowledge_point",
      targetConfig: { knowledgePointId: 9999 },
      priority: 8,
      status: "completed",
      cacheGeneratedCount: 50,
      executionTimeMs: 5000,
      beforeCacheHitRate: 60.0,
      afterCacheHitRate: 78.0,
      hitRateImprovement: 18.0,
      beforeAvgResponseTime: 500,
      afterAvgResponseTime: 350,
      responseTimeImprovement: 30.0,
      effectivenessScore: 85.0,
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    testWarmupTaskId = taskResult.insertId;
  });

  afterAll(async () => {
    // 清理测试数据
    await db.delete(knowledgePointHotness).where(eq(knowledgePointHotness.id, testKnowledgePointId));
    await db.delete(warmupTasks).where(eq(warmupTasks.id, testWarmupTaskId));
  });

  it("应该能够生成智能预热推荐", async () => {
    const recommendations = await generateIntelligentWarmupRecommendations();

    expect(recommendations).toBeDefined();
    expect(Array.isArray(recommendations)).toBe(true);
    
    if (recommendations.length > 0) {
      const firstRec = recommendations[0];
      expect(firstRec).toHaveProperty("taskName");
      expect(firstRec).toHaveProperty("taskType");
      expect(firstRec).toHaveProperty("priority");
      expect(firstRec).toHaveProperty("aiRecommendationScore");
      expect(firstRec).toHaveProperty("aiRecommendationReason");
      expect(firstRec).toHaveProperty("estimatedImpact");
      
      // 验证推荐分数在合理范围内
      expect(firstRec.aiRecommendationScore).toBeGreaterThanOrEqual(0);
      expect(firstRec.aiRecommendationScore).toBeLessThanOrEqual(100);
      
      // 验证优先级在合理范围内
      expect(firstRec.priority).toBeGreaterThanOrEqual(1);
      expect(firstRec.priority).toBeLessThanOrEqual(10);
    }
  });

  it("应该能够分析最佳预热时机", async () => {
    const timing = await analyzeOptimalWarmupTiming();

    expect(timing).toBeDefined();
    expect(timing).toHaveProperty("recommendedTime");
    expect(timing).toHaveProperty("reason");
    expect(timing).toHaveProperty("confidence");
    expect(timing).toHaveProperty("historicalData");

    // 验证推荐时间是未来时间
    expect(timing.recommendedTime.getTime()).toBeGreaterThan(Date.now());

    // 验证置信度在合理范围内
    expect(timing.confidence).toBeGreaterThanOrEqual(0);
    expect(timing.confidence).toBeLessThanOrEqual(1);

    // 验证历史数据结构
    expect(timing.historicalData).toHaveProperty("avgUserActivity");
    expect(timing.historicalData).toHaveProperty("avgSystemLoad");
    expect(timing.historicalData).toHaveProperty("previousWarmupSuccess");
  });

  it("应该能够分析历史预热效果", async () => {
    const effectiveness = await analyzeHistoricalWarmupEffectiveness();

    expect(effectiveness).toBeDefined();
    expect(Array.isArray(effectiveness)).toBe(true);

    if (effectiveness.length > 0) {
      const firstStat = effectiveness[0];
      expect(firstStat).toHaveProperty("taskType");
      expect(firstStat).toHaveProperty("avgHitRateImprovement");
      expect(firstStat).toHaveProperty("avgResponseTimeImprovement");
      expect(firstStat).toHaveProperty("avgEffectivenessScore");
      expect(firstStat).toHaveProperty("successRate");
      expect(firstStat).toHaveProperty("totalCount");
    }
  });

  it("应该能够分析缓存覆盖率", async () => {
    const coverage = await analyzeCacheCoverage();

    expect(coverage).toBeDefined();
    expect(coverage).toHaveProperty("totalHotKnowledgePoints");
    expect(coverage).toHaveProperty("cachedHotKnowledgePoints");
    expect(coverage).toHaveProperty("coverageRate");
    expect(coverage).toHaveProperty("uncoveredKnowledgePoints");

    // 验证覆盖率在合理范围内
    expect(coverage.coverageRate).toBeGreaterThanOrEqual(0);
    expect(coverage.coverageRate).toBeLessThanOrEqual(100);

    // 验证数量关系
    expect(coverage.uncoveredKnowledgePoints).toBe(
      coverage.totalHotKnowledgePoints - coverage.cachedHotKnowledgePoints
    );
  });

  it("应该能够记录预热任务效果", async () => {
    const result = await recordWarmupEffectiveness(
      testWarmupTaskId,
      { cacheHitRate: 60.0, avgResponseTime: 500 },
      { cacheHitRate: 75.0, avgResponseTime: 380 }
    );

    expect(result).toBeDefined();
    expect(result).toHaveProperty("hitRateImprovement");
    expect(result).toHaveProperty("responseTimeImprovement");
    expect(result).toHaveProperty("effectivenessScore");

    // 验证命中率提升计算正确
    expect(result.hitRateImprovement).toBe(15.0);

    // 验证响应时间改善计算正确
    expect(result.responseTimeImprovement).toBeCloseTo(24.0, 1);

    // 验证效果评分在合理范围内
    expect(result.effectivenessScore).toBeGreaterThanOrEqual(0);
    expect(result.effectivenessScore).toBeLessThanOrEqual(100);
  });
});
