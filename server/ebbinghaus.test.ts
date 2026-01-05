import { describe, expect, it } from "vitest";
import {
  calculateNextReviewDate,
  needsReview,
  getReviewUrgency,
  calculateReviewProgress,
  getReviewStageDescription,
  calculateReviewStats,
  EBBINGHAUS_INTERVALS,
} from "./ebbinghausService";

describe("艾宾浩斯遗忘曲线服务", () => {
  describe("calculateNextReviewDate", () => {
    it("应该正确计算第1次复习时间（1天后）", () => {
      const lastReviewDate = new Date("2024-01-01");
      const nextReviewDate = calculateNextReviewDate(lastReviewDate, 0);
      
      const expectedDate = new Date("2024-01-02");
      expect(nextReviewDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it("应该正确计算第2次复习时间（2天后）", () => {
      const lastReviewDate = new Date("2024-01-01");
      const nextReviewDate = calculateNextReviewDate(lastReviewDate, 1);
      
      const expectedDate = new Date("2024-01-03");
      expect(nextReviewDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it("应该正确计算第3次复习时间（4天后）", () => {
      const lastReviewDate = new Date("2024-01-01");
      const nextReviewDate = calculateNextReviewDate(lastReviewDate, 2);
      
      const expectedDate = new Date("2024-01-05");
      expect(nextReviewDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it("应该正确计算第4次复习时间（7天后）", () => {
      const lastReviewDate = new Date("2024-01-01");
      const nextReviewDate = calculateNextReviewDate(lastReviewDate, 3);
      
      const expectedDate = new Date("2024-01-08");
      expect(nextReviewDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it("应该正确计算第5次复习时间（15天后）", () => {
      const lastReviewDate = new Date("2024-01-01");
      const nextReviewDate = calculateNextReviewDate(lastReviewDate, 4);
      
      const expectedDate = new Date("2024-01-16");
      expect(nextReviewDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it("超过5次复习后应该设置为30天后", () => {
      const lastReviewDate = new Date("2024-01-01");
      const nextReviewDate = calculateNextReviewDate(lastReviewDate, 5);
      
      const expectedDate = new Date("2024-01-31");
      expect(nextReviewDate.toDateString()).toBe(expectedDate.toDateString());
    });
  });

  describe("needsReview", () => {
    it("如果没有设置复习时间，应该返回true", () => {
      expect(needsReview(null)).toBe(true);
    });

    it("如果复习时间已过，应该返回true", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(needsReview(pastDate)).toBe(true);
    });

    it("如果复习时间是今天，应该返回true", () => {
      const today = new Date();
      expect(needsReview(today)).toBe(true);
    });

    it("如果复习时间在未来，应该返回false", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(needsReview(futureDate)).toBe(false);
    });
  });

  describe("getReviewUrgency", () => {
    it("如果没有设置复习时间，应该返回urgent", () => {
      expect(getReviewUrgency(null)).toBe("urgent");
    });

    it("如果复习时间已逾期，应该返回urgent", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(getReviewUrgency(pastDate)).toBe("urgent");
    });

    it("如果复习时间是今天，应该返回today", () => {
      const today = new Date();
      expect(getReviewUrgency(today)).toBe("today");
    });

    it("如果复习时间在1-2天内，应该返回soon", () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 1);
      expect(getReviewUrgency(soonDate)).toBe("soon");
    });

    it("如果复习时间在3天后，应该返回later", () => {
      const laterDate = new Date();
      laterDate.setDate(laterDate.getDate() + 3);
      expect(getReviewUrgency(laterDate)).toBe("later");
    });
  });

  describe("calculateReviewProgress", () => {
    it("首次学习应该返回0%", () => {
      expect(calculateReviewProgress(0)).toBe(0);
    });

    it("完成1次复习应该返回20%", () => {
      expect(calculateReviewProgress(1)).toBe(20);
    });

    it("完成3次复习应该返回60%", () => {
      expect(calculateReviewProgress(3)).toBe(60);
    });

    it("完成5次复习应该返回100%", () => {
      expect(calculateReviewProgress(5)).toBe(100);
    });

    it("超过5次复习应该返回100%", () => {
      expect(calculateReviewProgress(10)).toBe(100);
    });
  });

  describe("getReviewStageDescription", () => {
    it("首次学习应该返回正确描述", () => {
      expect(getReviewStageDescription(0)).toBe("首次学习");
    });

    it("1-2次复习应该返回短期记忆巩固", () => {
      expect(getReviewStageDescription(1)).toBe("短期记忆巩固");
      expect(getReviewStageDescription(2)).toBe("短期记忆巩固");
    });

    it("3-4次复习应该返回长期记忆建立", () => {
      expect(getReviewStageDescription(3)).toBe("长期记忆建立");
      expect(getReviewStageDescription(4)).toBe("长期记忆建立");
    });

    it("5次及以上复习应该返回已掌握", () => {
      expect(getReviewStageDescription(5)).toBe("已掌握");
      expect(getReviewStageDescription(10)).toBe("已掌握");
    });
  });

  describe("calculateReviewStats", () => {
    it("应该正确统计空列表", () => {
      const stats = calculateReviewStats([]);
      expect(stats).toEqual({
        totalItems: 0,
        urgentCount: 0,
        todayCount: 0,
        soonCount: 0,
        completedCount: 0,
      });
    });

    it("应该正确统计各种紧急程度的项目", () => {
      const now = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const items = [
        { nextReviewDate: yesterday, reviewCount: 0 }, // urgent
        { nextReviewDate: now, reviewCount: 1 }, // today
        { nextReviewDate: tomorrow, reviewCount: 2 }, // soon
        { nextReviewDate: nextWeek, reviewCount: 3 }, // later
        { nextReviewDate: null, reviewCount: 5 }, // urgent + completed
      ];

      const stats = calculateReviewStats(items);
      expect(stats.totalItems).toBe(5);
      expect(stats.urgentCount).toBe(2); // yesterday + null
      expect(stats.todayCount).toBe(1);
      expect(stats.soonCount).toBe(1);
      expect(stats.completedCount).toBe(1); // reviewCount >= 5
    });

    it("应该正确识别已完成的项目", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const items = [
        { nextReviewDate: futureDate, reviewCount: 5 },
        { nextReviewDate: futureDate, reviewCount: 6 },
        { nextReviewDate: futureDate, reviewCount: 10 },
      ];

      const stats = calculateReviewStats(items);
      expect(stats.completedCount).toBe(3);
    });
  });

  describe("艾宾浩斯间隔常量", () => {
    it("应该包含正确的复习间隔", () => {
      expect(EBBINGHAUS_INTERVALS).toEqual([1, 2, 4, 7, 15]);
    });

    it("应该有5个复习节点", () => {
      expect(EBBINGHAUS_INTERVALS.length).toBe(5);
    });
  });
});
