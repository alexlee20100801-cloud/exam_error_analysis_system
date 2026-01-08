import { db } from "./db";
import { 
  sitemapHistory, 
  schemaValidationResults, 
  seoStats, 
  gscDataCache,
  seoPriorityHistory,
  type NewSitemapHistory,
  type NewSchemaValidationResult,
  type NewSeoStat,
  type NewGscDataCache,
  type NewSeoPriorityHistory
} from "../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// ============ Sitemap历史管理 ============

export async function createSitemapHistory(data: NewSitemapHistory) {
  const [result] = await db.insert(sitemapHistory).values(data);
  return result;
}

export async function getSitemapHistoryList(limit = 50) {
  return db
    .select()
    .from(sitemapHistory)
    .orderBy(desc(sitemapHistory.updateTime))
    .limit(limit);
}

export async function getSitemapHistoryById(id: number) {
  const [result] = await db
    .select()
    .from(sitemapHistory)
    .where(eq(sitemapHistory.id, id));
  return result;
}

export async function getLatestSitemapHistory() {
  const [result] = await db
    .select()
    .from(sitemapHistory)
    .orderBy(desc(sitemapHistory.updateTime))
    .limit(1);
  return result;
}

// ============ 结构化数据验证管理 ============

export async function createSchemaValidationResult(data: NewSchemaValidationResult) {
  const [result] = await db.insert(schemaValidationResults).values(data);
  return result;
}

export async function getSchemaValidationResults(filters?: {
  pageType?: string;
  validationStatus?: string;
  limit?: number;
}) {
  let query = db.select().from(schemaValidationResults);

  if (filters?.pageType) {
    query = query.where(eq(schemaValidationResults.pageType, filters.pageType)) as any;
  }
  if (filters?.validationStatus) {
    query = query.where(eq(schemaValidationResults.validationStatus, filters.validationStatus)) as any;
  }

  return query
    .orderBy(desc(schemaValidationResults.validationTime))
    .limit(filters?.limit || 100);
}

export async function getSchemaValidationByUrl(pageUrl: string) {
  const [result] = await db
    .select()
    .from(schemaValidationResults)
    .where(eq(schemaValidationResults.pageUrl, pageUrl))
    .orderBy(desc(schemaValidationResults.validationTime))
    .limit(1);
  return result;
}

export async function updateSchemaValidationResult(
  id: number,
  data: Partial<NewSchemaValidationResult>
) {
  await db
    .update(schemaValidationResults)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schemaValidationResults.id, id));
}

// ============ SEO统计数据管理 ============

export async function createOrUpdateSeoStats(pageUrl: string, data: Partial<NewSeoStat>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await db
    .select()
    .from(seoStats)
    .where(
      and(
        eq(seoStats.pageUrl, pageUrl),
        eq(seoStats.date, today)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(seoStats)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(seoStats.id, existing[0].id));
    return existing[0].id;
  } else {
    const [result] = await db.insert(seoStats).values({
      pageUrl,
      date: today,
      pageType: data.pageType || 'unknown',
      ...data
    });
    return result.insertId;
  }
}

export async function getSeoStatsByUrl(pageUrl: string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db
    .select()
    .from(seoStats)
    .where(
      and(
        eq(seoStats.pageUrl, pageUrl),
        gte(seoStats.date, startDate)
      )
    )
    .orderBy(desc(seoStats.date));
}

export async function getTopPagesByPriority(limit = 50) {
  return db
    .select()
    .from(seoStats)
    .orderBy(desc(seoStats.calculatedPriority))
    .limit(limit);
}

export async function getSeoStatsAggregated(startDate: Date, endDate: Date) {
  return db
    .select({
      pageType: seoStats.pageType,
      totalPageViews: sql<number>`SUM(${seoStats.pageViews})`,
      totalUniqueVisitors: sql<number>`SUM(${seoStats.uniqueVisitors})`,
      avgPriority: sql<number>`AVG(${seoStats.calculatedPriority})`,
      pageCount: sql<number>`COUNT(DISTINCT ${seoStats.pageUrl})`
    })
    .from(seoStats)
    .where(
      and(
        gte(seoStats.date, startDate),
        lte(seoStats.date, endDate)
      )
    )
    .groupBy(seoStats.pageType);
}

// ============ Google Search Console缓存管理 ============

export async function createGscDataCache(data: NewGscDataCache) {
  const [result] = await db.insert(gscDataCache).values(data);
  return result;
}

