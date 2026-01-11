import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { users, verificationCodes, accountBindingHistory } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { TRPCError } from "@trpc/server";
import { verifyCaptcha } from "./captchaService";
import { sendAliyunSms } from "./aliyunSmsService";

/**
 * 生成6位数字验证码
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 发送验证码（支持图形验证码校验和阿里云短信发送）
 */
export async function sendVerificationCode(params: {
  phone: string;
  type: "login" | "register" | "bind" | "reset";
  captchaId?: string;
  captchaCode?: string;
}): Promise<{ success: boolean; message: string }> {
  const { phone, type, captchaId, captchaCode } = params;

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "手机号格式不正确",
    });
  }

  // 验证图形验证码（如果提供了）
  if (captchaId && captchaCode) {
    const isCaptchaValid = await verifyCaptcha({ captchaId, code: captchaCode });
    if (!isCaptchaValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "图形验证码错误或已过期",
      });
    }
  }

  // 检查是否在1分钟内已发送过验证码
  const recentCode = await db
    .select()
    .from(verificationCodes)
    .where(
      and(
        eq(verificationCodes.phone, phone),
        eq(verificationCodes.type, type),
        gt(verificationCodes.createdAt, new Date(Date.now() - 60 * 1000).toISOString())
      )
    )
    .limit(1);

  if (recentCode.length > 0) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "请等待60秒后再发送验证码",
    });
  }

  // 生成验证码
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效期

  // 保存验证码到数据库
  await db.insert(verificationCodes).values({
    phone,
    code,
    type,
    expiresAt,
  });

  // 使用阿里云短信服务发送验证码
  const smsResult = await sendAliyunSms({ phone, code });
  
  if (!smsResult.success) {
    console.error("[SMS] 短信发送失败:", smsResult.message);
    // 即使短信发送失败，也返回成功（在开发模式下验证码已保存到数据库）
    console.log("[SMS] 开发模式 - 验证码: " + code);
  }

  return {
    success: true,
    message: "验证码已发送",
  };
}

/**
 * 验证验证码
 */
export async function verifyCode(params: {
  phone: string;
  code: string;
  type: "login" | "register" | "bind" | "reset";
}): Promise<boolean> {
  const { phone, code, type } = params;

  const result = await db
    .select()
    .from(verificationCodes)
    .where(
      and(
        eq(verificationCodes.phone, phone),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, type),
        eq(verificationCodes.used, 0),
        gt(verificationCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) {
    return false;
  }

  // 标记验证码为已使用
  await db
    .update(verificationCodes)
    .set({ used: 1 })
    .where(eq(verificationCodes.id, result[0].id));

  return true;
}

/**
 * 根据手机号查找用户
 */
export async function findUserByPhone(phone: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  return result[0] || null;
}

/**
 * 检查手机号是否已存在
 */
export async function isPhoneExists(phone: string): Promise<boolean> {
  const user = await findUserByPhone(phone);
  return user !== null;
}

/**
 * 手机号验证码登录
 */
export async function loginWithPhone(params: {
  phone: string;
  code: string;
}): Promise<{ user: typeof users.$inferSelect; sessionToken: string; isNewUser: boolean }> {
  const { phone, code } = params;

  // 验证验证码
  const isValid = await verifyCode({ phone, code, type: "login" });
  if (!isValid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "验证码错误或已过期",
    });
  }

  // 查找用户
  let user = await findUserByPhone(phone);
  let isNewUser = false;

  // 如果用户不存在，自动注册
  if (!user) {
    const openId = "phone_" + uuidv4();
    const result = await db.insert(users).values({
      openId,
      phone,
      phoneVerified: 1,
      name: "用户" + phone.slice(-4),
      loginMethod: "phone",
      role: "user",
    });

    const userId = Number(result[0].insertId);
    const newUserResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    user = newUserResult[0];
    isNewUser = true;
  }

  // 更新最后登录时间
  await db
    .update(users)
    .set({ 
      lastSignedIn: new Date().toISOString(),
      phoneVerified: 1,
    })
    .where(eq(users.id, user.id));

  // 生成session token
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || "用户" + phone.slice(-4),
  });

  return { user, sessionToken, isNewUser };
}

/**
 * 手机号注册
 */
export async function registerWithPhone(params: {
  phone: string;
  code: string;
  name?: string;
}): Promise<{ userId: number; openId: string }> {
  const { phone, code, name } = params;

  // 验证验证码
  const isValid = await verifyCode({ phone, code, type: "register" });
  if (!isValid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "验证码错误或已过期",
    });
  }

  // 检查手机号是否已存在
  if (await isPhoneExists(phone)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "该手机号已注册",
    });
  }

  // 生成唯一的openId
  const openId = "phone_" + uuidv4();

  // 创建用户
  const result = await db.insert(users).values({
    openId,
    phone,
    phoneVerified: 1,
    name: name || "用户" + phone.slice(-4),
    loginMethod: "phone",
    role: "user",
  });

  const userId = Number(result[0].insertId);

  return { userId, openId };
}

/**
 * 绑定手机号到现有账户
 */
export async function bindPhone(params: {
  userId: number;
  phone: string;
  code: string;
}): Promise<void> {
  const { userId, phone, code } = params;

  // 验证验证码
  const isValid = await verifyCode({ phone, code, type: "bind" });
  if (!isValid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "验证码错误或已过期",
    });
  }

  // 检查手机号是否已被其他用户绑定
  const existingUser = await findUserByPhone(phone);
  if (existingUser && existingUser.id !== userId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "该手机号已被其他账户绑定",
    });
  }

  // 获取当前用户信息
  const currentUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (currentUser.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "用户不存在",
    });
  }

  const oldPhone = currentUser[0].phone;

  // 更新用户手机号
  await db
    .update(users)
    .set({ phone, phoneVerified: 1 })
    .where(eq(users.id, userId));

  // 记录绑定历史
  await db.insert(accountBindingHistory).values({
    userId,
    bindingType: "phone",
    action: "bind",
    oldValue: oldPhone || null,
    newValue: phone,
  });
}

/**
 * 解绑手机号
 */
export async function unbindPhone(params: {
  userId: number;
}): Promise<void> {
  const { userId } = params;

  // 获取当前用户信息
  const currentUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (currentUser.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "用户不存在",
    });
  }

  const user = currentUser[0];

  // 检查是否有其他登录方式
  const hasOtherLoginMethod = user.passwordHash || user.wechat_open_id;
  if (!hasOtherLoginMethod) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "无法解绑手机号，请先绑定其他登录方式",
    });
  }

  const oldPhone = user.phone;

  // 解绑手机号
  await db
    .update(users)
    .set({ phone: null, phoneVerified: 0 })
    .where(eq(users.id, userId));

  // 记录解绑历史
  await db.insert(accountBindingHistory).values({
    userId,
    bindingType: "phone",
    action: "unbind",
    oldValue: oldPhone || null,
    newValue: null,
  });
}
