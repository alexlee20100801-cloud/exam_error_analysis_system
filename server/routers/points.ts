import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  getUserPointsStats,
  initializeFeedbackAchievements,
  POINTS_CONFIG,
} from '../services/pointsService';

/**
 * 积分系统路由
 */
export const pointsRouter = router({
  /**
   * 获取用户积分和反馈统计
   */
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    return getUserPointsStats(ctx.user.id);
  }),

  /**
   * 获取积分配置
   */
  getPointsConfig: protectedProcedure.query(async () => {
    return POINTS_CONFIG;
  }),

  /**
   * 初始化反馈相关成就（管理员）
   */
  initializeFeedbackAchievements: protectedProcedure.mutation(async () => {
    await initializeFeedbackAchievements();
    return { success: true };
  }),
});
