import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import {
  createOrder,
  getOrderById,
  getOrderByOrderNo,
  markOrderAsPaid,
} from "./services/orderService";
import {
  savePlan,
  getPlanById,
  getAllPlans,
} from "./services/subscriptionPlanService";
import {
  provisionAccountForOrder,
  createUserSubscription,
  getUserActiveSubscription,
} from "./services/accountProvisioningService";
import { hasFeaturePermission, checkAiAnalysisQuota } from "./services/permissionService";

describe("订单和支付系统测试", () => {
  let testPlanId: number;
  let testOrderId: number;
  let testOrderNo: string;

  beforeAll(async () => {
    // 创建测试套餐
    testPlanId = await savePlan({
      name: "测试套餐",
      description: "用于单元测试",
      price: 9900,
      currency: "CNY",
      durationDays: 30,
      features: ["error_questions", "ai_analysis"],
      maxErrorQuestions: 100,
      maxAiAnalysis: 10,
      isActive: true,
      sortOrder: 999,
    });
  });

  it("应该能够创建套餐", async () => {
    const plan = await getPlanById(testPlanId);
    expect(plan).toBeTruthy();
    expect(plan?.name).toBe("测试套餐");
    expect(plan?.price).toBe(9900);
    expect(plan?.features).toContain("error_questions");
  });

  it("应该能够获取所有套餐", async () => {
    const plans = await getAllPlans(true);
    expect(plans.length).toBeGreaterThan(0);
    const testPlan = plans.find((p) => p.id === testPlanId);
    expect(testPlan).toBeTruthy();
  });

  it("应该能够创建订单", async () => {
    const result = await createOrder({
      planId: testPlanId,
      buyerInfo: {
        email: "test@example.com",
        name: "测试用户",
      },
    });

    testOrderId = result.orderId;
    testOrderNo = result.orderNo;

    expect(testOrderId).toBeGreaterThan(0);
    expect(testOrderNo).toBeTruthy();
    expect(testOrderNo).toMatch(/^ORD/);
  });

  it("应该能够根据订单号获取订单", async () => {
    const order = await getOrderByOrderNo(testOrderNo);
    expect(order).toBeTruthy();
    expect(order?.order.id).toBe(testOrderId);
    expect(order?.order.status).toBe("pending");
    expect(order?.plan?.id).toBe(testPlanId);
  });

  it("应该能够标记订单为已支付", async () => {
    await markOrderAsPaid({
      orderId: testOrderId,
      paymentMethod: "stripe",
      thirdPartyOrderNo: "TEST_123456",
    });

    const order = await getOrderById(testOrderId);
    expect(order?.order.status).toBe("paid");
    expect(order?.order.paymentMethod).toBe("stripe");
  });

  it("应该能够为订单自动分发账号", async () => {
    const accountInfo = await provisionAccountForOrder({
      orderId: testOrderId,
      email: "newuser@example.com",
      name: "新用户",
    });

    expect(accountInfo.userId).toBeGreaterThan(0);
    expect(accountInfo.loginAccount).toBe("newuser@example.com");
    // 注：如果用户已存在，密码为空字符串
  });

  it("应该能够创建用户订阅", async () => {
    // 获取刚创建的用户ID
    const order = await getOrderById(testOrderId);
    const userId = order?.order.userId;
    expect(userId).toBeTruthy();

    if (userId) {
      const subscriptionId = await createUserSubscription({
        userId,
        planId: testPlanId,
        orderId: testOrderId,
        durationDays: 30,
      });

      expect(subscriptionId).toBeGreaterThan(0);

      // 验证订阅是否创建成功
      const subscription = await getUserActiveSubscription(userId);
      expect(subscription).toBeTruthy();
      expect(subscription?.planId).toBe(testPlanId);
      expect(subscription?.status).toBe("active");
    }
  });

  it("应该能够检查用户权限", async () => {
    const order = await getOrderById(testOrderId);
    const userId = order?.order.userId;

    if (userId) {
      // 检查用户是否有错题管理权限
      const hasPermission = await hasFeaturePermission(userId, "error_questions");
      expect(hasPermission).toBe(true);

      // 检查用户是否有AI分析权限
      const hasAiPermission = await hasFeaturePermission(userId, "ai_analysis");
      expect(hasAiPermission).toBe(true);

      // 检查用户是否没有未购买的功能权限
      const hasUnpurchasedPermission = await hasFeaturePermission(
        userId,
        "exam_generator"
      );
      expect(hasUnpurchasedPermission).toBe(false);
    }
  });

  it("应该能够检查AI分析配额", async () => {
    const order = await getOrderById(testOrderId);
    const userId = order?.order.userId;

    if (userId) {
      const quota = await checkAiAnalysisQuota(userId);
      expect(quota.allowed).toBe(true);
      expect(quota.used).toBe(0);
      expect(quota.limit).toBe(10);
    }
  });
});
