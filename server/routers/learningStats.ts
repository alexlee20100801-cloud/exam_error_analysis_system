import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getKnowledgePointMasteryData,
  getErrorDistributionData,
  getLearningTimeTrendData,
  getLearningOverview,
} from "../learningStatsService";

/**
 * 学习统计路由
 * 提供学习报告所需的各类统计数据
 */
export const learningStatsRouter = router({
  /**
   * 获取知识点掌握度数据（雷达图）
   */
  getKnowledgePointMastery: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
        limit: z.number().min(5).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const data = await getKnowledgePointMasteryData(
        // @ts-ignore
        ctx.user.id,
        input.subject,
        input.limit
      );
      return data;
    }),

  /**
   * 获取错题分布数据（饼图）
   */
  getErrorDistribution: protectedProcedure.query(async ({ ctx }) => {
    const data = await getErrorDistributionData(ctx.user.id);
    return data;
  }),

  /**
   * 获取学习时长趋势数据（折线图）
   */
  getLearningTimeTrend: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      // @ts-ignore
      const data = await getLearningTimeTrendData(ctx.user.id, input.days);
      return data;
    }),

  /**
   * 获取学习总览统计
   */
  getOverview: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const data = await getLearningOverview(ctx.user.id, input?.subject);
      return data;
    }),

  /**
   * 获取掌握度趋势数据
   */
  getMasteryTrend: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(90).default(30),
        subject: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { errorQuestions } = await import("../../drizzle/schema");
      const { eq, and, gte, sql } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const conditions = [eq(errorQuestions.userId, ctx.user.id), gte(errorQuestions.createdAt, startDate.toISOString())];
      if (input.subject) {
        conditions.push(sql`${errorQuestions.subject} = ${input.subject}`);
      }

      const questions = await db.select().from(errorQuestions).where(and(...conditions));

      // 按日期分组统计
      const dateMap = new Map<string, { total: number; mastered: number }>();
      questions.forEach((q) => {
        const date = q.createdAt.split("T")[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, { total: 0, mastered: 0 });
        }
        const stats = dateMap.get(date)!;
        stats.total++;
        if (q.isMastered) stats.mastered++;
      });

      // 转换为数组并计算掌握率
      return Array.from(dateMap.entries())
        .map(([date, stats]) => ({
          date,
          masteryRate: stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }),

  /**
   * 获取科目分布
   */
  getSubjectDistribution: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("../db");
    const { errorQuestions } = await import("../../drizzle/schema");
    const { eq, sql } = await import("drizzle-orm");

    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        subject: errorQuestions.subject,
        count: sql<number>`count(*)`
      })
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, ctx.user.id))
      .groupBy(errorQuestions.subject);

    const subjectLabels: Record<string, string> = {
      chinese: "语文",
      math: "数学",
      english: "英语",
      physics: "物理",
      chemistry: "化学",
      biology: "生物",
      politics: "政治",
      history: "历史",
      geography: "地理",
    };

    return result.map((r: any) => ({
      subject: r.subject,
      subjectLabel: subjectLabels[r.subject] || r.subject,
      count: Number(r.count),
    }));
  }),

  /**
   * 获取掌握度分布
   */
  getMasteryDistribution: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { errorQuestions } = await import("../../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(errorQuestions.userId, ctx.user.id)];
      if (input?.subject) {
        conditions.push(sql`${errorQuestions.subject} = ${input.subject}`);
      }

      const questions = await db.select().from(errorQuestions).where(and(...conditions));

      const notStarted = questions.filter((q) => q.reviewCount === 0).length;
      const inProgress = questions.filter((q) => q.reviewCount > 0 && !q.isMastered).length;
      const mastered = questions.filter((q) => q.isMastered).length;

      return [
        { label: "未开始", count: notStarted },
        { label: "学习中", count: inProgress },
        { label: "已掌握", count: mastered },
      ];
    }),

  /**
   * 获取薄弱知识点
   */
  getWeakKnowledgePoints: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
        subject: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { errorQuestions } = await import("../../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(errorQuestions.userId, ctx.user.id)];
      if (input.subject) {
        conditions.push(sql`${errorQuestions.subject} = ${input.subject}`);
      }

      const questions = await db.select().from(errorQuestions).where(and(...conditions));

      // 统计知识点
      const knowledgePointMap = new Map<string, { errorCount: number; masteredCount: number }>();
      questions.forEach((q) => {
        if (!q.knowledgePointIds) return;
        try {
          const points = JSON.parse(q.knowledgePointIds as string);
          if (Array.isArray(points)) {
            points.forEach((point: string) => {
              if (!knowledgePointMap.has(point)) {
                knowledgePointMap.set(point, { errorCount: 0, masteredCount: 0 });
              }
              const stats = knowledgePointMap.get(point)!;
              stats.errorCount++;
              if (q.isMastered) stats.masteredCount++;
            });
          }
        } catch (e) {
          // 忽略解析错误
        }
      });

      // 计算掌握率并排序
      const weakPoints = Array.from(knowledgePointMap.entries())
        .map(([point, stats]) => ({
          knowledgePoint: point,
          errorCount: stats.errorCount,
          masteryRate: stats.errorCount > 0 ? (stats.masteredCount / stats.errorCount) * 100 : 0,
        }))
        .sort((a, b) => a.masteryRate - b.masteryRate)
        .slice(0, input.limit);

      return weakPoints;
    }),
});
