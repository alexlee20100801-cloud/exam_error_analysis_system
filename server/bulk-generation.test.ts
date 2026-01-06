import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

/**
 * AI题库批量生成功能测试
 */

// 模拟管理员用户上下文
const createMockAdminContext = (): Context => ({
  req: {} as any,
  res: {} as any,
  user: {
    id: 1,
    openId: "test-admin",
    name: "Test Admin",
    email: "admin@test.com",
    role: "admin",
    userType: "student",
    grade: "senior1",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
});

// 模拟普通用户上下文
const createMockUserContext = (): Context => ({
  req: {} as any,
  res: {} as any,
  user: {
    id: 2,
    openId: "test-user",
    name: "Test User",
    email: "user@test.com",
    role: "user",
    userType: "student",
    grade: "senior1",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
});

describe("AI题库批量生成系统", () => {
  describe("权限控制", () => {
    it("管理员可以访问批量生成功能", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      // 应该能够获取题库统计
      const stats = await caller.bulkGeneration.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe("number");
    });

    it("普通用户不能访问批量生成功能", async () => {
      const caller = appRouter.createCaller(createMockUserContext());
      
      // 应该抛出权限错误
      await expect(
        caller.bulkGeneration.getStats()
      ).rejects.toThrow("只有管理员可以访问此功能");
    });
  });

  describe("题库统计", () => {
    it("应该返回正确的题库统计信息", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const stats = await caller.bulkGeneration.getStats();
      
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("bySubject");
      expect(stats).toHaveProperty("byDifficulty");
      expect(stats).toHaveProperty("byGrade");
      expect(Array.isArray(stats.bySubject)).toBe(true);
      expect(Array.isArray(stats.byDifficulty)).toBe(true);
      expect(Array.isArray(stats.byGrade)).toBe(true);
    });
  });

  describe("批量生成配置验证", () => {
    it("应该拒绝无效的生成配置", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      // 测试无效的questionsPerKnowledgePoint（超过最大值）
      await expect(
        caller.bulkGeneration.bulkGenerate({
          schoolLevel: "junior",
          grade: "junior1",
          subject: "math",
          questionsPerKnowledgePoint: 100, // 超过最大值50
        })
      ).rejects.toThrow();
    });

    it("应该接受有效的生成配置", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      // 这个测试会实际调用AI生成，所以使用较小的数量
      const result = await caller.bulkGeneration.bulkGenerate({
        schoolLevel: "junior",
        grade: "junior1",
        subject: "math",
        questionsPerKnowledgePoint: 1,
      });
      
      expect(result).toHaveProperty("totalGenerated");
      expect(result).toHaveProperty("successCount");
      expect(result).toHaveProperty("failedCount");
      expect(result).toHaveProperty("duplicateCount");
      expect(result).toHaveProperty("generatedQuestions");
      expect(result).toHaveProperty("errors");
      expect(Array.isArray(result.generatedQuestions)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    }, 30000);
  });

  describe("难度分布配置", () => {
    it("应该支持自定义难度分布", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const result = await caller.bulkGeneration.bulkGenerate({
        schoolLevel: "senior",
        grade: "senior1",
        subject: "physics",
        questionsPerKnowledgePoint: 3,
        difficultyDistribution: {
          easy: 0.2,
          medium: 0.5,
          hard: 0.3,
        },
      });
      
      expect(result).toBeDefined();
      // 验证生成结果包含不同难度的题目
      if (result.generatedQuestions.length > 0) {
        const difficulties = result.generatedQuestions.map(q => q.difficulty);
        expect(difficulties).toContain("easy");
        expect(difficulties).toContain("medium");
        expect(difficulties).toContain("hard");
      }
    }, 30000);
  });

  describe("智能补充功能", () => {
    it("应该能够执行智能补充", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      // 使用较小的目标数量进行测试
      const result = await caller.bulkGeneration.smartSupplement({
        targetPerKnowledgePoint: 2,
      });
      
      expect(result).toHaveProperty("totalGenerated");
      expect(result).toHaveProperty("successCount");
      expect(result).toHaveProperty("failedCount");
      expect(result).toHaveProperty("duplicateCount");
      expect(typeof result.totalGenerated).toBe("number");
      expect(typeof result.successCount).toBe("number");
    }, 30000);
  });

  describe("生成结果验证", () => {
    it("生成的题目应该包含必要的字段", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const result = await caller.bulkGeneration.bulkGenerate({
        schoolLevel: "junior",
        grade: "junior2",
        subject: "english",
        questionsPerKnowledgePoint: 1,
      });
      
      if (result.generatedQuestions.length > 0) {
        const question = result.generatedQuestions[0];
        expect(question).toHaveProperty("id");
        expect(question).toHaveProperty("title");
        expect(question).toHaveProperty("knowledgePointId");
        expect(question).toHaveProperty("difficulty");
        expect(typeof question.title).toBe("string");
        expect(question.title.length).toBeGreaterThan(0);
      }
    }, 30000);

    it("应该正确统计成功和失败数量", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const result = await caller.bulkGeneration.bulkGenerate({
        schoolLevel: "senior",
        grade: "senior2",
        subject: "chemistry",
        questionsPerKnowledgePoint: 2,
      });
      
      // 验证统计数据的一致性
      expect(result.totalGenerated).toBe(
        result.successCount + result.failedCount
      );
      expect(result.successCount).toBeGreaterThanOrEqual(0);
      expect(result.failedCount).toBeGreaterThanOrEqual(0);
      expect(result.duplicateCount).toBeGreaterThanOrEqual(0);
    }, 30000);
  });
});
