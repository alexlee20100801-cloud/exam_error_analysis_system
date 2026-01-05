/**
 * 分类功能单元测试
 */

import { describe, it, expect } from "vitest";
import { getSchoolLevelFromGrade } from "./utils/schoolLevelHelper";
import { getErrorQuestionCountByLevel, getErrorQuestionCountBySubject, getFullStatistics } from "./statsService";

describe("学科和板块分类功能", () => {
  describe("板块推断", () => {
    it("应该正确推断初中板块", () => {
      expect(getSchoolLevelFromGrade("junior1")).toBe("junior");
      expect(getSchoolLevelFromGrade("junior2")).toBe("junior");
      expect(getSchoolLevelFromGrade("junior3")).toBe("junior");
    });

    it("应该正确推断高中板块", () => {
      expect(getSchoolLevelFromGrade("senior1")).toBe("senior");
      expect(getSchoolLevelFromGrade("senior2")).toBe("senior");
      expect(getSchoolLevelFromGrade("senior3")).toBe("senior");
    });
  });

  describe("统计功能", () => {
    it("应该能按板块统计错题数量", async () => {
      // 使用测试用户ID
      const stats = await getErrorQuestionCountByLevel(1);
      
      expect(stats).toHaveProperty("junior");
      expect(stats).toHaveProperty("senior");
      expect(typeof stats.junior).toBe("number");
      expect(typeof stats.senior).toBe("number");
      expect(stats.junior).toBeGreaterThanOrEqual(0);
      expect(stats.senior).toBeGreaterThanOrEqual(0);
    });

    it("应该能按学科统计错题数量", async () => {
      const stats = await getErrorQuestionCountBySubject(1);
      
      expect(typeof stats).toBe("object");
      // 验证统计结果的数据类型
      Object.values(stats).forEach(count => {
        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it("应该能按板块和学科统计错题数量", async () => {
      const juniorStats = await getErrorQuestionCountBySubject(1, "junior");
      const seniorStats = await getErrorQuestionCountBySubject(1, "senior");
      
      expect(typeof juniorStats).toBe("object");
      expect(typeof seniorStats).toBe("object");
    });

    it("应该能获取完整的统计信息", async () => {
      const fullStats = await getFullStatistics(1);
      
      expect(fullStats).toHaveProperty("byLevel");
      expect(fullStats).toHaveProperty("bySubject");
      expect(fullStats.byLevel).toHaveProperty("junior");
      expect(fullStats.byLevel).toHaveProperty("senior");
      expect(fullStats.bySubject).toHaveProperty("all");
      expect(fullStats.bySubject).toHaveProperty("junior");
      expect(fullStats.bySubject).toHaveProperty("senior");
    });
  });
});
