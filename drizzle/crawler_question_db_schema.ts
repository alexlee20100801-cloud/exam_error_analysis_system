import { mysqlTable, mysqlEnum, int, varchar, text, timestamp, json, decimal, tinyint, index, unique } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ==================== 试题数据库主表 ====================
export const questionsDb = mysqlTable("questions_db", {
  id: int().autoincrement().primaryKey().notNull(),
  // 题目基本信息
  title: varchar({ length: 500 }).notNull(), // 题目标题
  content: text().notNull(), // 题目内容（题干）
  contentImages: json("content_images"), // 题目图片URLs数组
  options: json(), // 选择题选项（JSON数组）
  answer: text().notNull(), // 标准答案
  explanation: text(), // 解析
  explanationImages: json("explanation_images"), // 解析图片URLs数组
  
  // 分类信息
  region: varchar({ length: 100 }), // 地区（如：深圳、广州、北京）
  schoolLevel: mysqlEnum("school_level", ["junior", "senior"]).notNull(), // 学段（初中/高中）
  grade: mysqlEnum(["grade7", "grade8", "grade9", "grade10", "grade11", "grade12"]).notNull(), // 年级
  subject: mysqlEnum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]).notNull(), // 学科
  knowledgePoints: json("knowledge_points"), // 知识点数组（JSON）
  
  // 题目属性
  questionType: mysqlEnum("question_type", ["choice", "multiple_choice", "blank", "short_answer", "calculation", "essay", "proof"]).notNull(), // 题型
  difficulty: mysqlEnum(["easy", "medium", "hard"]).notNull(), // 难度
  difficultyScore: decimal("difficulty_score", { precision: 3, scale: 2 }), // 难度系数（0-1）
  
  // 来源信息
  sourceType: mysqlEnum("source_type", ["exam", "exercise", "competition", "mock"]).notNull(), // 来源类型（真题/练习/竞赛/模拟）
  sourceName: varchar("source_name", { length: 255 }), // 来源名称（如：2023年深圳中考数学）
  sourceSchool: varchar("source_school", { length: 255 }), // 来源学校
  sourceYear: int("source_year"), // 年份
  sourceUrl: varchar("source_url", { length: 500 }), // 原始URL
  
  // 质量控制
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }), // 质量评分（0-100）
  completenessScore: decimal("completeness_score", { precision: 5, scale: 2 }), // 完整性评分
  accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }), // 准确性评分
  verificationStatus: mysqlEnum("verification_status", ["pending", "verified", "rejected", "needs_review"]).default("pending").notNull(), // 验证状态
  verifiedBy: int("verified_by"), // 验证人ID
  verifiedAt: timestamp("verified_at"), // 验证时间
  
  // AI分类信息
  aiClassified: tinyint("ai_classified").default(0).notNull(), // 是否已AI分类
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }), // AI分类置信度
  aiClassifiedAt: timestamp("ai_classified_at"), // AI分类时间
  
  // 统计信息
  viewCount: int("view_count").default(0).notNull(), // 浏览次数
  usageCount: int("usage_count").default(0).notNull(), // 使用次数（被组卷、被练习）
  favoriteCount: int("favorite_count").default(0).notNull(), // 收藏次数
  
  // 内容指纹（用于去重）
  contentHash: varchar("content_hash", { length: 64 }), // 内容哈希
  
  // 时间戳
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_region_grade_subject").on(table.region, table.grade, table.subject),
  index("idx_question_type").on(table.questionType),
  index("idx_difficulty").on(table.difficulty),
  index("idx_source_type").on(table.sourceType),
  index("idx_quality_score").on(table.qualityScore),
  index("idx_verification_status").on(table.verificationStatus),
  index("idx_content_hash").on(table.contentHash),
  index("idx_created_at").on(table.createdAt),
]);

