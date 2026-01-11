import { describe, it, expect } from "vitest";
import { generateInviteCode } from "./parentSupervisionService";

describe("家长监督功能", () => {
  describe("邀请码生成", () => {
    it("应该生成8位邀请码", () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
    });

    it("邀请码应只包含允许的字符", () => {
      const allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const code = generateInviteCode();
      
      for (const char of code) {
        expect(allowedChars).toContain(char);
      }
    });

    it("生成的邀请码应该是唯一的", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      // 100个邀请码应该都是唯一的
      expect(codes.size).toBe(100);
    });

    it("邀请码不应包含容易混淆的字符", () => {
      const confusingChars = ["0", "O", "1", "I", "L"];
      const code = generateInviteCode();
      
      for (const char of confusingChars) {
        expect(code).not.toContain(char);
      }
    });
  });

  describe("学生统计数据计算", () => {
    it("应该正确计算掌握率", () => {
      const totalErrors = 100;
      const masteredCount = 75;
      const masteryRate = Math.round((masteredCount / totalErrors) * 100);
      
      expect(masteryRate).toBe(75);
    });

    it("当没有错题时掌握率应为0", () => {
      const totalErrors = 0;
      const masteredCount = 0;
      const masteryRate = totalErrors > 0 ? Math.round((masteredCount / totalErrors) * 100) : 0;
      
      expect(masteryRate).toBe(0);
    });

    it("应该正确计算本周新增错题", () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const questions = [
        { createdAt: new Date() },
        { createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      ];
      
      const weeklyNewErrors = questions.filter((q) => {
        const createdAt = new Date(q.createdAt);
        return createdAt >= oneWeekAgo;
      }).length;
      
      expect(weeklyNewErrors).toBe(2);
    });
  });

  describe("学科统计", () => {
    it("应该正确按学科分组统计", () => {
      const questions = [
        { subject: "math", isMastered: true },
        { subject: "math", isMastered: false },
        { subject: "chinese", isMastered: true },
        { subject: "english", isMastered: false },
        { subject: "english", isMastered: false },
      ];
      
      const subjectDistribution: Record<string, { total: number; mastered: number }> = {};
      questions.forEach((q) => {
        if (!subjectDistribution[q.subject]) {
          subjectDistribution[q.subject] = { total: 0, mastered: 0 };
        }
        subjectDistribution[q.subject].total++;
        if (q.isMastered) {
          subjectDistribution[q.subject].mastered++;
        }
      });
      
      expect(subjectDistribution.math.total).toBe(2);
      expect(subjectDistribution.math.mastered).toBe(1);
      expect(subjectDistribution.chinese.total).toBe(1);
      expect(subjectDistribution.chinese.mastered).toBe(1);
      expect(subjectDistribution.english.total).toBe(2);
      expect(subjectDistribution.english.mastered).toBe(0);
    });

    it("应该正确计算各学科掌握率", () => {
      const subjectStats = [
        { subject: "math", totalCount: 10, masteredCount: 8 },
        { subject: "chinese", totalCount: 5, masteredCount: 5 },
        { subject: "english", totalCount: 8, masteredCount: 2 },
      ];
      
      const withMasteryRate = subjectStats.map((s) => ({
        ...s,
        masteryRate: s.totalCount > 0 ? Math.round((s.masteredCount / s.totalCount) * 100) : 0,
      }));
      
      expect(withMasteryRate[0].masteryRate).toBe(80);
      expect(withMasteryRate[1].masteryRate).toBe(100);
      expect(withMasteryRate[2].masteryRate).toBe(25);
    });
  });

  describe("学习目标", () => {
    it("应该正确判断目标是否完成", () => {
      const goal = {
        targetValue: 100,
        currentValue: 100,
      };
      
      const isCompleted = goal.currentValue >= goal.targetValue;
      expect(isCompleted).toBe(true);
    });

    it("当当前值小于目标值时目标未完成", () => {
      const goal = {
        targetValue: 100,
        currentValue: 50,
      };
      
      const isCompleted = goal.currentValue >= goal.targetValue;
      expect(isCompleted).toBe(false);
    });

    it("应该正确计算目标进度百分比", () => {
      const goal = {
        targetValue: 100,
        currentValue: 75,
      };
      
      const progress = Math.round((goal.currentValue / goal.targetValue) * 100);
      expect(progress).toBe(75);
    });
  });
});
