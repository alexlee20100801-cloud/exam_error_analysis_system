import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, boolean, json, decimal } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 核心认证和用户信息
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  emailVerified: boolean("email_verified").default(false), // 邮箱是否验证
  wechatOpenId: varchar("wechat_open_id", { length: 128 }), // 微信OpenID
  wechatNickname: varchar("wechat_nickname", { length: 200 }), // 微信昵称
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  userType: mysqlEnum("userType", ["student", "parent"]).default("student").notNull(),
  // 学生信息
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
  currentSemester: mysqlEnum("currentSemester", ["first", "second"]), // 当前学期
  school: varchar("school", { length: 200 }),
  region: varchar("region", { length: 100 }), // 所在地区（如：深圳市南山区）
  // 菜单偏好设置（JSON格式存储禁用的菜单项）
  disabledMenuItems: json("disabledMenuItems").$type<string[]>(),
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
 * 学期枚举 - 上学期/下学期
 */
export const semesterEnum = ["first", "second"] as const;
export type Semester = typeof semesterEnum[number];

/**
 * 知识点表 - 深圳初高中各学科知识点分类体系
 */
export const knowledgePoints = mysqlTable("knowledge_points", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  semester: mysqlEnum("semester", semesterEnum), // 学期：上学期/下学期
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
  semester: mysqlEnum("semester", semesterEnum), // 学期：上学期/下学期
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]),
  // AI分析结果
  errorAnalysis: text("errorAnalysis"), // AI分析的错误点
  correctAnswer: text("correctAnswer"), // 正确答案
  detailedExplanation: text("detailedExplanation"), // 详细解析
  detailedAnalysis: text("detailedAnalysis"), // AI深度分析结果（JSON格式）
  knowledgePointIds: json("knowledgePointIds").$type<number[]>(), // 关联的知识点ID数组
  // 用户信息
  userAnswer: text("userAnswer"), // 用户的错误答案
  userNotes: text("userNotes"), // 用户笔记（文字）
  noteImages: json("noteImages").$type<string[]>(), // 笔记图片URL数组
  voiceExplanation: text("voiceExplanation"), // AI语音讲解稿（缓存）
  // 状态
  isAnalyzed: boolean("isAnalyzed").default(false), // 是否已AI分析
  isMastered: boolean("isMastered").default(false), // 是否已掌握
  isFavorite: boolean("isFavorite").default(false), // 是否已收藏
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
  questionType: mysqlEnum("questionType", ["choice", "blank", "short_answer", "essay", "calculation"]).notNull(),
  answer: text("answer").notNull(),
  explanation: text("explanation"),
  // 分类
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  semester: mysqlEnum("semester", semesterEnum), // 学期：上学期/下学期
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

/**
 * 错题标签表
 */
