import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { 
  analyzeUserWeakness, 
  getKnowledgeRadarData, 
  getKnowledgeHeatmapData 
} from "../weaknessAnalysisService";

export const weaknessRouter = router({
  /**
   * 分析用户薄弱点
   */
  analyze: protectedProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .query(async ({ input }) => {
      return await analyzeUserWeakness(input.userId);
    }),

  /**
   * 获取知识点掌握度雷达图数据
   */
  getRadarData: protectedProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getKnowledgeRadarData(input.userId);
    }),

  /**
   * 获取知识点掌握度热力图数据
   */
  getHeatmapData: protectedProcedure
    .input(z.object({
      userId: z.number(),
      subject: z.string(),
    }))
    .query(async ({ input }) => {
      return await getKnowledgeHeatmapData(input.userId, input.subject);
    }),
});
