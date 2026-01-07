/**
 * 错题集分享功能的数据库Schema
 */

import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, json, index } from "drizzle-orm/mysql-core";

/**
 * 分享链接表
 */
export const errorQuestionShares = mysqlTable("error_question_shares", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(), // 创建分享的用户ID
  shareCode: varchar("share_code", { length: 32 }).notNull().unique(), // 分享码（短链接）
  title: varchar({ length: 255 }).notNull(), // 分享标题
  description: text(), // 分享描述
  
  // 分享的错题ID列表
  questionIds: json("question_ids").notNull(), // 存储错题ID数组
  
  // 权限控制
  accessType: mysqlEnum("access_type", ["public", "password"]).default("public").notNull(), // 访问类型
  password: varchar({ length: 255 }), // 密码（如果是密码保护）
  
  // 统计信息
  viewCount: int("view_count").default(0).notNull(), // 浏览次数
  downloadCount: int("download_count").default(0).notNull(), // 下载次数
  
  // 有效期
  expiresAt: timestamp("expires_at", { mode: "string" }), // 过期时间（可选）
  
  // 状态
  isActive: int("is_active").default(1).notNull(), // 是否激活
  
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_user_id").on(table.userId),
  index("idx_share_code").on(table.shareCode),
  index("idx_created_at").on(table.createdAt),
]);

/**
 * 分享访问记录表
 */
export const shareAccessLogs = mysqlTable("share_access_logs", {
  id: int().autoincrement().primaryKey().notNull(),
  shareId: int("share_id").notNull(), // 分享ID
  visitorId: varchar("visitor_id", { length: 255 }), // 访客ID（可以是用户ID或匿名ID）
  ipAddress: varchar("ip_address", { length: 45 }), // IP地址
  userAgent: text("user_agent"), // 浏览器信息
  action: mysqlEnum(["view", "download"]).notNull(), // 操作类型
  accessedAt: timestamp("accessed_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_share_id").on(table.shareId),
  index("idx_accessed_at").on(table.accessedAt),
]);

// 类型导出
export type ErrorQuestionShare = typeof errorQuestionShares.$inferSelect;
export type NewErrorQuestionShare = typeof errorQuestionShares.$inferInsert;
export type ShareAccessLog = typeof shareAccessLogs.$inferSelect;
export type NewShareAccessLog = typeof shareAccessLogs.$inferInsert;
