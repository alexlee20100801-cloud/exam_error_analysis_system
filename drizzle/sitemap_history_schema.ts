import { mysqlTable, int, varchar, text, timestamp, boolean, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Sitemap更新历史记录表
 * 记录每次sitemap自动更新的执行结果
 */
export const sitemapUpdateHistory = mysqlTable("sitemap_update_history", {
  id: int().autoincrement().primaryKey(),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  success: boolean("success").notNull(),
  totalUrls: int("total_urls"),
  sitemapUrl: text("sitemap_url"),
  errorMessage: text("error_message"),
  executionTimeMs: int("execution_time_ms"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  updatedAtIdx: index("idx_sitemap_history_updated_at").on(table.updatedAt),
  successIdx: index("idx_sitemap_history_success").on(table.success),
}));
