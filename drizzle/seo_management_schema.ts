import { mysqlTable, int, varchar, text, timestamp, json, float, index } from "drizzle-orm/mysql-core";

// Sitemap更新历史表
export const sitemapHistory = mysqlTable("sitemap_history", {
  id: int("id").primaryKey().autoincrement(),
  updateTime: timestamp("update_time").notNull().defaultNow(),
  urlCount: int("url_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("success"), // success, failed, in_progress
  errorMessage: text("error_message"),
  generatedBy: varchar("generated_by", { length: 50 }).notNull().default("auto"), // auto, manual
  metadata: json("metadata"), // 额外信息如执行时长、文件大小等
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  updateTimeIdx: index("update_time_idx").on(table.updateTime),
  statusIdx: index("status_idx").on(table.status)
}));

// 结构化数据验证结果表
export const schemaValidationResults = mysqlTable("schema_validation_results", {
  id: int("id").primaryKey().autoincrement(),
  pageUrl: varchar("page_url", { length: 500 }).notNull(),
  pageType: varchar("page_type", { length: 50 }).notNull(), // home, error_question, learning_report, etc.
  schemaType: varchar("schema_type", { length: 50 }).notNull(), // WebSite, Question, Course, etc.
  validationStatus: varchar("validation_status", { length: 20 }).notNull().default("pending"), // pending, valid, invalid, warning
  validationTime: timestamp("validation_time").notNull().defaultNow(),
  errors: json("errors"), // 验证错误详情
  warnings: json("warnings"), // 验证警告详情
  richResultsEligible: int("rich_results_eligible").notNull().default(0), // 0=否, 1=是
  metadata: json("metadata"), // 额外信息
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  pageUrlIdx: index("page_url_idx").on(table.pageUrl),
  validationStatusIdx: index("validation_status_idx").on(table.validationStatus),
  pageTypeIdx: index("page_type_idx").on(table.pageType)
}));

// SEO统计表
export const seoStats = mysqlTable("seo_stats", {
  id: int("id").primaryKey().autoincrement(),
  pageUrl: varchar("page_url", { length: 500 }).notNull(),
  pageType: varchar("page_type", { length: 50 }).notNull(),
  date: timestamp("date").notNull(),
  pageViews: int("page_views").notNull().default(0),
  uniqueVisitors: int("unique_visitors").notNull().default(0),
  updateCount: int("update_count").notNull().default(0), // 当天更新次数
  lastUpdateTime: timestamp("last_update_time"),
  calculatedPriority: float("calculated_priority").notNull().default(0.5), // 计算出的优先级 0.0-1.0
  calculatedChangefreq: varchar("calculated_changefreq", { length: 20 }).notNull().default("weekly"), // always, hourly, daily, weekly, monthly, yearly, never
  manualPriority: float("manual_priority"), // 手动设置的优先级，如果设置则覆盖计算值
  manualChangefreq: varchar("manual_changefreq", { length: 20 }), // 手动设置的更新频率
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  pageUrlIdx: index("page_url_idx").on(table.pageUrl),
  dateIdx: index("date_idx").on(table.date),
  pageTypeIdx: index("page_type_idx").on(table.pageType),
  priorityIdx: index("priority_idx").on(table.calculatedPriority)
}));

// Google Search Console数据缓存表
export const gscDataCache = mysqlTable("gsc_data_cache", {
  id: int("id").primaryKey().autoincrement(),
  dataType: varchar("data_type", { length: 50 }).notNull(), // index_status, search_analytics, query_stats
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  data: json("data").notNull(), // 缓存的GSC数据
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 缓存过期时间
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  dataTypeIdx: index("data_type_idx").on(table.dataType),
  expiresAtIdx: index("expires_at_idx").on(table.expiresAt),
  dateRangeIdx: index("date_range_idx").on(table.startDate, table.endDate)
}));

// SEO优先级调整历史表
export const seoPriorityHistory = mysqlTable("seo_priority_history", {
  id: int("id").primaryKey().autoincrement(),
  pageUrl: varchar("page_url", { length: 500 }).notNull(),
  oldPriority: float("old_priority"),
  newPriority: float("new_priority").notNull(),
  oldChangefreq: varchar("old_changefreq", { length: 20 }),
  newChangefreq: varchar("new_changefreq", { length: 20 }).notNull(),
  adjustmentType: varchar("adjustment_type", { length: 20 }).notNull(), // auto, manual
  adjustedBy: int("adjusted_by"), // 用户ID，如果是手动调整
  reason: text("reason"), // 调整原因说明
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  pageUrlIdx: index("page_url_idx").on(table.pageUrl),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
  adjustmentTypeIdx: index("adjustment_type_idx").on(table.adjustmentType)
}));

// TypeScript类型导出
export type SitemapHistory = typeof sitemapHistory.$inferSelect;
export type NewSitemapHistory = typeof sitemapHistory.$inferInsert;

export type SchemaValidationResult = typeof schemaValidationResults.$inferSelect;
export type NewSchemaValidationResult = typeof schemaValidationResults.$inferInsert;

export type SeoStat = typeof seoStats.$inferSelect;
export type NewSeoStat = typeof seoStats.$inferInsert;

export type GscDataCache = typeof gscDataCache.$inferSelect;
export type NewGscDataCache = typeof gscDataCache.$inferInsert;

export type SeoPriorityHistory = typeof seoPriorityHistory.$inferSelect;
export type NewSeoPriorityHistory = typeof seoPriorityHistory.$inferInsert;
