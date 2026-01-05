/**
 * 统计路由 - 提供错题统计API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getFullStatistics, getErrorQuestionCountByLevel, getErrorQuestionCountBySubject } from "../statsService";

export const statsRouter = router({
  /**
   * 获取完整的统计信息（板块+学科）
   */
  getFullStats: protectedProcedure.query(async ({ ctx }) => {
    return await getFullStatistics(ctx.user.id);
  }),

  /**
   * 按板块统计
   */
  getByLevel: protectedProcedure.query(async ({ ctx }) => {
    return await getErrorQuestionCountByLevel(ctx.user.id);
  }),

  /**
   * 按学科统计
   */
  getBySubject: protectedProcedure
    .input(
      z.object({
        schoolLevel: z.enum(["junior", "senior"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getErrorQuestionCountBySubject(ctx.user.id, input.schoolLevel);
    }),
});
