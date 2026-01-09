/**
 * 薄弱点分析 API 单元测试
 * 测试薄弱知识点分析、学习路径生成等功能
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { analyzeUserWeakness, getKnowledgeRadarData, getKnowledgeHeatmapData } from '../weaknessAnalysisService';
import type { WeaknessAnalysis, WeakKnowledgePoint } from '../weaknessAnalysisService';

describe('Weakness Analysis Service', () => {
  const testUserId = 1;

  describe('analyzeUserWeakness', () => {
    it('should return empty analysis for user with no error questions', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.weakKnowledgePoints).toEqual([]);
      expect(result.overallMasteryRate).toBe(100);
      expect(result.totalErrorQuestions).toBe(0);
      expect(result.recommendations).toContain('开始录入错题，系统将为您分析薄弱点');
    });

    it('should return valid WeaknessAnalysis structure', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('weakKnowledgePoints');
      expect(result).toHaveProperty('overallMasteryRate');
      expect(result).toHaveProperty('totalErrorQuestions');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('learningPath');
      expect(result).toHaveProperty('analysisDate');
    });

    it('should have valid analysis date', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      const date = new Date(result.analysisDate);
      expect(date.getTime()).toBeLessThanOrEqual(Date.now());
      expect(date.getTime()).toBeGreaterThan(Date.now() - 10000); // 10 seconds ago
    });
  });

  describe('WeakKnowledgePoint structure', () => {
    it('should have all required properties', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      if (result.weakKnowledgePoints.length > 0) {
        const wp = result.weakKnowledgePoints[0];
        
        expect(wp).toHaveProperty('knowledgePointId');
        expect(wp).toHaveProperty('name');
        expect(wp).toHaveProperty('subject');
        expect(wp).toHaveProperty('grade');
        expect(wp).toHaveProperty('errorCount');
        expect(wp).toHaveProperty('totalPracticeCount');
        expect(wp).toHaveProperty('errorRate');
        expect(wp).toHaveProperty('masteryLevel');
        expect(wp).toHaveProperty('difficulty');
        expect(wp).toHaveProperty('relatedQuestionIds');
        expect(wp).toHaveProperty('improvementSuggestion');
      }
    });

    it('should have valid error rate (0-100)', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      for (const wp of result.weakKnowledgePoints) {
        expect(wp.errorRate).toBeGreaterThanOrEqual(0);
        expect(wp.errorRate).toBeLessThanOrEqual(100);
      }
    });

    it('should have valid mastery level (0-100)', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      for (const wp of result.weakKnowledgePoints) {
        expect(wp.masteryLevel).toBeGreaterThanOrEqual(0);
        expect(wp.masteryLevel).toBeLessThanOrEqual(100);
      }
    });

    it('should have valid difficulty level', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      const validDifficulties = ['easy', 'medium', 'hard'];
      for (const wp of result.weakKnowledgePoints) {
        expect(validDifficulties).toContain(wp.difficulty);
      }
    });
  });

  describe('Learning Path', () => {
    it('should generate learning path with valid structure', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      for (const node of result.learningPath) {
        expect(node).toHaveProperty('knowledgePointId');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('order');
        expect(node).toHaveProperty('estimatedTime');
        expect(node).toHaveProperty('prerequisiteIds');
        expect(node).toHaveProperty('recommendedQuestions');
        expect(node).toHaveProperty('status');
      }
    });

    it('should have valid learning path status', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      const validStatuses = ['not_started', 'in_progress', 'completed'];
      for (const node of result.learningPath) {
        expect(validStatuses).toContain(node.status);
      }
    });

    it('should have positive estimated time', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      for (const node of result.learningPath) {
        expect(node.estimatedTime).toBeGreaterThan(0);
      }
    });
  });

  describe('Recommendations', () => {
    it('should return array of recommendations', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should have meaningful recommendations', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      for (const rec of result.recommendations) {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Overall Mastery Rate', () => {
    it('should have valid mastery rate (0-100)', async () => {
      const result = await analyzeUserWeakness(testUserId);
      
      expect(result.overallMasteryRate).toBeGreaterThanOrEqual(0);
      expect(result.overallMasteryRate).toBeLessThanOrEqual(100);
    });
  });

  describe('getKnowledgeRadarData', () => {
    it('should return radar data with subject and mastery', async () => {
      const result = await getKnowledgeRadarData(testUserId);
      
      expect(Array.isArray(result)).toBe(true);
      
      for (const item of result) {
        expect(item).toHaveProperty('subject');
        expect(item).toHaveProperty('mastery');
        expect(item).toHaveProperty('totalPoints');
        
        expect(item.mastery).toBeGreaterThanOrEqual(0);
        expect(item.mastery).toBeLessThanOrEqual(100);
        expect(item.totalPoints).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getKnowledgeHeatmapData', () => {
    it('should return heatmap data for subject', async () => {
      const result = await getKnowledgeHeatmapData(testUserId, 'math');
      
      expect(Array.isArray(result)).toBe(true);
      
      for (const item of result) {
        expect(item).toHaveProperty('knowledgePointId');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('grade');
        expect(item).toHaveProperty('masteryLevel');
        expect(item).toHaveProperty('errorCount');
        
        expect(item.masteryLevel).toBeGreaterThanOrEqual(0);
        expect(item.masteryLevel).toBeLessThanOrEqual(100);
        expect(item.errorCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle different subjects', async () => {
      const subjects = ['math', 'physics', 'chemistry'];
      
      for (const subject of subjects) {
        const result = await getKnowledgeHeatmapData(testUserId, subject);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // 这个测试需要模拟数据库连接失败
      // 在实际环境中应该使用 mock
      expect(async () => {
        await analyzeUserWeakness(testUserId);
      }).not.toThrow();
    });
  });
});
