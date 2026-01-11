import { mysqlTable, mysqlEnum, int, varchar, text, timestamp, json, decimal, tinyint, index, unique, primaryKey, mysqlView } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

// 高级功能 schema将在后续的开发中逐步添加
// 详见DEVELOPMENT_GUIDE.md中的实施指南

// 导入分享功能的schema
export { errorQuestionShares, shareAccessLogs, type ErrorQuestionShare, type NewErrorQuestionShare, type ShareAccessLog, type NewShareAccessLog } from "./share_schema";

// 导入打印预览schema
export { printTemplates, printHistory, type PrintTemplate, type NewPrintTemplate, type PrintHistory, type NewPrintHistory } from "./print_preview_schema";

// 导入协作错题集schema
export {
  collaborativeCollections,
  collectionMembers,
  collectionQuestions,
  collectionComments,
  collectionActivities,
  commentLikes,
  type CollaborativeCollection,
  type NewCollaborativeCollection,
  type CollectionMember,
  type NewCollectionMember,
  type CollectionQuestion,
  type NewCollectionQuestion,
  type CollectionComment,
  type NewCollectionComment,
  type CollectionActivity,
  type NewCollectionActivity,
  type CommentLike,
  type NewCommentLike
} from "./collaborative_collections_schema";

// 导入证件管理schema
export { idCards, type IdCard, type NewIdCard } from "./id_card_schema";

// 导入Sitemap更新历史schema
export { sitemapUpdateHistory } from "./sitemap_history_schema";

// 导入SEO管理schema
export {
  sitemapHistory,
  schemaValidationResults,
  seoStats,
  gscDataCache,
  seoPriorityHistory,
  type SitemapHistory,
  type NewSitemapHistory,
  type SchemaValidationResult,
  type NewSchemaValidationResult,
  type SeoStat,
  type NewSeoStat,
  type GscDataCache,
  type NewGscDataCache,
  type SeoPriorityHistory,
  type NewSeoPriorityHistory
} from "./seo_management_schema";

// 导入性能优化和告警 schema
export {
  aiClassificationMetrics,
  paperAlgorithmMetrics,
  crawlerPerformanceMetrics,
  performanceAlertRules,
  performanceAlerts,
  weeklyReports,
  scheduledTaskLogs,
  type AiClassificationMetric,
  type NewAiClassificationMetric,
  type PaperAlgorithmMetric,
  type NewPaperAlgorithmMetric,
  type CrawlerPerformanceMetric,
  type NewCrawlerPerformanceMetric,
  type PerformanceAlertRule,
  type NewPerformanceAlertRule,
  type PerformanceAlert,
  type NewPerformanceAlert,
  type WeeklyReport,
  type NewWeeklyReport,
  type ScheduledTaskLog,
  type NewScheduledTaskLog
} from "./optimization_schema";

// 导入查重去噪 schema
export { 
  questionSimilarities, 
  deduplicationRecords, 
  noiseDetectionRecords, 
  deduplicationConfig,
  type QuestionSimilarity, 
  type NewQuestionSimilarity,
  type DeduplicationRecord,
  type NewDeduplicationRecord,
  type NoiseDetectionRecord,
  type NewNoiseDetectionRecord,
  type DeduplicationConfig,
  type NewDeduplicationConfig
} from "./deduplication_schema";

// 导入合规审核 schema
export {
  complianceRules,
  complianceChecks,
  complianceViolations,
  manualReviews,
  reviewWorkflows,
  reviewStats,
  type ComplianceRule,
  type NewComplianceRule,
  type ComplianceCheck,
  type NewComplianceCheck,
  type ComplianceViolation,
  type NewComplianceViolation,
  type ManualReview,
  type NewManualReview,
  type ReviewWorkflow,
  type NewReviewWorkflow,
  type ReviewStat,
  type NewReviewStat
} from "./compliance_schema";

// 导入质量评分 schema
export {
  qualityScores,
  qualityRules,
  qualityImprovements,
  type QualityScore,
  type NewQualityScore,
  type QualityRule,
  type NewQualityRule,
  type QualityImprovement,
  type NewQualityImprovement
} from "./quality_schema";

// 导入批量编辑和AI缓存 schema
export {
  uploadSessions,
  uploadSessionItems,
  questionAnalysisCache,
  type UploadSession,
  type NewUploadSession,
  type UploadSessionItem,
  type NewUploadSessionItem,
  type QuestionAnalysisCache,
  type NewQuestionAnalysisCache
} from "./batch_and_cache_schema";

// 导入上传历史 schema
export {
  uploadHistory,
  type UploadHistory,
  type NewUploadHistory
} from "./upload_history_schema";

// 导入角色增强 schema
export {
  teacherClasses,
  studentClasses,
  classReports,
  parentViewLogs,
  type TeacherClass,
  type NewTeacherClass,
  type StudentClass,
  type NewStudentClass,
  type ClassReport,
  type NewClassReport,
  type ParentViewLog,
  type NewParentViewLog
} from "./role_enhancement_schema";

// 导入通知配置 schema
export {
  notificationConfigs,
  notificationHistory,
  userNotifications,
  notificationSettings,
  type NotificationConfig,
  type NewNotificationConfig,
  type NotificationHistory,
  type NewNotificationHistory,
  type UserNotification,
  type NewUserNotification,
  type NotificationSetting,
  type NewNotificationSetting
} from "./notification_schema";

// 导入缓存预热和A/B测试 schema
export {
  knowledgePointHotness,
  questionTypeHotness,
  warmupTasks,
  batchOperationHistory,
  abTestExperiments,
  abTestUserGroups,
  recommendationFeedback,
  abTestStatistics,
  type KnowledgePointHotness,
  type NewKnowledgePointHotness,
  type QuestionTypeHotness,
  type NewQuestionTypeHotness,
  type WarmupTask,
  type NewWarmupTask,
  type BatchOperationHistory,
  type NewBatchOperationHistory,
  type AbTestExperiment,
  type NewAbTestExperiment,
  type AbTestUserGroup,
  type NewAbTestUserGroup,
  type RecommendationFeedback,
  type NewRecommendationFeedback,
  type AbTestStatistic,
  type NewAbTestStatistic
} from "./cache_warmup_ab_test_schema";

// 导入学习数据分析 schema
export {
  studySessions,
  subjectMasterySnapshots,
  reviewReminderSettings,
  learningReports,
  type StudySession,
  type NewStudySession,
  type SubjectMasterySnapshot,
  type NewSubjectMasterySnapshot,
  type ReviewReminderSetting,
  type NewReviewReminderSetting,
  type LearningReport,
  type NewLearningReport
} from "./learning_analytics_schema";

// 导入爬虫和试题数据库 schema
export {
  questionsDb,
  videoExplanations,
  crawlSources,
  crawlTasks,
  questionTags,
  questionQuality,
  type QuestionDb,
  type NewQuestionDb,
  type VideoExplanation,
  type NewVideoExplanation,
  type CrawlSource,
  type NewCrawlSource,
  type CrawlTask,
  type NewCrawlTask,
  type QuestionTag,
  type NewQuestionTag,
  type QuestionQuality,
  type NewQuestionQuality
} from "./crawler_question_db_schema";

// 导入爬虫优化和算法调优 schema
export {
  crawlerSelectorRules,
  crawlerPerformanceStats,
  aiClassificationTestSet,
  aiClassificationEvaluationHistory,
  aiPromptVersions,
  paperGenerationFeedback,
  paperAlgorithmConfig,
  paperQualityEvaluationHistory,
  type CrawlerSelectorRule,
  type NewCrawlerSelectorRule,
  type CrawlerPerformanceStat,
  type NewCrawlerPerformanceStat,
  type AiClassificationTestSet,
  type NewAiClassificationTestSet,
  type AiClassificationEvaluationHistory,
  type NewAiClassificationEvaluationHistory,
  type AiPromptVersion,
  type NewAiPromptVersion,
  type PaperGenerationFeedback,
  type NewPaperGenerationFeedback,
  type PaperAlgorithmConfig,
  type NewPaperAlgorithmConfig,
  type PaperQualityEvaluationHistory,
  type NewPaperQualityEvaluationHistory
} from "./crawler_optimization_schema";

