import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

/**
 * 题目审核工作流测试
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

describe("题目审核工作流", () => {
  describe("权限控制", () => {
    it("管理员可以访问审核功能", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      // 应该能够获取审核统计
      const stats = await caller.questionReview.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalPending).toBe("number");
      expect(typeof stats.totalApproved).toBe("number");
      expect(typeof stats.approvalRate).toBe("number");
    });

    it("普通用户不能访问审核功能", async () => {
      const caller = appRouter.createCaller(createMockUserContext());
      
      // 应该抛出权限错误
      await expect(
        caller.questionReview.getStats()
      ).rejects.toThrow("只有管理员可以访问此功能");
    });
  });

  describe("审核统计", () => {
    it("应该返回正确的审核统计信息", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const stats = await caller.questionReview.getStats();
      
      expect(stats).toHaveProperty("totalPending");
      expect(stats).toHaveProperty("totalApproved");
      expect(stats).toHaveProperty("totalRejected");
      expect(stats).toHaveProperty("totalNeedsRevision");
      expect(stats).toHaveProperty("approvalRate");
      expect(stats).toHaveProperty("averageQualityScore");
      expect(stats).toHaveProperty("todayReviewed");
      
      // 验证数据类型
      expect(typeof stats.totalPending).toBe("number");
      expect(typeof stats.approvalRate).toBe("number");
      expect(typeof stats.averageQualityScore).toBe("number");
    });
  });

  describe("待审核题目列表", () => {
    it("应该能够获取待审核题目列表", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const result = await caller.questionReview.getPendingQuestions({
        limit: 10,
        offset: 0,
      });
      
      expect(result).toHaveProperty("questions");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.questions)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("应该支持按学科筛选", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const result = await caller.questionReview.getPendingQuestions({
        limit: 10,
        offset: 0,
        subject: "math",
      });
      
      expect(result).toBeDefined();
      // 如果有结果，验证学科筛选
      if (result.questions.length > 0) {
        result.questions.forEach(q => {
          expect(q.subject).toBe("math");
        });
      }
    });

    it("应该支持分页", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const page1 = await caller.questionReview.getPendingQuestions({
        limit: 5,
        offset: 0,
      });
      
      const page2 = await caller.questionReview.getPendingQuestions({
        limit: 5,
        offset: 5,
      });
      
      expect(page1.questions.length).toBeLessThanOrEqual(5);
      expect(page2.questions.length).toBeLessThanOrEqual(5);
      
      // 如果两页都有数据，验证不重复
      if (page1.questions.length > 0 && page2.questions.length > 0) {
        const page1Ids = page1.questions.map(q => q.id);
        const page2Ids = page2.questions.map(q => q.id);
        const intersection = page1Ids.filter(id => page2Ids.includes(id));
        expect(intersection.length).toBe(0);
      }
    });
  });

  describe("审核提交", () => {
    it("应该能够提交审核（通过）", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      // 先获取一个待审核题目
      const pending = await caller.questionReview.getPendingQuestions({
        limit: 1,
        offset: 0,
      });
      
      if (pending.questions.length > 0) {
        const questionId = pending.questions[0].id;
        
        const result = await caller.questionReview.submitReview({
          questionId,
          status: "approved",
          scores: {
            accuracy: 5,
            difficulty: 4,
            clarity: 5,
            discrimination: 4,
          },
          notes: "题目质量很好",
        });
        
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("overallScore");
        expect(result.success).toBe(true);
        expect(typeof result.overallScore).toBe("number");
        expect(result.overallScore).toBeGreaterThan(0);
        expect(result.overallScore).toBeLessThanOrEqual(5);
      }
    }, 10000);

    it("应该能够提交审核（拒绝）", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const pending = await caller.questionReview.getPendingQuestions({
        limit: 1,
        offset: 0,
      });
      
      if (pending.questions.length > 0) {
        const questionId = pending.questions[0].id;
        
        const result = await caller.questionReview.submitReview({
          questionId,
          status: "rejected",
          scores: {
            accuracy: 2,
            difficulty: 3,
            clarity: 2,
            discrimination: 2,
          },
          notes: "题目存在明显错误",
          suggestions: "需要重新生成",
        });
        
        expect(result.success).toBe(true);
        expect(result.overallScore).toBeLessThan(3);
      }
    }, 10000);

    it("应该正确计算综合评分", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const pending = await caller.questionReview.getPendingQuestions({
        limit: 1,
        offset: 0,
      });
      
      if (pending.questions.length > 0) {
        const questionId = pending.questions[0].id;
        
        const result = await caller.questionReview.submitReview({
          questionId,
          status: "approved",
          scores: {
            accuracy: 4,
            difficulty: 4,
            clarity: 4,
            discrimination: 4,
          },
        });
        
        // 综合评分应该是4分
        expect(result.overallScore).toBe(4);
      }
    }, 10000);
  });

  describe("批量审核", () => {
    it("应该能够批量审核题目", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const pending = await caller.questionReview.getPendingQuestions({
        limit: 3,
        offset: 0,
      });
      
      if (pending.questions.length >= 2) {
        const questionIds = pending.questions.slice(0, 2).map(q => q.id);
        
        const result = await caller.questionReview.batchReview({
          questionIds,
          status: "approved",
          notes: "批量通过",
        });
        
        expect(result).toHaveProperty("successCount");
        expect(result).toHaveProperty("failedCount");
        expect(result).toHaveProperty("total");
        expect(result.total).toBe(questionIds.length);
        expect(result.successCount + result.failedCount).toBe(result.total);
      }
    }, 15000);
  });

  describe("审核历史", () => {
    it("应该能够获取审核历史", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const result = await caller.questionReview.getReviewHistory({
        limit: 10,
        offset: 0,
      });
      
      expect(result).toHaveProperty("reviews");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.reviews)).toBe(true);
    });

    it("应该支持按审核人筛选", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      const result = await caller.questionReview.getReviewHistory({
        limit: 10,
        offset: 0,
        reviewerId: 1,
      });
      
      expect(result).toBeDefined();
      // 如果有结果，验证审核人筛选
      if (result.reviews.length > 0) {
        result.reviews.forEach(r => {
          expect(r.reviewerId).toBe(1);
        });
      }
    });
  });

  describe("题目详情和历史", () => {
    it("应该能够获取题目详情和审核历史", async () => {
      const caller = appRouter.createCaller(createMockAdminContext());
      
      // 先获取一个题目
      const pending = await caller.questionReview.getPendingQuestions({
        limit: 1,
        offset: 0,
      });
      
      if (pending.questions.length > 0) {
        const questionId = pending.questions[0].id;
        
        const result = await caller.questionReview.getQuestionWithHistory({
          questionId,
        });
        
        expect(result).toHaveProperty("question");
        expect(result).toHaveProperty("reviews");
        expect(result.question.id).toBe(questionId);
        expect(Array.isArray(result.reviews)).toBe(true);
      }
    });
  });
});
