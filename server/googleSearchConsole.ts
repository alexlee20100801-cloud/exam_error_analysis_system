import { TRPCError } from "@trpc/server";
import { getGscDataCache, createGscDataCache } from "./seoManagementDb";

/**
 * Google Search Console API集成模块
 * 
 * 注意: 使用此模块需要配置以下环境变量:
 * - GOOGLE_SEARCH_CONSOLE_API_KEY: Google API密钥
 * - GOOGLE_SEARCH_CONSOLE_SITE_URL: 网站URL (如 https://example.com)
 */

const GSC_API_BASE = 'https://searchconsole.googleapis.com/v1';
const CACHE_DURATION_HOURS = 24; // 缓存24小时

// 检查是否配置了GSC API
export function isGscConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SEARCH_CONSOLE_API_KEY &&
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
  );
}

// 获取API密钥和站点URL
function getGscConfig() {
  const apiKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;

  if (!apiKey || !siteUrl) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: '未配置Google Search Console API。请在环境变量中设置GOOGLE_SEARCH_CONSOLE_API_KEY和GOOGLE_SEARCH_CONSOLE_SITE_URL'
    });
  }

  return { apiKey, siteUrl };
}

// 通用API请求函数
async function makeGscRequest(endpoint: string, body?: any) {
  const { apiKey, siteUrl } = getGscConfig();
  
  const url = `${GSC_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Google Search Console API错误: ${error.error?.message || response.statusText}`
    });
  }

  return response.json();
}

// ============ 索引状态查询 ============

export interface IndexStatus {
  totalIndexed: number;
  totalSubmitted: number;
  indexingErrors: Array<{
    url: string;
    error: string;
    lastCrawled?: string;
  }>;
  coverage: {
    valid: number;
    warning: number;
    error: number;
    excluded: number;
  };
}

export async function getIndexStatus(): Promise<IndexStatus> {
  // 检查缓存
  const cached = await getGscDataCache(
    'index_status',
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
    new Date()
  );

  if (cached) {
    return cached.data as IndexStatus;
  }

  // 调用GSC API获取索引状态
  const { siteUrl } = getGscConfig();
  
  try {
    const response = await makeGscRequest(
      `/urlInspection/index:inspect`,
      {
        inspectionUrl: siteUrl,
        siteUrl: siteUrl
      }
    );

    // 处理响应数据
    const indexStatus: IndexStatus = {
      totalIndexed: response.inspectionResult?.indexStatusResult?.coverageState === 'Submitted and indexed' ? 1 : 0,
      totalSubmitted: 1,
      indexingErrors: [],
      coverage: {
        valid: response.inspectionResult?.indexStatusResult?.verdict === 'PASS' ? 1 : 0,
        warning: 0,
        error: response.inspectionResult?.indexStatusResult?.verdict === 'FAIL' ? 1 : 0,
        excluded: 0
      }
    };

    // 缓存结果
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    await createGscDataCache({
      dataType: 'index_status',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      data: indexStatus,
      expiresAt
    });

    return indexStatus;
  } catch (error: any) {
    // 如果API未配置或调用失败,返回模拟数据
    console.warn('GSC API调用失败,返回模拟数据:', error.message);
    return {
      totalIndexed: 0,
      totalSubmitted: 0,
      indexingErrors: [],
      coverage: {
        valid: 0,
        warning: 0,
        error: 0,
        excluded: 0
      }
    };
  }
}

// ============ 搜索分析数据 ============

export interface SearchAnalytics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  trends: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

export async function getSearchAnalytics(
  startDate: Date,
  endDate: Date
): Promise<SearchAnalytics> {
  // 检查缓存
  const cached = await getGscDataCache('search_analytics', startDate, endDate);

  if (cached) {
    return cached.data as SearchAnalytics;
  }

  // 调用GSC API获取搜索分析数据
  const { siteUrl } = getGscConfig();
  
  try {
    const response = await makeGscRequest(
      `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['date'],
        rowLimit: 1000
      }
    );

    // 处理响应数据
    const rows = response.rows || [];
    const totalClicks = rows.reduce((sum: number, row: any) => sum + (row.clicks || 0), 0);
    const totalImpressions = rows.reduce((sum: number, row: any) => sum + (row.impressions || 0), 0);
    const avgPosition = rows.length > 0
      ? rows.reduce((sum: number, row: any) => sum + (row.position || 0), 0) / rows.length
      : 0;

    const analytics: SearchAnalytics = {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      position: avgPosition,
      trends: rows.map((row: any) => ({
        date: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      }))
    };

    // 缓存结果
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    await createGscDataCache({
      dataType: 'search_analytics',
      startDate,
      endDate,
      data: analytics,
      expiresAt
    });

    return analytics;
  } catch (error: any) {
    console.warn('GSC API调用失败,返回模拟数据:', error.message);
    return {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      trends: []
    };
  }
}

// ============ 搜索查询统计 ============

export interface QueryStats {
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  totalQueries: number;
}

export async function getQueryStats(
  startDate: Date,
  endDate: Date,
  limit = 100
): Promise<QueryStats> {
  // 检查缓存
  const cached = await getGscDataCache('query_stats', startDate, endDate);

  if (cached) {
    return cached.data as QueryStats;
  }

  // 调用GSC API获取查询统计
  const { siteUrl } = getGscConfig();
  
  try {
    const response = await makeGscRequest(
      `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: limit
      }
    );

    // 处理响应数据
    const rows = response.rows || [];

    const queryStats: QueryStats = {
      topQueries: rows.map((row: any) => ({
        query: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0
      })),
      totalQueries: rows.length
    };

    // 缓存结果
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    await createGscDataCache({
      dataType: 'query_stats',
      startDate,
      endDate,
      data: queryStats,
      expiresAt
    });

    return queryStats;
  } catch (error: any) {
    console.warn('GSC API调用失败,返回模拟数据:', error.message);
    return {
      topQueries: [],
      totalQueries: 0
    };
  }
}

// ============ 页面性能统计 ============

export interface PagePerformance {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getPagePerformance(
  startDate: Date,
  endDate: Date,
  limit = 100
): Promise<PagePerformance[]> {
  const { siteUrl } = getGscConfig();
  
  try {
    const response = await makeGscRequest(
      `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['page'],
        rowLimit: limit
      }
    );

    const rows = response.rows || [];

    return rows.map((row: any) => ({
      url: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0
    }));
  } catch (error: any) {
    console.warn('GSC API调用失败,返回空数组:', error.message);
    return [];
  }
}

// ============ 提交URL到Google索引 ============

export async function submitUrlForIndexing(url: string): Promise<boolean> {
  const { siteUrl } = getGscConfig();
  
  try {
    await makeGscRequest(
      `/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(url)}`,
      {}
    );
    return true;
  } catch (error: any) {
    console.error('提交URL索引失败:', error.message);
    return false;
  }
}
