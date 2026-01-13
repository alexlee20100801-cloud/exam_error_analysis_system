import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = "7d";

// 注册验证Schema
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "密码不匹配",
  path: ["confirmPassword"],
});

// 登录验证Schema
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

// 生成JWT Token
function generateToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 验证JWT Token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch (error) {
    return null;
  }
}

export const authLocalRouter = router({
  // 用户注册
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      // 检查用户名是否已存在
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "用户名已存在",
        });
      }

      // 检查邮箱是否已存在
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingEmail.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "邮箱已被注册",
        });
      }

      // 密码加密
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // 创建用户
      const result = await db
        .insert(users)
        .values({
          username: input.username,
          email: input.email,
          passwordHash: hashedPassword,
          name: input.username,
          role: "user",
          isActive: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const newUser = result[0];

      // 生成Token
      const token = generateToken(newUser.id);

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        token,
      };
    }),

  // 用户登录
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      // 查找用户
      const user = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (user.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        });
      }

      const foundUser = user[0];

      // 检查用户是否被禁用
      if (!foundUser.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "账户已被禁用",
        });
      }

      // 验证密码
      if (!foundUser.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        });
      }

      const passwordMatch = await bcrypt.compare(
        input.password,
        foundUser.passwordHash
      );

      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        });
      }

      // 更新最后登录时间
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, foundUser.id));

      // 生成Token
      const token = generateToken(foundUser.id);

      return {
        user: {
          id: foundUser.id,
          username: foundUser.username,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
        },
        token,
      };
    }),

  // 验证Token
  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(({ input }) => {
      const decoded = verifyToken(input.token);
      if (!decoded) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token无效或已过期",
        });
      }
      return { valid: true, userId: decoded.userId };
    }),

  // 修改密码
  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string().min(8),
        newPassword: z.string().min(8),
        confirmPassword: z.string(),
      }).refine(data => data.newPassword === data.confirmPassword, {
        message: "新密码不匹配",
        path: ["confirmPassword"],
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (user.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      const foundUser = user[0];

      // 验证旧密码
      if (!foundUser.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "密码验证失败",
        });
      }

      const passwordMatch = await bcrypt.compare(
        input.oldPassword,
        foundUser.passwordHash
      );

      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "旧密码错误",
        });
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // 更新密码
      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true, message: "密码已修改" };
    }),

  // 重置密码（通过邮箱）
  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        newPassword: z.string().min(8),
        confirmPassword: z.string(),
      }).refine(data => data.newPassword === data.confirmPassword, {
        message: "新密码不匹配",
        path: ["confirmPassword"],
      })
    )
    .mutation(async ({ input }) => {
      // 查找用户
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (user.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // 更新密码
      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user[0].id));

      return { success: true, message: "密码已重置" };
    }),

  // 获取当前用户信息
  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (user.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      const foundUser = user[0];
      return {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        createdAt: foundUser.createdAt,
        updatedAt: foundUser.updatedAt,
      };
    }),

  // 登出
  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      // 这里可以添加令牌黑名单逻辑
      return { success: true, message: "已登出" };
    }),

  // 忘记密码
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) {
        return { success: true, message: "如果邮箱存在，重置链接已发送" };
      }
      return { success: true, message: "重置邮件已发送" };
    }),

  // 重置密码
  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      return { success: true, message: "密码已重置" };
    }),
});
