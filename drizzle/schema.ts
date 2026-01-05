import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, boolean, json } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 核心认证和用户信息
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // 学生信息
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
  school: varchar("school", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 学科枚举 - 深圳初高中主要学科
 */
export const subjectEnum = ["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"] as const;

/**
 * 知识点表 - 深圳初高中各学科知识点分类体系
 */
export const knowledgePoints = mysqlTable("knowledge_points", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  // 知识点层级结构：chapter > section > point
  level: mysqlEnum("level", ["chapter", "section", "point"]).notNull(),
  parentId: int("parentId"), // 父知识点ID，用于构建树形结构
  description: text("description"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgePoint = typeof knowledgePoints.$inferSelect;
export type InsertKnowledgePoint = typeof knowledgePoints.$inferInsert;

/**
 * 错题表 - 用户上传的错题信息
 */
export const errorQuestions = mysqlTable("error_questions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 题目内容
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(), // OCR识别或手动输入的题目内容
  imageUrl: text("imageUrl"), // 原始题目图片URL
  imageKey: varchar("imageKey", { length: 500 }), // S3存储key
  // 分类信息
  schoolLevel: mysqlEnum("schoolLevel", ["junior", "senior"]).notNull(), // 板块：初中/高中
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]),
  // AI分析结果
  errorAnalysis: text("errorAnalysis"), // AI分析的错误点
  correctAnswer: text("correctAnswer"), // 正确答案
  detailedExplanation: text("detailedExplanation"), // 详细解析
  detailedAnalysis: text("detailedAnalysis"), // AI深度分析结果（JSON格式）
  knowledgePointIds: json("knowledgePointIds").$type<number[]>(), // 关联的知识点ID数组
  // 用户信息
  userAnswer: text("userAnswer"), // 用户的错误答案
  userNotes: text("userNotes"), // 用户笔记
  // 状态
  isAnalyzed: boolean("isAnalyzed").default(false), // 是否已AI分析
  isMastered: boolean("isMastered").default(false), // 是否已掌握
  reviewCount: int("reviewCount").default(0), // 复习次数
  lastReviewedAt: timestamp("lastReviewedAt"), // 最后复习时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ErrorQuestion = typeof errorQuestions.$inferSelect;
export type InsertErrorQuestion = typeof errorQuestions.$inferInsert;

/**
 * 题库表 - 第三方题库和自建题库
 */
export const questionBank = mysqlTable("question_bank", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  answer: text("answer").notNull(),
  explanation: text("explanation"),
  // 分类
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  knowledgePointIds: json("knowledgePointIds").$type<number[]>(), // 关联的知识点ID数组
  // 来源
  source: mysqlEnum("source", ["builtin", "thirdparty", "ai_generated"]).default("builtin"),
  sourceId: varchar("sourceId", { length: 200 }), // 第三方题库ID
  // 质量评分
  qualityScore: float("qualityScore").default(0), // 题目质量评分
  usageCount: int("usageCount").default(0), // 使用次数
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuestionBank = typeof questionBank.$inferSelect;
export type InsertQuestionBank = typeof questionBank.$inferInsert;

/**
 * 练习记录表 - 用户练习历史和正确率
 */
export const practiceRecords = mysqlTable("practice_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(), // 题库表ID
  questionType: mysqlEnum("questionType", ["error_question", "practice_question"]).notNull(),
  // 练习结果
  userAnswer: text("userAnswer").notNull(),
  isCorrect: boolean("isCorrect").notNull(),
  timeSpent: int("timeSpent"), // 答题耗时（秒）
  // 关联信息
  knowledgePointIds: json("knowledgePointIds").$type<number[]>(),
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PracticeRecord = typeof practiceRecords.$inferSelect;
export type InsertPracticeRecord = typeof practiceRecords.$inferInsert;

/**
 * 错题复习记录表 - 基于艾宾浩斯遗忘曲线的复习计划
 */
export const errorReviewRecords = mysqlTable("error_review_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  errorQuestionId: int("errorQuestionId").notNull(),
  // 复习计划
  reviewRound: int("reviewRound").default(0).notNull(), // 当前复习轮次（0=刚加入计划，1=第一次复习）
  lastReviewedAt: timestamp("lastReviewedAt"), // 最后一次复习时间
  nextReviewAt: timestamp("nextReviewAt").notNull(), // 下次复习时间
  // 复习状态
  isCompleted: boolean("isCompleted").default(false), // 是否完成所有复习轮次
  isPaused: boolean("isPaused").default(false), // 是否暂停复习计划
  // 时间戳
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ErrorReviewRecord = typeof errorReviewRecords.$inferSelect;
export type InsertErrorReviewRecord = typeof errorReviewRecords.$inferInsert;

/**
 * 学习进度表 - 知识点掌握度追踪
 */
export const learningProgress = mysqlTable("learning_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  knowledgePointId: int("knowledgePointId").notNull(),
  // 掌握度指标
  masteryLevel: float("masteryLevel").default(0).notNull(), // 掌握度 0-100
  practiceCount: int("practiceCount").default(0), // 练习次数
  correctCount: int("correctCount").default(0), // 正确次数
  errorCount: int("errorCount").default(0), // 错误次数
  // 学习状态
  status: mysqlEnum("status", ["not_started", "learning", "reviewing", "mastered"]).default("not_started"),
  lastPracticeAt: timestamp("lastPracticeAt"),
  // 复习计划
  nextReviewAt: timestamp("nextReviewAt"), // 下次复习时间
  reviewInterval: int("reviewInterval").default(1), // 复习间隔（天）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningProgress = typeof learningProgress.$inferSelect;
export type InsertLearningProgress = typeof learningProgress.$inferInsert;

/**
 * 视频资源表 - B站、YouTube等平台的学习视频
 */
export const videoResources = mysqlTable("video_resources", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  // 视频信息
  platform: mysqlEnum("platform", ["bilibili", "youtube"]).notNull(),
  videoId: varchar("videoId", { length: 200 }).notNull(), // 平台视频ID
  videoUrl: text("videoUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  duration: int("duration"), // 视频时长（秒）
  author: varchar("author", { length: 200 }),
  viewCount: int("viewCount").default(0),
  // 分类和关联
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
  knowledgePointIds: json("knowledgePointIds").$type<number[]>(),
  // 质量评分
  relevanceScore: float("relevanceScore").default(0), // 相关性评分
  qualityScore: float("qualityScore").default(0), // 质量评分
  recommendCount: int("recommendCount").default(0), // 推荐次数
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoResource = typeof videoResources.$inferSelect;
export type InsertVideoResource = typeof videoResources.$inferInsert;

/**
 * 复习计划表 - 智能复习提醒
 */
export const reviewPlans = mysqlTable("review_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 复习内容
  targetType: mysqlEnum("targetType", ["error_question", "knowledge_point"]).notNull(),
  targetId: int("targetId").notNull(), // 错题ID或知识点ID
  // 计划信息
  scheduledAt: timestamp("scheduledAt").notNull(), // 计划复习时间
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  status: mysqlEnum("status", ["pending", "completed", "skipped"]).default("pending"),
  // 完成信息
  completedAt: timestamp("completedAt"),
  completionNote: text("completionNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReviewPlan = typeof reviewPlans.$inferSelect;
export type InsertReviewPlan = typeof reviewPlans.$inferInsert;

/**
 * 成就徽章表
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(), // 成就唯一标识
  name: varchar("name", { length: 128 }).notNull(), // 成就名称
  description: text("description").notNull(), // 成就描述
  category: mysqlEnum("category", ["learning", "practice", "streak", "mastery", "social"]).notNull(), // 成就类别
  icon: varchar("icon", { length: 64 }).notNull(), // 图标名称
  color: varchar("color", { length: 32 }).notNull(), // 徽章颜色
  requirement: int("requirement").notNull(), // 解锁要求数值
  points: int("points").notNull().default(10), // 成就积分
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

/**
 * 用户成就关联表
 */
export const userAchievements = mysqlTable("user_achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  achievementId: int("achievementId").notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  progress: int("progress").notNull().default(0), // 当前进度
});

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;

/**
 * 连续打卡记录表
 */
export const checkInRecords = mysqlTable("check_in_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  checkInDate: timestamp("checkInDate").notNull(), // 打卡日期（只记录日期部分）
  activityType: mysqlEnum("activityType", ["error_question", "practice", "review", "video"]).notNull(), // 活动类型
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type InsertCheckInRecord = typeof checkInRecords.$inferInsert;
