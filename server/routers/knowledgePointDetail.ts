import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getKnowledgePointFullDetail } from "../knowledgePointDetailService";

export const knowledgePointDetailRouter = router({
  /**
   * 获取知识点的完整详情数据
   */
  getDetail: protectedProcedure
    .input(
      z.object({
        knowledgePointId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const detail = await getKnowledgePointFullDetail(ctx.user.id, input.knowledgePointId);
      return detail;
    }),
});
