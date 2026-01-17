import { z } from "zod";
import { db } from "../db";
import { users, verificationCodes } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { emailService } from "../emailService";

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
      const openId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await db
        .insert(users)
        .values({
          openId,
          username: input.username,
          email: input.email,
          passwordHash: hashedPassword,
          name: input.username,
          role: "user",
          isActive: 1,
          userType: "student",
          loginMethod: "local",
        })
        .$returningId();

      const userId = (result[0] as any) as number;

      // 生成Token
      const token = generateToken(userId);

      return {
        success: true,
        message: "注册成功",
        token,
        user: {
          id: userId,
          username: input.username,
          email: input.email,
          name: input.username,
          role: "user",
        },
      };
    }),

  // 用户登录
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      // 查找用户
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        });
      }

      const user = result[0];

      // 检查账户是否被禁用
      if (!user.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "账户已被禁用",
        });
      }

      // 验证密码
      const passwordMatch = await bcrypt.compare(input.password, user.passwordHash || "");
      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        });
      }

      // 生成Token
      const token = generateToken(user.id);

      return {
        success: true,
        message: "登录成功",
        token,
        user: {
          id: user.id,
          username: user.username || "",
          email: user.email || "",
          name: user.name || "",
          role: user.role,
        },
      };
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
    .mutation(async ({ input, ctx }) => {
      // 查找用户
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      const user = result[0];

      // 验证旧密码
      const passwordMatch = await bcrypt.compare(input.oldPassword, user.passwordHash || "");
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
        .set({ passwordHash: hashedPassword })
        .where(eq(users.id, ctx.user.id));

      return { success: true, message: "密码已修改" };
    }),

  // 忘记密码
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      // 查找用户
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (result.length === 0) {
        // 为了安全起见，即使用户不存在也返回成功
        return { success: true, message: "如果邮箱存在，重置链接已发送" };
      }

      const user = result[0];

      // 生成重置Token
      const resetToken = jwt.sign({ userId: user.id, type: "reset" }, JWT_SECRET, {
        expiresIn: "1h",
      });

      // 构建重置链接
      const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

      // 发送邮件
      const emailSent = await emailService.sendPasswordResetEmail(input.email, resetLink);

      if (!emailSent) {
        console.warn("密码重置邮件发送失败");
        // 即使邮件发送失败，也返回成功（为了安全起见）
      }

      return { success: true, message: "如果邮箱存在，重置链接已发送" };
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

      if (!user || user.length === 0) {
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
        .set({ passwordHash: hashedPassword })
        .where(eq(users.email, input.email));

      return { success: true, message: "密码已重置" };
    }),

  // 发送邮箱验证码
  sendVerificationCode: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      try {
        // 生成1位随机验证码
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 计算过期时间：10分钟
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // 删除该邮箱的旧验证码
        await db
          .delete(verificationCodes)
          .where(eq(verificationCodes.email, input.email));

        // 保存新的验证码
        await db
          .insert(verificationCodes)
          .values({
            email: input.email,
            code,
            expiresAt: expiresAt.toISOString(),
            type: "email_verification",
            used: 0,
          });

        // 尝试发送邮件
        const emailSent = await emailService.sendVerificationCodeEmail(input.email, code);

        if (!emailSent) {
          // 如果邮件发送失败，返回开发模式的验证码
          console.warn(`邮件发送失败，使用开发模式验证码: ${code}`);
          return {
            success: true,
            message: "验证码已生成（邮件服务未配置，开发模式：验证码为123456）",
            code: "123456",
          };
        }

        return { success: true, message: "验证码已发送到邮箱" };
      } catch (error) {
        console.error("发送验证码失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "发送验证码失败，请重试",
        });
      }
    }),

  // 验证邮箱
  verifyEmail: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // 验证验证码格式
        if (!/^\d{6}$/.test(input.code)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "验证码格式错误" });
        }

        // 从数据库查询验证码
        const result = await db
          .select()
          .from(verificationCodes)
          .where(
            and(
              eq(verificationCodes.email, input.email),
              eq(verificationCodes.code, input.code),
              gt(verificationCodes.expiresAt, new Date().toISOString()),
              eq(verificationCodes.used, 0)
            )
          )
          .limit(1);

        if (result.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "验证码错误或已过期",
          });
        }

        // 标记验证码为已使用
        await db
          .update(verificationCodes)
          .set({ used: 1 })
          .where(
            and(
              eq(verificationCodes.email, input.email),
              eq(verificationCodes.code, input.code)
            )
          );

        return { success: true, message: "邮箱验证成功" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("邮箱验证失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "邮箱验证失败，请重试",
        });
      }
    }),

  // 获取当前用户信息
  me: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (result.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "用户不存在",
      });
    }

    const user = result[0];
    return {
      id: user.id,
      username: user.username || "",
      email: user.email || "",
      name: user.name || "",
      role: user.role,
    };
  }),

  // 更新用户资料
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(20).optional(),
        school: z.string().max(200).optional(),
        grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]).optional(),
        userType: z.enum(["student", "parent", "teacher"]).optional(),
        region: z.string().max(100).optional(),
        learningGoals: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 构建更新对象
      const updateData: any = {};

      if (input.name) updateData.name = input.name;
      if (input.email) updateData.email = input.email;
      if (input.phone) updateData.phone = input.phone;
      if (input.school) updateData.school = input.school;
      if (input.grade) updateData.grade = input.grade;
      if (input.userType) updateData.userType = input.userType;
      if (input.region) updateData.region = input.region;
      if (input.learningGoals) updateData.learningGoals = input.learningGoals;

      // 更新用户资料
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "用户资料已更新",
      };
    }),

  // 登出
  logout: protectedProcedure.mutation(async () => {
    return { success: true, message: "已登出" };
  }),
});
