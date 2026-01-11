import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "../../shared/const";
import {
  generateWechatAuthUrl,
  handleWechatCallback,
  unbindWechat,
  isWechatAuthConfigured,
} from "../services/wechatAuthService";

export const wechatAuthRouter = router({
  // 检查微信登录是否已配置
  isConfigured: publicProcedure.query(async () => {
    const configured = await isWechatAuthConfigured();
    return { configured };
  }),

  // 获取微信授权URL
  getAuthUrl: publicProcedure
    .input(
      z.object({
        redirectUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await generateWechatAuthUrl({
        redirectUrl: input.redirectUrl,
        action: "login",
      });
      
      if (!result) {
        return {
          success: false,
          message: "微信登录未配置",
          authUrl: null,
        };
      }
      
      return {
        success: true,
        authUrl: result.authUrl,
        state: result.state,
      };
    }),

  // 微信登录回调处理
  callback: publicProcedure
    .input(
      z.object({
        code: z.string(),
        state: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await handleWechatCallback(input);
      
      // 设置session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, result.sessionToken, cookieOptions);
      
      return {
        success: true,
        isNewUser: result.isNewUser,
        redirectUrl: result.redirectUrl,
        user: {
          id: result.user.id,
          name: result.user.name,
          wechatNickname: result.user.wechat_nickname,
        },
      };
    }),

  // 获取绑定微信的授权URL（需要登录）
  getBindUrl: protectedProcedure
    .input(
      z.object({
        redirectUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await generateWechatAuthUrl({
        redirectUrl: input.redirectUrl,
        action: "bind",
        userId: ctx.user.id,
      });
      
      if (!result) {
        return {
          success: false,
          message: "微信登录未配置",
          authUrl: null,
        };
      }
      
      return {
        success: true,
        authUrl: result.authUrl,
        state: result.state,
      };
    }),

  // 解绑微信（需要登录）
  unbind: protectedProcedure.mutation(async ({ ctx }) => {
    await unbindWechat({ userId: ctx.user.id });
    return { success: true };
  }),
});
