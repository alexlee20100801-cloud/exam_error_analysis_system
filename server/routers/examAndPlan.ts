import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as examService from "../examService";
import * as studyPlanService from "../studyPlanService";

export const examAndPlanRouter = router({
  // 创建考试
  createExam: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        examDate: z.string(), // ISO date string
        subject: z.string(),
        section: z.enum(["junior", "senior"]),
        grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
        scope: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const examId = await examService.createExam({
        userId: ctx.user.id,
        name: input.name,
        examDate: new Date(input.examDate),
        subject: input.subject as any,
        section: input.section,
        grade: input.grade,
        scope: input.scope,
        description: input.description,
      });

      return { examId };
    }),

  // 更新考试
  updateExam: protectedProcedure
    .input(
      z.object({
        examId: z.number(),
        name: z.string().optional(),
        examDate: z.string().optional(),
        subject: z.string().optional(),
        section: z.enum(["junior", "senior"]).optional(),
        grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).optional(),
        scope: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.examDate) updateData.examDate = new Date(input.examDate);
      if (input.subject) updateData.subject = input.subject;
      if (input.section) updateData.section = input.section;
      if (input.grade) updateData.grade = input.grade;
      if (input.scope !== undefined) updateData.scope = input.scope;
      if (input.description !== undefined) updateData.description = input.description;

      await examService.updateExam(ctx.user.id, input.examId, updateData);

      return { success: true };
    }),

  // 删除考试
  deleteExam: protectedProcedure.input(z.object({ examId: z.number() })).mutation(async ({ ctx, input }) => {
    await examService.deleteExam(ctx.user.id, input.examId);
    return { success: true };
  }),

  // 获取所有考试
  getAllExams: protectedProcedure.query(async ({ ctx }) => {
    const exams = await examService.getUserExams(ctx.user.id);
    return exams;
  }),

  // 获取即将到来的考试
  getUpcomingExams: protectedProcedure.query(async ({ ctx }) => {
    const exams = await examService.getUpcomingExams(ctx.user.id);
    return exams;
  }),

  // 获取考试详情
  getExamById: protectedProcedure.input(z.object({ examId: z.number() })).query(async ({ ctx, input }) => {
    const exam = await examService.getExamById(ctx.user.id, input.examId);
    return exam;
  }),

  // 生成复习计划
  generatePlan: protectedProcedure.input(z.object({ examId: z.number() })).mutation(async ({ ctx, input }) => {
    const planCount = await studyPlanService.generateStudyPlan(ctx.user.id, input.examId);
    return { planCount };
  }),

  // 获取指定日期的复习计划
  getPlansByDate: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ ctx, input }) => {
    const date = new Date(input.date);
    const plans = await studyPlanService.getStudyPlansByDate(ctx.user.id, date);
    return plans;
  }),

  // 获取日期范围内的复习计划
  getPlansByDateRange: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      const plans = await studyPlanService.getStudyPlansByDateRange(ctx.user.id, startDate, endDate);
      return plans;
    }),

  // 标记计划为已完成
  markPlanCompleted: protectedProcedure.input(z.object({ planId: z.number() })).mutation(async ({ ctx, input }) => {
    await studyPlanService.markPlanAsCompleted(ctx.user.id, input.planId);
    return { success: true };
  }),

  // 获取复习计划统计
  getPlanStats: protectedProcedure.input(z.object({ examId: z.number() })).query(async ({ ctx, input }) => {
    const stats = await studyPlanService.getStudyPlanStats(ctx.user.id, input.examId);
    return stats;
  }),
});
