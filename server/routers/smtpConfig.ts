import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getSMTPConfig,
  saveSMTPConfig,
  deleteSMTPConfig,
  testSMTPConfig,
  getSMTPConfigStatus,
  type SMTPConfig,
} from "../services/smtpConfigService";

/**
 * SMTP配置管理路由（仅管理员可访问）
 */
export const smtpConfigRouter = router({
  /**
   * 获取SMTP配置状态（不返回敏感信息）
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    // 仅管理员可访问
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "仅管理员可访问此功能",
      });
    }

    return await getSMTPConfigStatus();
  }),

  /**
   * 获取完整SMTP配置（包含敏感信息）
   */
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    // 仅管理员可访问
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "仅管理员可访问此功能",
      });
    }

    const config = await getSMTPConfig();
    if (!config) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "SMTP配置未设置",
      });
    }

    return config;
  }),

  /**
   * 保存SMTP配置
   */
  saveConfig: protectedProcedure
    .input(
      z.object({
        host: z.string().min(1, "主机地址不能为空"),
        port: z.number().int().min(1).max(65535, "端口号必须在1-65535之间"),
        secure: z.boolean(),
        user: z.string().min(1, "用户名不能为空"),
        password: z.string().min(1, "密码不能为空"),
        fromEmail: z.string().email("发件人邮箱格式不正确"),
        fromName: z.string().min(1, "发件人名称不能为空"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 仅管理员可访问
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问此功能",
        });
      }

      try {
        await saveSMTPConfig(input as SMTPConfig, ctx.user.id);
        return {
          success: true,
          message: "SMTP配置保存成功",
        };
      } catch (error) {
        console.error("Failed to save SMTP config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "保存SMTP配置失败",
        });
      }
    }),

  /**
   * 测试SMTP配置
   */
  testConfig: protectedProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number(),
        secure: z.boolean(),
        user: z.string(),
        password: z.string(),
        fromEmail: z.string().email(),
        fromName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 仅管理员可访问
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问此功能",
        });
      }

      try {
        const isValid = await testSMTPConfig(input as SMTPConfig);
        return {
          success: isValid,
          message: isValid ? "SMTP配置测试成功" : "SMTP配置测试失败，请检查配置信息",
        };
      } catch (error) {
        console.error("SMTP config test failed:", error);
        return {
          success: false,
          message: "SMTP配置测试失败：" + (error instanceof Error ? error.message : "未知错误"),
        };
      }
    }),

  /**
   * 删除SMTP配置
   */
  deleteConfig: protectedProcedure.mutation(async ({ ctx }) => {
    // 仅管理员可访问
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "仅管理员可访问此功能",
      });
    }

    try {
      await deleteSMTPConfig();
      return {
        success: true,
        message: "SMTP配置已删除",
      };
    } catch (error) {
      console.error("Failed to delete SMTP config:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "删除SMTP配置失败",
      });
    }
  }),
});
