import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import {
  savePaymentConfig,
  getPaymentConfig,
  getAllPaymentConfigs,
  togglePaymentMethod,
} from "../services/paymentConfigService";

export const paymentConfigRouter = router({
  /**
   * 获取所有支付配置（不返回敏感信息）
   */
  getAll: adminProcedure.query(async () => {
    return await getAllPaymentConfigs();
  }),

  /**
   * 获取单个支付配置（返回完整配置，仅管理员）
   */
  getOne: adminProcedure
    .input(
      z.object({
        paymentMethod: z.enum(["stripe", "wechat", "alipay"]),
      })
    )
    .query(async ({ input }) => {
      return await getPaymentConfig(input.paymentMethod);
    }),

  /**
   * 保存微信支付配置
   */
  saveWechat: adminProcedure
    .input(
      z.object({
        appId: z.string().min(1, "应用ID不能为空"),
        mchId: z.string().min(1, "商户号不能为空"),
        apiV3Key: z.string().min(32, "APIv3密钥至少32位"),
        serialNo: z.string().min(1, "证书序列号不能为空"),
        privateKey: z.string().min(1, "商户私钥不能为空"),
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await savePaymentConfig({
        paymentMethod: "wechat",
        config: {
          appId: input.appId,
          mchId: input.mchId,
          apiV3Key: input.apiV3Key,
          serialNo: input.serialNo,
          privateKey: input.privateKey,
        },
        isEnabled: input.isEnabled,
        lastModifiedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * 保存支付宝配置
   */
  saveAlipay: adminProcedure
    .input(
      z.object({
        appId: z.string().min(1, "应用ID不能为空"),
        privateKey: z.string().min(1, "应用私钥不能为空"),
        alipayPublicKey: z.string().min(1, "支付宝公钥不能为空"),
        gateway: z.string().optional(),
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await savePaymentConfig({
        paymentMethod: "alipay",
        config: {
          appId: input.appId,
          privateKey: input.privateKey,
          alipayPublicKey: input.alipayPublicKey,
          gateway: input.gateway,
        },
        isEnabled: input.isEnabled,
        lastModifiedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * 启用/禁用支付方式
   */
  toggle: adminProcedure
    .input(
      z.object({
        paymentMethod: z.enum(["stripe", "wechat", "alipay"]),
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await togglePaymentMethod(input.paymentMethod, input.isEnabled);
      return { success: true };
    }),
});
