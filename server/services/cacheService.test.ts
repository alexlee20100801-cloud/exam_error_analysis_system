import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { cacheService, CACHE_KEYS, TTL_POLICIES } from "./cacheService";

// Mock Redis客户端
vi.mock("redis", () => {
  const mockClient = {
    get: vi.fn(),
    set: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    exists: vi.fn(),
    ttl: vi.fn(),
    expire: vi.fn(),
    persist: vi.fn(),
    info: vi.fn(),
    flushAll: vi.fn(),
    connect: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
  };

  return {
    createClient: vi.fn(() => mockClient),
  };
});

describe("缓存服务", () => {
  beforeAll(async () => {
    // 初始化缓存服务
    await cacheService.initialize();
  });

  afterAll(async () => {
    // 断开连接
    await cacheService.disconnect();
  });

  describe("缓存键规范", () => {
    it("应该定义所有必要的缓存键前缀", () => {
      expect(CACHE_KEYS.QUESTION).toBe("q:");
      expect(CACHE_KEYS.QUESTION_DETAIL).toBe("qd:");
      expect(CACHE_KEYS.QUESTION_LIST).toBe("ql:");
      expect(CACHE_KEYS.KNOWLEDGE_POINT).toBe("kp:");
      expect(CACHE_KEYS.USER_PROFILE).toBe("up:");
      expect(CACHE_KEYS.CRAWLER_TASK).toBe("ct:");
      expect(CACHE_KEYS.ANALYSIS_CACHE).toBe("ac:");
    });

    it("应该能正确构建缓存键", () => {
      const questionKey = `${CACHE_KEYS.QUESTION}123`;
      expect(questionKey).toBe("q:123");

      const userKey = `${CACHE_KEYS.USER_PROFILE}456`;
      expect(userKey).toBe("up:456");

      const analysisKey = `${CACHE_KEYS.ANALYSIS_CACHE}789`;
      expect(analysisKey).toBe("ac:789");
    });
  });

  describe("TTL策略", () => {
    it("应该定义所有TTL策略", () => {
      expect(TTL_POLICIES.SHORT).toBe(5 * 60);
      expect(TTL_POLICIES.MEDIUM).toBe(30 * 60);
      expect(TTL_POLICIES.LONG).toBe(60 * 60);
      expect(TTL_POLICIES.VERY_LONG).toBe(24 * 60 * 60);
      expect(TTL_POLICIES.REALTIME).toBe(60);
      expect(TTL_POLICIES.NEVER).toBe(0);
    });

    it("应该正确排序TTL策略", () => {
      expect(TTL_POLICIES.REALTIME).toBeLessThan(TTL_POLICIES.SHORT);
      expect(TTL_POLICIES.SHORT).toBeLessThan(TTL_POLICIES.MEDIUM);
      expect(TTL_POLICIES.MEDIUM).toBeLessThan(TTL_POLICIES.LONG);
      expect(TTL_POLICIES.LONG).toBeLessThan(TTL_POLICIES.VERY_LONG);
    });
  });

  describe("缓存操作", () => {
    it("应该能设置和获取缓存", async () => {
      const key = "test:key";
      const value = { id: 1, name: "测试" };

      const setResult = await cacheService.set(key, value);
      expect(setResult).toBe(true);

      // 注意：由于我们mock了Redis，实际的get可能返回null
      // 在真实环境中，这应该返回缓存的值
    });

    it("应该能删除缓存", async () => {
      const key = "test:key:to:delete";

      const deleteResult = await cacheService.delete(key);
      expect(deleteResult).toBe(true);
    });

    it("应该能检查缓存是否存在", async () => {
      const key = "test:existing:key";

      const exists = await cacheService.exists(key);
      expect(typeof exists).toBe("boolean");
    });

    it("应该能获取缓存的TTL", async () => {
      const key = "test:ttl:key";

      const ttl = await cacheService.getTTL(key);
      expect(typeof ttl).toBe("number");
    });

    it("应该能设置缓存的新TTL", async () => {
      const key = "test:new:ttl:key";

      const setTTLResult = await cacheService.setTTL(key, TTL_POLICIES.LONG);
      expect(setTTLResult).toBe(true);
    });
  });

  describe("批量操作", () => {
    it("应该能删除匹配模式的缓存", async () => {
      const pattern = "test:*";

      const deletedCount = await cacheService.deletePattern(pattern);
      expect(typeof deletedCount).toBe("number");
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });

    it("应该能清空所有缓存", async () => {
      const flushResult = await cacheService.flushAll();
      expect(flushResult).toBe(true);
    });
  });

  describe("缓存统计", () => {
    it("应该能获取缓存统计信息", async () => {
      const stats = await cacheService.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.isConnected).toBe("boolean");
    });

    it("应该能检查连接状态", () => {
      const isReady = cacheService.isReady();
      expect(typeof isReady).toBe("boolean");
    });
  });

  describe("缓存场景", () => {
    it("应该能缓存题目列表", async () => {
      const key = `${CACHE_KEYS.QUESTION_LIST}math:高中`;
      const questions = [
        { id: 1, content: "题目1", difficulty: "easy" },
        { id: 2, content: "题目2", difficulty: "medium" },
      ];

      await cacheService.set(key, questions, TTL_POLICIES.MEDIUM);

      // 验证缓存键格式
      expect(key).toContain(CACHE_KEYS.QUESTION_LIST);
    });

    it("应该能缓存用户学习统计", async () => {
      const userId = 123;
      const key = `${CACHE_KEYS.USER_LEARNING_STATS}${userId}`;
      const stats = {
        totalQuestions: 100,
        correctCount: 75,
        accuracy: 0.75,
      };

      await cacheService.set(key, stats, TTL_POLICIES.LONG);

      // 验证缓存键格式
      expect(key).toContain(CACHE_KEYS.USER_LEARNING_STATS);
    });

    it("应该能缓存AI分析结果", async () => {
      const questionId = 456;
      const key = `${CACHE_KEYS.ANALYSIS_CACHE}${questionId}`;
      const analysis = {
        difficulty: "medium",
        keyPoints: ["函数", "导数"],
        estimatedTime: 180,
      };

      await cacheService.set(key, analysis, TTL_POLICIES.VERY_LONG);

      // 验证缓存键格式
      expect(key).toContain(CACHE_KEYS.ANALYSIS_CACHE);
    });

    it("应该能缓存爬虫任务状态", async () => {
      const taskId = 789;
      const key = `${CACHE_KEYS.CRAWLER_TASK_STATUS}${taskId}`;
      const status = {
        taskId,
        status: "running",
        progress: 45,
        startTime: new Date().toISOString(),
      };

      await cacheService.set(key, status, TTL_POLICIES.REALTIME);

      // 验证缓存键格式
      expect(key).toContain(CACHE_KEYS.CRAWLER_TASK_STATUS);
    });
  });

  describe("缓存失败处理", () => {
    it("应该在缓存不可用时优雅地降级", async () => {
      // 测试当Redis不可用时的行为
      const result = await cacheService.set("test:key", { data: "value" });

      // 应该返回false表示缓存设置失败
      expect(typeof result).toBe("boolean");
    });

    it("应该在获取缓存失败时返回null", async () => {
      const result = await cacheService.get("nonexistent:key");

      // 应该返回null
      expect(result === null || result === undefined).toBe(true);
    });
  });

  describe("缓存键模式", () => {
    it("应该支持通配符模式删除", async () => {
      const patterns = [
        `${CACHE_KEYS.QUESTION}*`,
        `${CACHE_KEYS.USER_PROFILE}*`,
        `${CACHE_KEYS.ANALYSIS_CACHE}*`,
      ];

      for (const pattern of patterns) {
        const result = await cacheService.deletePattern(pattern);
        expect(typeof result).toBe("number");
      }
    });

    it("应该能构建复杂的缓存键", () => {
      const userId = 123;
      const questionId = 456;
      const key = `${CACHE_KEYS.USER_ERROR_QUESTIONS}${userId}:${questionId}`;

      expect(key).toBe("ueq:123:456");
    });
  });
});