// ==================== 视频讲解表 ====================
export const videoExplanations = mysqlTable("video_explanations", {
  id: int().autoincrement().primaryKey().notNull(),
  questionId: int("question_id").notNull(), // 关联题目ID
  
  // 视频信息
  videoUrl: varchar("video_url", { length: 500 }).notNull(), // 视频URL
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }), // 缩略图URL
  duration: int(), // 视频时长（秒）
  resolution: varchar({ length: 20 }), // 分辨率（如：1080p）
  fileSize: int("file_size"), // 文件大小（字节）
  
  // 讲师信息
  teacherName: varchar("teacher_name", { length: 100 }), // 讲师姓名
  teacherTitle: varchar("teacher_title", { length: 100 }), // 讲师职称
  teacherSchool: varchar("teacher_school", { length: 255 }), // 讲师学校
  
  // 视频内容
  description: text(), // 视频描述
  knowledgePoints: json("knowledge_points"), // 涉及知识点
  segments: json(), // 视频分段信息（时间轴+知识点）
  
  // 质量信息
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }), // 质量评分
  viewCount: int("view_count").default(0).notNull(), // 观看次数
  likeCount: int("like_count").default(0).notNull(), // 点赞次数
  
  // 可用性
  isAvailable: tinyint("is_available").default(1).notNull(), // 是否可用
  lastCheckedAt: timestamp("last_checked_at"), // 最后检查时间
  
  // 来源信息
  sourceUrl: varchar("source_url", { length: 500 }), // 原始URL
  sourcePlatform: varchar("source_platform", { length: 100 }), // 来源平台
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_question_id").on(table.questionId),
  index("idx_is_available").on(table.isAvailable),
  index("idx_quality_score").on(table.qualityScore),
]);

// ==================== 数据源配置表 ====================
export const crawlSources = mysqlTable("crawl_sources", {
  id: int().autoincrement().primaryKey().notNull(),
  
  // 基本信息
  name: varchar({ length: 255 }).notNull(), // 数据源名称
  description: text(), // 描述
  websiteUrl: varchar("website_url", { length: 500 }).notNull(), // 网站URL
  sourceType: mysqlEnum("source_type", ["static_web", "dynamic_web", "api", "file"]).notNull(), // 数据源类型
  
  // 爬虫配置
  urlTemplate: text("url_template"), // URL模板（支持变量替换）
  selectorConfig: json("selector_config"), // 选择器配置（JSON）
  paginationConfig: json("pagination_config"), // 分页配置
  authConfig: json("auth_config"), // 认证配置（如API Key）
  
  // 反爬虫策略
  useProxy: tinyint("use_proxy").default(0).notNull(), // 是否使用代理
  requestDelay: int("request_delay").default(1000).notNull(), // 请求延迟（毫秒）
  userAgentRotation: tinyint("user_agent_rotation").default(1).notNull(), // 是否轮换User-Agent
  
  // 数据提取配置
  contentExtractors: json("content_extractors"), // 内容提取器配置
  imageDownload: tinyint("image_download").default(1).notNull(), // 是否下载图片
  videoExtraction: tinyint("video_extraction").default(0).notNull(), // 是否提取视频
  
  // 优先级和调度
  priority: int().default(5).notNull(), // 优先级（1-10）
  isActive: tinyint("is_active").default(1).notNull(), // 是否启用
  scheduleTime: varchar("schedule_time", { length: 50 }), // 调度时间（cron表达式）
  
  // 统计信息
  totalCrawled: int("total_crawled").default(0).notNull(), // 累计爬取数量
  successCount: int("success_count").default(0).notNull(), // 成功次数
  failureCount: int("failure_count").default(0).notNull(), // 失败次数
  lastCrawledAt: timestamp("last_crawled_at"), // 最后爬取时间
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_is_active").on(table.isActive),
  index("idx_priority").on(table.priority),
  index("idx_source_type").on(table.sourceType),
]);

// ==================== 爬虫任务表 ====================
export const crawlTasks = mysqlTable("crawl_tasks", {
  id: int().autoincrement().primaryKey().notNull(),
  sourceId: int("source_id").notNull(), // 数据源ID
  
  // 任务信息
  taskType: mysqlEnum("task_type", ["scheduled", "manual", "retry"]).notNull(), // 任务类型
  status: mysqlEnum(["pending", "running", "completed", "failed", "cancelled"]).default("pending").notNull(), // 任务状态
  
  // 执行信息
  startedAt: timestamp("started_at"), // 开始时间
  completedAt: timestamp("completed_at"), // 完成时间
  duration: int(), // 执行时长（秒）
  
  // 统计信息
  itemsProcessed: int("items_processed").default(0).notNull(), // 已处理项目数
  itemsSucceeded: int("items_succeeded").default(0).notNull(), // 成功数
  itemsFailed: int("items_failed").default(0).notNull(), // 失败数
  itemsDuplicated: int("items_duplicated").default(0).notNull(), // 重复数
  
  // 错误信息
  errorMessage: text("error_message"), // 错误消息
  errorStack: text("error_stack"), // 错误堆栈
  
  // 日志和结果
  logFile: varchar("log_file", { length: 500 }), // 日志文件路径
  resultSummary: json("result_summary"), // 结果摘要（JSON）
  
  // 重试信息
  retryCount: int("retry_count").default(0).notNull(), // 重试次数
  maxRetries: int("max_retries").default(3).notNull(), // 最大重试次数
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_source_id").on(table.sourceId),
  index("idx_status").on(table.status),
  index("idx_task_type").on(table.taskType),
  index("idx_created_at").on(table.createdAt),
]);

