import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { errorQuestionsRouter } from "./routers/errorQuestions";
import { knowledgePointsRouter } from "./routers/knowledgePoints";
import { aiAnalysisRouter } from "./routers/aiAnalysis";
import { videosRouter } from "./routers/videos";
import { practiceRouter } from "./routers/practice";
import { reviewRouter } from "./routers/review";

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
});

export type AppRouter = typeof appRouter;
