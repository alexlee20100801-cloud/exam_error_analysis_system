import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
  verifyEmailToken,
  resendVerificationEmail,
  isEmailVerified,
} from "../services/emailVerificationService";

/**
 * 邮箱验证路由
 */
export const emailVerificationRouter = router({
  /**
   * 发送验证邮件
   */
  sendVerification: protectedProcedure
    .input(
      z.object({
        email: z.string().email("邮箱格式不正确"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // 创建验证令牌
        const token = await createEmailVerificationToken(ctx.user.id, input.email);

        // 发送验证邮件
        await sendVerificationEmail(input.email, token, ctx.user.name || undefined);

        return {
          success: true,
          message: "验证邮件已发送，请检查您的邮箱",
        };
      } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "发送验证邮件失败",
        });
      }
    }),

  /**
   * 验证邮箱令牌（公开接口，通过邮件链接访问）
   */
  verifyToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "令牌不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await verifyEmailToken(input.token);
        return result;
      } catch (error) {
        console.error("Failed to verify email token:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "验证失败，请稍后重试",
        });
      }
    }),

  /**
   * 重新发送验证邮件
   */
  resendVerification: protectedProcedure
    .input(
      z.object({
        email: z.string().email("邮箱格式不正确"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await resendVerificationEmail(ctx.user.id, input.email, ctx.user.name || undefined);

        return {
          success: true,
          message: "验证邮件已重新发送",
        };
      } catch (error) {
        console.error("Failed to resend verification email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "重新发送验证邮件失败",
        });
      }
    }),

  /**
   * 检查邮箱验证状态
   */
  checkVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const isVerified = await isEmailVerified(ctx.user.id);
      return {
        isVerified,
        email: ctx.user.email || null,
      };
    } catch (error) {
      console.error("Failed to check verification status:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "检查验证状态失败",
      });
    }
  }),
});
