import { mysqlTable, int, varchar, text, timestamp, json, mysqlEnum, index } from "drizzle-orm/mysql-core";

/**
 * 证件管理表
 * 存储用户上传的各类证件信息
 */
export const idCards = mysqlTable("id_cards", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  
  // 证件类型
  cardType: mysqlEnum("card_type", [
    'id_card',           // 身份证
    'student_card',      // 学生证
    'driver_license',    // 驾驶证
    'passport',          // 护照
    'other'              // 其他
  ]).notNull(),
  
  // 证件名称（用户自定义）
  cardName: varchar("card_name", { length: 128 }).notNull(),
  
  // 证件图片
  frontImageUrl: varchar("front_image_url", { length: 500 }).notNull(),
  backImageUrl: varchar("back_image_url", { length: 500 }),
  
  // 拼接后的图片
  mergedImageUrl: varchar("merged_image_url", { length: 500 }),
  
  // A4排版图片
  a4LayoutImageUrl: varchar("a4_layout_image_url", { length: 500 }),
  
  // 识别的证件信息（JSON格式）
  extractedInfo: json("extracted_info"),
  
  // 备注
  notes: text(),
  
  // 时间戳
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_user_id").on(table.userId),
  index("idx_card_type").on(table.cardType),
  index("idx_created_at").on(table.createdAt),
]);

// TypeScript类型定义
export type IdCard = typeof idCards.$inferSelect;
export type NewIdCard = typeof idCards.$inferInsert;
