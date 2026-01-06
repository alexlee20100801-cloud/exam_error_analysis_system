/**
 * 真题练习API路由
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// 管理员权限检查
const adminProcedure = protectedProcedure.use(({ ctx, next }: any) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理员权限' });
  }
  return next({ ctx });
});
import { getDb } from "../db";
import { questions, practiceRecords } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  generateQuestionsForGradeAndSubject,
  saveQuestionsToDatabase,
} from "../questionGenerationService";

export const questionsRouter = router({
  // 获取题目列表（支持筛选）
  list: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        grade: z.string().optional(),
        semester: z.string().optional(),
        difficulty: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      const conditions = [eq(questions.isPublished, true)];

      if (input.subject) {
        conditions.push(eq(questions.subject, input.subject as any));
      }
      if (input.grade) {
        conditions.push(eq(questions.grade, input.grade as any));
      }
      if (input.semester) {
        conditions.push(eq(questions.semester, input.semester as any));
      }
      if (input.difficulty) {
        conditions.push(eq(questions.difficulty, input.difficulty as any));
      }

      const questionsList = await db
        .select()
        .from(questions)
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        questions: questionsList,
        total: questionsList.length,
      };
    }),

  // 获取单个题目详情
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      const question = await db
        .select()
        .from(questions)
        .where(eq(questions.id, input.id))
        .limit(1);

      if (question.length === 0) {
        throw new Error("题目不存在");
      }

      return question[0];
    }),

  // 提交答案并评分
  submitAnswer: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        userAnswer: z.string(),
        timeSpent: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      // 获取题目
      const question = await db
        .select()
        .from(questions)
        .where(eq(questions.id, input.questionId))
        .limit(1);

      if (question.length === 0) {
        throw new Error("题目不存在");
      }

      const q = question[0];

      // 简单的答案比对（去除空格和大小写）
      const userAnswerNormalized = input.userAnswer.trim().toLowerCase();
      const correctAnswerNormalized = q.correctAnswer.trim().toLowerCase();
      const isCorrect = userAnswerNormalized === correctAnswerNormalized;

      // 保存练习记录
      await db.insert(practiceRecords).values({
        userId: ctx.user.id,
        questionId: input.questionId,
        questionType: "practice_question" as any,
        userAnswer: input.userAnswer,
        isCorrect,
        timeSpent: input.timeSpent,
        subject: q.subject,
        grade: q.grade,
      });

      return {
        isCorrect,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    }),

  // 获取练习统计
  getStatistics: protectedProcedure.query(async ({ ctx }: any) => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const records = await db
      .select()
      .from(practiceRecords)
      .where(eq(practiceRecords.userId, ctx.user.id));

    const total = records.length;
    const correct = records.filter((r) => r.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return {
      total,
      correct,
      wrong: total - correct,
      accuracy,
    };
  }),

  // 管理员：生成题目
  generate: adminProcedure
    .input(
      z.object({
        grade: z.string(),
        subject: z.string(),
        semester: z.string(),
        count: z.number().default(5),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const generatedQuestions = await generateQuestionsForGradeAndSubject(
          input.grade,
          input.subject,
          input.semester,
          input.count
        );

        await saveQuestionsToDatabase(generatedQuestions);

        return {
          success: true,
          count: generatedQuestions.length,
        };
      } catch (error: any) {
        throw new Error(`生成题目失败: ${error.message}`);
      }
    }),
});
