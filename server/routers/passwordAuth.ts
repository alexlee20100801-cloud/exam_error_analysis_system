import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import {
  registerUser,
  loginUser,
  changePassword,
  setPasswordForUser,
  isUsernameExists,
  isEmailExists,
} from "../services/passwordAuth";

// 密码验证规则
const passwordSchema = z
  .string()
  .min(6, "密码至少6个字符")
  .max(50, "密码最多50个字符")
  .regex(/[a-zA-Z]/, "密码必须包含字母")
  .regex(/[0-9]/, "密码必须包含数字");

// 用户名验证规则
const usernameSchema = z
  .string()
  .min(3, "用户名至少3个字符")
  .max(20, "用户名最多20个字符")
  .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线");

export const passwordAuthRouter = router({
  /**
   * 用户注册
   */
  register: publicProcedure
    .input(
      z.object({
        username: usernameSchema,
        password: passwordSchema,
        confirmPassword: z.string(),
        email: z.string().email("邮箱格式不正确").optional(),
        name: z.string().max(50, "姓名最多50个字符").optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 验证两次密码是否一致
      if (input.password !== input.confirmPassword) {
        throw new Error("两次输入的密码不一致");
      }

      // 注册用户
      const { userId, openId } = await registerUser({
        username: input.username,
        password: input.password,
        email: input.email,
        name: input.name,
      });

      // 自动登录：设置session cookie
      const { sessionToken } = await loginUser({
        account: input.username,
        password: input.password,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      return {
        success: true,
        userId,
        message: "注册成功",
      };
    }),

  /**
   * 用户登录
   */
  login: publicProcedure
    .input(
      z.object({
        account: z.string().min(1, "请输入用户名或邮箱"),
        password: z.string().min(1, "请输入密码"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { user, sessionToken } = await loginUser({
        account: input.account,
        password: input.password,
      });

      // 设置session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        message: "登录成功",
      };
    }),

  /**
   * 修改密码
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().min(1, "请输入原密码"),
        newPassword: passwordSchema,
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw new Error("两次输入的新密码不一致");
      }

      await changePassword({
        userId: ctx.user.id,
        oldPassword: input.oldPassword,
        newPassword: input.newPassword,
      });

      return {
        success: true,
        message: "密码修改成功",
      };
    }),

  /**
   * 为OAuth用户绑定用户名密码
   */
  bindPassword: protectedProcedure
    .input(
      z.object({
        username: usernameSchema,
        password: passwordSchema,
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.password !== input.confirmPassword) {
        throw new Error("两次输入的密码不一致");
      }

      await setPasswordForUser({
        userId: ctx.user.id,
        username: input.username,
        password: input.password,
      });

      return {
        success: true,
        message: "密码绑定成功",
      };
    }),

  /**
   * 检查用户名是否可用
   */
  checkUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const exists = await isUsernameExists(input.username);
      return {
        available: !exists,
        message: exists ? "用户名已被使用" : "用户名可用",
      };
    }),

  /**
   * 检查邮箱是否可用
   */
  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const exists = await isEmailExists(input.email);
      return {
        available: !exists,
        message: exists ? "邮箱已被注册" : "邮箱可用",
      };
    }),
});
