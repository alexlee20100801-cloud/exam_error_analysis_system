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
  
  // 错题统计
  errorQuestionStats: errorQuestionStatsRouter,
  
  // AI学习建议
  aiLearningAdvice: aiLearningAdviceRouter,
  
  // 收藏管理
  favorites: favoritesRouter,

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
  
  // 定时任务管理
  scheduledTasks: scheduledTasksRouter,
  
  // 专项练习池
  practicePools: practicePoolsRouter,
});

export type AppRouter = typeof appRouter;
