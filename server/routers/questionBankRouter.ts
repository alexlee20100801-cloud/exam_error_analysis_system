import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  batchCreateQuestions,
  parseQuestionData,
} from "../questionBankService";

// 管理员权限验证中间件
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有管理员可以访问题库管理功能",
    });
  }
  return next({ ctx });
});

export const questionBankRouter = router({
  /**
   * 获取题目列表（支持筛选和分页）
   */
  list: adminProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        grade: z.string().optional(),
        difficulty: z.string().optional(),
        questionType: z.string().optional(),
        searchKeyword: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, ...filter } = input;
      return await getQuestions(filter, page, pageSize);
    }),

  /**
   * 获取单个题目详情
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const question = await getQuestionById(input.id);
      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "题目不存在",
        });
      }
      return question;
    }),

  /**
   * 创建题目
   */
  create: adminProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
        grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
        difficulty: z.enum(["easy", "medium", "hard"]),
        questionType: z.enum(["choice", "blank", "short_answer", "calculation", "essay"]),
        answer: z.string(),
        explanation: z.string().optional(),
        knowledgePointIds: z.array(z.number()).optional(),
        source: z.enum(["builtin", "thirdparty", "ai_generated"]).optional(),
        sourceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createQuestion(input);
    }),

  /**
   * 更新题目
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]).optional(),
        grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        questionType: z.enum(["choice", "blank", "short_answer", "calculation", "essay"]).optional(),
        answer: z.string().optional(),
        explanation: z.string().optional(),
        knowledgePointIds: z.array(z.number()).optional(),
        source: z.enum(["builtin", "thirdparty", "ai_generated"]).optional(),
        sourceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await updateQuestion(input);
    }),

  /**
   * 删除题目
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteQuestion(input.id);
    }),

  /**
   * 批量导入题目（解析CSV数据）
   */
  batchImport: adminProcedure
    .input(
      z.object({
        data: z.array(z.array(z.string())), // CSV数据（二维数组）
      })
    )
    .mutation(async ({ input }) => {
      try {
        const questions = parseQuestionData(input.data);
        
        if (questions.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "没有有效的题目数据",
          });
        }

        const result = await batchCreateQuestions(questions);
        return {
          success: true,
          count: result.count,
          message: `成功导入 ${result.count} 道题目`,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `批量导入失败：${error.message}`,
        });
      }
    }),
});
