import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { 
  rawQuestions,
  complianceChecks,
  complianceViolations,
  manualReviews
} from "../../drizzle/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export const complianceRouter = router({
  // 获取待审核试题列表
  getPendingReviews: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ input }) => {
      // 查询待审核的试题
      const pendingQuestions = await db
        .select()
        .from(rawQuestions)
        .where(eq(rawQuestions.complianceStatus, 'pending'))
        .orderBy(desc(rawQuestions.createdAt))
        .limit(input.limit);
      
      // 获取每个试题的合规检查记录
      const questionIds = pendingQuestions.map(q => q.id);
      let complianceRecords: any[] = [];
      
      if (questionIds.length > 0) {
        complianceRecords = await db
          .select()
          .from(complianceChecks)
          .where(inArray(complianceChecks.questionId, questionIds))
          .orderBy(desc(complianceChecks.createdAt));
      }
      
      // 组合数据
      const recordsMap = new Map<number, any[]>();
      complianceRecords.forEach(record => {
        if (!recordsMap.has(record.questionId)) {
          recordsMap.set(record.questionId, []);
        }
        recordsMap.get(record.questionId)!.push(record);
      });
      
      const result = pendingQuestions.map(question => {
        const records = recordsMap.get(question.id) || [];
        const issues = records
          .filter(r => r.overallStatus === 'fail' || r.overallStatus === 'warning')
          .map(r => r.overallStatus === 'fail' ? '严重问题' : '警告');
        
        // 确定风险等级
        let severity = 'low';
        if (records.some(r => r.overallStatus === 'fail')) {
          severity = 'high';
        } else if (records.some(r => r.overallStatus === 'warning')) {
          severity = 'medium';
        }
        
        return {
          id: question.id,
          subject: question.subject,
          // @ts-ignore
          content: question.content,
          // @ts-ignore
          options: question.options,
          // @ts-ignore
          answer: question.answer,
          // @ts-ignore
          explanation: question.explanation,
          complianceStatus: question.complianceStatus,
          // @ts-ignore
          complianceDetails: question.complianceDetails,
          // @ts-ignore
          issues: [...new Set(issues)],
          severity,
          createdAt: question.createdAt
        };
      });
      
      return result;
    }),

  // 审核试题
  reviewQuestion: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      status: z.enum(['approved', 'rejected']),
      reviewNote: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { questionId, status, reviewNote } = input;
      
      // 更新试题状态
      await db.update(rawQuestions)
        .set({
          // @ts-ignore
          complianceStatus: status,
          complianceDetails: reviewNote || null
        })
        .where(eq(rawQuestions.id, questionId));
      
      // 记录审核操作
      await db.insert(manualReviews).values({
        questionId,
        reviewerId: ctx.user?.id || 1,
        reviewStatus: status === 'approved' ? 'approved' : 'rejected',
        reviewNotes: reviewNote || `人工审核: ${status === 'approved' ? '通过' : '拒绝'}`
      });
      
      return {
        success: true,
        message: `审核完成: ${status === 'approved' ? '已通过' : '已拒绝'}`
      };
    }),

  // 批量审核
  batchReview: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
      status: z.enum(['approved', 'rejected']),
      reviewNote: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { questionIds, status, reviewNote } = input;
      
      // 批量更新试题状态
      await db.update(rawQuestions)
        .set({
          // @ts-ignore
          complianceStatus: status,
          complianceDetails: reviewNote || null
        })
        .where(inArray(rawQuestions.id, questionIds));
      
      // 批量记录审核操作
      const records = questionIds.map(questionId => ({
        questionId,
        reviewerId: ctx.user?.id || 1,
        reviewStatus: status === 'approved' ? ('approved' as const) : ('rejected' as const),
        reviewNotes: reviewNote || `批量审核: ${status === 'approved' ? '通过' : '拒绝'}`
      }));
      
      await db.insert(manualReviews).values(records);
      
      return {
        success: true,
        total: questionIds.length,
        message: `批量审核完成: ${questionIds.length} 个试题`
      };
    }),

  // 获取合规统计
  getComplianceStats: protectedProcedure
    .query(async () => {
      const [totalQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions);
      
      const [pendingQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions)
        .where(eq(rawQuestions.complianceStatus, 'pending'));
      
      const [approvedQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions)
        .where(eq(rawQuestions.complianceStatus, 'approved' as any));
      
      const [rejectedQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions)
        .where(eq(rawQuestions.complianceStatus, 'rejected' as any));
      
      // 统计问题类型分布
      const issueTypeStats = await db
        .select({
          overallStatus: complianceChecks.overallStatus,
          count: sql<number>`count(*)`
        })
        .from(complianceChecks)
        .where(sql`${complianceChecks.overallStatus} != 'pass'`)
        .groupBy(complianceChecks.overallStatus);
      
      return {
        total: totalQuestions.count || 0,
        pending: pendingQuestions.count || 0,
        approved: approvedQuestions.count || 0,
        rejected: rejectedQuestions.count || 0,
        issueTypes: issueTypeStats.reduce((acc, item) => {
          acc[item.overallStatus || 'unknown'] = item.count;
          return acc;
        }, {} as Record<string, number>)
      };
    }),

  // 获取合规检查记录
  getComplianceRecords: protectedProcedure
    .input(z.object({
      questionId: z.number().optional(),
      overallStatus: z.enum(['pass', 'warning', 'fail']).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      let query = db.select().from(complianceChecks);
      
      const conditions = [];
      if (input.questionId) {
        conditions.push(eq(complianceChecks.questionId, input.questionId));
      }
      if (input.overallStatus) {
        conditions.push(eq(complianceChecks.overallStatus, input.overallStatus));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const records = await query
        .orderBy(desc(complianceChecks.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return {
        records,
        total: records.length
      };
    })
});