export async function getGscDataCache(dataType: string, startDate: Date, endDate: Date) {
  const now = new Date();
  
  const [result] = await db
    .select()
    .from(gscDataCache)
    .where(
      and(
        eq(gscDataCache.dataType, dataType),
        eq(gscDataCache.startDate, startDate),
        eq(gscDataCache.endDate, endDate),
        gte(gscDataCache.expiresAt, now)
      )
    )
    .limit(1);
  
  return result;
}

export async function cleanExpiredGscCache() {
  const now = new Date();
  await db
    .delete(gscDataCache)
    .where(lte(gscDataCache.expiresAt, now));
}

// ============ SEO优先级调整历史 ============

export async function createSeoPriorityHistory(data: NewSeoPriorityHistory) {
  const [result] = await db.insert(seoPriorityHistory).values(data);
  return result;
}

export async function getSeoPriorityHistory(pageUrl?: string, limit = 100) {
  let query = db.select().from(seoPriorityHistory);

  if (pageUrl) {
    query = query.where(eq(seoPriorityHistory.pageUrl, pageUrl)) as any;
  }

  return query
    .orderBy(desc(seoPriorityHistory.createdAt))
    .limit(limit);
}

// ============ 智能优先级计算 ============

export async function calculateSmartPriority(pageUrl: string): Promise<{
  priority: number;
  changefreq: string;
}> {
  // 获取最近30天的统计数据
  const stats = await getSeoStatsByUrl(pageUrl, 30);
  
  if (stats.length === 0) {
    return { priority: 0.5, changefreq: 'weekly' };
  }

  // 计算平均访问量
  const avgPageViews = stats.reduce((sum, s) => sum + s.pageViews, 0) / stats.length;
  
  // 计算更新频率
  const updateCount = stats.reduce((sum, s) => sum + s.updateCount, 0);
  
  // 优先级计算逻辑 (0.0 - 1.0)
  // 基于访问量和更新频率的加权计算
  let priority = 0.5; // 默认值
  
  // 访问量影响 (权重60%)
  if (avgPageViews > 1000) priority += 0.3;
  else if (avgPageViews > 500) priority += 0.2;
  else if (avgPageViews > 100) priority += 0.1;
  
  // 更新频率影响 (权重40%)
  if (updateCount > 20) priority += 0.2;
  else if (updateCount > 10) priority += 0.15;
  else if (updateCount > 5) priority += 0.1;
  
  // 确保在0.0-1.0范围内
  priority = Math.min(1.0, Math.max(0.0, priority));
  
  // 更新频率判断
  let changefreq = 'weekly';
  const avgUpdatePerDay = updateCount / 30;
  
  if (avgUpdatePerDay >= 1) changefreq = 'daily';
  else if (avgUpdatePerDay >= 0.5) changefreq = 'weekly';
  else if (avgUpdatePerDay >= 0.1) changefreq = 'monthly';
  else changefreq = 'yearly';
  
  return { priority, changefreq };
}

// ============ 批量更新优先级 ============

export async function batchUpdatePriorities() {
  // 获取所有需要更新的页面
  const allPages = await db
    .select({
      pageUrl: seoStats.pageUrl,
      pageType: seoStats.pageType
    })
    .from(seoStats)
    .groupBy(seoStats.pageUrl, seoStats.pageType);

  const results = [];

  for (const page of allPages) {
    const { priority, changefreq } = await calculateSmartPriority(page.pageUrl);
    
    // 获取当前优先级
    const currentStats = await db
      .select()
      .from(seoStats)
      .where(eq(seoStats.pageUrl, page.pageUrl))
      .orderBy(desc(seoStats.date))
      .limit(1);

    const oldPriority = currentStats[0]?.calculatedPriority;
    const oldChangefreq = currentStats[0]?.calculatedChangefreq;

    // 更新统计数据
    await createOrUpdateSeoStats(page.pageUrl, {
      pageType: page.pageType,
      calculatedPriority: priority,
      calculatedChangefreq: changefreq
    });

    // 记录历史
    await createSeoPriorityHistory({
      pageUrl: page.pageUrl,
      oldPriority,
      newPriority: priority,
      oldChangefreq,
      newChangefreq: changefreq,
      adjustmentType: 'auto',
      reason: '基于访问量和更新频率的自动调整'
    });

    results.push({
      pageUrl: page.pageUrl,
      oldPriority,
      newPriority: priority,
      oldChangefreq,
      newChangefreq: changefreq
    });
  }

  return results;
}
