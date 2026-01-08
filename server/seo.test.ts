import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: {} as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

describe("SEO功能测试", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testUserId: number;

  beforeAll(async () => {
    // 创建测试caller(需要认证)
    const testUser: AuthenticatedUser = {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "测试用户",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx = createTestContext(testUser);
    caller = appRouter.createCaller(ctx);
    testUserId = 1;
  });

  describe("Sitemap自动更新", () => {
    it("应该能够手动触发sitemap更新", async () => {
      const result = await caller.sitemapAutoUpdate.updateNow();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.url).toBeDefined();
        expect(result.totalUrls).toBeGreaterThan(0);
      }
    });

    it("应该能够获取搜索引擎提交指引", async () => {
      const result = await caller.sitemapAutoUpdate.getSubmissionGuide();

      expect(result.googleSearchConsole).toBeDefined();
      expect(result.googleSearchConsole.title).toBe("Google Search Console");
      expect(result.googleSearchConsole.steps).toBeInstanceOf(Array);
      expect(result.googleSearchConsole.url).toBe("https://search.google.com/search-console");

      expect(result.bingWebmaster).toBeDefined();
      expect(result.bingWebmaster.title).toBe("Bing Webmaster Tools");
      expect(result.bingWebmaster.steps).toBeInstanceOf(Array);
      expect(result.bingWebmaster.url).toBe("https://www.bing.com/webmasters");
    });
  });

  describe("Sitemap更新历史", () => {
    it("应该能够获取sitemap更新历史记录", async () => {
      const result = await caller.sitemapHistory.getHistory({
        limit: 10,
        offset: 0,
      });

      expect(result.history).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("应该能够获取最近一次更新记录", async () => {
      const result = await caller.sitemapHistory.getLatest();

      // 可能为null(如果还没有更新记录)
      if (result) {
        expect(result.success).toBeDefined();
        expect(result.createdAt).toBeDefined();
      }
    });

    it("应该能够获取更新统计信息", async () => {
      const result = await caller.sitemapHistory.getStats();

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.successful).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
      expect(result.avgExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("结构化数据验证", () => {
    it("应该能够获取Google Rich Results Test链接", async () => {
      const publicCtx = createTestContext(null);
      const publicCaller = appRouter.createCaller(publicCtx);

      const result = await publicCaller.structuredDataValidation.getRichResultsTestLink({
        url: "https://exam-error-analysis.manus.space/",
      });

      expect(result.testUrl).toContain("https://search.google.com/test/rich-results");
      expect(result.testUrl).toContain("exam-error-analysis.manus.space");
    });

    it("应该能够验证单个URL的结构化数据", async () => {
      // 注意: 这个测试需要实际的网站URL可访问
      // 在本地测试环境中可能会失败
      const result = await caller.structuredDataValidation.validateUrl({
        url: "https://exam-error-analysis.manus.space/",
      });

      expect(result.success).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.richResultsTypes).toBeInstanceOf(Array);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
    }, 30000); // 增加超时时间,因为需要网络请求

    it("应该能够验证关键页面", async () => {
      // 注意: 这个测试需要实际的网站URL可访问
      // 在本地测试环境中可能会失败
      const result = await caller.structuredDataValidation.validateKeyPages();

      expect(result.results).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.valid).toBeGreaterThanOrEqual(0);
      expect(result.summary.invalid).toBeGreaterThanOrEqual(0);
    }, 60000); // 增加超时时间,因为需要多个网络请求
  });

  describe("Sitemap生成", () => {
    it("应该能够生成sitemap XML", async () => {
      const publicCtx = createTestContext(null);
      const publicCaller = appRouter.createCaller(publicCtx);

      const result = await publicCaller.sitemap.generate();

      expect(result.xml).toBeDefined();
      expect(result.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(result.totalUrls).toBeGreaterThan(0);
      expect(result.staticUrls).toBeGreaterThan(0);
      expect(result.dynamicUrls).toBeGreaterThanOrEqual(0);
    });
  });
});
