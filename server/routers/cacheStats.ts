import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getCacheStats } from "../services/analysisCacheService";

export const cacheStatsRouter = router({
  /**
   * 获取AI分析缓存统计信息
   */
  getStats: protectedProcedure
    .query(async () => {
      const stats = await getCacheStats();
      
      if (!stats) {
        return {
          totalCaches: 0,
          totalHits: 0,
          avgHitCount: 0,
        };
      }

      return stats;
    }),
});
