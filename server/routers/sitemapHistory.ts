import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { sitemapUpdateHistory } from "../../drizzle/sitemap_history_schema";
import { desc } from "drizzle-orm";

/**
 * Sitemap更新历史路由器
 */
export const sitemapHistoryRouter = router({
  /**
   * 获取sitemap更新历史记录
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const { limit, offset } = input;

      const history = await db
        .select()
        .from(sitemapUpdateHistory)
        .orderBy(desc(sitemapUpdateHistory.createdAt))
        .limit(limit)
        .offset(offset);

      const total = await db
        .select({ count: sitemapUpdateHistory.id })
        .from(sitemapUpdateHistory);

      return {
        history,
        total: total.length,
      };
    }),

  /**
   * 获取最近一次更新记录
   */
  getLatest: protectedProcedure.query(async () => {
    const latest = await db
      .select()
      .from(sitemapUpdateHistory)
      .orderBy(desc(sitemapUpdateHistory.createdAt))
      .limit(1);

    return latest[0] || null;
  }),

  /**
   * 获取更新统计信息
   */
  getStats: protectedProcedure.query(async () => {
    const allHistory = await db.select().from(sitemapUpdateHistory);

    const total = allHistory.length;
    const successful = allHistory.filter((h) => h.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const avgExecutionTime =
      total > 0
        ? allHistory.reduce((sum, h) => sum + (h.executionTimeMs || 0), 0) / total
        : 0;

    const lastUpdate = allHistory[0];

    return {
      total,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      avgExecutionTime: Math.round(avgExecutionTime),
      lastUpdate: lastUpdate
        ? {
            success: lastUpdate.success,
            updatedAt: lastUpdate.updatedAt,
            totalUrls: lastUpdate.totalUrls,
          }
        : null,
    };
  }),
});