export const errorQuestionTags = mysqlTable("error_question_tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 标签所属用户
  name: varchar("name", { length: 50 }).notNull(), // 标签名称
  color: varchar("color", { length: 20 }).notNull().default("#3B82F6"), // 标签颜色（十六进制）
  description: text("description"), // 标签描述
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ErrorQuestionTag = typeof errorQuestionTags.$inferSelect;
export type InsertErrorQuestionTag = typeof errorQuestionTags.$inferInsert;

/**
 * 错题-标签关联表（多对多关系）
 */
export const errorQuestionTagRelations = mysqlTable("error_question_tag_relations", {
  id: int("id").autoincrement().primaryKey(),
  errorQuestionId: int("errorQuestionId").notNull(), // 错题ID
  tagId: int("tagId").notNull(), // 标签ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ErrorQuestionTagRelation = typeof errorQuestionTagRelations.$inferSelect;
export type InsertErrorQuestionTagRelation = typeof errorQuestionTagRelations.$inferInsert;

/**
 * 考试日期表
 */
export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 考试所属用户
  name: varchar("name", { length: 100 }).notNull(), // 考试名称（如"期中考试"、"月考"）
  examDate: timestamp("examDate").notNull(), // 考试日期
  subject: mysqlEnum("subject", subjectEnum).notNull(), // 考试科目
  section: mysqlEnum("section", ["junior", "senior"]).notNull(), // 板块（初中/高中）
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(), // 年级
  scope: text("scope"), // 考试范围（知识点、章节等）
  description: text("description"), // 考试说明
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Exam = typeof exams.$inferSelect;
export type InsertExam = typeof exams.$inferInsert;

/**
 * 复习计划表
 */
export const studyPlans = mysqlTable("study_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 计划所属用户
  examId: int("examId").notNull(), // 关联的考试ID
  planDate: timestamp("planDate").notNull(), // 计划日期
  taskType: mysqlEnum("taskType", ["knowledge_point", "error_question", "practice"]).notNull(), // 任务类型
  targetId: int("targetId"), // 目标ID（知识点ID或错题ID）
  targetName: varchar("targetName", { length: 200 }), // 目标名称
  priority: int("priority").notNull().default(0), // 优先级（0-100）
  estimatedMinutes: int("estimatedMinutes"), // 预计学习时长（分钟）
  completed: boolean("completed").notNull().default(false), // 是否完成
  completedAt: timestamp("completedAt"), // 完成时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudyPlan = typeof studyPlans.$inferSelect;
export type InsertStudyPlan = typeof studyPlans.$inferInsert;

/**
 * 家长-学生关联表
 */
export const parentStudentRelations = mysqlTable("parent_student_relations", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(), // 家长用户ID
  studentId: int("studentId").notNull(), // 学生用户ID
  inviteCode: varchar("inviteCode", { length: 32 }).unique(), // 邀请码
  status: mysqlEnum("status", ["pending", "active", "rejected"]).default("pending").notNull(), // 绑定状态
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParentStudentRelation = typeof parentStudentRelations.$inferSelect;
export type InsertParentStudentRelation = typeof parentStudentRelations.$inferInsert;

/**
 * 学习目标表
 */
export const learningGoals = mysqlTable("learning_goals", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(), // 学生用户ID
  parentId: int("parentId"), // 设置目标的家长ID（可选，学生也可自己设置）
  goalType: mysqlEnum("goalType", ["error_count", "mastery_rate", "review_count", "study_time"]).notNull(), // 目标类型
  targetValue: int("targetValue").notNull(), // 目标值
  currentValue: int("currentValue").notNull().default(0), // 当前值
  period: mysqlEnum("period", ["daily", "weekly", "monthly"]).notNull(), // 周期
  startDate: timestamp("startDate").notNull(), // 开始日期
  endDate: timestamp("endDate").notNull(), // 截止日期
  completed: boolean("completed").notNull().default(false), // 是否完成
  completedAt: timestamp("completedAt"), // 完成时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningGoal = typeof learningGoals.$inferSelect;
export type InsertLearningGoal = typeof learningGoals.$inferInsert;

/**
 * 目标提醒记录表
 */
export const goalReminders = mysqlTable("goal_reminders", {
  id: int("id").autoincrement().primaryKey(),
  goalId: int("goalId").notNull(), // 学习目标ID
  parentId: int("parentId").notNull(), // 接收提醒的家长ID
  studentId: int("studentId").notNull(), // 学生ID
  reminderType: mysqlEnum("reminderType", ["deadline_approaching", "progress_behind", "goal_failed", "goal_achieved"]).notNull(), // 提醒类型
  message: text("message").notNull(), // 提醒消息内容
  sent: boolean("sent").notNull().default(false), // 是否已发送
  sentAt: timestamp("sentAt"), // 发送时间
  read: boolean("read").notNull().default(false), // 是否已读
  readAt: timestamp("readAt"), // 阅读时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GoalReminder = typeof goalReminders.$inferSelect;
export type InsertGoalReminder = typeof goalReminders.$inferInsert;

/**
 * 真题表 - 存储各学校历年真题
 */
export const realExamQuestions = mysqlTable("real_exam_questions", {
  id: int("id").autoincrement().primaryKey(),
  // 题目内容
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(), // 题目内容
  questionType: mysqlEnum("questionType", ["choice", "blank", "short_answer", "essay", "calculation"]).notNull(), // 题型
  answer: text("answer").notNull(), // 答案
  explanation: text("explanation"), // 解析
  imageUrl: text("imageUrl"), // 题目图片URL
  imageKey: varchar("imageKey", { length: 500 }), // S3存储key
  // 分类信息
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  semester: mysqlEnum("semester", semesterEnum), // 学期：上学期/下学期
  schoolLevel: mysqlEnum("schoolLevel", ["junior", "senior"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  knowledgePointIds: json("knowledgePointIds").$type<number[]>(), // 关联的知识点ID数组
  // 来源信息
  sourceSchool: varchar("sourceSchool", { length: 200 }), // 来源学校（如：深圳中学、深圳外国语学校）
  sourceRegion: varchar("sourceRegion", { length: 100 }), // 来源地区（如：深圳市南山区）
  examYear: int("examYear"), // 考试年份（如：2023）
  examSemester: mysqlEnum("examSemester", ["first", "second"]), // 学期（上学期/下学期）
  examType: varchar("examType", { length: 100 }), // 考试类型（如：期中考试、期末考试、月考）
  // 统计信息
  usageCount: int("usageCount").default(0), // 使用次数
  averageScore: decimal("averageScore", { precision: 5, scale: 2 }), // 平均得分率
  // 状态
  isVerified: boolean("isVerified").default(false), // 是否已验证
  isPublic: boolean("isPublic").default(true), // 是否公开
  createdBy: int("createdBy"), // 创建者ID（管理员）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RealExamQuestion = typeof realExamQuestions.$inferSelect;
export type InsertRealExamQuestion = typeof realExamQuestions.$inferInsert;

/**
 * 用户真题练习记录表
 */
export const realExamPracticeRecords = mysqlTable("real_exam_practice_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(), // 关联real_exam_questions表
  // 练习信息
  userAnswer: text("userAnswer"), // 用户答案
  isCorrect: boolean("isCorrect"), // 是否正确
  timeSpent: int("timeSpent"), // 用时（秒）
  score: decimal("score", { precision: 5, scale: 2 }), // 得分
  // 状态
  isBookmarked: boolean("isBookmarked").default(false), // 是否收藏
  practiceDate: timestamp("practiceDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RealExamPracticeRecord = typeof realExamPracticeRecords.$inferSelect;
export type InsertRealExamPracticeRecord = typeof realExamPracticeRecords.$inferInsert;

/**
 * AI生成试卷表
 */
export const generatedExamPapers = mysqlTable("generated_exam_papers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 试卷信息
  title: varchar("title", { length: 200 }).notNull(),
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  schoolLevel: mysqlEnum("schoolLevel", ["junior", "senior"]).notNull(),
  // 生成配置
  totalQuestions: int("totalQuestions").notNull(), // 总题数
  totalScore: int("totalScore").notNull(), // 总分
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  knowledgePointIds: json("knowledgePointIds").$type<number[]>(), // 涉及的知识点ID数组
  questionTypes: json("questionTypes").$type<{type: string, count: number}[]>(), // 题型分布
  // 试卷内容
  questions: json("questions").$type<{id: number, type: string, score: number}[]>(), // 题目列表（引用question_bank或real_exam_questions）
  // 状态
  isCompleted: boolean("isCompleted").default(false), // 是否已完成
  completedAt: timestamp("completedAt"), // 完成时间
  totalTimeSpent: int("totalTimeSpent"), // 总用时（分钟）
  userScore: decimal("userScore", { precision: 5, scale: 2 }), // 用户得分
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedExamPaper = typeof generatedExamPapers.$inferSelect;
export type InsertGeneratedExamPaper = typeof generatedExamPapers.$inferInsert;

/**
 * 学习路径表 - 个性化学习路径
 */
export const learningPaths = mysqlTable("learning_paths", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  pathData: json("path_data").$type<any>(), // 路径节点数据（JSON格式）
  totalNodes: int("total_nodes").notNull().default(0),
  completedNodes: int("completed_nodes").notNull().default(0),
  status: mysqlEnum("status", ["active", "completed", "paused"]).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LearningPath = typeof learningPaths.$inferSelect;
export type InsertLearningPath = typeof learningPaths.$inferInsert;

/**
 * 学习路径节点进度表
 */
export const learningPathProgress = mysqlTable("learning_path_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  pathId: int("path_id").notNull(),
  nodeId: varchar("node_id", { length: 100 }).notNull(), // 节点ID
  knowledgePointId: int("knowledge_point_id"),
  status: mysqlEnum("status", ["locked", "available", "in_progress", "completed"]).notNull().default("locked"),
  score: int("score"), // 该节点的得分
  attempts: int("attempts").notNull().default(0), // 尝试次数
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LearningPathProgress = typeof learningPathProgress.$inferSelect;
export type InsertLearningPathProgress = typeof learningPathProgress.$inferInsert;

/**
 * 真题题库表 - AI每日自动生成的练习题目
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  subject: mysqlEnum("subject", subjectEnum).notNull(),
  grade: mysqlEnum("grade", ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).notNull(),
  semester: mysqlEnum("semester", semesterEnum),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  // 题目类型：选择题、填空题、解答题等
  questionType: mysqlEnum("questionType", ["choice", "fillBlank", "shortAnswer", "essay"]).notNull(),
  // 选择题选项（JSON格式）
  options: json("options").$type<string[]>(),
  // 正确答案
  correctAnswer: text("correctAnswer").notNull(),
  // 详细解析
  explanation: text("explanation"),
  // 知识点标签
  knowledgePoints: json("knowledgePoints").$type<string[]>(),
  // AI生成时间
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  // 是否已发布（管理员审核后发布）
  isPublished: boolean("isPublished").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;



/**
 * 定时任务配置表 - 管理系统定时任务
 */
export const scheduledTasks = mysqlTable("scheduled_tasks", {
  id: int("id").autoincrement().primaryKey(),
  taskName: varchar("task_name", { length: 100 }).notNull().unique(),
  taskType: mysqlEnum("task_type", ["generate_questions", "send_reminders", "cleanup", "check_review_task_reminders"]).notNull(),
  cronExpression: varchar("cron_expression", { length: 50 }).notNull(), // 如：0 2 * * * (每天凌晨2点)
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastExecutedAt: timestamp("last_executed_at"),
  lastStatus: mysqlEnum("last_status", ["success", "failed", "running"]),
  lastErrorMessage: text("last_error_message"),
  executionCount: int("execution_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = typeof scheduledTasks.$inferInsert;

/**
 * 任务执行日志表 - 记录每次任务执行的详细信息
 */
export const taskExecutionLogs = mysqlTable("task_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("task_id").notNull(),
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  duration: int("duration"), // 执行时长（毫秒）
  itemsProcessed: int("items_processed"), // 处理的项目数量
  errorMessage: text("error_message"),
  details: json("details").$type<Record<string, any>>(), // 详细信息（JSON格式）
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type TaskExecutionLog = typeof taskExecutionLogs.$inferSelect;
export type InsertTaskExecutionLog = typeof taskExecutionLogs.$inferInsert;

/**
 * 专项练习池表 - 错题转化的针对性练习题
 */
export const practicePools = mysqlTable("practice_pools", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sourceErrorQuestionId: int("source_error_question_id").notNull(), // 来源错题ID
  practiceQuestionId: int("practice_question_id").notNull(), // 练习题ID（questions表）
  knowledgePointId: int("knowledge_point_id"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "skipped"]).notNull().default("pending"),
  completedAt: timestamp("completed_at"),
  score: int("score"), // 完成后的得分
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PracticePool = typeof practicePools.$inferSelect;
export type InsertPracticePool = typeof practicePools.$inferInsert;

/**
 * 收藏表 - 用户收藏的题目
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  questionId: int("question_id").notNull(), // 题目ID
  questionType: mysqlEnum("question_type", ["error_question", "practice_question", "question"]).notNull(), // 题目类型
  note: text("note"), // 收藏备注
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * 学习提醒表 - 基于艾宾浩斯遗忘曲线的复习提醒
 */
export const reviewReminders = mysqlTable("review_reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  questionId: int("question_id").notNull(), // 题目ID
  questionType: mysqlEnum("question_type", ["error_question", "practice_question"]).notNull(), // 题目类型
  nextReviewDate: timestamp("next_review_date").notNull(), // 下次复习日期
  reviewCount: int("review_count").notNull().default(0), // 已复习次数
  status: mysqlEnum("status", ["pending", "completed", "skipped", "deleted"]).notNull().default("pending"),
  lastReviewedAt: timestamp("last_reviewed_at"), // 最后复习时间
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ReviewReminder = typeof reviewReminders.$inferSelect;
export type InsertReviewReminder = typeof reviewReminders.$inferInsert;

/**
 * 复习历史表 - 记录每次复习的详细信息
 */
export const reviewHistory = mysqlTable("review_history", {
  id: int("id").autoincrement().primaryKey(),
  reminderId: int("reminder_id").notNull(),
  userId: int("user_id").notNull(),
  questionId: int("question_id").notNull(),
  questionType: mysqlEnum("question_type", ["error_question", "practice_question"]).notNull(),
  reviewedAt: timestamp("reviewed_at").notNull(), // 复习时间
  masteryLevel: int("mastery_level"), // 复习后的掌握度（0-100）
  timeSpent: int("time_spent"), // 复习耗时（秒）
  notes: text("notes"), // 复习笔记
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ReviewHistory = typeof reviewHistory.$inferSelect;
export type InsertReviewHistory = typeof reviewHistory.$inferInsert;

/**
 * AI学习建议历史表 - 保存每次生成的AI建议
 */
export const aiAdviceHistory = mysqlTable("ai_advice_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  // AI建议内容（JSON格式）
  adviceData: json("advice_data").$type<{
    overallAssessment: string;
    learningTips: Array<{title: string; content: string; priority: string}>;
    reviewPlan: Array<{subject: string; knowledgePoint?: string; reason: string; suggestedTime: string; priority: number}>;
    weaknesses: Array<{area: string; severity: string; recommendation: string}>;
    encouragement: string;
  }>().notNull(),
  // 统计信息
  totalErrorQuestions: int("total_error_questions").notNull().default(0),
  masteryRate: int("mastery_rate").notNull().default(0), // 掌握率（0-100）
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AiAdviceHistory = typeof aiAdviceHistory.$inferSelect;
export type InsertAiAdviceHistory = typeof aiAdviceHistory.$inferInsert;

/**
 * 复习任务表 - 基于AI建议生成的复习任务
 */
export const reviewTasks = mysqlTable("review_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  adviceHistoryId: int("advice_history_id").notNull(), // 关联的AI建议历史ID
  // 任务信息
  subject: varchar("subject", { length: 50 }).notNull(),
  knowledgePoint: varchar("knowledge_point", { length: 200 }),
  reason: text("reason").notNull(),
  suggestedTime: varchar("suggested_time", { length: 50 }).notNull(),
  priority: int("priority").notNull().default(0),
  // 完成状态
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  // 时间信息
  scheduledDate: timestamp("scheduled_date"), // 计划复习日期
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ReviewTask = typeof reviewTasks.$inferSelect;
export type InsertReviewTask = typeof reviewTasks.$inferInsert;

/**
 * 用户提醒设置表 - 存储用户的复习任务提醒偏好
 */
export const userReminderSettings = mysqlTable("user_reminder_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  // 是否启用提醒
  enabled: boolean("enabled").notNull().default(true),
  // 提醒时间点（JSON数组，单位：分钟）
  // 例如：[1440, 180, 60] 表示提前1天3小时1小时
  reminderMinutes: json("reminder_minutes").$type<number[]>().notNull(),
  // 通知渠道偏好（JSON数组）
  // 可选值："system", "email", "wechat"
  notificationChannels: json("notification_channels").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type UserReminderSetting = typeof userReminderSettings.$inferSelect;
export type InsertUserReminderSetting = typeof userReminderSettings.$inferInsert;

/**
 * 复习任务提醒记录表 - 记录每次发送的提醒
 */
export const reviewTaskReminders = mysqlTable("review_task_reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  taskId: int("task_id").notNull(), // 关联的复习任务ID
  // 提醒信息
  reminderType: mysqlEnum("reminder_type", ["one_day_before", "three_hours_before", "one_hour_before", "custom"]).notNull(),
  reminderMinutes: int("reminder_minutes").notNull(), // 提前多少分钟提醒
  scheduledTime: timestamp("scheduled_time").notNull(), // 计划发送时间
  // 发送状态
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  // 提醒内容
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ReviewTaskReminder = typeof reviewTaskReminders.$inferSelect;
export type InsertReviewTaskReminder = typeof reviewTaskReminders.$inferInsert;

/**
 * 系统设置表 - 存储全局配置（如SMTP配置）
 */
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  // 设置键（唯一标识）
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  // 设置值（JSON格式，加密存储敏感信息）
  settingValue: text("setting_value").notNull(),
  // 设置描述
  description: text("description"),
  // 是否加密存储
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  // 最后修改人
  lastModifiedBy: int("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * 邮箱验证令牌表 - 存储邮箱验证链接的令牌
 */
export const emailVerificationTokens = mysqlTable("email_verification_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  // 验证令牌（UUID）
  token: varchar("token", { length: 64 }).notNull().unique(),
  // 令牌状态
  status: mysqlEnum("status", ["pending", "verified", "expired"]).notNull().default("pending"),
  // 过期时间（默认24小时）
  expiresAt: timestamp("expires_at").notNull(),
  // 验证时间
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

/**
 * 邮件模板表 - 存储可自定义的邮件模板
 */
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  // 模板类型（唯一标识）
  templateType: varchar("template_type", { length: 100 }).notNull().unique(),
  // 模板名称
  name: varchar("name", { length: 200 }).notNull(),
  // 模板描述
  description: text("description"),
  // 邮件主题（支持变量）
  subject: varchar("subject", { length: 500 }).notNull(),
  // 邮件内容（HTML格式，支持变量）
  htmlContent: text("html_content").notNull(),
  // 可用变量列表（JSON数组）
  availableVariables: json("available_variables").$type<string[]>(),
  // 是否为系统默认模板
  isDefault: boolean("is_default").notNull().default(false),
  // 是否启用
  isActive: boolean("is_active").notNull().default(true),
  // 最后修改人
  lastModifiedBy: int("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * 套餐计划表 - 存储不同的订阅套餐
 */
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  // 套餐名称
  name: varchar("name", { length: 100 }).notNull(),
  // 套餐描述
  description: text("description"),
  // 价格（分）
  price: int("price").notNull(),
  // 货币类型
  currency: varchar("currency", { length: 10 }).notNull().default("CNY"),
  // 有效期（天）
  durationDays: int("duration_days").notNull(),
  // 功能权限列表（JSON数组）
  features: json("features").$type<string[]>().notNull(),
  // 最大错题数量（-1表示无限制）
  maxErrorQuestions: int("max_error_questions").notNull().default(-1),
  // 最大AI分析次数（-1表示无限制）
  maxAiAnalysis: int("max_ai_analysis").notNull().default(-1),
  // 是否启用
  isActive: boolean("is_active").notNull().default(true),
  // 排序顺序
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * 订单表 - 存储所有订单信息
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  // 订单号（唯一）
  orderNo: varchar("order_no", { length: 64 }).notNull().unique(),
  // 用户ID（可为空，支付前可能未注册）
  userId: int("user_id"),
  // 套餐ID
  planId: int("plan_id").notNull(),
  // 订单金额（分）
  amount: int("amount").notNull(),
  // 货币类型
  currency: varchar("currency", { length: 10 }).notNull().default("CNY"),
  // 支付方式（stripe, wechat, alipay）
  paymentMethod: mysqlEnum("payment_method", ["stripe", "wechat", "alipay"]),
  // 订单状态
  status: mysqlEnum("status", ["pending", "paid", "cancelled", "refunded", "expired"]).notNull().default("pending"),
  // 支付时间
  paidAt: timestamp("paid_at"),
  // 第三方支付订单号
  thirdPartyOrderNo: varchar("third_party_order_no", { length: 255 }),
  // 购买人信息（JSON）
  buyerInfo: json("buyer_info").$type<{
    email?: string;
    phone?: string;
    name?: string;
  }>(),
  // 过期时间（未支付订单的过期时间）
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * 用户订阅表 - 存储用户的订阅关系
 */
export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  // 用户ID
  userId: int("user_id").notNull(),
  // 套餐ID
  planId: int("plan_id").notNull(),
  // 订单ID
  orderId: int("order_id").notNull(),
  // 订阅开始时间
  startDate: timestamp("start_date").notNull(),
  // 订阅结束时间
  endDate: timestamp("end_date").notNull(),
  // 订阅状态
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).notNull().default("active"),
  // 已使用的AI分析次数
  usedAiAnalysis: int("used_ai_analysis").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * 支付配置表 - 存储支付方式的配置信息
 */
export const paymentConfigs = mysqlTable("payment_configs", {
  id: int("id").autoincrement().primaryKey(),
  // 支付方式
  paymentMethod: mysqlEnum("payment_method", ["stripe", "wechat", "alipay"]).notNull().unique(),
  // 是否启用
  isEnabled: boolean("is_enabled").notNull().default(false),
  // 配置信息（加密存储，JSON格式）
  config: text("config").notNull(),
  // 最后修改人
  lastModifiedBy: int("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PaymentConfig = typeof paymentConfigs.$inferSelect;
export type InsertPaymentConfig = typeof paymentConfigs.$inferInsert;

/**
 * 账号凭证表 - 存储自动生成的账号密码
 */
export const accountCredentials = mysqlTable("account_credentials", {
  id: int("id").autoincrement().primaryKey(),
  // 用户ID
  userId: int("user_id").notNull().unique(),
  // 登录账号（邮箱或手机号）
  loginAccount: varchar("login_account", { length: 320 }).notNull().unique(),
  // 初始密码（加密存储）
  initialPassword: varchar("initial_password", { length: 255 }).notNull(),
  // 是否已修改密码
  passwordChanged: boolean("password_changed").notNull().default(false),
  // 凭证发送方式（email, sms）
  deliveryMethod: mysqlEnum("delivery_method", ["email", "sms"]).notNull(),
  // 凭证发送状态
  deliveryStatus: mysqlEnum("delivery_status", ["pending", "sent", "failed"]).notNull().default("pending"),
  // 凭证发送时间
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AccountCredential = typeof accountCredentials.$inferSelect;
export type InsertAccountCredential = typeof accountCredentials.$inferInsert;
