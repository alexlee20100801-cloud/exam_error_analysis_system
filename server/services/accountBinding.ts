import { db } from "../db";
import { users, accountBindingHistory } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * 获取用户的账号绑定状态
 */
export async function getBindingStatus(userId: number) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "用户不存在",
    });
  }

  const user = result[0];

  return {
    phone: {
      bound: !!user.phone,
      value: user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : null,
      verified: !!user.phoneVerified,
    },
    wechat: {
      bound: !!user.wechat_open_id,
      nickname: user.wechat_nickname || null,
    },
    username: {
      bound: !!user.username,
      value: user.username || null,
    },
    email: {
      bound: !!user.email,
      value: user.email ? user.email.replace(/(.{2}).*(@.*)/, "$1***$2") : null,
      verified: !!user.email_verified,
    },
  };
}

/**
 * 获取账号绑定历史
 */
export async function getBindingHistory(userId: number, limit: number = 20) {
  const history = await db
    .select()
    .from(accountBindingHistory)
    .where(eq(accountBindingHistory.userId, userId))
    .orderBy(desc(accountBindingHistory.createdAt))
    .limit(limit);

  return history.map((record) => ({
    id: record.id,
    type: record.bindingType,
    action: record.action,
    oldValue: record.oldValue ? maskValue(record.oldValue, record.bindingType) : null,
    newValue: record.newValue ? maskValue(record.newValue, record.bindingType) : null,
    createdAt: record.createdAt,
  }));
}

/**
 * 脱敏显示值
 */
function maskValue(value: string, type: string): string {
  switch (type) {
    case "phone":
      return value.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    case "email":
      return value.replace(/(.{2}).*(@.*)/, "$1***$2");
    case "wechat":
      return value.length > 4 ? value.slice(0, 2) + "***" + value.slice(-2) : "***";
    default:
      return value;
  }
}

/**
 * 绑定用户名和密码
 */
export async function bindUsername(params: {
  userId: number;
  username: string;
  password: string;
}): Promise<void> {
  const { userId, username, password } = params;

  // 检查用户名是否已被使用
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUser.length > 0 && existingUser[0].id !== userId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "用户名已被使用",
    });
  }

  // 获取当前用户
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

  const oldUsername = currentUser[0].username;

  // 导入密码哈希函数
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 12);

  // 更新用户名和密码
  await db
    .update(users)
    .set({ username, passwordHash })
    .where(eq(users.id, userId));

  // 记录绑定历史
  await db.insert(accountBindingHistory).values({
    userId,
    bindingType: "username",
    action: "bind",
    oldValue: oldUsername || null,
    newValue: username,
  });
}

/**
 * 解绑用户名（需要有其他登录方式）
 */
export async function unbindUsername(userId: number): Promise<void> {
  // 获取当前用户
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
  const hasOtherLoginMethod = user.phone || user.wechat_open_id;
  if (!hasOtherLoginMethod) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "无法解绑用户名，请先绑定其他登录方式",
    });
  }

  const oldUsername = user.username;

  // 解绑用户名和密码
  await db
    .update(users)
    .set({ username: null, passwordHash: null })
    .where(eq(users.id, userId));

  // 记录解绑历史
  await db.insert(accountBindingHistory).values({
    userId,
    bindingType: "username",
    action: "unbind",
    oldValue: oldUsername || null,
    newValue: null,
  });
}

/**
 * 检查是否可以解绑某种登录方式
 */
export async function canUnbind(userId: number, type: "phone" | "wechat" | "username"): Promise<boolean> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) {
    return false;
  }

  const user = result[0];

  // 计算当前有多少种登录方式
  let loginMethodCount = 0;
  if (user.phone) loginMethodCount++;
  if (user.wechat_open_id) loginMethodCount++;
  if (user.passwordHash) loginMethodCount++;

  // 至少保留一种登录方式
  return loginMethodCount > 1;
}