// ==================== AI分类标签表 ====================
export const questionTags = mysqlTable("question_tags", {
  id: int().autoincrement().primaryKey().notNull(),
  questionId: int("question_id").notNull(), // 题目ID
  
  // 标签信息
  tagType: mysqlEnum("tag_type", ["region", "grade", "subject", "knowledge_point", "question_type", "difficulty", "source"]).notNull(), // 标签类型
  tagValue: varchar("tag_value", { length: 255 }).notNull(), // 标签值
  
  // AI分类信息
  isAiGenerated: tinyint("is_ai_generated").default(1).notNull(), // 是否AI生成
  confidence: decimal({ precision: 5, scale: 2 }), // 置信度
  
  // 验证信息
  isVerified: tinyint("is_verified").default(0).notNull(), // 是否已验证
  verifiedBy: int("verified_by"), // 验证人ID
  verifiedAt: timestamp("verified_at"), // 验证时间
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_question_id").on(table.questionId),
  index("idx_tag_type").on(table.tagType),
  index("idx_tag_value").on(table.tagValue),
  unique("unique_question_tag").on(table.questionId, table.tagType, table.tagValue),
]);

// ==================== 题目质量评分表 ====================
export const questionQuality = mysqlTable("question_quality", {
  id: int().autoincrement().primaryKey().notNull(),
  questionId: int("question_id").notNull(), // 题目ID
  
  // 完整性评分
  hasTitle: tinyint("has_title").default(0).notNull(), // 是否有标题
  hasContent: tinyint("has_content").default(0).notNull(), // 是否有内容
  hasAnswer: tinyint("has_answer").default(0).notNull(), // 是否有答案
  hasExplanation: tinyint("has_explanation").default(0).notNull(), // 是否有解析
  hasImages: tinyint("has_images").default(0).notNull(), // 是否有图片
  completenessScore: decimal("completeness_score", { precision: 5, scale: 2 }).notNull(), // 完整性评分
  
  // 准确性评分
  answerReasonable: tinyint("answer_reasonable").default(1).notNull(), // 答案是否合理
  explanationCorrect: tinyint("explanation_correct").default(1).notNull(), // 解析是否正确
  noTypos: tinyint("no_typos").default(1).notNull(), // 是否无错别字
  accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }).notNull(), // 准确性评分
  
  // 难度评估
  estimatedDifficulty: mysqlEnum("estimated_difficulty", ["easy", "medium", "hard"]), // 估计难度
  difficultyConfidence: decimal("difficulty_confidence", { precision: 5, scale: 2 }), // 难度置信度
  
  // 综合评分
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(), // 综合评分
  
  // 评分来源
  scoredBy: mysqlEnum("scored_by", ["ai", "manual", "hybrid"]).default("ai").notNull(), // 评分方式
  scorerId: int("scorer_id"), // 评分人ID（如果是人工）
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_question_id").on(table.questionId),
  index("idx_overall_score").on(table.overallScore),
]);

// TypeScript类型导出
export type QuestionDb = typeof questionsDb.$inferSelect;
export type NewQuestionDb = typeof questionsDb.$inferInsert;
export type VideoExplanation = typeof videoExplanations.$inferSelect;
export type NewVideoExplanation = typeof videoExplanations.$inferInsert;
export type CrawlSource = typeof crawlSources.$inferSelect;
export type NewCrawlSource = typeof crawlSources.$inferInsert;
export type CrawlTask = typeof crawlTasks.$inferSelect;
export type NewCrawlTask = typeof crawlTasks.$inferInsert;
export type QuestionTag = typeof questionTags.$inferSelect;
export type NewQuestionTag = typeof questionTags.$inferInsert;
export type QuestionQuality = typeof questionQuality.$inferSelect;
export type NewQuestionQuality = typeof questionQuality.$inferInsert;
