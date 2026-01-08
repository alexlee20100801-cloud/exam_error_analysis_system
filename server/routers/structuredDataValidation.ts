import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  validateStructuredData,
  validateMultipleUrls,
  getRichResultsTestUrl,
} from "../structuredDataValidationService";

/**
 * 结构化数据验证路由器
 */
export const structuredDataValidationRouter = router({
  /**
   * 验证单个URL的结构化数据
   */
  validateUrl: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await validateStructuredData(input.url);
      return result;
    }),

  /**
   * 批量验证多个URL
   */
  validateMultiple: protectedProcedure
    .input(
      z.object({
        urls: z.array(z.string().url()).min(1).max(20),
      })
    )
    .mutation(async ({ input }) => {
      const result = await validateMultipleUrls(input.urls);
      return result;
    }),

  /**
   * 验证当前网站的关键页面
   */
  validateKeyPages: protectedProcedure.mutation(async () => {
    const baseUrl = process.env.VITE_APP_URL || "https://exam-error-analysis.manus.space";
    
    const keyPages = [
      `${baseUrl}/`,
      `${baseUrl}/dashboard`,
      `${baseUrl}/error-questions`,
      `${baseUrl}/knowledge-graph`,
      `${baseUrl}/learning-report`,
    ];

    const result = await validateMultipleUrls(keyPages);
    return result;
  }),

  /**
   * 获取Google Rich Results Test链接
   */
  getRichResultsTestLink: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .query(({ input }) => {
      return {
        testUrl: getRichResultsTestUrl(input.url),
      };
    }),
});
