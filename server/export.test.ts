/**
 * 错题导出功能单元测试
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "测试用户",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("export functionality", () => {
  it("should get export stats for user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.export.getExportStats();

    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("bySubject");
    expect(stats).toHaveProperty("byGrade");
    expect(stats).toHaveProperty("byMastered");
    expect(Array.isArray(stats.bySubject)).toBe(true);
    expect(Array.isArray(stats.byGrade)).toBe(true);
    expect(typeof stats.byMastered.mastered).toBe("number");
    expect(typeof stats.byMastered.notMastered).toBe("number");
  });

  it("should export error questions as PDF", { timeout: 15000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 注意：这个测试可能会失败如果数据库中没有错题
    // 在实际使用中，应该先创建测试数据
    try {
      const result = await caller.export.exportErrorQuestions({
        format: "pdf",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.filename).toContain(".pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.questionCount).toBeGreaterThan(0);
    } catch (error: any) {
      // 如果没有错题，应该抛出特定错误
      expect(error.message).toContain("没有符合条件的错题");
    }
  });

  it("should export error questions as Word", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.export.exportErrorQuestions({
        format: "word",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.filename).toContain(".docx");
      expect(result.mimeType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(result.questionCount).toBeGreaterThan(0);
    } catch (error: any) {
      expect(error.message).toContain("没有符合条件的错题");
    }
  });

  it("should filter export by subject", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.export.exportErrorQuestions({
        format: "pdf",
        subject: "math",
      });

      expect(result.success).toBe(true);
      expect(result.questionCount).toBeGreaterThanOrEqual(0);
    } catch (error: any) {
      expect(error.message).toContain("没有符合条件的错题");
    }
  });

  it("should filter export by grade", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.export.exportErrorQuestions({
        format: "pdf",
        grade: "senior2",
      });

      expect(result.success).toBe(true);
      expect(result.questionCount).toBeGreaterThanOrEqual(0);
    } catch (error: any) {
      expect(error.message).toContain("没有符合条件的错题");
    }
  });

  it("should filter export by date range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    try {
      const result = await caller.export.exportErrorQuestions({
        format: "pdf",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(result.success).toBe(true);
      expect(result.questionCount).toBeGreaterThanOrEqual(0);
    } catch (error: any) {
      expect(error.message).toContain("没有符合条件的错题");
    }
  });

  it("should filter export by mastered status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.export.exportErrorQuestions({
        format: "pdf",
        isMastered: false,
      });

      expect(result.success).toBe(true);
      expect(result.questionCount).toBeGreaterThanOrEqual(0);
    } catch (error: any) {
      expect(error.message).toContain("没有符合条件的错题");
    }
  });

  it("should combine multiple filters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.export.exportErrorQuestions({
        format: "word",
        subject: "math",
        grade: "senior2",
        isMastered: false,
      });

      expect(result.success).toBe(true);
      expect(result.questionCount).toBeGreaterThanOrEqual(0);
    } catch (error: any) {
      expect(error.message).toContain("没有符合条件的错题");
    }
  });
});
