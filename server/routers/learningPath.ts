import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as learningPathService from "../learningPathService";
import * as learningAdviceService from "../learningAdviceService";

export const learningPathRouter = router({
  /**
   * 生成学习路径
   */
  generate: protectedProcedure
    .input(
      z.object({
        subject: z.string(),
        grade: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pathId = await learningPathService.generateLearningPath(
        // @ts-ignore
        ctx.user.id,
        input.subject,
        input.grade
      );
      return { pathId };
    }),

  /**
   * 获取用户的所有学习路径
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    return await learningPathService.getUserLearningPaths(ctx.user.id);
  }),

  /**
   * 获取学习路径详情
   */
  getDetail: protectedProcedure
    .input(z.object({ pathId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await learningPathService.getLearningPathDetail(
        input.pathId,
        // @ts-ignore
        ctx.user.id
      );
    }),

  /**
   * 获取路径统计数据
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        pathId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await learningPathService.getPathStatistics(input.pathId, ctx.user.id);
    }),

  /**
   * 获取节点题目
   */
  getNodeQuestions: protectedProcedure
    .input(
      z.object({
        pathId: z.number(),
        nodeId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await learningPathService.getNodeQuestions(
        input.nodeId,
        input.pathId,
        ctx.user.id
      );
    }),

  /**
   * 生成学习建议
   */
  generateAdvice: protectedProcedure
    .input(
      z.object({
        pathId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await learningAdviceService.generateLearningAdvice(input.pathId, ctx.user.id);
    }),

  /**
   * 完成节点
   */
  completeNode: protectedProcedure
    .input(
      z.object({
        pathId: z.number(),
        nodeId: z.string(),
        score: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await learningPathService.completePathNode(
        input.pathId,
        input.nodeId,
        // @ts-ignore
        ctx.user.id,
        input.score
      );
      return { success: true };
    }),
});
