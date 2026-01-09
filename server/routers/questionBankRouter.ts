import { z } from "zod";
import { router, protectedProcedure, publicProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as questionBankService from "../services/questionBankService";

export const questionBankRouter = router({
  // ==================== 公开查询接口 ====================

  /**
   * 获取题库分类列表
   */
  getCategories: publicProcedure.query(async () => {
    try {
      const categories = await questionBankService.getQuestionCategories();
      return categories;
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "获取分类列表失败"
      });
    }
  }),

  /**
   * 获取分类统计
   */
  getCategoryStats: publicProcedure
    .input(
      z.object({
        grade: z.string().optional(),
        subject: z.string().optional()
      })
    )
    .query(async ({ input }) => {
      try {
        const stats = await questionBankService.getCategoryStats(
          input.grade,
          input.subject
        );
        return stats;
      } catch (error) {
        console.error("Error fetching category stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取分类统计失败"
        });
      }
    }),

  /**
   * 搜索题目
   */
  searchQuestions: publicProcedure
    .input(
      z.object({
        grade: z.string().optional(),
        subject: z.string().optional(),
        difficulty: z.string().optional(),
        questionType: z.string().optional(),
        knowledgePoint: z.string().optional(),
        keyword: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0)
      })
    )
    .query(async ({ input }) => {
      try {
        const results = await questionBankService.searchQuestions(input);
        return results;
      } catch (error) {
        console.error("Error searching questions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "搜索题目失败"
        });
      }
    }),

  /**
   * 获取题目详情
   */
  getQuestionDetail: publicProcedure
    .input(z.object({ questionId: z.number() }))
    .query(async ({ input }) => {
      try {
        const question = await questionBankService.getQuestionDetail(input.questionId);
        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "题目不存在"
          });
        }
        return question;
      } catch (error) {
        console.error("Error fetching question detail:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取题目详情失败"
        });
      }
    }),

  /**
   * 获取相似题
   */
  getSimilarQuestions: publicProcedure
    .input(
      z.object({
        questionId: z.number(),
        limit: z.number().default(5)
      })
    )
    .query(async ({ input }) => {
      try {
        const similar = await questionBankService.getSimilarQuestions(
          input.questionId,
          input.limit
        );
        return similar;
      } catch (error) {
        console.error("Error fetching similar questions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取相似题失败"
        });
      }
    }),

  /**
   * 获取题库总体统计
   */
  getQuestionBankStats: publicProcedure.query(async () => {
    try {
      const stats = await questionBankService.getQuestionBankStats();
      return stats;
    } catch (error) {
      console.error("Error fetching question bank stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "获取题库统计失败"
      });
    }
  }),

  /**
   * 获取来源统计
   */
  getSourceStats: publicProcedure.query(async () => {
    try {
      const stats = await questionBankService.getSourceStats();
      return stats;
    } catch (error) {
      console.error("Error fetching source stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "获取来源统计失败"
      });
    }
  }),

  /**
   * 获取知识点统计
   */
  getKnowledgePointStats: publicProcedure
    .input(z.object({ subject: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const stats = await questionBankService.getKnowledgePointStats(input.subject);
        return stats;
      } catch (error) {
        console.error("Error fetching knowledge point stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取知识点统计失败"
        });
      }
    }),

  // ==================== 受保护的用户接口 ====================

  /**
   * 记录题目使用
   */
  recordQuestionUsage: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        usageType: z.enum(["view", "practice", "collection", "paper", "analysis"])
      })
    )
    .mutation(async ({ input }) => {
      try {
        await questionBankService.recordQuestionUsage(
          input.questionId,
          input.usageType
        );
        return { success: true };
      } catch (error) {
        console.error("Error recording question usage:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "记录题目使用失败"
        });
      }
    }),

  // ==================== 管理员接口 ====================

  /**
   * 获取爬虫任务列表
   */
  getCrawlerTasks: adminProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0)
      })
    )
    .query(async ({ input }) => {
      try {
        const tasks = await questionBankService.getCrawlerTasks(
          input.limit,
          input.offset
        );
        return tasks;
      } catch (error) {
        console.error("Error fetching crawler tasks:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取爬虫任务失败"
        });
      }
    }),

  /**
   * 获取爬虫任务详情
   */
  getCrawlerTaskDetail: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      try {
        const task = await questionBankService.getCrawlerTaskDetail(input.taskId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "爬虫任务不存在"
          });
        }
        return task;
      } catch (error) {
        console.error("Error fetching crawler task detail:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "获取爬虫任务详情失败"
        });
      }
    }),

  /**
   * 创建爬虫任务
   */
  createCrawlerTask: adminProcedure
    .input(
      z.object({
        taskName: z.string(),
        taskType: z.string(),
        sourceUrl: z.string().optional(),
        sourceType: z.string().optional(),
        targetSubject: z.string().optional(),
        targetGrade: z.string().optional(),
        scheduleType: z.string().optional(),
        scheduleTime: z.string().optional(),
        config: z.record(z.string(), z.any()).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await questionBankService.createCrawlerTask({
          ...input,
          createdBy: ctx.user.id
        });
        return result;
      } catch (error) {
        console.error("Error creating crawler task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "创建爬虫任务失败"
        });
      }
    })
});
