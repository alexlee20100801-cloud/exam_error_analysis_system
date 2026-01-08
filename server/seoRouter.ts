import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createSitemapHistory,
  getSitemapHistoryList,
  getSitemapHistoryById,
  getLatestSitemapHistory,
  createSchemaValidationResult,
  getSchemaValidationResults,
  getSchemaValidationByUrl,
  createOrUpdateSeoStats,
  getSeoStatsByUrl,
  getTopPagesByPriority,
  getSeoStatsAggregated,
  getGscDataCache,
  createGscDataCache,
  cleanExpiredGscCache,
  getSeoPriorityHistory,
  createSeoPriorityHistory,
  calculateSmartPriority,
  batchUpdatePriorities
} from "./seoManagementDb";
import { TRPCError } from "@trpc/server";

export const seoRouter = router({
  // ============ Sitemap管理 ============
  
  // 获取sitemap更新历史列表
  getSitemapHistory: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(50)
    }))
    .query(async ({ input }) => {
      return getSitemapHistoryList(input.limit);
    }),

  // 获取最新的sitemap更新记录
  getLatestSitemapUpdate: publicProcedure
    .query(async () => {
      return getLatestSitemapHistory();
    }),

  // 手动触发sitemap更新
  triggerSitemapUpdate: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // 生成sitemap逻辑
        const urlCount = await generateSitemapXml();
        
        // 记录更新历史
        await createSitemapHistory({
          urlCount,
          status: 'success',
          generatedBy: 'manual',
          metadata: {
            triggeredBy: ctx.user.id,
            triggeredAt: new Date().toISOString()
          }
        });

        return {
          success: true,
          urlCount,
          message: 'Sitemap更新成功'
        };
      } catch (error: any) {
        // 记录失败
        await createSitemapHistory({
          urlCount: 0,
          status: 'failed',
          generatedBy: 'manual',
          errorMessage: error.message,
          metadata: {
            triggeredBy: ctx.user.id,
            error: error.stack
          }
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Sitemap更新失败: ${error.message}`
        });
      }
    }),

  // ============ 结构化数据验证 ============

  // 获取验证结果列表
  getValidationResults: publicProcedure
    .input(z.object({
      pageType: z.string().optional(),
      validationStatus: z.string().optional(),
      limit: z.number().optional().default(100)
    }))
    .query(async ({ input }) => {
      return getSchemaValidationResults(input);
    }),

  // 验证指定URL的结构化数据
  validatePageSchema: protectedProcedure
    .input(z.object({
      pageUrl: z.string().url(),
      pageType: z.string(),
      schemaType: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        // 调用Google Rich Results Test API
        const validationResult = await validateStructuredData(
          input.pageUrl,
          input.schemaType
        );

        // 保存验证结果
        await createSchemaValidationResult({
          pageUrl: input.pageUrl,
          pageType: input.pageType,
          schemaType: input.schemaType,
          validationStatus: validationResult.status,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          richResultsEligible: validationResult.richResultsEligible ? 1 : 0,
          validationTime: new Date()
        });

        return validationResult;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `验证失败: ${error.message}`
        });
      }
    }),

  // ============ SEO统计数据 ============

  // 记录页面访问
  trackPageView: publicProcedure
    .input(z.object({
      pageUrl: z.string(),
      pageType: z.string()
    }))
    .mutation(async ({ input }) => {
      const stats = await getSeoStatsByUrl(input.pageUrl, 1);
      const currentStats = stats[0];

      await createOrUpdateSeoStats(input.pageUrl, {
        pageType: input.pageType,
        pageViews: (currentStats?.pageViews || 0) + 1,
        uniqueVisitors: (currentStats?.uniqueVisitors || 0) + 1
      });

      return { success: true };
    }),

  // 记录页面更新
  trackPageUpdate: publicProcedure
    .input(z.object({
      pageUrl: z.string(),
      pageType: z.string()
    }))
    .mutation(async ({ input }) => {
      const stats = await getSeoStatsByUrl(input.pageUrl, 1);
      const currentStats = stats[0];

      await createOrUpdateSeoStats(input.pageUrl, {
        pageType: input.pageType,
        updateCount: (currentStats?.updateCount || 0) + 1,
        lastUpdateTime: new Date()
      });

      return { success: true };
    }),

  // 获取页面SEO统计
  getPageSeoStats: publicProcedure
    .input(z.object({
      pageUrl: z.string(),
      days: z.number().optional().default(30)
    }))
    .query(async ({ input }) => {
      return getSeoStatsByUrl(input.pageUrl, input.days);
    }),

  // 获取优先级最高的页面
  getTopPages: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(50)
    }))
    .query(async ({ input }) => {
      return getTopPagesByPriority(input.limit);
    }),

  // 获取聚合统计数据
  getSeoStatsAggregated: publicProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date()
    }))
    .query(async ({ input }) => {
      return getSeoStatsAggregated(input.startDate, input.endDate);
    }),

  // ============ 智能优先级调整 ============

  // 计算单个页面的智能优先级
  calculatePagePriority: protectedProcedure
    .input(z.object({
      pageUrl: z.string()
    }))
    .query(async ({ input }) => {
      return calculateSmartPriority(input.pageUrl);
    }),

  // 批量更新所有页面优先级
  batchUpdatePriorities: protectedProcedure
    .mutation(async () => {
      try {
        const results = await batchUpdatePriorities();
        return {
          success: true,
          updatedCount: results.length,
          results
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `批量更新失败: ${error.message}`
        });
      }
    }),

  // 手动设置页面优先级
  setManualPriority: protectedProcedure
    .input(z.object({
      pageUrl: z.string(),
      priority: z.number().min(0).max(1),
      changefreq: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])
    }))
    .mutation(async ({ input, ctx }) => {
      const stats = await getSeoStatsByUrl(input.pageUrl, 1);
      const currentStats = stats[0];

      await createOrUpdateSeoStats(input.pageUrl, {
        pageType: currentStats?.pageType || 'unknown',
        manualPriority: input.priority,
        manualChangefreq: input.changefreq
      });

      // 记录历史
      await createSeoPriorityHistory({
        pageUrl: input.pageUrl,
        oldPriority: currentStats?.calculatedPriority,
        newPriority: input.priority,
        oldChangefreq: currentStats?.calculatedChangefreq,
        newChangefreq: input.changefreq,
        adjustmentType: 'manual',
        adjustedBy: ctx.user.id,
        reason: '手动调整优先级'
      });

      return { success: true };
    }),

  // 获取优先级调整历史
  getPriorityHistory: publicProcedure
    .input(z.object({
      pageUrl: z.string().optional(),
      limit: z.number().optional().default(100)
    }))
    .query(async ({ input }) => {
      return getSeoPriorityHistory(input.pageUrl, input.limit);
    }),

  // ============ Google Search Console缓存 ============

  // 清理过期缓存
  cleanExpiredCache: protectedProcedure
    .mutation(async () => {
      await cleanExpiredGscCache();
      return { success: true };
    }),

  // ============ Google Search Console集成 ============

  // 检查GSC是否配置
  isGscConfigured: publicProcedure
    .query(async () => {
      const { isGscConfigured } = await import('./googleSearchConsole');
      return { configured: isGscConfigured() };
    }),

  // 获取索引状态
  getIndexStatus: protectedProcedure
    .query(async () => {
      const { getIndexStatus } = await import('./googleSearchConsole');
      return getIndexStatus();
    }),

  // 获取搜索分析数据
  getSearchAnalytics: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date()
    }))
    .query(async ({ input }) => {
      const { getSearchAnalytics } = await import('./googleSearchConsole');
      return getSearchAnalytics(input.startDate, input.endDate);
    }),

  // 获取搜索查询统计
  getQueryStats: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      limit: z.number().optional().default(100)
    }))
    .query(async ({ input }) => {
      const { getQueryStats } = await import('./googleSearchConsole');
      return getQueryStats(input.startDate, input.endDate, input.limit);
    }),

  // 获取页面性能统计
  getPagePerformance: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      limit: z.number().optional().default(100)
    }))
    .query(async ({ input }) => {
      const { getPagePerformance } = await import('./googleSearchConsole');
      return getPagePerformance(input.startDate, input.endDate, input.limit);
    }),

  // 提交URL到Google索引
  submitUrlForIndexing: protectedProcedure
    .input(z.object({
      url: z.string().url()
    }))
    .mutation(async ({ input }) => {
      const { submitUrlForIndexing } = await import('./googleSearchConsole');
      const success = await submitUrlForIndexing(input.url);
      return { success };
    })
});

// ============ 辅助函数 ============

// 生成sitemap.xml文件
async function generateSitemapXml(): Promise<number> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // 获取所有需要包含在sitemap中的URL
  const urls: Array<{
    url: string;
    priority: number;
    changefreq: string;
    lastmod?: Date;
  }> = [];

  // 添加静态页面
  urls.push({
    url: '/',
    priority: 1.0,
    changefreq: 'daily'
  });

  // 获取动态页面的优先级数据
  const topPages = await getTopPagesByPriority(1000);
  
  for (const page of topPages) {
    const priority = page.manualPriority ?? page.calculatedPriority;
    const changefreq = page.manualChangefreq ?? page.calculatedChangefreq;
    
    urls.push({
      url: page.pageUrl,
      priority,
      changefreq,
      lastmod: page.lastUpdateTime || undefined
    });
  }

  // 生成XML内容
  const baseUrl = process.env.VITE_APP_URL || 'https://exam-error-analysis.manus.space';
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const item of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${item.url}</loc>\n`;
    if (item.lastmod) {
      xml += `    <lastmod>${item.lastmod.toISOString().split('T')[0]}</lastmod>\n`;
    }
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `    <priority>${item.priority.toFixed(1)}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  // 写入文件
  const publicDir = path.join(process.cwd(), 'client', 'public');
  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), xml, 'utf-8');

  return urls.length;
}

// 验证结构化数据
async function validateStructuredData(
  pageUrl: string,
  schemaType: string
): Promise<{
  status: string;
  errors: any[];
  warnings: any[];
  richResultsEligible: boolean;
}> {
  // 这里应该调用Google Rich Results Test API
  // 由于API需要配置,这里先返回模拟数据
  
  // TODO: 实现真实的Google Rich Results Test API调用
  // const response = await fetch(
  //   'https://searchconsole.googleapis.com/v1/urlTestingTools/richResults:run',
  //   {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${process.env.GOOGLE_API_TOKEN}`,
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify({ url: pageUrl })
  //   }
  // );

  return {
    status: 'valid',
    errors: [],
    warnings: [],
    richResultsEligible: true
  };
}
