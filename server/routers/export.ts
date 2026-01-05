/**
 * 错题导出路由
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generatePDFDocument, generateWordDocument } from "../exportService";
import { getDb } from "../db";
import { errorQuestions } from "../../drizzle/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

/**
 * 导出筛选条件schema
 */
const exportFilterSchema = z.object({
  format: z.enum(["pdf", "word"]),
  subject: z.string().optional(),
  grade: z.string().optional(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  isMastered: z.boolean().optional(),
});

export const exportRouter = router({
  /**
   * 导出错题本
   */
  exportErrorQuestions: protectedProcedure
    .input(exportFilterSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // 构建查询条件
      const conditions = [eq(errorQuestions.userId, ctx.user.id)];

      if (input.subject) {
        conditions.push(eq(errorQuestions.subject, input.subject as any));
      }

      if (input.grade) {
        conditions.push(eq(errorQuestions.grade, input.grade as any));
      }

      if (input.startDate) {
        const startDate = new Date(input.startDate);
        conditions.push(gte(errorQuestions.createdAt, startDate));
      }

      if (input.endDate) {
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999); // 包含当天结束时间
        conditions.push(lte(errorQuestions.createdAt, endDate));
      }

      if (input.isMastered !== undefined) {
        conditions.push(eq(errorQuestions.isMastered, input.isMastered));
      }

      // 查询错题
      const questions = await db
        .select()
        .from(errorQuestions)
        .where(and(...conditions))
        .orderBy(errorQuestions.createdAt);

      if (questions.length === 0) {
        throw new Error("没有符合条件的错题");
      }

      // 生成文档
      let buffer: Buffer;
      let filename: string;
      let mimeType: string;

      if (input.format === "pdf") {
        buffer = await generatePDFDocument(questions, ctx.user.name || "学生");
        filename = `错题本_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.pdf`;
        mimeType = "application/pdf";
      } else {
        buffer = await generateWordDocument(questions, ctx.user.name || "学生");
        filename = `错题本_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.docx`;
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      }

      // 返回Base64编码的文档数据
      return {
        success: true,
        data: buffer.toString("base64"),
        filename,
        mimeType,
        questionCount: questions.length,
      };
    }),

  /**
   * 获取导出统计信息
   */
  getExportStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // 统计各学科错题数量
    const subjectStats = await db
      .select({
        subject: errorQuestions.subject,
        count: sql<number>`count(*)`,
      })
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, ctx.user.id))
      .groupBy(errorQuestions.subject);

    // 统计各年级错题数量
    const gradeStats = await db
      .select({
        grade: errorQuestions.grade,
        count: sql<number>`count(*)`,
      })
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, ctx.user.id))
      .groupBy(errorQuestions.grade);

    // 统计掌握状态
    const masteredStats = await db
      .select({
        isMastered: errorQuestions.isMastered,
        count: sql<number>`count(*)`,
      })
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, ctx.user.id))
      .groupBy(errorQuestions.isMastered);

    // 总数
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, ctx.user.id));

    return {
      total: totalResult[0]?.count || 0,
      bySubject: subjectStats.map((s) => ({
        subject: s.subject,
        count: Number(s.count),
      })),
      byGrade: gradeStats.map((g) => ({
        grade: g.grade,
        count: Number(g.count),
      })),
      byMastered: {
        mastered: Number(masteredStats.find((m) => m.isMastered)?.count || 0),
        notMastered: Number(masteredStats.find((m) => !m.isMastered)?.count || 0),
      },
    };
  }),
});
