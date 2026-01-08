import { mysqlTable, int, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * 协作错题集表
 * 存储协作错题集的基本信息
 */
export const collaborativeCollections = mysqlTable("collaborative_collections", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(), // 错题集名称
  description: text("description"), // 错题集描述
  ownerId: int("owner_id").notNull(), // 所有者用户ID
  
  // 可见性设置
  visibility: mysqlEnum("visibility", ["private", "public", "link"]).notNull().default("private"),
  // private: 仅成员可见
  // public: 所有人可见
  // link: 有链接的人可见
  
  // 统计信息
  memberCount: int("member_count").notNull().default(1), // 成员数量
  questionCount: int("question_count").notNull().default(0), // 错题数量
  commentCount: int("comment_count").notNull().default(0), // 评论数量
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
});

/**
 * 协作成员表
 * 存储协作错题集的成员信息和权限
 */
export const collectionMembers = mysqlTable("collection_members", {
  id: int("id").primaryKey().autoincrement(),
  collectionId: int("collection_id").notNull(), // 错题集ID
  userId: int("user_id").notNull(), // 用户ID
  
  // 成员角色
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).notNull().default("viewer"),
  // owner: 所有者，拥有所有权限
  // editor: 编辑者，可以添加/编辑错题和评论
  // viewer: 查看者，只能查看
  
  // 邀请信息
  invitedBy: int("invited_by"), // 邀请人ID
  invitedAt: timestamp("invited_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  
  joinedAt: timestamp("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastAccessedAt: timestamp("last_accessed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 协作错题关联表
 * 存储协作错题集中的错题
 */
export const collectionQuestions = mysqlTable("collection_questions", {
  id: int("id").primaryKey().autoincrement(),
  collectionId: int("collection_id").notNull(), // 错题集ID
  questionId: int("question_id").notNull(), // 错题ID
  addedBy: int("added_by").notNull(), // 添加人ID
  
  // 错题备注
  note: text("note"), // 添加人的备注
  
  addedAt: timestamp("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 协作评论表
 * 存储协作错题集中的评论和讨论
 */
export const collectionComments = mysqlTable("collection_comments", {
  id: int("id").primaryKey().autoincrement(),
  collectionId: int("collection_id").notNull(), // 错题集ID
  questionId: int("question_id"), // 错题ID（如果是针对某个错题的评论）
  userId: int("user_id").notNull(), // 评论人ID
  
  content: text("content").notNull(), // 评论内容
  
  // 回复关系
  parentId: int("parent_id"), // 父评论ID（用于回复）
  
  // 统计信息
  likeCount: int("like_count").notNull().default(0), // 点赞数
  replyCount: int("reply_count").notNull().default(0), // 回复数
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
});

/**
 * 协作活动日志表
 * 记录协作错题集中的所有活动
 */
export const collectionActivities = mysqlTable("collection_activities", {
  id: int("id").primaryKey().autoincrement(),
  collectionId: int("collection_id").notNull(), // 错题集ID
  userId: int("user_id").notNull(), // 操作人ID
  
  // 活动类型
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  // 可能的值: 
  // - member_joined: 成员加入
  // - member_left: 成员离开
  // - question_added: 添加错题
  // - question_removed: 移除错题
  // - comment_added: 添加评论
  // - comment_deleted: 删除评论
  // - collection_updated: 更新错题集信息
  
  // 活动详情
  details: text("details"), // JSON格式的详细信息
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 评论点赞表
 * 记录用户对评论的点赞
 */
export const commentLikes = mysqlTable("comment_likes", {
  id: int("id").primaryKey().autoincrement(),
  commentId: int("comment_id").notNull(), // 评论ID
  userId: int("user_id").notNull(), // 点赞人ID
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// TypeScript 类型定义
export type CollaborativeCollection = typeof collaborativeCollections.$inferSelect;
export type NewCollaborativeCollection = typeof collaborativeCollections.$inferInsert;
export type CollectionMember = typeof collectionMembers.$inferSelect;
export type NewCollectionMember = typeof collectionMembers.$inferInsert;
export type CollectionQuestion = typeof collectionQuestions.$inferSelect;
export type NewCollectionQuestion = typeof collectionQuestions.$inferInsert;
export type CollectionComment = typeof collectionComments.$inferSelect;
export type NewCollectionComment = typeof collectionComments.$inferInsert;
export type CollectionActivity = typeof collectionActivities.$inferSelect;
export type NewCollectionActivity = typeof collectionActivities.$inferInsert;
export type CommentLike = typeof commentLikes.$inferSelect;
export type NewCommentLike = typeof commentLikes.$inferInsert;
