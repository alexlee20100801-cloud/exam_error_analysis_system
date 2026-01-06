import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllPlans,
  getPlanById,
  savePlan,
  deletePlan,
  initializeDefaultPlans,
} from "../services/subscriptionPlanService";

export const subscriptionPlanRouter = router({
  /**
   * 获取所有套餐（公开）
   */
  getAll: publicProcedure.query(async () => {
    const plans = await getAllPlans(false);
    return plans;
  }),

  /**
   * 获取所有套餐（管理员，包含禁用的）
   */
  getAllAdmin: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "仅管理员可访问",
      });
    }

    const plans = await getAllPlans(true);
    return plans;
  }),

  /**
   * 根据ID获取套餐
   */
  getById: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const plan = await getPlanById(input.id);
      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "套餐不存在",
        });
      }
      return plan;
    }),

  /**
   * 保存套餐（管理员）
   */
  save: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        price: z.number(),
        currency: z.string().optional(),
        durationDays: z.number(),
        features: z.array(z.string()),
        maxErrorQuestions: z.number().optional(),
        maxAiAnalysis: z.number().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问",
        });
      }

      const planId = await savePlan(input);
      return { id: planId };
    }),

  /**
   * 删除套餐（管理员）
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问",
        });
      }

      await deletePlan(input.id);
      return { success: true };
    }),

  /**
   * 初始化默认套餐（管理员）
   */
  initializeDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "仅管理员可访问",
      });
    }

    await initializeDefaultPlans();
    return { success: true };
  }),
});
