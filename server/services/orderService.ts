import { getDb } from "../db";
import { orders, subscriptionPlans, userSubscriptions, users } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

/**
 * 生成订单号
 */
export function generateOrderNo(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `ORD${timestamp}${random}`;
}

/**
 * 创建订单
 */
export async function createOrder(params: {
  planId: number;
  userId?: number;
  buyerInfo?: {
    email?: string;
    phone?: string;
    name?: string;
  };
}): Promise<{ orderId: number; orderNo: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 获取套餐信息
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, params.planId));
    if (!plan) {
      throw new Error("套餐不存在");
    }

    if (!plan.isActive) {
      throw new Error("套餐已停用");
    }

    const orderNo = generateOrderNo();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // 订单2小时后过期

    const [result] = await db.insert(orders).values({
      orderNo,
      userId: params.userId,
      planId: params.planId,
      amount: plan.price,
      currency: plan.currency,
      status: "pending",
      buyerInfo: params.buyerInfo,
      expiresAt,
    });

    return {
      orderId: result.insertId,
      orderNo,
    };
  } catch (error) {
    console.error("Failed to create order:", error);
    throw new Error("创建订单失败");
  }
}

/**
 * 获取订单详情
 */
export async function getOrderById(orderId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const [order] = await db
      .select({
        order: orders,
        plan: subscriptionPlans,
      })
      .from(orders)
      .leftJoin(subscriptionPlans, eq(orders.planId, subscriptionPlans.id))
      .where(eq(orders.id, orderId));

    return order || null;
  } catch (error) {
    console.error("Failed to get order:", error);
    return null;
  }
}

/**
 * 根据订单号获取订单
 */
export async function getOrderByOrderNo(orderNo: string) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const [order] = await db
      .select({
        order: orders,
        plan: subscriptionPlans,
      })
      .from(orders)
      .leftJoin(subscriptionPlans, eq(orders.planId, subscriptionPlans.id))
      .where(eq(orders.orderNo, orderNo));

    return order || null;
  } catch (error) {
    console.error("Failed to get order by orderNo:", error);
    return null;
  }
}

/**
 * 更新订单支付状态
 */
export async function markOrderAsPaid(params: {
  orderId: number;
  paymentMethod: "stripe" | "wechat" | "alipay";
  thirdPartyOrderNo?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    await db
      .update(orders)
      .set({
        status: "paid",
        paymentMethod: params.paymentMethod,
        thirdPartyOrderNo: params.thirdPartyOrderNo,
        paidAt: new Date(),
      })
      .where(eq(orders.id, params.orderId));
  } catch (error) {
    console.error("Failed to mark order as paid:", error);
    throw new Error("更新订单状态失败");
  }
}

/**
 * 取消订单
 */
export async function cancelOrder(orderId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
  } catch (error) {
    console.error("Failed to cancel order:", error);
    throw new Error("取消订单失败");
  }
}

/**
 * 获取用户订单列表
 */
export async function getUserOrders(userId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const userOrders = await db
      .select({
        order: orders,
        plan: subscriptionPlans,
      })
      .from(orders)
      .leftJoin(subscriptionPlans, eq(orders.planId, subscriptionPlans.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    return userOrders;
  } catch (error) {
    console.error("Failed to get user orders:", error);
    return [];
  }
}

/**
 * 获取所有订单（管理员）
 */
export async function getAllOrders(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 简化为直接构建完整查询
    const baseQuery = db
      .select({
        order: orders,
        plan: subscriptionPlans,
        user: users,
      })
      .from(orders)
      .leftJoin(subscriptionPlans, eq(orders.planId, subscriptionPlans.id))
      .leftJoin(users, eq(orders.userId, users.id));

    if (params?.status) {
      const allOrders = await baseQuery
        .where(eq(orders.status, params.status as any))
        .orderBy(desc(orders.createdAt))
        .limit(params?.limit || 100)
        .offset(params?.offset || 0);
      return allOrders;
    }

    const allOrders = await baseQuery
      .orderBy(desc(orders.createdAt))
      .limit(params?.limit || 100)
      .offset(params?.offset || 0);
    return allOrders;
  } catch (error) {
    console.error("Failed to get all orders:", error);
    return [];
  }
}

/**
 * 检查并过期未支付订单
 */
export async function expireUnpaidOrders(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const now = new Date();
    const result = await db
      .update(orders)
      .set({ status: "expired" })
      .where(and(eq(orders.status, "pending"), eq(orders.expiresAt, now)));

    return (result as any).rowsAffected || 0;
  } catch (error) {
    console.error("Failed to expire unpaid orders:", error);
    return 0;
  }
}
