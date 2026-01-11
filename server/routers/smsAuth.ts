import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "../../shared/const";
import {
  sendVerificationCode,
  loginWithPhone,
  registerWithPhone,
  bindPhone,
  unbindPhone,
  isPhoneExists,
} from "../services/smsAuth";

export const smsAuthRouter = router({
  // 发送验证码（支持图形验证码校验和IP频率限制）
  sendCode: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确"),
        type: z.enum(["login", "register", "bind", "reset"]),
        captchaId: z.string().optional(),
        captchaCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 获取客户端IP地址
      const ipAddress = ctx.req.headers['x-forwarded-for'] as string || 
                        ctx.req.headers['x-real-ip'] as string || 
                        ctx.req.socket?.remoteAddress || 
                        'unknown';
      // 如果是多个IP（通过代理），取第一个
      const clientIp = ipAddress.split(',')[0].trim();
      
      return sendVerificationCode({
        ...input,
        ipAddress: clientIp,
      });
    }),

  // 手机号验证码登录
  login: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确"),
        code: z.string().length(6, "验证码必须是6位数字"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await loginWithPhone(input);

      // 设置session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, result.sessionToken, cookieOptions);

      return {
        success: true,
        isNewUser: result.isNewUser,
        user: {
          id: result.user.id,
          name: result.user.name,
          phone: result.user.phone,
        },
      };
    }),

  // 手机号注册
  register: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确"),
        code: z.string().length(6, "验证码必须是6位数字"),
        name: z.string().min(1).max(50).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await registerWithPhone(input);
      return {
        success: true,
        userId: result.userId,
      };
    }),

  // 检查手机号是否已注册
  checkPhone: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确"),
      })
    )
    .query(async ({ input }) => {
      const exists = await isPhoneExists(input.phone);
      return { exists };
    }),

  // 绑定手机号（需要登录）
  bind: protectedProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确"),
        code: z.string().length(6, "验证码必须是6位数字"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await bindPhone({
        userId: ctx.user.id,
        phone: input.phone,
        code: input.code,
      });
      return { success: true };
    }),

  // 解绑手机号（需要登录）
  unbind: protectedProcedure.mutation(async ({ ctx }) => {
    await unbindPhone({ userId: ctx.user.id });
    return { success: true };
  }),
});
