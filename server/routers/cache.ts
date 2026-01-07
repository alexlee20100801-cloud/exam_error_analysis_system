import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { questionAnalysisCache } from "../../drizzle/schema";
import { sql, count, sum, avg } from "drizzle-orm";

export const cacheRouter = router({
  /**
   * 获取详细的缓存统计信息
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("数据库连接失败");
    }

    // 获取总体统计
    const totalResult = await db
      .select({
        totalCached: count(),
        totalHits: sum(questionAnalysisCache.hitCount),
        avgHitCount: avg(questionAnalysisCache.hitCount),
      })
      .from(questionAnalysisCache);

    const total = totalResult[0];
    const totalCached = Number(total.totalCached) || 0;
    const totalHits = Number(total.totalHits) || 0;
    const avgHitCount = Number(total.avgHitCount) || 0;

    // 计算总请求数和命中率
    // 假设每个缓存项至少被请求过一次(创建时),加上命中次数
    const totalRequests = totalCached + totalHits;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const totalMisses = totalCached; // 未命中次数等于缓存项数量(首次创建时)

    // 按学科统计
    const bySubject = await db
      .select({
        subject: questionAnalysisCache.subject,
        count: count(),
        totalHits: sum(questionAnalysisCache.hitCount),
      })
      .from(questionAnalysisCache)
      .groupBy(questionAnalysisCache.subject);

    const subjectStats = bySubject.map((item) => {
      const itemCount = Number(item.count) || 0;
      const itemHits = Number(item.totalHits) || 0;
      const itemRequests = itemCount + itemHits;
      const itemHitRate = itemRequests > 0 ? (itemHits / itemRequests) * 100 : 0;

      return {
        subject: item.subject,
        count: itemCount,
        hitRate: Math.round(itemHitRate * 10) / 10,
      };
    });

    // 按年级统计
    const byGrade = await db
      .select({
        grade: questionAnalysisCache.grade,
        count: count(),
        totalHits: sum(questionAnalysisCache.hitCount),
      })
      .from(questionAnalysisCache)
      .groupBy(questionAnalysisCache.grade);

    const gradeStats = byGrade.map((item) => {
      const itemCount = Number(item.count) || 0;
      const itemHits = Number(item.totalHits) || 0;
      const itemRequests = itemCount + itemHits;
      const itemHitRate = itemRequests > 0 ? (itemHits / itemRequests) * 100 : 0;

      return {
        grade: item.grade,
        count: itemCount,
        hitRate: Math.round(itemHitRate * 10) / 10,
      };
    });

    return {
      totalCached,
      totalHits,
      totalMisses,
      totalRequests,
      hitRate: Math.round(hitRate * 10) / 10,
      avgHitCount: Math.round(avgHitCount * 10) / 10,
      bySubject: subjectStats,
      byGrade: gradeStats,
    };
  }),

  /**
   * 清空所有缓存
   */
  clearCache: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("数据库连接失败");
    }

    // 获取删除前的数量
    const beforeCount = await db
      .select({ count: count() })
      .from(questionAnalysisCache);

    const deletedCount = Number(beforeCount[0].count) || 0;

    // 删除所有缓存
    await db.delete(questionAnalysisCache);

    return {
      success: true,
      deletedCount,
    };
  }),

  /**
   * 清理低命中率的缓存
   */
  clearLowHitCache: protectedProcedure
    .input(
      z.object({
        maxHitCount: z.number().min(0).default(1), // 清理命中次数小于等于此值的缓存
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("数据库连接失败");
      }

      // 获取符合条件的缓存数量
      const toDelete = await db
        .select({ count: count() })
        .from(questionAnalysisCache)
        .where(sql`${questionAnalysisCache.hitCount} <= ${input.maxHitCount}`);

      const deletedCount = Number(toDelete[0].count) || 0;

      // 删除低命中率缓存
      await db
        .delete(questionAnalysisCache)
        .where(sql`${questionAnalysisCache.hitCount} <= ${input.maxHitCount}`);

      return {
        success: true,
        deletedCount,
      };
    }),

  /**
   * 获取缓存详情列表(分页)
   */
  getCacheList: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        subject: z.string().optional(),
        grade: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("数据库连接失败");
      }

      const offset = (input.page - 1) * input.pageSize;

      // 构建查询条件
      let query = db.select().from(questionAnalysisCache);

      if (input.subject) {
        query = query.where(sql`${questionAnalysisCache.subject} = ${input.subject}`) as any;
      }

      if (input.grade) {
        query = query.where(sql`${questionAnalysisCache.grade} = ${input.grade}`) as any;
      }

      // 获取总数
      const totalResult = await db
        .select({ count: count() })
        .from(questionAnalysisCache);
      const total = Number(totalResult[0].count) || 0;

      // 获取分页数据
      const caches = await query
        .orderBy(sql`${questionAnalysisCache.hitCount} DESC`)
        .limit(input.pageSize)
        .offset(offset);

      return {
        caches,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),
});
