import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { achievementsRouter } from "./routers/achievements";
import { statsRouter } from "./routers/stats";
import { errorQuestionsRouter } from "./routers/errorQuestions";
import { knowledgePointsRouter } from "./routers/knowledgePoints";
import { aiAnalysisRouter } from "./routers/aiAnalysis";
import { videosRouter } from "./routers/videos";
import { practiceRouter } from "./routers/practice";
import { reviewRouter } from "./routers/review";
import { learningStatsRouter } from "./routers/learningStats";
import { practiceQuestionsRouter } from "./routers/practiceQuestions";
import { exportRouter } from "./routers/export";
import { subjectReportRouter } from "./routers/subjectReport";
import { knowledgePointDetailRouter } from "./routers/knowledgePointDetail";
import { reviewPlanRouter } from "./routers/reviewPlan";
import { errorExportRouter } from "./routers/errorExport";
import { voiceExplanationRouter } from "./routers/voiceExplanation";
import { learningReportExportRouter } from "./routers/learningReportExport";
import { tagsRouter } from "./routers/tags";
import { examAndPlanRouter } from "./routers/examAndPlan";
import { parentSupervisionRouter } from "./routers/parentSupervision";
import { realExamRouter } from "./routers/realExam";
import { questionBankRouter } from "./routers/questionBankRouter";
import { learningPathRouter } from "./routers/learningPath";
import { semesterRouter } from "./routers/semesterRouter";
import { userSettingsRouter } from "./routers/userSettings";
import { similarQuestionsRouter } from "./routers/similarQuestions";
import { questionsRouter } from "./routers/questions";
import { scheduledTasksRouter } from "./routers/scheduledTasks";
import { practicePoolsRouter } from "./routers/practicePools";
import { favoritesRouter } from "./routers/favorites";
import { reviewRemindersRouter } from "./routers/reviewReminders";
import { errorQuestionStatsRouter } from "./routers/errorQuestionStats";
import { aiLearningAdviceRouter } from "./routers/aiLearningAdvice";
import { reviewTasksRouter } from "./routers/reviewTasks";
import { reminderSettingsRouter } from "./routers/reminderSettings";
import { documentUploadRouter } from "./routers/documentUpload";
import { symbolCorrectionRouter } from "./routers/symbolCorrection";
import { enhancedExportRouter } from "./routers/enhancedExport";
import { annotationsRouter } from "./routers/annotations";
import { chartDataExtractionRouter } from "./routers/chartDataExtraction";
import { comparisonLearningRouter } from "./routers/comparisonLearning";
import { chartAnnotationsRouter } from "./routers/chartAnnotations";
import { annotationTemplatesRouter } from "./routers/annotationTemplates";
import { aiAnnotationRouter } from "./routers/aiAnnotation";
import { collaborativeLearningRouter } from "./routers/collaborativeLearning";
import { aiAnnotationFeedbackRouter } from "./routers/aiAnnotationFeedback";
import { sitemapRouter } from "./routers/sitemap";
import { cacheStatsRouter } from "./routers/cacheStats";
import { pointsRouter } from "./routers/points";
import { aiQuestionCollectionRouter } from "./routers/aiQuestionCollection";
import { questionReviewRouter } from "./routers/questionReview";
import { questionRecommendationRouter } from "./routers/questionRecommendation";
import { questionExportRouter } from "./routers/questionExport";
import { aiFavoritesRouter } from "./routers/aiFavorites";
import { collaborativeFilteringRouter } from "./routers/collaborativeFiltering";
import { exportTemplatesRouter } from "./routers/exportTemplates";
import { advancedExportRouter } from "./routers/advancedExport";
import { shareRouter } from "./routers/share";
import { weaknessRouter } from "./routers/weakness";
import { smartExamPaperRouter } from "./routers/smartExamPaper";
import { practiceRecordsRouter } from "./routers/practiceRecords";
import { batchImageProcessingRouter } from "./routers/batchImageProcessing";
import { smartScannerRouter } from "./routers/smartScanner";
import { idCardManagementRouter } from "./routers/idCardManagement";
import { smartCropRouter } from "./routers/smartCrop";
import { cropTemplatesRouter } from "./routers/cropTemplates";
import { batchSmartCropRouter } from "./routers/batchSmartCrop";
import { cropHistoryRouter } from "./routers/cropHistory";
import { dataCrawlerRouter } from "./routers/dataCrawler";
import { deduplicationRouter } from "./routers/deduplication";
import { complianceRouter } from "./routers/compliance";
import { qualityRouter } from "./routers/quality";
import { recommendationRouter } from "./routers/recommendation";
import { batchUploadRouter } from "./routers/batchUpload";
import { uploadHistoryRouter } from "./routers/uploadHistory";
import { roleEnhancementRouter } from "./routers/roleEnhancement";
import { cacheRouter } from "./routers/cache";
import { cacheWarmupRouter } from "./routers/cacheWarmup";
import { batchOperationHistoryRouter } from "./routers/batchOperationHistory";
import { abTestRouter } from "./routers/abTest";
import { warmupIntelligenceRouter } from "./routers/warmupIntelligence";
import { auditEnhancementRouter } from "./routers/auditEnhancement";
import { scheduledTasksManagementRouter } from "./routers/scheduledTasksManagement";
import { notificationManagementRouter } from "./routers/notificationManagement";
import { notificationConfigRouter } from "./routers/notificationConfig";
import { userProfileRouter } from "./routers/userProfile";
import { learningAnalyticsRouter } from "./routers/learningAnalytics";
import { smartReviewReminderRouter } from "./routers/smartReviewReminder";
import { learningReportGenerationRouter } from "./routers/learningReportGeneration";
import { printPreviewRouter } from "./routers/printPreview";
import { collaborativeCollectionsRouter } from "./routers/collaborativeCollections";
import { ogImageRouter } from "./routers/ogImage";
import { sitemapAutoUpdateRouter } from "./routers/sitemapAutoUpdate";
import { sitemapHistoryRouter } from "./routers/sitemapHistory";
import { structuredDataValidationRouter } from "./routers/structuredDataValidation";
import { seoRouter } from "./seoRouter";
import { crawlerConfigRouter } from "./routers/crawlerConfig";
import { aiClassificationOptimizationRouter } from "./routers/aiClassificationOptimization";
import { paperAlgorithmOptimizationRouter } from "./routers/paperAlgorithmOptimization";
import { crawlerRouter } from "./routers/crawler";
import { aiExamPaperRouter } from "./routers/aiExamPaper";
import { optimizationRouter } from "./routers/optimization";
import { systemManagementRouter } from "./routers/systemManagement";
import { passwordAuthRouter } from "./routers/passwordAuth";
import { smsAuthRouter } from "./routers/smsAuth";
import { accountBindingRouter } from "./routers/accountBinding";
import { captchaRouter } from "./routers/captcha";
import { wechatAuthRouter } from "./routers/wechatAuth";
import { ipBlacklistRouter } from "./routers/ipBlacklist";
import { exportTemplatesEnhancedRouter } from "./routers/exportTemplatesEnhanced";
import { parentNotificationRouter } from "./routers/parentNotification";
import { ocrEnhancedRouter } from "./routers/ocrEnhanced";
import { notificationServiceConfigRouter } from "./routers/notificationServiceConfig";
import { userNotificationHistoryRouter } from "./routers/userNotificationHistory";
import { reviewReminderSchedulerRouter } from "./routers/reviewReminderScheduler";
import { terminologyManagementRouter } from "./routers/terminologyManagement";
import { taskAlertRouter } from "./routers/taskAlert";
import { exportHistoryRouter } from "./routers/exportHistory";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 错题管理
  errorQuestions: errorQuestionsRouter,
  
  // 文档上传和解析
  documentUpload: documentUploadRouter,
  
  // 批量图片处理
  batchImageProcessing: batchImageProcessingRouter,
  
  // 符号校正
  symbolCorrection: symbolCorrectionRouter,
  
  // 增强导出
  enhancedExport: enhancedExportRouter,
  
  // 图表标注
  annotations: annotationsRouter,
  chartAnnotations: chartAnnotationsRouter,
  
  // 图表数据提取
  chartDataExtraction: chartDataExtractionRouter,
  
  // 对比学习
  comparisonLearning: comparisonLearningRouter,
  
  // 标注模板
  annotationTemplates: annotationTemplatesRouter,
  
  // AI辅助标注
  aiAnnotation: aiAnnotationRouter,
  
  // 协作学习
  collaborativeLearning: collaborativeLearningRouter,
  
  // AI标注反馈
  aiAnnotationFeedback: aiAnnotationFeedbackRouter,
  
  // 缓存统计
  cacheStats: cacheStatsRouter,
  
  // 缓存管理
  cache: cacheRouter,
  
  // 缓存预热
  cacheWarmup: cacheWarmupRouter,
  
  // 批量操作历史
  batchOperationHistory: batchOperationHistoryRouter,
  
  // A/B测试
  abTest: abTestRouter,
  
  // 预热任务智能优化
  warmupIntelligence: warmupIntelligenceRouter,
  
  // 批量操作审计增强
  auditEnhancement: auditEnhancementRouter,
  
  // 定时任务管理
  scheduledTasksManagement: scheduledTasksManagementRouter,
  
  // 通知管理
  notificationManagement: notificationManagementRouter,
  notificationConfig: notificationConfigRouter,
  
  // 用户资料管理
  userProfile: userProfileRouter,
  
  // 学习数据分析
  learningAnalytics: learningAnalyticsRouter,
  
  // 智能复习提醒
  smartReviewReminder: smartReviewReminderRouter,
  
  // 学习报告生成
  learningReportGeneration: learningReportGenerationRouter,
  
  // Sitemap生成
  sitemap: sitemapRouter,
  
  // Sitemap自动更新
  sitemapAutoUpdate: sitemapAutoUpdateRouter,
  
  // Sitemap更新历史
  sitemapHistory: sitemapHistoryRouter,
  
  // 结构化数据验证
  structuredDataValidation: structuredDataValidationRouter,
  
  // SEO管理
  seo: seoRouter,
  crawler: crawlerRouter,
  
  // 爬虫配置管理
  crawlerConfig: crawlerConfigRouter,
  
  // AI分类优化
  aiClassificationOptimization: aiClassificationOptimizationRouter,
  
  // 组卷算法优化
  paperAlgorithmOptimization: paperAlgorithmOptimizationRouter,
  aiExamPaper: aiExamPaperRouter,
  
  // 性能优化管理
  optimization: optimizationRouter,
  
  // 打印预览
  printPreview: printPreviewRouter,
  
  // 协作错题集
  collaborativeCollections: collaborativeCollectionsRouter,
  
  // 积分系统
  points: pointsRouter,
  
  // 错题统计
  errorQuestionStats: errorQuestionStatsRouter,
  
  // AI学习建议
  aiLearningAdvice: aiLearningAdviceRouter,
  reviewTasks: reviewTasksRouter,
  reminderSettings: reminderSettingsRouter,
  
  // 收藏管理
  favorites: favoritesRouter,
  
  // AI题目收藏
  aiFavorites: aiFavoritesRouter,
  
  // 协同过滤推荐
  collaborativeFiltering: collaborativeFilteringRouter,
  
    // 导出模板
  exportTemplates: exportTemplatesRouter,
  
  // 高级导出
  advancedExport: advancedExportRouter,
  
  // 分享功能
  share: shareRouter,
  
  // OG图片生成
  ogImage: ogImageRouter,

  // 学习提醒
  reviewReminders: reviewRemindersRouter,
  
  // 知识点管理
  knowledgePoints: knowledgePointsRouter,
  
  // AI分析
  aiAnalysis: aiAnalysisRouter,
  
  // 视频搜索和推荐
  videos: videosRouter,
  
  // 练习和学习追踪
  practice: practiceRouter,
  
  // 练习记录系统
  practiceRecords: practiceRecordsRouter,
  
  // 复习计划
  review: reviewRouter,
  learningStats: learningStatsRouter,
  
  // 练习题生成和批改
  practiceQuestions: practiceQuestionsRouter,
  
  // 错题导出
  export: exportRouter,
  achievements: achievementsRouter,
  stats: statsRouter,
  
  // 学科学习报告
  subjectReport: subjectReportRouter,
  
  // 知识点详情
  knowledgePointDetail: knowledgePointDetailRouter,
  reviewPlan: reviewPlanRouter,
  errorExport: errorExportRouter,
  
  // 语音讲解
  voiceExplanation: voiceExplanationRouter,
  
  // 学习报告导出
  learningReportExport: learningReportExportRouter,
  
  // 错题标签
  tags: tagsRouter,
  
  // 考试和复习计划
  examAndPlan: examAndPlanRouter,
  
  // 家长监督
  parentSupervision: parentSupervisionRouter,
  
  // 真题和AI试卷
  realExam: realExamRouter,
  questionBank: questionBankRouter,
  learningPath: learningPathRouter,
  semester: semesterRouter,
  
  // 用户设置
  userSettings: userSettingsRouter,
  similarQuestions: similarQuestionsRouter,
  
  // 真题练习
  questions: questionsRouter,
  
  // AI薄弱点分析
  weakness: weaknessRouter,
  
  // 智能扫描
  smartScanner: smartScannerRouter,
  
  // 证件管理
  idCardManagement: idCardManagementRouter,
  
  // 智能框选
  smartCrop: smartCropRouter,
  
  // 框选模板管理
  cropTemplates: cropTemplatesRouter,
  
  // 批量智能框选
  batchSmartCrop: batchSmartCropRouter,
  
  // 框选历史记录
  cropHistory: cropHistoryRouter,
  
  // 智能组卷
  examPaper: smartExamPaperRouter,
  
  // 定时任务管理
  scheduledTasks: scheduledTasksRouter,
  
  // 专项练习池
  practicePools: practicePoolsRouter,
  
  // AI收集题目
  aiQuestionCollection: aiQuestionCollectionRouter,
  
  // 题目审核
  questionReview: questionReviewRouter,
  
  // 题目推荐
  questionRecommendation: questionRecommendationRouter,
  
  // 题目导出
  questionExport: questionExportRouter,
  
  // 第一阶段：数据采集路由
  dataCrawler: dataCrawlerRouter,
  
  // 第二阶段：查重去噪
  deduplication: deduplicationRouter,
  
  // 第二阶段：合规审核
  compliance: complianceRouter,
  
  // 第二阶段：质量评分
  quality: qualityRouter,
  
  // 推荐系统
  recommendation: recommendationRouter,
  
  // 批量上传和AI缓存
  batchUpload: batchUploadRouter,
  
  // 上传历史记录
  uploadHistory: uploadHistoryRouter,
  
  // 角色增强(家长和教师)
  roleEnhancement: roleEnhancementRouter,
  
  // 系统管理
  systemManagement: systemManagementRouter,
  
  // 密码认证
  passwordAuth: passwordAuthRouter,
  
  // 短信验证码认证
  smsAuth: smsAuthRouter,
  
  // 图形验证码
  captcha: captchaRouter,
  
  // 微信扫码登录
  wechatAuth: wechatAuthRouter,
  
  // 账号绑定管理
  accountBinding: accountBindingRouter,
  
  // IP黑名单管理
  ipBlacklist: ipBlacklistRouter,
  
  // 增强版导出模板
  exportTemplatesEnhanced: exportTemplatesEnhancedRouter,
  
  // 家长通知系统
  parentNotification: parentNotificationRouter,
  
  // OCR增强
  ocrEnhanced: ocrEnhancedRouter,
  
  // 通知服务配置
  notificationService: notificationServiceConfigRouter,
  
  // 用户通知历史
  userNotificationHistory: userNotificationHistoryRouter,
  
  // 复习提醒调度器
  reviewReminderScheduler: reviewReminderSchedulerRouter,
  
  // 教育术语管理
  terminologyManagement: terminologyManagementRouter,
  
  // 定时任务告警
  taskAlert: taskAlertRouter,
  
  // 导出历史记录
  exportHistory: exportHistoryRouter,
});

export type AppRouter = typeof appRouter;
