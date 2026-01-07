import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { questionAnalysisCache } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('缓存管理功能测试', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testCacheId: number;

  beforeAll(async () => {
    // 创建测试caller(模拟已登录用户)
    caller = appRouter.createCaller({
      user: {
        id: 1,
        name: 'Test User',
        openId: 'test-open-id',
        role: 'admin',
      },
      req: {} as any,
      res: {} as any,
    });

    // 清理测试数据
    const db = await getDb();
    if (db) {
      await db.delete(questionAnalysisCache);
    }

    // 插入测试缓存数据
    if (db) {
      const result = await db.insert(questionAnalysisCache).values([
        {
          contentHash: 'test_hash_1',
          subject: 'math',
          grade: 'junior1',
          errorAnalysis: '测试错误分析1',
          correctAnswer: '测试正确答案1',
          detailedExplanation: '测试详细解释1',
          detailedAnalysis: '测试详细分析1',
          knowledgePointIds: JSON.stringify([1, 2, 3]),
          difficulty: 'medium',
          hitCount: 5,
          analysisVersion: 'v1',
        },
        {
          contentHash: 'test_hash_2',
          subject: 'math',
          grade: 'junior2',
          errorAnalysis: '测试错误分析2',
          correctAnswer: '测试正确答案2',
          detailedExplanation: '测试详细解释2',
          detailedAnalysis: '测试详细分析2',
          knowledgePointIds: JSON.stringify([2, 3, 4]),
          difficulty: 'hard',
          hitCount: 10,
          analysisVersion: 'v1',
        },
        {
          contentHash: 'test_hash_3',
          subject: 'english',
          grade: 'senior1',
          errorAnalysis: '测试错误分析3',
          correctAnswer: '测试正确答案3',
          detailedExplanation: '测试详细解释3',
          detailedAnalysis: '测试详细分析3',
          knowledgePointIds: JSON.stringify([5, 6]),
          difficulty: 'easy',
          hitCount: 1,
          analysisVersion: 'v1',
        },
      ]);
      
      testCacheId = result[0].insertId;
    }
  });

  afterAll(async () => {
    // 清理测试数据
    const db = await getDb();
    if (db) {
      await db.delete(questionAnalysisCache);
    }
  });

  it('应该能够获取缓存统计信息', async () => {
    const stats = await caller.cache.getStats();

    expect(stats).toBeDefined();
    expect(stats.totalCached).toBe(3);
    expect(stats.totalHits).toBe(16); // 5 + 10 + 1
    expect(stats.totalRequests).toBe(19); // 3 + 16
    expect(stats.hitRate).toBeGreaterThan(0);
    expect(stats.avgHitCount).toBeCloseTo(5.33, 1);
  });

  it('应该能够按学科统计缓存', async () => {
    const stats = await caller.cache.getStats();

    expect(stats.bySubject).toBeDefined();
    expect(stats.bySubject.length).toBeGreaterThan(0);

    const mathStats = stats.bySubject.find(s => s.subject === 'math');
    expect(mathStats).toBeDefined();
    expect(mathStats?.count).toBe(2);

    const englishStats = stats.bySubject.find(s => s.subject === 'english');
    expect(englishStats).toBeDefined();
    expect(englishStats?.count).toBe(1);
  });

  it('应该能够按年级统计缓存', async () => {
    const stats = await caller.cache.getStats();

    expect(stats.byGrade).toBeDefined();
    expect(stats.byGrade.length).toBeGreaterThan(0);

    const junior1Stats = stats.byGrade.find(s => s.grade === 'junior1');
    expect(junior1Stats).toBeDefined();
    expect(junior1Stats?.count).toBe(1);
  });

  it('应该能够获取缓存列表(分页)', async () => {
    const result = await caller.cache.getCacheList({
      page: 1,
      pageSize: 10,
    });

    expect(result).toBeDefined();
    expect(result.caches).toBeDefined();
    expect(result.caches.length).toBe(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  it('应该能够按学科筛选缓存列表', async () => {
    const result = await caller.cache.getCacheList({
      page: 1,
      pageSize: 10,
      subject: 'math',
    });

    expect(result).toBeDefined();
    expect(result.caches.length).toBe(2);
    expect(result.caches.every(c => c.subject === 'math')).toBe(true);
  });

  it('应该能够按年级筛选缓存列表', async () => {
    const result = await caller.cache.getCacheList({
      page: 1,
      pageSize: 10,
      grade: 'junior1',
    });

    expect(result).toBeDefined();
    expect(result.caches.length).toBe(1);
    expect(result.caches[0].grade).toBe('junior1');
  });

  it('应该能够清理低命中率的缓存', async () => {
    const result = await caller.cache.clearLowHitCache({
      maxHitCount: 1,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(1); // 只有hitCount=1的那条

    // 验证缓存已被删除
    const stats = await caller.cache.getStats();
    expect(stats.totalCached).toBe(2);
  });

  it('应该能够清空所有缓存', async () => {
    const result = await caller.cache.clearCache();

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2); // 剩余的2条

    // 验证所有缓存已被清空
    const stats = await caller.cache.getStats();
    expect(stats.totalCached).toBe(0);
    expect(stats.totalHits).toBe(0);
  });
});
