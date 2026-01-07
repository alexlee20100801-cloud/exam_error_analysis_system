import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createTeacherClass,
  getTeacherClasses,
  addStudentToClass,
  getClassStudents,
  generateClassReport,
  getClassReports,
  getParentStudents,
  getStudentOverviewForParent,
  logParentView,
} from "../roleEnhancementService";

export const roleEnhancementRouter = router({
  // ========== 教师功能 ==========
  
  /**
   * 创建班级
   */
  createClass: protectedProcedure
    .input(z.object({
      className: z.string(),
      grade: z.enum(['junior1','junior2','junior3','senior1','senior2','senior3']),
      subject: z.enum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).optional(),
      schoolYear: z.string().optional(),
      semester: z.enum(['first','second']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userType !== 'teacher') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only teachers can create classes' });
      }
      
      const classRecord = await createTeacherClass({
        teacherId: ctx.user.id,
        ...input,
      });
      return classRecord;
    }),

  /**
   * 获取教师的所有班级
   */
  getMyClasses: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.userType !== 'teacher') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only teachers can access this' });
      }
      
      const classes = await getTeacherClasses(ctx.user.id);
      return classes;
    }),

  /**
   * 添加学生到班级
   */
  addStudentToClass: protectedProcedure
    .input(z.object({
      studentId: z.number(),
      classId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userType !== 'teacher') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only teachers can add students' });
      }
      
      const record = await addStudentToClass(input.studentId, input.classId);
      return record;
    }),

  /**
   * 获取班级学生列表
   */
  getClassStudents: protectedProcedure
    .input(z.object({
      classId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userType !== 'teacher') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only teachers can access this' });
      }
      
      const students = await getClassStudents(input.classId);
      return students;
    }),

  /**
   * 生成班级学习报告
   */
  generateReport: protectedProcedure
    .input(z.object({
      classId: z.number(),
      reportType: z.enum(['weekly','monthly','semester']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userType !== 'teacher') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only teachers can generate reports' });
      }
      
      const report = await generateClassReport(input.classId, input.reportType);
      return report;
    }),

  /**
   * 获取班级历史报告
   */
  getClassReports: protectedProcedure
    .input(z.object({
      classId: z.number(),
      limit: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userType !== 'teacher') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only teachers can access this' });
      }
      
      const reports = await getClassReports(input.classId, input.limit);
      return reports;
    }),

  // ========== 家长功能 ==========

  /**
   * 获取家长关联的学生列表
   */
  getMyChildren: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.userType !== 'parent') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only parents can access this' });
      }
      
      const students = await getParentStudents(ctx.user.id);
      return students;
    }),

  /**
   * 获取学生学习概览(家长查看)
   */
  getChildOverview: protectedProcedure
    .input(z.object({
      studentId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userType !== 'parent') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only parents can access this' });
      }
      
      // 记录查看日志
      await logParentView(ctx.user.id, input.studentId, 'dashboard');
      
      const overview = await getStudentOverviewForParent(input.studentId);
      return overview;
    }),

  /**
   * 记录家长查看行为
   */
  logView: protectedProcedure
    .input(z.object({
      studentId: z.number(),
      viewType: z.enum(['dashboard','error_question','report','progress']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userType !== 'parent') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only parents can access this' });
      }
      
      await logParentView(ctx.user.id, input.studentId, input.viewType);
      return { success: true };
    }),
});
