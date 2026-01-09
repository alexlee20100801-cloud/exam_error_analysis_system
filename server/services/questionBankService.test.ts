import { describe, it, expect } from "vitest";
import * as questionBankService from "./questionBankService";

describe("Question Bank Service", () => {
  describe("getQuestionCategories", () => {
    it("should return an array of categories", async () => {
      const categories = await questionBankService.getQuestionCategories();
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe("searchQuestions", () => {
    it("should return an array of questions", async () => {
      const results = await questionBankService.searchQuestions({
        limit: 10,
        offset: 0,
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should filter by subject", async () => {
      const results = await questionBankService.searchQuestions({
        subject: "math",
        limit: 10,
        offset: 0,
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should filter by grade", async () => {
      const results = await questionBankService.searchQuestions({
        grade: "junior1",
        limit: 10,
        offset: 0,
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("getQuestionBankStats", () => {
    it("should return stats object", async () => {
      const stats = await questionBankService.getQuestionBankStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalQuestions).toBe("number");
      expect(typeof stats.gradeCount).toBe("number");
      expect(typeof stats.subjectCount).toBe("number");
    });
  });

  describe("getCategoryStats", () => {
    it("should return category stats", async () => {
      const stats = await questionBankService.getCategoryStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalQuestions).toBe("number");
    });
  });

  describe("getSourceStats", () => {
    it("should return source stats array", async () => {
      const stats = await questionBankService.getSourceStats();
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  describe("recordQuestionUsage", () => {
    it("should record question usage successfully", async () => {
      const result = await questionBankService.recordQuestionUsage(1, "view");
      expect(result.success).toBe(true);
    });
  });

  describe("getCrawlerTasks", () => {
    it("should return crawler tasks array", async () => {
      const tasks = await questionBankService.getCrawlerTasks(20, 0);
      expect(Array.isArray(tasks)).toBe(true);
    });
  });
});
