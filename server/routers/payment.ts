import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createOrder,
  getOrderById,
  getOrderByOrderNo,
  getUserOrders,
  getAllOrders,
  markOrderAsPaid,
  cancelOrder,
} from "../services/orderService";
import {
  provisionAccountForOrder,
  createUserSubscription,
} from "../services/accountProvisioningService";
import { getPlanById } from "../services/subscriptionPlanService";

export const paymentRouter = router({
  /**
   * 创建订单
   */
  createOrder: publicProcedure
    .input(
      z.object({
        planId: z.number(),
        buyerInfo: z
          .object({
            email: z.string().email().optional(),
            phone: z.string().optional(),
            name: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await createOrder({
          planId: input.planId,
          userId: ctx.user?.id,
          buyerInfo: input.buyerInfo,
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "创建订单失败",
        });
      }
    }),

  /**
   * 获取订单详情
   */
  getOrder: publicProcedure
    .input(
      z.object({
        orderNo: z.string(),
      })
    )
    .query(async ({ input }) => {
      const order = await getOrderByOrderNo(input.orderNo);
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }
      return order;
    }),

  /**
   * 获取用户订单列表
   */
  getMyOrders: protectedProcedure.query(async ({ ctx }) => {
    const orders = await getUserOrders(ctx.user.id);
    return orders;
  }),

  /**
   * 取消订单
   */
  cancelOrder: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const order = await getOrderById(input.orderId);
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }

      if (order.order.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权操作此订单",
        });
      }

      if (order.order.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "只能取消待支付订单",
        });
      }

      await cancelOrder(input.orderId);
      return { success: true };
    }),

  /**
   * 模拟支付成功（仅用于测试）
   */
  simulatePayment: publicProcedure
    .input(
      z.object({
        orderNo: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const order = await getOrderByOrderNo(input.orderNo);
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }

      if (order.order.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "订单已支付或已取消",
        });
      }

      // 标记订单为已支付
      await markOrderAsPaid({
        orderId: order.order.id,
        paymentMethod: "stripe",
        thirdPartyOrderNo: `TEST_${Date.now()}`,
      });

      // 自动分发账号
      const buyerInfo = order.order.buyerInfo as any;
      const accountInfo = await provisionAccountForOrder({
        orderId: order.order.id,
        email: buyerInfo?.email,
        phone: buyerInfo?.phone,
        name: buyerInfo?.name,
      });

      // 创建订阅
      if (order.plan) {
        await createUserSubscription({
          userId: accountInfo.userId,
          planId: order.plan.id,
          orderId: order.order.id,
          durationDays: order.plan.durationDays,
        });
      }

      return {
        success: true,
        accountInfo,
      };
    }),

  /**
   * 获取所有订单（管理员）
   */
  getAllOrders: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问",
        });
      }

      const orders = await getAllOrders(input);
      return orders;
    }),
});