export const accountCredentials = mysqlTable("account_credentials", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	loginAccount: varchar("login_account", { length: 320 }).notNull(),
	initialPassword: varchar("initial_password", { length: 255 }).notNull(),
	passwordChanged: tinyint("password_changed").default(0).notNull(),
	deliveryMethod: mysqlEnum("delivery_method", ['email','sms']).notNull(),
	deliveryStatus: mysqlEnum("delivery_status", ['pending','sent','failed']).default('pending').notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_user_id").on(table.userId),
	index("idx_login_account").on(table.loginAccount),
	index("user_id").on(table.userId),
	index("login_account").on(table.loginAccount),
]);

export const achievements = mysqlTable("achievements", {
	id: int().autoincrement().primaryKey().notNull(),
	code: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 128 }).notNull(),
	description: text().notNull(),
	category: mysqlEnum(['learning','practice','streak','mastery','social']).notNull(),
	icon: varchar({ length: 64 }).notNull(),
	color: varchar({ length: 32 }).notNull(),
	requirement: int().notNull(),
	points: int().default(10).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("achievements_code_unique").on(table.code),
]);

export const aiAdviceHistory = mysqlTable("ai_advice_history", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	adviceData: json("advice_data").notNull(),
	totalErrorQuestions: int("total_error_questions").default(0).notNull(),
	masteryRate: int("mastery_rate").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const aiAnnotationFeedback = mysqlTable("ai_annotation_feedback", {
	id: int().autoincrement().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	annotationId: int("annotation_id").notNull(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	chartType: varchar("chart_type", { length: 100 }),
	rating: int().notNull(),
	feedbackType: mysqlEnum("feedback_type", ['accurate','partially_accurate','inaccurate','missing_features']).notNull(),
	improvementSuggestion: text("improvement_suggestion"),
	aiAnnotations: json("ai_annotations"),
	userCorrectedAnnotations: json("user_corrected_annotations"),
	confidence: decimal({ precision: 5, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("annotation_id_idx").on(table.annotationId),
	index("chart_type_idx").on(table.chartType),
	index("rating_idx").on(table.rating),
]);

export const aiGeneratedQuestions = mysqlTable("ai_generated_questions", {
	id: int().autoincrement().notNull(),
	sourceId: int("source_id").notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	answer: text().notNull(),
	explanation: text(),
	questionType: mysqlEnum("question_type", ['choice','blank','short_answer','calculation','essay']).notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['grade7','grade8','grade9','grade10','grade11','grade12']).notNull(),
	difficulty: mysqlEnum(['easy','medium','hard']).notNull(),
	knowledgePointIds: json("knowledge_point_ids"),
	generationMethod: mysqlEnum("generation_method", ['ai_inspired','ai_similar','ai_original']).notNull(),
	originalityScore: decimal("originality_score", { precision: 5, scale: 2 }),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	reviewStatus: mysqlEnum("review_status", ['pending','approved','rejected','needs_revision']).default('pending').notNull(),
	reviewedBy: int("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewNotes: text("review_notes"),
	isPublic: tinyint("is_public").default(0).notNull(),
	usageCount: int("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("source_id_idx").on(table.sourceId),
	index("subject_grade_idx").on(table.subject, table.grade),
	index("review_status_idx").on(table.reviewStatus),
	index("is_public_idx").on(table.isPublic),
]);

export const aiQuestionFavorites = mysqlTable("ai_question_favorites", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	questionId: int("question_id").notNull(),
	folderId: int("folder_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("question_id_idx").on(table.questionId),
	index("user_question_unique_idx").on(table.userId, table.questionId),
]);

export const annotationComments = mysqlTable("annotation_comments", {
	id: int().autoincrement().notNull(),
	sharedAnnotationId: int("shared_annotation_id").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	content: text().notNull(),
	parentCommentId: int("parent_comment_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("shared_annotation_id_idx").on(table.sharedAnnotationId),
	index("user_id_idx").on(table.userId),
]);

export const annotationLikes = mysqlTable("annotation_likes", {
	id: int().autoincrement().notNull(),
	sharedAnnotationId: int("shared_annotation_id").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("unique_like").on(table.sharedAnnotationId, table.userId),
]);

export const annotationTemplates = mysqlTable("annotation_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: mysqlEnum(['coordinate_system','function_graph','geometry','physics_experiment','chemistry_apparatus','data_chart','custom']).notNull(),
	description: text(),
	thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
	annotations: json().notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	isPublic: tinyint("is_public").default(1).notNull(),
	createdBy: varchar("created_by", { length: 255 }).notNull(),
	usageCount: int("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("category_idx").on(table.category),
	index("subject_idx").on(table.subject),
	index("created_by_idx").on(table.createdBy),
]);

export const annotations = mysqlTable("annotations", {
	id: int().autoincrement().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	itemType: mysqlEnum("item_type", ['error_question','practice_pool','question_bank','real_exam']).notNull(),
	itemId: int("item_id").notNull(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	annotationType: mysqlEnum("annotation_type", ['marker','arrow','text','highlight','rectangle','circle']).notNull(),
	annotationData: json("annotation_data"),
	color: varchar({ length: 50 }).default('#FF0000'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_item_idx").on(table.userId, table.itemType, table.itemId),
]);

export const chartAnnotations = mysqlTable("chart_annotations", {
	id: int().autoincrement().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	errorQuestionId: int("error_question_id").notNull(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	annotations: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("error_question_id_idx").on(table.errorQuestionId),
]);

export const chartDataExtractions = mysqlTable("chart_data_extractions", {
	id: int().autoincrement().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	errorQuestionId: int("error_question_id").notNull(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	extractedData: json("extracted_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("error_question_id_idx").on(table.errorQuestionId),
]);

export const chartTypeTemplates = mysqlTable("chart_type_templates", {
	id: int().autoincrement().notNull(),
	chartType: varchar("chart_type", { length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: mysqlEnum(['math_function','geometry','physics','chemistry','data_visualization']).notNull(),
	description: text(),
	featurePatterns: json("feature_patterns"),
	recognitionPrompt: text("recognition_prompt"),
	accuracyRate: decimal("accuracy_rate", { precision: 5, scale: 2 }).default('0'),
	feedbackCount: int("feedback_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("category_idx").on(table.category),
	index("chart_type").on(table.chartType),
]);

export const checkInRecords = mysqlTable("check_in_records", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	checkInDate: timestamp({ mode: 'string' }).notNull(),
	activityType: mysqlEnum(['error_question','practice','review','video']).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const collectionTasks = mysqlTable("collection_tasks", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	schools: json().notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['grade7','grade8','grade9','grade10','grade11','grade12']).notNull(),
	examType: varchar("exam_type", { length: 100 }),
	year: int(),
	semester: mysqlEnum(['first','second']),
	targetCount: int("target_count").notNull(),
	status: mysqlEnum(['pending','in_progress','completed','failed']).default('pending').notNull(),
	progress: int().default(0).notNull(),
	generatedQuestionIds: json("generated_question_ids"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("status_idx").on(table.status),
]);

export const emailTemplates = mysqlTable("email_templates", {
	id: int().autoincrement().notNull(),
	templateType: varchar("template_type", { length: 100 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	subject: varchar({ length: 500 }).notNull(),
	htmlContent: text("html_content").notNull(),
	availableVariables: json("available_variables"),
	isDefault: tinyint("is_default").default(0).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	lastModifiedBy: int("last_modified_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("template_type").on(table.templateType),
]);

export const emailVerificationTokens = mysqlTable("email_verification_tokens", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	email: varchar({ length: 320 }).notNull(),
	token: varchar({ length: 64 }).notNull(),
	status: mysqlEnum(['pending','verified','expired']).default('pending').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token").on(table.token),
]);

export const errorQuestionTagRelations = mysqlTable("error_question_tag_relations", {
	id: int().autoincrement().notNull(),
	errorQuestionId: int().notNull(),
	tagId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const errorQuestionTags = mysqlTable("error_question_tags", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 50 }).notNull(),
	color: varchar({ length: 20 }).default('#3B82F6').notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const errorQuestions = mysqlTable("error_questions", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	imageUrl: text(),
	imageKey: varchar({ length: 500 }),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	difficulty: mysqlEnum(['easy','medium','hard']),
	errorAnalysis: text(),
	correctAnswer: text(),
	detailedExplanation: text(),
	knowledgePointIds: json(),
	userAnswer: text(),
	userNotes: text(),
	isAnalyzed: tinyint().default(0),
	isMastered: tinyint().default(0),
	reviewCount: int().default(0),
	lastReviewedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	detailedAnalysis: text(),
	schoolLevel: mysqlEnum(['junior','senior']).notNull(),
	voiceExplanation: text(),
	semester: mysqlEnum(['first','second']),
	isFavorite: tinyint().default(0),
	noteImages: json(),
});

export const errorReviewRecords = mysqlTable("error_review_records", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	errorQuestionId: int().notNull(),
	reviewRound: int().default(0).notNull(),
	lastReviewedAt: timestamp({ mode: 'string' }),
	nextReviewAt: timestamp({ mode: 'string' }).notNull(),
	isCompleted: tinyint().default(0),
	isPaused: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const exams = mysqlTable("exams", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 100 }).notNull(),
	examDate: timestamp({ mode: 'string' }).notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	section: mysqlEnum(['junior','senior']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	scope: text(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// 旧的exportTemplates已经改为advanced_features_schema中的新版本
// 详见advanced_features_schema.ts

export const favoriteFolders = mysqlTable("favorite_folders", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 50 }),
	questionCount: int("question_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
]);

export const favorites = mysqlTable("favorites", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	questionId: int("question_id").notNull(),
	questionType: mysqlEnum("question_type", ['error_question','practice_question','question']).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const generatedExamPapers = mysqlTable("generated_exam_papers", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	title: varchar({ length: 200 }).notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	schoolLevel: mysqlEnum(['junior','senior']).notNull(),
	totalQuestions: int().notNull(),
	totalScore: int().notNull(),
	difficulty: mysqlEnum(['easy','medium','hard']).notNull(),
	knowledgePointIds: json(),
	questionTypes: json(),
	questions: json(),
	isCompleted: tinyint().default(0),
	completedAt: timestamp({ mode: 'string' }),
	totalTimeSpent: int(),
	userScore: decimal({ precision: 5, scale: 2 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const goalReminders = mysqlTable("goal_reminders", {
	id: int().autoincrement().notNull(),
	goalId: int().notNull(),
	parentId: int().notNull(),
	studentId: int().notNull(),
	reminderType: mysqlEnum(['deadline_approaching','progress_behind','goal_failed','goal_achieved']).notNull(),
	message: text().notNull(),
	sent: tinyint().default(0).notNull(),
	sentAt: timestamp({ mode: 'string' }),
	read: tinyint().default(0).notNull(),
	readAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const knowledgePoints = mysqlTable("knowledge_points", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	level: mysqlEnum(['chapter','section','point']).notNull(),
	parentId: int(),
	description: text(),
	difficulty: mysqlEnum(['easy','medium','hard']).default('medium'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	semester: mysqlEnum(['first','second']),
});

export const learningGoals = mysqlTable("learning_goals", {
	id: int().autoincrement().notNull(),
	studentId: int().notNull(),
	parentId: int(),
	goalType: mysqlEnum(['error_count','mastery_rate','review_count','study_time']).notNull(),
	targetValue: int().notNull(),
	currentValue: int().default(0).notNull(),
	period: mysqlEnum(['daily','weekly','monthly']).notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	completed: tinyint().default(0).notNull(),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const learningPathProgress = mysqlTable("learning_path_progress", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	pathId: int("path_id").notNull(),
	nodeId: varchar("node_id", { length: 100 }).notNull(),
	knowledgePointId: int("knowledge_point_id"),
	status: mysqlEnum(['locked','available','in_progress','completed']).default('locked').notNull(),
	score: int(),
	attempts: int().default(0).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const learningPaths = mysqlTable("learning_paths", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	pathData: json("path_data"),
	totalNodes: int("total_nodes").default(0).notNull(),
	completedNodes: int("completed_nodes").default(0).notNull(),
	status: mysqlEnum(['active','completed','paused']).default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const learningProgress = mysqlTable("learning_progress", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	knowledgePointId: int().notNull(),
	masteryLevel: decimal({ precision: 5, scale: 2 }).notNull(),
	practiceCount: int().default(0),
	correctCount: int().default(0),
	errorCount: int().default(0),
	status: mysqlEnum(['not_started','learning','reviewing','mastered']).default('not_started'),
	lastPracticeAt: timestamp({ mode: 'string' }),
	nextReviewAt: timestamp({ mode: 'string' }),
	reviewInterval: int().default(1),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
	id: int().autoincrement().notNull(),
	orderNo: varchar("order_no", { length: 64 }).notNull(),
	userId: int("user_id"),
	planId: int("plan_id").notNull(),
	amount: int().notNull(),
	currency: varchar({ length: 10 }).default('CNY').notNull(),
	paymentMethod: mysqlEnum("payment_method", ['stripe','wechat','alipay']),
	status: mysqlEnum(['pending','paid','cancelled','refunded','expired']).default('pending').notNull(),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	thirdPartyOrderNo: varchar("third_party_order_no", { length: 255 }),
	buyerInfo: json("buyer_info"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_order_no").on(table.orderNo),
	index("idx_user_id").on(table.userId),
	index("idx_status").on(table.status),
	index("order_no").on(table.orderNo),
]);

export const parentStudentRelations = mysqlTable("parent_student_relations", {
	id: int().autoincrement().notNull(),
	parentId: int().notNull(),
	studentId: int().notNull(),
	inviteCode: varchar({ length: 32 }),
	status: mysqlEnum(['pending','active','rejected']).default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("parent_student_relations_inviteCode_unique").on(table.inviteCode),
]);

export const paymentCallbackLogs = mysqlTable("payment_callback_logs", {
	id: int().autoincrement().notNull(),
	orderNo: varchar("order_no", { length: 64 }).notNull(),
	paymentMethod: mysqlEnum("payment_method", ['stripe','wechat','alipay']).notNull(),
	thirdPartyOrderNo: varchar("third_party_order_no", { length: 255 }),
	rawData: text("raw_data").notNull(),
	signatureValid: tinyint("signature_valid"),
	processStatus: mysqlEnum("process_status", ['pending','success','failed']).default('pending').notNull(),
	processMessage: text("process_message"),
	ipAddress: varchar("ip_address", { length: 45 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const paymentConfigs = mysqlTable("payment_configs", {
	id: int().autoincrement().notNull(),
	paymentMethod: mysqlEnum("payment_method", ['stripe','wechat','alipay']).notNull(),
	isEnabled: tinyint("is_enabled").default(0).notNull(),
	config: text().notNull(),
	lastModifiedBy: int("last_modified_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("payment_method").on(table.paymentMethod),
]);

export const practicePools = mysqlTable("practice_pools", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	sourceErrorQuestionId: int("source_error_question_id").notNull(),
	practiceQuestionId: int("practice_question_id").notNull(),
	knowledgePointId: int("knowledge_point_id"),
	difficulty: mysqlEnum(['easy','medium','hard']).notNull(),
	status: mysqlEnum(['pending','completed','skipped']).default('pending').notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	score: int(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	});

export type PracticePool = typeof practicePools.$inferSelect;
export type NewPracticePool = typeof practicePools.$inferInsert;

// 瑑练记录表
export const practiceRecords = mysqlTable("practice_records", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	questionId: int().notNull(),
	questionType: mysqlEnum(['error_question','practice_question']).notNull(),
	userAnswer: text().notNull(),
	isCorrect: tinyint().notNull(),
	timeSpent: int(),
	knowledgePointIds: json(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	});

// 练习会话表 - 跟踪每次练习的整体情况
export const practiceSessions = mysqlTable("practice_sessions", {
	id: int().autoincrement().primaryKey().notNull(),
	sessionId: varchar('session_id', { length: 64 }).notNull().unique(), // UUID
	userId: int('user_id').notNull(),
	practiceMode: mysqlEnum('practice_mode', ['random','chapter','timed','weakness','review']).notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']),
	totalQuestions: int('total_questions').default(0).notNull(),
	completedQuestions: int('completed_questions').default(0).notNull(),
	correctCount: int('correct_count').default(0).notNull(),
	wrongCount: int('wrong_count').default(0).notNull(),
	totalTimeSpent: int('total_time_spent').default(0).notNull(), // 总用时（秒）
	accuracyRate: decimal('accuracy_rate', { precision: 5, scale: 2 }), // 正确率
	status: mysqlEnum('status', ['in_progress','completed','abandoned']).default('in_progress').notNull(),
	startedAt: timestamp('started_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp('completed_at', { mode: 'string' }),
	createdAt: timestamp('created_at', { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_user_sessions").on(table.userId, table.createdAt),
	index("idx_session_id").on(table.sessionId),
])

export const pushConfigs = mysqlTable("push_configs", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	pushType: mysqlEnum("push_type", ['question','knowledge','resource']).notNull(),
	targetFilters: json("target_filters").notNull(),
	contentConfig: json("content_config").notNull(),
	frequency: mysqlEnum(['daily','weekly','monthly','once']).notNull(),
	pushTime: varchar("push_time", { length: 5 }).default('09:00').notNull(),
	channels: json().notNull(),
	isEnabled: tinyint("is_enabled").default(1).notNull(),
	nextPushTime: timestamp("next_push_time", { mode: 'string' }),
	lastPushTime: timestamp("last_push_time", { mode: 'string' }),
	createdBy: int("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const pushRecords = mysqlTable("push_records", {
	id: int().autoincrement().notNull(),
	configId: int("config_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	targetUserCount: int("target_user_count").notNull(),
	successCount: int("success_count").default(0).notNull(),
	failedCount: int("failed_count").default(0).notNull(),
	status: mysqlEnum(['pending','processing','completed','failed']).default('pending').notNull(),
	channels: json().notNull(),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const questionBank = mysqlTable("question_bank", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	answer: text().notNull(),
	explanation: text(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	difficulty: mysqlEnum(['easy','medium','hard']).notNull(),
	knowledgePointIds: json(),
	source: mysqlEnum(['builtin','thirdparty','ai_generated']).default('builtin'),
	sourceId: varchar({ length: 200 }),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	usageCount: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	questionType: mysqlEnum(['choice','blank','short_answer','essay','calculation']).notNull(),
	semester: mysqlEnum(['first','second']),
	reviewStatus: mysqlEnum(['pending','approved','rejected','needs_revision']).default('pending'),
	reviewedBy: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewNotes: text(),
});

export const questionRecommendations = mysqlTable("question_recommendations", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	questionId: int("question_id").notNull(),
	recommendationReason: text("recommendation_reason"),
	matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(),
	basedOnErrorQuestionIds: json("based_on_error_question_ids"),
	weakKnowledgePoints: json("weak_knowledge_points"),
	isClicked: tinyint("is_clicked").default(0).notNull(),
	isPracticed: tinyint("is_practiced").default(0).notNull(),
	practiceResult: mysqlEnum("practice_result", ['correct','incorrect','skipped']),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	clickedAt: timestamp("clicked_at", { mode: 'string' }),
	practicedAt: timestamp("practiced_at", { mode: 'string' }),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("question_id_idx").on(table.questionId),
	index("user_question_idx").on(table.userId, table.questionId),
]);

export const questionReviewRecords = mysqlTable("question_review_records", {
	id: int().autoincrement().notNull(),
	questionId: int("question_id").notNull(),
	reviewerId: int("reviewer_id").notNull(),
	action: mysqlEnum(['approve','reject','request_revision']).notNull(),
	previousStatus: mysqlEnum("previous_status", ['pending','approved','rejected','needs_revision']).notNull(),
	newStatus: mysqlEnum("new_status", ['pending','approved','rejected','needs_revision']).notNull(),
	notes: text(),
	modifiedFields: json("modified_fields"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("question_id_idx").on(table.questionId),
	index("reviewer_id_idx").on(table.reviewerId),
]);

export const questionReviews = mysqlTable("question_reviews", {
	id: int().autoincrement().notNull(),
	questionId: int().notNull(),
	reviewerId: int().notNull(),
	reviewerName: varchar({ length: 200 }),
	status: mysqlEnum(['approved','rejected','needs_revision']).notNull(),
	accuracyScore: int(),
	difficultyScore: int(),
	clarityScore: int(),
	discriminationScore: int(),
	overallScore: decimal("overall_score", { precision: 5, scale: 2 }),
	notes: text(),
	suggestions: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const questionSources = mysqlTable("question_sources", {
	id: int().autoincrement().notNull(),
	sourceName: varchar("source_name", { length: 500 }).notNull(),
	sourceSchool: varchar("source_school", { length: 255 }).notNull(),
	sourceUrl: varchar("source_url", { length: 1000 }),
	examYear: int("exam_year"),
	examSemester: mysqlEnum("exam_semester", ['first','second']),
	examType: varchar("exam_type", { length: 100 }),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['grade7','grade8','grade9','grade10','grade11','grade12']).notNull(),
	topicSummary: text("topic_summary"),
	knowledgePoints: json("knowledge_points"),
	difficulty: mysqlEnum(['easy','medium','hard']).notNull(),
	relevanceScore: decimal("relevance_score", { precision: 5, scale: 2 }),
	searchQuery: text("search_query"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("school_subject_idx").on(table.sourceSchool, table.subject),
	index("grade_subject_idx").on(table.grade, table.subject),
]);

export const questions = mysqlTable("questions", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	semester: mysqlEnum(['first','second']),
	difficulty: mysqlEnum(['easy','medium','hard']).notNull(),
	questionType: mysqlEnum(['choice','fillBlank','shortAnswer','essay']).notNull(),
	options: json(),
	correctAnswer: text().notNull(),
	explanation: text(),
	knowledgePoints: json(),
	generatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	isPublished: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const realExamPracticeRecords = mysqlTable("real_exam_practice_records", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	questionId: int().notNull(),
	userAnswer: text(),
	isCorrect: tinyint(),
	timeSpent: int(),
	score: decimal({ precision: 5, scale: 2 }),
	isBookmarked: tinyint().default(0),
	practiceDate: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const realExamQuestions = mysqlTable("real_exam_questions", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	questionType: mysqlEnum(['choice','blank','short_answer','essay','calculation']).notNull(),
	answer: text().notNull(),
	explanation: text(),
	imageUrl: text(),
	imageKey: varchar({ length: 500 }),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']).notNull(),
	schoolLevel: mysqlEnum(['junior','senior']).notNull(),
	difficulty: mysqlEnum(['easy','medium','hard']).notNull(),
	knowledgePointIds: json(),
	sourceSchool: varchar({ length: 200 }),
	sourceRegion: varchar({ length: 100 }),
	examYear: int(),
	examSemester: mysqlEnum(['first','second']),
	examType: varchar({ length: 100 }),
	usageCount: int().default(0),
	averageScore: decimal({ precision: 5, scale: 2 }),
	isVerified: tinyint().default(0),
	isPublic: tinyint().default(1),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	semester: mysqlEnum(['first','second']),
});

export const reviewHistory = mysqlTable("review_history", {
	id: int().autoincrement().notNull(),
	reminderId: int("reminder_id").notNull(),
	userId: int("user_id").notNull(),
	questionId: int("question_id").notNull(),
	questionType: mysqlEnum("question_type", ['error_question','practice_question']).notNull(),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }).notNull(),
	masteryLevel: int("mastery_level"),
	timeSpent: int("time_spent"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const reviewPlans = mysqlTable("review_plans", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int().notNull(),
	targetType: mysqlEnum(['error_question','knowledge_point']).notNull(),
	targetId: int().notNull(),
	scheduledAt: timestamp({ mode: 'string' }).notNull(),
	priority: mysqlEnum(['low','medium','high','urgent']).default('medium'),
	status: mysqlEnum(['pending','completed','skipped']).default('pending'),
	completedAt: timestamp({ mode: 'string' }),
	completionNote: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	nextReviewAt: timestamp("next_review_at", { mode: 'string' }),
	nextReviewDate: timestamp("next_review_date", { mode: 'string' }),
});

export const reviewReminders = mysqlTable("review_reminders", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	questionId: int("question_id").notNull(),
	questionType: mysqlEnum("question_type", ['error_question','practice_question']).notNull(),
	nextReviewDate: timestamp("next_review_date", { mode: 'string' }).notNull(),
	reviewCount: int("review_count").default(0).notNull(),
	status: mysqlEnum(['pending','completed','skipped','deleted']).default('pending').notNull(),
	lastReviewedAt: timestamp("last_reviewed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const reviewTaskReminders = mysqlTable("review_task_reminders", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	taskId: int("task_id").notNull(),
	reminderType: mysqlEnum("reminder_type", ['one_day_before','three_hours_before','one_hour_before','custom']).notNull(),
	reminderMinutes: int("reminder_minutes").notNull(),
	scheduledTime: timestamp("scheduled_time", { mode: 'string' }).notNull(),
	sent: tinyint().default(0).notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	message: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const reviewTasks = mysqlTable("review_tasks", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	adviceHistoryId: int("advice_history_id").notNull(),
	subject: varchar({ length: 50 }).notNull(),
	knowledgePoint: varchar("knowledge_point", { length: 200 }),
	reason: text().notNull(),
	suggestedTime: varchar("suggested_time", { length: 50 }).notNull(),
	priority: int().default(0).notNull(),
	completed: tinyint().default(0).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	scheduledDate: timestamp("scheduled_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const scheduledTasks = mysqlTable("scheduled_tasks", {
	id: int().autoincrement().notNull(),
	taskName: varchar("task_name", { length: 100 }).notNull(),
	taskType: mysqlEnum("task_type", ['generate_questions','send_reminders','cleanup','check_review_task_reminders','execute_push_tasks']).notNull(),
	cronExpression: varchar("cron_expression", { length: 50 }).notNull(),
	isEnabled: tinyint("is_enabled").default(1).notNull(),
	lastExecutedAt: timestamp("last_executed_at", { mode: 'string' }),
	lastStatus: mysqlEnum("last_status", ['success','failed','running']),
	lastErrorMessage: text("last_error_message"),
	executionCount: int("execution_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("scheduled_tasks_task_name_unique").on(table.taskName),
]);

export const sharedAnnotations = mysqlTable("shared_annotations", {
	id: int().autoincrement().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	errorQuestionId: int("error_question_id").notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	annotations: json().notNull(),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['grade7','grade8','grade9','grade10','grade11','grade12']).notNull(),
	likeCount: int("like_count").default(0).notNull(),
	viewCount: int("view_count").default(0).notNull(),
	isPublic: tinyint("is_public").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("subject_grade_idx").on(table.subject, table.grade),
]);

export const studyPlans = mysqlTable("study_plans", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	examId: int().notNull(),
	planDate: timestamp({ mode: 'string' }).notNull(),
	taskType: mysqlEnum(['knowledge_point','error_question','practice']).notNull(),
	targetId: int(),
	targetName: varchar({ length: 200 }),
	priority: int().default(0).notNull(),
	estimatedMinutes: int(),
	completed: tinyint().default(0).notNull(),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const subscriptionPlans = mysqlTable("subscription_plans", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	price: int().notNull(),
	currency: varchar({ length: 10 }).default('CNY').notNull(),
	durationDays: int("duration_days").notNull(),
	features: json().notNull(),
	maxErrorQuestions: int("max_error_questions").default(-1).notNull(),
	maxAiAnalysis: int("max_ai_analysis").default(-1).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	sortOrder: int("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const systemSettings = mysqlTable("system_settings", {
	id: int().autoincrement().notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: text("setting_value").notNull(),
	description: text(),
	isEncrypted: tinyint("is_encrypted").default(0).notNull(),
	lastModifiedBy: int("last_modified_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("setting_key").on(table.settingKey),
]);

export const taskExecutionLogs = mysqlTable("task_execution_logs", {
	id: int().autoincrement().notNull(),
	taskId: int("task_id").notNull(),
	status: mysqlEnum(['success','failed']).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	duration: int(),
	itemsProcessed: int("items_processed"),
	errorMessage: text("error_message"),
	details: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const userAchievements = mysqlTable("user_achievements", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	achievementId: int().notNull(),
	unlockedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	progress: int().default(0).notNull(),
});

export const userPracticeBehaviors = mysqlTable("user_practice_behaviors", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	questionId: int("question_id").notNull(),
	behaviorType: mysqlEnum("behavior_type", ['view','practice','correct','incorrect','favorite','export']).notNull(),
	timeSpent: int("time_spent"),
	score: int(),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("question_id_idx").on(table.questionId),
	index("behavior_type_idx").on(table.behaviorType),
	index("created_at_idx").on(table.createdAt),
]);

export const userPushReceipts = mysqlTable("user_push_receipts", {
	id: int().autoincrement().notNull(),
	pushRecordId: int("push_record_id").notNull(),
	userId: int("user_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	pushType: mysqlEnum("push_type", ['question','knowledge','resource']).notNull(),
	channel: mysqlEnum(['system','email','wechat']).notNull(),
	status: mysqlEnum(['sent','failed','read']).default('sent').notNull(),
	isRead: tinyint("is_read").default(0).notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
	isClicked: tinyint("is_clicked").default(0).notNull(),
	clickedAt: timestamp("clicked_at", { mode: 'string' }),
	relatedContentId: int("related_content_id"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const userReminderSettings = mysqlTable("user_reminder_settings", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	enabled: tinyint().default(1).notNull(),
	reminderMinutes: json("reminder_minutes").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	notificationChannels: json("notification_channels").notNull(),
},
(table) => [
	index("user_reminder_settings_user_id_unique").on(table.userId),
]);

export const userSimilarityCache = mysqlTable("user_similarity_cache", {
	id: int().autoincrement().notNull(),
	userId1: int("user_id_1").notNull(),
	userId2: int("user_id_2").notNull(),
	similarityScore: int("similarity_score").notNull(),
	commonBehaviorCount: int("common_behavior_count").notNull(),
	lastCalculatedAt: timestamp("last_calculated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("user_1_idx").on(table.userId1),
	index("user_2_idx").on(table.userId2),
	index("score_idx").on(table.similarityScore),
]);

export const userSubscriptions = mysqlTable("user_subscriptions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	planId: int("plan_id").notNull(),
	orderId: int("order_id").notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	status: mysqlEnum(['active','expired','cancelled']).default('active').notNull(),
	usedAiAnalysis: int("used_ai_analysis").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_user_id").on(table.userId),
	index("idx_status").on(table.status),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']),
	school: varchar({ length: 200 }),
	userType: mysqlEnum(['student','parent','teacher']).default('student').notNull(),
	region: varchar({ length: 100 }),
	currentSemester: mysqlEnum(['first','second']),
	disabledMenuItems: json(),
	email_verified: tinyint("email_verified").default(0),
	wechat_open_id: varchar("wechat_open_id", { length: 128 }),
	wechat_nickname: varchar("wechat_nickname", { length: 200 }),
	theme: mysqlEnum(['light','dark','system']).default('system'),
	points: int().default(0).notNull(),
	total_feedback_count: int("total_feedback_count").default(0).notNull(),
	subjectPreferences: json("subject_preferences"),
	learningGoals: json("learning_goals"),
	dailyStudyTime: int("daily_study_time").default(30),
	preferredReviewTime: varchar("preferred_review_time", { length: 10 }).default('20:00'),
	notificationEnabled: tinyint("notification_enabled").default(1),
	reviewReminderEnabled: tinyint("review_reminder_enabled").default(1),
	goalReminderEnabled: tinyint("goal_reminder_enabled").default(1),
	// 用户名密码登录字段
	username: varchar({ length: 64 }),
	passwordHash: varchar("password_hash", { length: 255 }),
	// 手机号登录字段
	phone: varchar({ length: 20 }),
	phoneVerified: tinyint("phone_verified").default(0),
},
(table) => [
	index("users_openId_unique").on(table.openId),
	index("users_username_unique").on(table.username),
]);

export const videoResources = mysqlTable("video_resources", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text(),
	platform: mysqlEnum(['bilibili','youtube']).notNull(),
	videoId: varchar({ length: 200 }).notNull(),
	videoUrl: text().notNull(),
	thumbnailUrl: text(),
	duration: int(),
	author: varchar({ length: 200 }),
	viewCount: int().default(0),
	subject: mysqlEnum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).notNull(),
	grade: mysqlEnum(['junior1','junior2','junior3','senior1','senior2','senior3']),
	knowledgePointIds: json(),
	relevanceScore: decimal("relevance_score", { precision: 5, scale: 2 }),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	recommendCount: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

/**
 * 智能文档上传处理系统 - 上传的文档记录表
 */
export const uploadedDocuments = mysqlTable("uploaded_documents", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  
  // 文件信息
  originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
  fileType: mysqlEnum("file_type", ['image', 'pdf', 'word']).notNull(),
  fileSize: int("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  
  // S3存储路径
  originalFileUrl: varchar("original_file_url", { length: 500 }).notNull(),
  originalFileKey: varchar("original_file_key", { length: 500 }).notNull(),
  
  // 处理状态
  processingStatus: mysqlEnum("processing_status", [
    'uploaded',
    'region_selecting',
    'processing',
    'completed',
    'failed'
  ]).default('uploaded').notNull(),
  
  errorMessage: text("error_message"),
  
  // 元数据
  totalRegions: int("total_regions").default(0).notNull(),
  totalContents: int("total_contents").default(0).notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("user_id_idx").on(table.userId),
  index("processing_status_idx").on(table.processingStatus),
  index("created_at_idx").on(table.createdAt),
]);

/**
 * 框选区域表
 */
export const documentRegions = mysqlTable("document_regions", {
  id: int().autoincrement().primaryKey().notNull(),
  documentId: int("document_id").notNull(),
  
  // 区域位置（相对于原图的百分比坐标）
  x: decimal({ precision: 10, scale: 6 }).notNull(),
  y: decimal({ precision: 10, scale: 6 }).notNull(),
  width: decimal({ precision: 10, scale: 6 }).notNull(),
  height: decimal({ precision: 10, scale: 6 }).notNull(),
  
  // 区域类型
  regionType: mysqlEnum("region_type", [
    'text',
    'formula',
    'chart',
    'table',
    'image',
    'mixed'
  ]).notNull(),
  
  // 处理后的图像
  processedImageUrl: varchar("processed_image_url", { length: 500 }),
  processedImageKey: varchar("processed_image_key", { length: 500 }),
  
  // 是否需要清除笔迹
  needsHandwritingRemoval: int("needs_handwriting_removal").default(1).notNull(),
  
  // 处理状态
  processingStatus: mysqlEnum("processing_status", [
    'pending',
    'processing',
    'completed',
    'failed'
  ]).default('pending').notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("document_id_idx").on(table.documentId),
  index("region_type_idx").on(table.regionType),
  index("processing_status_idx").on(table.processingStatus),
]);

/**
 * 识别的内容表
 */
export const recognizedContents = mysqlTable("recognized_contents", {
  id: int().autoincrement().primaryKey().notNull(),
  regionId: int("region_id").notNull(),
  documentId: int("document_id").notNull(),
  
  // 内容类型
  contentType: mysqlEnum("content_type", [
    'text',
    'formula',
    'chart_data',
    'table_data',
    'image_description'
  ]).notNull(),
  
  // 原始识别结果
  rawContent: text("raw_content").notNull(),
  
  // 结构化数据
  structuredData: json("structured_data"),
  
  // 可编辑格式
  editableFormat: mysqlEnum("editable_format", [
    'plain_text',
    'markdown',
    'latex',
    'json',
    'html'
  ]).notNull(),
  
  editableContent: text("editable_content").notNull(),
  
  // 识别置信度
  confidence: decimal({ precision: 5, scale: 2 }),
  
  // 是否已被用户编辑
  isEdited: int("is_edited").default(0).notNull(),
  
  // 用户编辑后的内容
  userEditedContent: text("user_edited_content"),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("region_id_idx").on(table.regionId),
  index("document_id_idx").on(table.documentId),
  index("content_type_idx").on(table.contentType),
]);

/**
 * 手写笔迹清除记录表
 */
export const handwritingRemovalLogs = mysqlTable("handwriting_removal_logs", {
  id: int().autoincrement().primaryKey().notNull(),
  regionId: int("region_id").notNull(),
  documentId: int("document_id").notNull(),
  
  // 原始图像
  beforeImageUrl: varchar("before_image_url", { length: 500 }).notNull(),
  beforeImageKey: varchar("before_image_key", { length: 500 }).notNull(),
  
  // 处理后图像
  afterImageUrl: varchar("after_image_url", { length: 500 }).notNull(),
  afterImageKey: varchar("after_image_key", { length: 500 }).notNull(),
  
  // 检测到的笔迹信息
  detectedHandwriting: json("detected_handwriting"),
  
  // 处理参数
  processingParams: json("processing_params"),
  
  // 处理耗时
  processingTimeMs: int("processing_time_ms"),
  
  // 质量评分
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index("region_id_idx").on(table.regionId),
  index("document_id_idx").on(table.documentId),
]);

/**
 * 导出记录表
 */
export const documentExports = mysqlTable("document_exports", {
  id: int().autoincrement().primaryKey().notNull(),
  documentId: int("document_id").notNull(),
  userId: int("user_id").notNull(),
  
  // 导出格式
  exportFormat: mysqlEnum("export_format", [
    'word',
    'pdf',
    'markdown',
    'latex',
    'json'
  ]).notNull(),
  
  // 导出文件
  exportFileUrl: varchar("export_file_url", { length: 500 }).notNull(),
  exportFileKey: varchar("export_file_key", { length: 500 }).notNull(),
  
  // 导出配置
  exportConfig: json("export_config"),
  
  // 文件大小
  fileSize: int("file_size").notNull(),
  
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index("document_id_idx").on(table.documentId),
  index("user_id_idx").on(table.userId),
  index("created_at_idx").on(table.createdAt),
]);

// ============================================
// Type Exports
// ============================================

// User types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Achievement types
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type InsertAchievement = typeof achievements.$inferInsert;

// Error Question types
export type ErrorQuestion = typeof errorQuestions.$inferSelect;
export type NewErrorQuestion = typeof errorQuestions.$inferInsert;

// Knowledge Point types
export type KnowledgePoint = typeof knowledgePoints.$inferSelect;
export type NewKnowledgePoint = typeof knowledgePoints.$inferInsert;

// Practice Record types
export type PracticeRecord = typeof practiceRecords.$inferSelect;
export type NewPracticeRecord = typeof practiceRecords.$inferInsert;

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type NewPracticeSession = typeof practiceSessions.$inferInsert;

// Review Plan types
export type ReviewPlan = typeof reviewPlans.$inferSelect;
export type NewReviewPlan = typeof reviewPlans.$inferInsert;

// User Achievement types
export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;

// Check In Record types
export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type NewCheckInRecord = typeof checkInRecords.$inferInsert;

// Learning Progress types
export type LearningProgress = typeof learningProgress.$inferSelect;
export type NewLearningProgress = typeof learningProgress.$inferInsert;

// Document types will be added when document tables are created

// 用户自定义框选模板表
export const userCropTemplates = mysqlTable("user_crop_templates", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	templateName: varchar("template_name", { length: 255 }).notNull(),
	description: text(),
	regions: json().notNull(), // 框选区域配置 [{x, y, width, height, label}]
	thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
	category: mysqlEnum(['choice', 'blank', 'short_answer', 'calculation', 'essay', 'custom']).default('custom').notNull(),
	usageCount: int("usage_count").default(0).notNull(),
	isPublic: tinyint("is_public").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("category_idx").on(table.category),
]);

export type UserCropTemplate = typeof userCropTemplates.$inferSelect;
export type NewUserCropTemplate = typeof userCropTemplates.$inferInsert;

// 批量框选任务表
export const batchCropTasks = mysqlTable("batch_crop_tasks", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	taskName: varchar("task_name", { length: 255 }).notNull(),
	fileList: json("file_list").notNull(), // [{url, filename, status, result}]
	totalFiles: int("total_files").notNull(),
	processedFiles: int("processed_files").default(0).notNull(),
	failedFiles: int("failed_files").default(0).notNull(),
	status: mysqlEnum(['pending', 'processing', 'completed', 'failed']).default('pending').notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("status_idx").on(table.status),
]);

export type BatchCropTask = typeof batchCropTasks.$inferSelect;
export type NewBatchCropTask = typeof batchCropTasks.$inferInsert;

// 框选历史记录表
export const cropHistory = mysqlTable("crop_history", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	imageHash: varchar("image_hash", { length: 64 }), // 图片哈希值用于相似度匹配
	regions: json().notNull(), // 框选区域配置
	questionType: mysqlEnum("question_type", ['choice', 'blank', 'short_answer', 'calculation', 'essay', 'mixed']),
	subject: mysqlEnum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
	grade: mysqlEnum(['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']),
	feedback: mysqlEnum(['accepted', 'rejected', 'modified']), // 用户反馈
	usageCount: int("usage_count").default(1).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("user_id_idx").on(table.userId),
	index("question_type_idx").on(table.questionType),
	index("image_hash_idx").on(table.imageHash),
]);

export type CropHistory = typeof cropHistory.$inferSelect;
export type NewCropHistory = typeof cropHistory.$inferInsert;

// ==================== 第一阶段：基础数据采集和处理 ====================
// 爆虫任务表已经改为advanced_features_schema中的新版本
// 详见advanced_features_schema.ts
// export const crawlerTasks = mysqlTable("crawler_tasks", { ... });
// export type CrawlerTask = typeof crawlerTasks.$inferSelect;
// export type NewCrawlerTask = typeof crawlerTasks.$inferInsert;

// 原始试题表
export const rawQuestions = mysqlTable("raw_questions", {
	id: int().autoincrement().primaryKey().notNull(),
	crawlerTaskId: int("crawler_task_id"), // 关联爬虫任务
	sourceUrl: varchar("source_url", { length: 500 }).notNull(),
	sourceType: varchar("source_type", { length: 100 }).notNull(), // 教育云、学校题库、网络爬取等
	sourceName: varchar("source_name", { length: 255 }), // 来源名称：XX学校、XX教育局
	rawContent: text("raw_content").notNull(), // 原始内容（HTML/文本）
	imageUrls: json("image_urls"), // 图片URL数组
	ocrText: text("ocr_text"), // OCR识别的文本
	ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }), // OCR置信度
	extractedMetadata: json("extracted_metadata"), // 提取的元数据
	subject: mysqlEnum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
	grade: mysqlEnum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']),
	questionType: mysqlEnum("question_type", ['choice', 'blank', 'short_answer', 'calculation', 'essay', 'mixed']),
	difficulty: mysqlEnum(['easy', 'medium', 'hard']),
	knowledgePointIds: json("knowledge_point_ids"), // AI识别的知识点ID数组
	processingStatus: mysqlEnum("processing_status", ['raw', 'ocr_done', 'metadata_extracted', 'quality_checked', 'approved', 'rejected']).default('raw').notNull(),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }), // 质量评分
	duplicateCheckStatus: mysqlEnum("duplicate_check_status", ['pending', 'unique', 'duplicate', 'similar']).default('pending').notNull(),
	duplicateOfId: int("duplicate_of_id"), // 如果是重复题，指向原题ID
	similarityScore: decimal("similarity_score", { precision: 5, scale: 2 }), // 相似度分数
	complianceStatus: mysqlEnum("compliance_status", ['pending', 'compliant', 'out_of_scope', 'needs_review']).default('pending').notNull(),
	complianceNotes: text("compliance_notes"), // 合规审核备注
	isPublic: tinyint("is_public").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("crawler_task_id_idx").on(table.crawlerTaskId),
	index("source_type_idx").on(table.sourceType),
	index("subject_grade_idx").on(table.subject, table.grade),
	index("processing_status_idx").on(table.processingStatus),
	index("duplicate_check_status_idx").on(table.duplicateCheckStatus),
	index("compliance_status_idx").on(table.complianceStatus),
]);

export type RawQuestion = typeof rawQuestions.$inferSelect;
export type NewRawQuestion = typeof rawQuestions.$inferInsert;

// 爬虫来源配置表
export const crawlerSources = mysqlTable("crawler_sources", {
	id: int().autoincrement().primaryKey().notNull(),
	sourceName: varchar("source_name", { length: 255 }).notNull(),
	sourceType: mysqlEnum("source_type", ['education_cloud', 'school_bank', 'education_website', 'research_website', 'famous_school']).notNull(),
	sourceUrl: varchar("source_url", { length: 500 }),
	region: varchar({ length: 100 }).default('深圳').notNull(), // 地区
	credibilityScore: decimal("credibility_score", { precision: 5, scale: 2 }).default('0'), // 可信度评分
	totalQuestions: int("total_questions").default(0).notNull(),
	approvedQuestions: int("approved_questions").default(0).notNull(),
	lastCrawledAt: timestamp("last_crawled_at", { mode: 'string' }),
	isActive: tinyint("is_active").default(1).notNull(),
	crawlerConfig: json("crawler_config"), // 该来源的爬虫配置
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("source_type_idx").on(table.sourceType),
	index("region_idx").on(table.region),
	index("is_active_idx").on(table.isActive),
]);

export type CrawlerSource = typeof crawlerSources.$inferSelect;
export type NewCrawlerSource = typeof crawlerSources.$inferInsert;

// 知识点标签表（扩展现有知识图谱）
export const knowledgePointTags = mysqlTable("knowledge_point_tags", {
	id: int().autoincrement().primaryKey().notNull(),
	knowledgePointId: int("knowledge_point_id").notNull(),
	tagName: varchar("tag_name", { length: 100 }).notNull(),
	tagType: mysqlEnum("tag_type", ['concept', 'method', 'application', 'difficulty', 'exam_frequency']).notNull(),
	weight: decimal({ precision: 5, scale: 2 }).default('1.00').notNull(), // 标签权重
	usageCount: int("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("knowledge_point_id_idx").on(table.knowledgePointId),
	index("tag_type_idx").on(table.tagType),
	unique("unique_kp_tag").on(table.knowledgePointId, table.tagName),
]);

export type KnowledgePointTag = typeof knowledgePointTags.$inferSelect;
export type NewKnowledgePointTag = typeof knowledgePointTags.$inferInsert;

// 知识点关联表
export const knowledgePointRelations = mysqlTable("knowledge_point_relations", {
	id: int().autoincrement().primaryKey().notNull(),
	fromKnowledgePointId: int("from_knowledge_point_id").notNull(),
	toKnowledgePointId: int("to_knowledge_point_id").notNull(),
	relationType: mysqlEnum("relation_type", ['prerequisite', 'related', 'advanced', 'application']).notNull(),
	strength: decimal({ precision: 5, scale: 2 }).default('1.00').notNull(), // 关联强度
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("from_kp_idx").on(table.fromKnowledgePointId),
	index("to_kp_idx").on(table.toKnowledgePointId),
	index("relation_type_idx").on(table.relationType),
	unique("unique_relation").on(table.fromKnowledgePointId, table.toKnowledgePointId, table.relationType),
]);

export type KnowledgePointRelation = typeof knowledgePointRelations.$inferSelect;
export type NewKnowledgePointRelation = typeof knowledgePointRelations.$inferInsert;

// OCR处理日志表
export const ocrProcessingLogs = mysqlTable("ocr_processing_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	rawQuestionId: int("raw_question_id").notNull(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	ocrEngine: varchar("ocr_engine", { length: 50 }).default('manus_llm').notNull(),
	ocrText: text("ocr_text").notNull(),
	confidence: decimal({ precision: 5, scale: 2 }),
	hasSpecialSymbols: tinyint("has_special_symbols").default(0).notNull(), // 是否包含数学符号/化学式
	specialSymbolsDetected: json("special_symbols_detected"), // 检测到的特殊符号列表
	processingTime: int("processing_time"), // 处理时间（毫秒）
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("raw_question_id_idx").on(table.rawQuestionId),
	index("has_special_symbols_idx").on(table.hasSpecialSymbols),
]);

export type OcrProcessingLog = typeof ocrProcessingLogs.$inferSelect;
export type NewOcrProcessingLog = typeof ocrProcessingLogs.$inferInsert;

// ==================== 高级登录认证相关表 ====================

// 验证码表 - 用于手机验证码登录
export const verificationCodes = mysqlTable("verification_codes", {
  id: int().autoincrement().primaryKey().notNull(),
  phone: varchar({ length: 20 }).notNull(),
  code: varchar({ length: 10 }).notNull(),
  type: mysqlEnum(['login', 'register', 'bind', 'reset']).notNull(),
  used: tinyint().default(0).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'date' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("phone_idx").on(table.phone),
  index("code_idx").on(table.code),
  index("expires_at_idx").on(table.expiresAt),
]);

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;

// 微信OAuth状态表 - 用于微信扫码登录
export const wechatOAuthStates = mysqlTable("wechat_oauth_states", {
  id: int().autoincrement().primaryKey().notNull(),
  state: varchar({ length: 64 }).notNull(),
  redirectUrl: varchar("redirect_url", { length: 500 }),
  userId: int("user_id"), // 如果是绑定操作，关联用户ID
  action: mysqlEnum(['login', 'bind']).default('login').notNull(),
  used: tinyint().default(0).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'date' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("state_idx").on(table.state),
  index("expires_at_idx").on(table.expiresAt),
]);

export type WechatOAuthState = typeof wechatOAuthStates.$inferSelect;
export type NewWechatOAuthState = typeof wechatOAuthStates.$inferInsert;

// 账号绑定历史表 - 记录用户账号绑定/解绑操作
export const accountBindingHistory = mysqlTable("account_binding_history", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  bindingType: mysqlEnum("binding_type", ['phone', 'wechat', 'username', 'email']).notNull(),
  action: mysqlEnum(['bind', 'unbind']).notNull(),
  oldValue: varchar("old_value", { length: 255 }),
  newValue: varchar("new_value", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("user_id_idx").on(table.userId),
  index("binding_type_idx").on(table.bindingType),
  index("created_at_idx").on(table.createdAt),
]);

export type AccountBindingHistory = typeof accountBindingHistory.$inferSelect;
export type NewAccountBindingHistory = typeof accountBindingHistory.$inferInsert;


// ==================== 登录安全策略相关表 ====================

// 登录尝试记录表 - 记录所有登录尝试
export const loginAttempts = mysqlTable("login_attempts", {
  id: int().autoincrement().primaryKey().notNull(),
  identifier: varchar({ length: 255 }).notNull(), // 登录标识符（手机号/用户名/邮箱/微信openid）
  identifierType: mysqlEnum("identifier_type", ['phone', 'username', 'email', 'wechat']).notNull(),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  userAgent: text("user_agent"),
  success: tinyint().default(0).notNull(),
  failReason: varchar("fail_reason", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("identifier_idx").on(table.identifier),
  index("identifier_type_idx").on(table.identifierType),
  index("ip_address_idx").on(table.ipAddress),
  index("created_at_idx").on(table.createdAt),
]);

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;

// 登录锁定表 - 记录被锁定的账号
export const loginLocks = mysqlTable("login_locks", {
  id: int().autoincrement().primaryKey().notNull(),
  identifier: varchar({ length: 255 }).notNull(),
  identifierType: mysqlEnum("identifier_type", ['phone', 'username', 'email', 'wechat']).notNull(),
  lockReason: varchar("lock_reason", { length: 255 }),
  failedAttempts: int("failed_attempts").default(0).notNull(),
  unlocksAt: timestamp("unlocks_at", { mode: 'string' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("identifier_idx").on(table.identifier),
  index("identifier_type_idx").on(table.identifierType),
  index("unlocks_at_idx").on(table.unlocksAt),
]);

export type LoginLock = typeof loginLocks.$inferSelect;
export type NewLoginLock = typeof loginLocks.$inferInsert;

// 用户设备表 - 记录用户登录过的设备
export const userDevices = mysqlTable("user_devices", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  deviceId: varchar("device_id", { length: 64 }).notNull(), // 设备唯一标识
  deviceType: mysqlEnum("device_type", ['mobile', 'tablet', 'desktop', 'unknown']).default('unknown').notNull(),
  browser: varchar({ length: 50 }),
  os: varchar({ length: 50 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  isTrusted: tinyint("is_trusted").default(0).notNull(),
  lastActiveAt: timestamp("last_active_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("user_id_idx").on(table.userId),
  index("device_id_idx").on(table.deviceId),
  index("last_active_at_idx").on(table.lastActiveAt),
]);

export type UserDevice = typeof userDevices.$inferSelect;
export type NewUserDevice = typeof userDevices.$inferInsert;

// 登录日志表 - 记录成功的登录
export const loginLogs = mysqlTable("login_logs", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id"),
  loginMethod: mysqlEnum("login_method", ['phone', 'username', 'wechat', 'oauth', 'email']).notNull(),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  deviceId: varchar("device_id", { length: 64 }),
  userAgent: text("user_agent"),
  success: tinyint().default(1).notNull(),
  failReason: varchar("fail_reason", { length: 255 }),
  isNewDevice: tinyint("is_new_device").default(0).notNull(),
  isNewLocation: tinyint("is_new_location").default(0).notNull(),
  riskLevel: mysqlEnum("risk_level", ['low', 'medium', 'high']).default('low').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("user_id_idx").on(table.userId),
  index("ip_address_idx").on(table.ipAddress),
  index("created_at_idx").on(table.createdAt),
  index("risk_level_idx").on(table.riskLevel),
]);

export type LoginLog = typeof loginLogs.$inferSelect;
export type NewLoginLog = typeof loginLogs.$inferInsert;

// 安全告警表 - 记录安全相关的告警
export const securityAlerts = mysqlTable("security_alerts", {
  id: int().autoincrement().primaryKey().notNull(),
  userId: int("user_id").notNull(),
  alertType: mysqlEnum("alert_type", ['new_device', 'new_location', 'multiple_failures', 'suspicious_activity', 'account_locked']).notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  ipAddress: varchar("ip_address", { length: 50 }),
  location: varchar({ length: 255 }),
  deviceInfo: text("device_info"),
  isRead: tinyint("is_read").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("user_id_idx").on(table.userId),
  index("alert_type_idx").on(table.alertType),
  index("is_read_idx").on(table.isRead),
  index("created_at_idx").on(table.createdAt),
]);

export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type NewSecurityAlert = typeof securityAlerts.$inferInsert;

// 短信服务配置表 - 存储短信服务商配置
export const smsServiceConfig = mysqlTable("sms_service_config", {
  id: int().autoincrement().primaryKey().notNull(),
  provider: mysqlEnum(['aliyun', 'tencent', 'custom']).notNull(),
  accessKeyId: varchar("access_key_id", { length: 255 }),
  accessKeySecret: varchar("access_key_secret", { length: 255 }),
  signName: varchar("sign_name", { length: 100 }),
  templateCode: varchar("template_code", { length: 100 }),
  region: varchar({ length: 50 }),
  isActive: tinyint("is_active").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("provider_idx").on(table.provider),
  index("is_active_idx").on(table.isActive),
]);

export type SmsServiceConfig = typeof smsServiceConfig.$inferSelect;
export type NewSmsServiceConfig = typeof smsServiceConfig.$inferInsert;

// 微信配置表 - 存储微信开放平台配置
export const wechatConfig = mysqlTable("wechat_config", {
  id: int().autoincrement().primaryKey().notNull(),
  appId: varchar("app_id", { length: 100 }).notNull(),
  appSecret: varchar("app_secret", { length: 255 }).notNull(),
  redirectUri: varchar("redirect_uri", { length: 500 }),
  scope: varchar({ length: 100 }).default('snsapi_login'),
  isActive: tinyint("is_active").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("is_active_idx").on(table.isActive),
]);

export type WechatConfig = typeof wechatConfig.$inferSelect;
export type NewWechatConfig = typeof wechatConfig.$inferInsert;
