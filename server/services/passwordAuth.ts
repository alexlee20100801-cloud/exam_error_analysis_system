import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { TRPCError } from "@trpc/server";

const SALT_ROUNDS = 12;

/**
 * 密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 根据用户名查找用户
 */
export async function findUserByUsername(username: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0] || null;
}

/**
 * 根据邮箱查找用户
 */
export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
}

/**
 * 检查用户名是否已存在
 */
export async function isUsernameExists(username: string): Promise<boolean> {
  const user = await findUserByUsername(username);
  return user !== null;
}

/**
 * 检查邮箱是否已存在
 */
export async function isEmailExists(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return user !== null;
}

/**
 * 用户注册
 */
export async function registerUser(params: {
  username: string;
  password: string;
  email?: string;
  name?: string;
}): Promise<{ userId: number; openId: string }> {
  const { username, password, email, name } = params;

  // 检查用户名是否已存在
  if (await isUsernameExists(username)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "用户名已存在",
    });
  }

  // 检查邮箱是否已存在（如果提供了邮箱）
  if (email && (await isEmailExists(email))) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "邮箱已被注册",
    });
  }

  // 生成密码哈希
  const passwordHash = await hashPassword(password);

  // 生成唯一的openId（用于与现有系统兼容）
  const openId = `local_${uuidv4()}`;

  // 创建用户
  const result = await db.insert(users).values({
    openId,
    username,
    passwordHash,
    email: email || null,
    name: name || username,
    loginMethod: "password",
    role: "user",
  });

  const userId = Number(result[0].insertId);

  return { userId, openId };
}

/**
 * 用户登录（用户名或邮箱）
 */
export async function loginUser(params: {
  account: string; // 用户名或邮箱
  password: string;
}): Promise<{ user: typeof users.$inferSelect; sessionToken: string }> {
  const { account, password } = params;

  // 查找用户（支持用户名或邮箱登录）
  const result = await db
    .select()
    .from(users)
    .where(or(eq(users.username, account), eq(users.email, account)))
    .limit(1);

  const user = result[0];

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "用户不存在",
    });
  }

  // 检查是否设置了密码
  if (!user.passwordHash) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "该账户未设置密码，请使用其他方式登录",
    });
  }

  // 验证密码
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "密码错误",
    });
  }

  // 更新最后登录时间
  await db
    .update(users)
    .set({ lastSignedIn: new Date().toISOString() })
    .where(eq(users.id, user.id));

  // 生成session token
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || user.username || "",
  });

  return { user, sessionToken };
}

/**
 * 修改密码
 */
export async function changePassword(params: {
  userId: number;
  oldPassword: string;
  newPassword: string;
}): Promise<void> {
  const { userId, oldPassword, newPassword } = params;

  // 查找用户
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = result[0];

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "用户不存在",
    });
  }

  // 如果用户已有密码，验证旧密码
  if (user.passwordHash) {
    const isValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "原密码错误",
      });
    }
  }

  // 生成新密码哈希
  const newPasswordHash = await hashPassword(newPassword);

  // 更新密码
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash })
    .where(eq(users.id, userId));
}

/**
 * 为现有用户设置密码（OAuth用户绑定密码）
 */
export async function setPasswordForUser(params: {
  userId: number;
  username: string;
  password: string;
}): Promise<void> {
  const { userId, username, password } = params;

  // 检查用户名是否已被其他用户使用
  const existingUser = await findUserByUsername(username);
  if (existingUser && existingUser.id !== userId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "用户名已被使用",
    });
  }

  // 生成密码哈希
  const passwordHash = await hashPassword(password);

  // 更新用户信息
  await db
    .update(users)
    .set({ username, passwordHash })
    .where(eq(users.id, userId));
}
