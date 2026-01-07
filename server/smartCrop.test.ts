/**
 * 智能框选功能测试
 */

import { describe, it, expect } from 'vitest';
import { optimizeCropAreas, recommendCropStrategy } from './smartCropService';
import type { DetectedArea } from './smartCropService';

describe('smartCropService', () => {
  describe('optimizeCropAreas', () => {
    it('应该合并重叠的区域', () => {
      const areas: DetectedArea[] = [
        { x: 10, y: 10, width: 50, height: 20, label: '题目1', confidence: 0.9 },
        { x: 15, y: 15, width: 45, height: 18, label: '题目1-重复', confidence: 0.8 },
      ];

      const optimized = optimizeCropAreas(areas);

      // 应该合并为一个区域
      expect(optimized.length).toBe(1);
      expect(optimized[0].x).toBeLessThanOrEqual(10);
      expect(optimized[0].y).toBeLessThanOrEqual(10);
    });

    it('应该保留不重叠的区域', () => {
      const areas: DetectedArea[] = [
        { x: 10, y: 10, width: 50, height: 20, label: '题目1', confidence: 0.9 },
        { x: 10, y: 50, width: 50, height: 20, label: '题目2', confidence: 0.9 },
      ];

      const optimized = optimizeCropAreas(areas);

      // 应该保留两个区域
      expect(optimized.length).toBe(2);
    });

    it('应该按Y坐标排序', () => {
      const areas: DetectedArea[] = [
        { x: 10, y: 50, width: 50, height: 20, label: '题目2', confidence: 0.9 },
        { x: 10, y: 10, width: 50, height: 20, label: '题目1', confidence: 0.9 },
      ];

      const optimized = optimizeCropAreas(areas);

      // 第一个区域应该是Y坐标较小的
      expect(optimized[0].y).toBeLessThan(optimized[1].y);
    });
  });

  describe('recommendCropStrategy', () => {
    it('应该为选择题返回正确的建议', () => {
      const strategy = recommendCropStrategy('choice');
      expect(strategy).toContain('选择题');
      expect(strategy).toContain('选项');
    });

    it('应该为填空题返回正确的建议', () => {
      const strategy = recommendCropStrategy('fill');
      expect(strategy).toContain('填空题');
    });

    it('应该为解答题返回正确的建议', () => {
      const strategy = recommendCropStrategy('answer');
      expect(strategy).toContain('解答题');
    });

    it('应该为混合题型返回正确的建议', () => {
      const strategy = recommendCropStrategy('mixed');
      expect(strategy).toContain('混合');
    });
  });
});
