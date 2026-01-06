import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getUserActiveSubscription } from "../services/accountProvisioningService";
import { getUserPermissions, checkAiAnalysisQuota } from "../services/permissionService";
import { getPlanById } from "../services/subscriptionPlanService";

export const userSubscriptionRouter = router({
  /**
   * 获取当前用户的订阅信息
   */
  getMy: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getUserActiveSubscription(ctx.user.id);
    if (!subscription) {
      return null;
    }

    const plan = await getPlanById(subscription.planId);
    return {
      subscription,
      plan,
    };
  }),

  /**
   * 获取当前用户的权限列表
   */
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const permissions = await getUserPermissions(ctx.user.id);
    return permissions;
  }),

  /**
   * 检查AI分析配额
   */
  checkAiQuota: protectedProcedure.query(async ({ ctx }) => {
    const quota = await checkAiAnalysisQuota(ctx.user.id);
    return quota;
  }),
});
