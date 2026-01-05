import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSubjectFullStats } from "../subjectStatsService";
import { ALL_SUBJECTS } from "../../shared/subjects";

export const subjectReportRouter = router({
  /**
   * 获取学科的完整学习报告数据
   */
  getReport: protectedProcedure
    .input(
      z.object({
        subject: z.enum(ALL_SUBJECTS as [string, ...string[]]),
      })
    )
    .query(async ({ ctx, input }) => {
      const stats = await getSubjectFullStats(ctx.user.id, input.subject as any);
      return stats;
    }),
});
