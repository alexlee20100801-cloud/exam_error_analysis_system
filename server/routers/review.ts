import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { errorQuestions } from "../../drizzle/schema";
import { eq, and, or, sql } from "drizzle-orm";
import {
  calculateNextReviewDate,
  getReviewUrgency,
  calculateReviewProgress,
  getReviewStageDescription,
  calculateReviewStats,
} from "../ebbinghausService";
import {
  createReviewPlan,
  getReviewPlansByUser,
  updateReviewPlan,
  getPendingReviewPlans,
  getLearningProgressByUser,
} from "../db";
import { notifyOwner } from "../_core/notification";

export const reviewRouter = router({
  /**
   * 创建复习计划
   */
  createPlan: protectedProcedure
    .input(z.object({
      targetType: z.enum(["error_question", "knowledge_point"]),
      targetId: z.number(),
      scheduledAt: z.date(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await createReviewPlan({
        userId: ctx.user.id,
        targetType: input.targetType,
        targetId: input.targetId,
        // @ts-ignore
        scheduledAt: input.scheduledAt,
        priority: input.priority,
        status: "pending",
      });

      return {
        success: true,
        id: result[0]?.insertId ? Number(result[0].insertId) : 0,
      };
    }),

  /**
   * 获取用户的复习计划列表
   */
  listPlans: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "completed", "skipped"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const plans = await getReviewPlansByUser(
        ctx.user.id,
        // @ts-ignore
        input?.status
      );
      return plans;
    }),

  /**
   * 获取待复习的计划
   */
  getPendingPlans: protectedProcedure
    .query(async ({ ctx }) => {
      const plans = await getPendingReviewPlans(ctx.user.id);
      return plans;
    }),

  /**
   * 完成复习计划
   */
  completePlan: protectedProcedure
    .input(z.object({
      planId: z.number(),
      completionNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateReviewPlan(input.planId, {
        status: "completed",
        // @ts-ignore
        completedAt: new Date(),
        completionNote: input.completionNote,
      });

      return {
        success: true,
      };
    }),

  /**
   * 跳过复习计划
   */
  skipPlan: protectedProcedure
    .input(z.object({
      planId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateReviewPlan(input.planId, {
        status: "skipped",
      });

      return {
        success: true,
      };
    }),

  /**
   * 智能生成复习计划
   * 根据学习进度和遗忘曲线自动生成复习计划
   */
  generateSmartPlan: protectedProcedure
    .mutation(async ({ ctx }) => {
      // 获取用户的学习进度
      const progressList = await getLearningProgressByUser(ctx.user.id);

      const createdPlans = [];

      for (const progress of progressList) {
        // 只为需要复习的知识点创建计划
        if (
          progress.nextReviewAt &&
          // @ts-ignore
          progress.nextReviewAt <= new Date() &&
          progress.status !== "mastered"
        ) {
          // 根据掌握度确定优先级
          let priority: "low" | "medium" | "high" | "urgent" = "medium";
          // @ts-ignore
          if (progress.masteryLevel < 50) {
            priority = "urgent";
          // @ts-ignore
          } else if (progress.masteryLevel < 70) {
            priority = "high";
          // @ts-ignore
          } else if (progress.masteryLevel < 85) {
            priority = "medium";
          } else {
            priority = "low";
          }

          const result = await createReviewPlan({
            userId: ctx.user.id,
            targetType: "knowledge_point",
            targetId: progress.knowledgePointId,
            scheduledAt: progress.nextReviewAt,
            priority: priority,
            status: "pending",
          });

          createdPlans.push({
            id: result[0]?.insertId ? Number(result[0].insertId) : 0,
            knowledgePointId: progress.knowledgePointId,
            priority: priority,
          });
        }
      }

      // 如果创建了新的复习计划，发送通知给用户（通过owner notification）
      if (createdPlans.length > 0) {
        try {
          await notifyOwner({
            title: "新的复习计划",
            content: `用户 ${ctx.user.name || ctx.user.email} 有 ${createdPlans.length} 个新的复习任务需要完成。`,
          });
        } catch (error) {
          console.error("[Review] 发送通知失败:", error);
        }
      }

      return {
        success: true,
        createdCount: createdPlans.length,
        plans: createdPlans,
      };
    }),

  /**
   * 获取复习统计数据
   */
  getStatistics: protectedProcedure
    .query(async ({ ctx }) => {
      const allPlans = await getReviewPlansByUser(ctx.user.id);
      const pendingPlans = await getPendingReviewPlans(ctx.user.id);

      const completedCount = allPlans.filter(p => p.status === "completed").length;
      const skippedCount = allPlans.filter(p => p.status === "skipped").length;
      const pendingCount = pendingPlans.length;

      // 按优先级统计待复习任务
      const urgentCount = pendingPlans.filter(p => p.priority === "urgent").length;
      const highCount = pendingPlans.filter(p => p.priority === "high").length;
      const mediumCount = pendingPlans.filter(p => p.priority === "medium").length;
      const lowCount = pendingPlans.filter(p => p.priority === "low").length;

      return {
        total: allPlans.length,
        completed: completedCount,
        skipped: skippedCount,
        pending: pendingCount,
        byPriority: {
          urgent: urgentCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
      };
    }),

  /**
   * 获取今日待复习列表（基于艾宾浩斯曲线）
   */
  getTodayReviewList: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const now = new Date();
    const reviewItems: Array<{
      id: number;
      type: 'error_question';
      title: string;
      subject: string;
      grade: string;
      reviewCount: number;
      nextReviewDate: Date | null;
      lastReviewedAt: Date | null;
      urgency: 'urgent' | 'today' | 'soon' | 'later';
      progress: number;
      stageDescription: string;
    }> = [];

    try {
      // 查询需要复习的错题
      const errorQuestionsToReview = await db
        .select({
          id: errorQuestions.id,
          title: errorQuestions.title,
          subject: errorQuestions.subject,
          grade: errorQuestions.grade,
          reviewCount: errorQuestions.reviewCount,
          lastReviewedAt: errorQuestions.lastReviewedAt,
        })
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, ctx.user.id),
            // @ts-ignore
            eq(errorQuestions.isMastered, false),
            or(
              sql`${errorQuestions.lastReviewedAt} IS NULL`,
              sql`DATE_ADD(${errorQuestions.lastReviewedAt}, INTERVAL 
                CASE ${errorQuestions.reviewCount}
                  WHEN 0 THEN 1
                  WHEN 1 THEN 2
                  WHEN 2 THEN 4
                  WHEN 3 THEN 7
                  WHEN 4 THEN 15
                  ELSE 30
                END DAY) <= ${now}`
            )
          )
        )
        .limit(50);

      for (const eq of errorQuestionsToReview) {
        const nextReviewDate = eq.lastReviewedAt
          // @ts-ignore
          ? calculateNextReviewDate(eq.lastReviewedAt, eq.reviewCount || 0)
          : now;

        reviewItems.push({
          id: eq.id,
          type: 'error_question',
          title: eq.title,
          subject: eq.subject,
          grade: eq.grade,
          reviewCount: eq.reviewCount || 0,
          nextReviewDate,
          // @ts-ignore
          lastReviewedAt: eq.lastReviewedAt,
          urgency: getReviewUrgency(nextReviewDate),
          progress: calculateReviewProgress(eq.reviewCount || 0),
          stageDescription: getReviewStageDescription(eq.reviewCount || 0),
        });
      }

      // 按紧急程度排序
      reviewItems.sort((a, b) => {
        const urgencyOrder = { urgent: 0, today: 1, soon: 2, later: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });

      return reviewItems;
    } catch (error) {
      console.error("[复习计划] 获取今日待复习列表失败:", error);
      return [];
    }
  }),

  /**
   * 获取复习统计信息（艾宾浩斯曲线）
   */
  getEbbinghausStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        totalItems: 0,
        urgentCount: 0,
        todayCount: 0,
        soonCount: 0,
        completedCount: 0,
      };
    }

    try {
      // 查询所有错题
      const allErrorQuestions = await db
        .select({
          reviewCount: errorQuestions.reviewCount,
          lastReviewedAt: errorQuestions.lastReviewedAt,
        })
        .from(errorQuestions)
        .where(eq(errorQuestions.userId, ctx.user.id));

      const items = allErrorQuestions.map(eq => ({
        nextReviewDate: eq.lastReviewedAt
          // @ts-ignore
          ? calculateNextReviewDate(eq.lastReviewedAt, eq.reviewCount || 0)
          : new Date(),
        reviewCount: eq.reviewCount || 0,
      }));

      return calculateReviewStats(items);
    } catch (error) {
      console.error("[复习计划] 获取复习统计失败:", error);
      return {
        totalItems: 0,
        urgentCount: 0,
        todayCount: 0,
        soonCount: 0,
        completedCount: 0,
      };
    }
  }),

  /**
   * 标记错题为已复习
   */
  markAsReviewed: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("数据库不可用");
      }

      try {
        // 获取当前错题信息
        const errorQuestion = await db
          .select({
            reviewCount: errorQuestions.reviewCount,
          })
          .from(errorQuestions)
          .where(
            and(
              eq(errorQuestions.id, input.errorQuestionId),
              eq(errorQuestions.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (errorQuestion.length === 0) {
          throw new Error("错题不存在");
        }

        const currentReviewCount = errorQuestion[0].reviewCount || 0;
        const newReviewCount = currentReviewCount + 1;
        const now = new Date();

        // 更新复习记录
        await db
          .update(errorQuestions)
          .set({
            reviewCount: newReviewCount,
            // @ts-ignore
            lastReviewedAt: now,
            // 如果完成了5次复习，标记为已掌握
            // @ts-ignore
            isMastered: newReviewCount >= 5,
          })
          .where(eq(errorQuestions.id, input.errorQuestionId));

        return {
          success: true,
          reviewCount: newReviewCount,
          nextReviewDate: calculateNextReviewDate(now, newReviewCount),
        };
      } catch (error) {
        console.error("[复习计划] 标记已复习失败:", error);
        throw error;
      }
    }),
});
