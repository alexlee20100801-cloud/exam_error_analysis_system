import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  updateSitemapFile,
  getSearchEngineSubmissionGuide,
} from "../sitemapAutoUpdateService";

/**
 * Sitemap自动更新路由器
 */
export const sitemapAutoUpdateRouter = router({
  /**
   * 手动触发sitemap更新
   */
  updateNow: protectedProcedure.mutation(async () => {
    const result = await updateSitemapFile();
    return result;
  }),

  /**
   * 获取搜索引擎提交指引
   */
  getSubmissionGuide: publicProcedure.query(() => {
    return getSearchEngineSubmissionGuide();
  }),
});
