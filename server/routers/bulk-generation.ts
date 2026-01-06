import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  bulkGenerateQuestions,
  getQuestionBankStats,
  smartSupplementQuestionBank,
  type BulkGenerationConfig,
} from "../services/bulkQuestionGenerationService";
import { TRPCError } from "@trpc/server";

/**
 * AI题库批量生成路由
 * 仅管理员可访问
 */

// 管理员权限中间件
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有管理员可以访问此功能",
    });
  }
  return next({ ctx });
});

export const bulkGenerationRouter = router({
  /**
   * 批量生成题目
   */
  bulkGenerate: adminProcedure
    .input(
      z.object({
        schoolLevel: z.enum(["junior", "senior"]),
        grade: z.string(),
        subject: z.string(),
        semester: z.string().optional(),
        knowledgePointIds: z.array(z.number()).optional(),
        questionsPerKnowledgePoint: z.number().min(1).max(50),
        difficultyDistribution: z
          .object({
            easy: z.number().min(0).max(1),
            medium: z.number().min(0).max(1),
            hard: z.number().min(0).max(1),
          })
          .optional(),
        questionTypes: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const config: BulkGenerationConfig = {
        schoolLevel: input.schoolLevel,
        grade: input.grade,
        subject: input.subject,
        semester: input.semester,
        knowledgePointIds: input.knowledgePointIds,
        questionsPerKnowledgePoint: input.questionsPerKnowledgePoint,
        difficultyDistribution: input.difficultyDistribution,
        questionTypes: input.questionTypes,
      };

      const result = await bulkGenerateQuestions(config);

      return result;
    }),

  /**
   * 智能补充题库（根据缺口自动生成）
   */
  smartSupplement: adminProcedure
    .input(
      z.object({
        targetPerKnowledgePoint: z.number().min(1).max(100).default(10),
      })
    )
    .mutation(async ({ input }) => {
      const result = await smartSupplementQuestionBank(
        input.targetPerKnowledgePoint
      );

      return result;
    }),

  /**
   * 获取题库统计信息
   */
  getStats: adminProcedure.query(async () => {
    const stats = await getQuestionBankStats();
    return stats;
  }),

  /**
   * 获取生成历史（TODO: 需要创建生成历史表）
   */
  getGenerationHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      // TODO: 实现生成历史查询
      return {
        total: 0,
        records: [],
      };
    }),
});
