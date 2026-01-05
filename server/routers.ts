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
});

export type AppRouter = typeof appRouter;
