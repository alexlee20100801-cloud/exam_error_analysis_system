import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
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
          progress.nextReviewAt <= new Date() &&
          progress.status !== "mastered"
        ) {
          // 根据掌握度确定优先级
          let priority: "low" | "medium" | "high" | "urgent" = "medium";
          if (progress.masteryLevel < 50) {
            priority = "urgent";
          } else if (progress.masteryLevel < 70) {
            priority = "high";
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
});
