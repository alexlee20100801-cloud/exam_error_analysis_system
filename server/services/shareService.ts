/**
 * 错题集分享服务
 */

import { getDb } from "../db";
import { errorQuestionShares, shareAccessLogs } from "../../drizzle/share_schema";
import { errorQuestions } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

/**
 * 生成唯一的分享码
 */
function generateShareCode(): string {
  return crypto.randomBytes(6).toString("base64url");
}

/**
 * 创建分享链接
 */
export async function createShare(
  userId: number,
  questionIds: number[],
  title: string,
  description?: string,
  accessType: "public" | "password" = "public",
  password?: string,
  expiresAt?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 生成唯一的分享码
  let shareCode = generateShareCode();
  let attempts = 0;
  const maxAttempts = 10;

  // 确保分享码唯一
  while (attempts < maxAttempts) {
    const existing = await db
      .select()
      .from(errorQuestionShares)
      .where(eq(errorQuestionShares.shareCode, shareCode))
      .limit(1);

    if (existing.length === 0) {
      break;
    }

    shareCode = generateShareCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error("生成分享码失败，请重试");
  }

  // 创建分享记录
  const result = await db.insert(errorQuestionShares).values({
    userId,
    shareCode,
    title,
    description,
    questionIds: JSON.stringify(questionIds),
    accessType,
    password: password ? hashPassword(password) : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    viewCount: 0,
    downloadCount: 0,
    isActive: 1,
  });

  return {
    id: Number(result[0].insertId),
    shareCode,
    shareUrl: `/share/${shareCode}`,
  };
}

/**
 * 获取分享详情
 */
export async function getShareByCode(shareCode: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const shares = await db
    .select()
    .from(errorQuestionShares)
    .where(
      and(
        eq(errorQuestionShares.shareCode, shareCode),
        eq(errorQuestionShares.isActive, 1)
      )
    )
    .limit(1);

  if (shares.length === 0) {
    return null;
  }

  const share = shares[0];

  // 检查是否过期
  if (share.expiresAt) {
    const expiresAt = new Date(share.expiresAt);
    if (expiresAt < new Date()) {
      return null; // 已过期
    }
  }

  return share;
}

/**
 * 验证分享密码
 */
export function verifySharePassword(sharePassword: string, inputPassword: string): boolean {
  return hashPassword(inputPassword) === sharePassword;
}

/**
 * 获取分享的错题列表
 */
export async function getSharedQuestions(shareCode: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const share = await getShareByCode(shareCode);
  if (!share) {
    throw new Error("分享不存在或已过期");
  }

  // 解析错题ID列表
  const questionIds = JSON.parse(share.questionIds as string) as number[];

  // 查询错题详情
  const questions = await db
    .select()
    .from(errorQuestions)
    .where(eq(errorQuestions.id, questionIds[0])); // 先查第一个

  // 由于drizzle的限制，需要逐个查询
  const allQuestions = [];
  for (const questionId of questionIds) {
    const result = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, questionId))
      .limit(1);

    if (result.length > 0) {
      allQuestions.push(result[0]);
    }
  }

  return {
    share: {
      id: share.id,
      title: share.title,
      description: share.description,
      createdAt: share.createdAt,
      viewCount: share.viewCount,
      downloadCount: share.downloadCount,
    },
    questions: allQuestions,
  };
}

/**
 * 记录分享访问
 */
export async function recordShareAccess(
  shareId: number,
  action: "view" | "download",
  visitorId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 记录访问日志
  await db.insert(shareAccessLogs).values({
    shareId,
    visitorId,
    ipAddress,
    userAgent,
    action,
  });

  // 更新统计数据
  if (action === "view") {
    await db
      .update(errorQuestionShares)
      .set({
        viewCount: (errorQuestionShares.viewCount as any) + 1,
      })
      .where(eq(errorQuestionShares.id, shareId));
  } else if (action === "download") {
    await db
      .update(errorQuestionShares)
      .set({
        downloadCount: (errorQuestionShares.downloadCount as any) + 1,
      })
      .where(eq(errorQuestionShares.id, shareId));
  }
}

/**
 * 获取用户的所有分享
 */
export async function getUserShares(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const shares = await db
    .select()
    .from(errorQuestionShares)
    .where(eq(errorQuestionShares.userId, userId))
    .orderBy(desc(errorQuestionShares.createdAt));

  return shares.map((share: any) => ({
    ...share,
    questionCount: (JSON.parse(share.questionIds as string) as number[]).length,
  }));
}

/**
 * 删除分享
 */
export async function deleteShare(shareId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 验证所有权
  const shares = await db
    .select()
    .from(errorQuestionShares)
    .where(
      and(
        eq(errorQuestionShares.id, shareId),
        eq(errorQuestionShares.userId, userId)
      )
    )
    .limit(1);

  if (shares.length === 0) {
    throw new Error("分享不存在或无权删除");
  }

  // 软删除（设置为不活跃）
  await db
    .update(errorQuestionShares)
    .set({ isActive: 0 })
    .where(eq(errorQuestionShares.id, shareId));

  return true;
}

/**
 * 更新分享
 */
export async function updateShare(
  shareId: number,
  userId: number,
  updates: {
    title?: string;
    description?: string;
    accessType?: "public" | "password";
    password?: string;
    expiresAt?: Date | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 验证所有权
  const shares = await db
    .select()
    .from(errorQuestionShares)
    .where(
      and(
        eq(errorQuestionShares.id, shareId),
        eq(errorQuestionShares.userId, userId)
      )
    )
    .limit(1);

  if (shares.length === 0) {
    throw new Error("分享不存在或无权修改");
  }

  // 构建更新数据
  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.accessType !== undefined) updateData.accessType = updates.accessType;
  if (updates.password !== undefined) {
    updateData.password = updates.password ? hashPassword(updates.password) : null;
  }
  if (updates.expiresAt !== undefined) {
    updateData.expiresAt = updates.expiresAt ? updates.expiresAt.toISOString() : null;
  }

  // 更新分享
  await db
    .update(errorQuestionShares)
    .set(updateData)
    .where(eq(errorQuestionShares.id, shareId));

  return true;
}

/**
 * 简单的密码哈希函数（实际应用中应使用bcrypt等更安全的方法）
 */
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}
