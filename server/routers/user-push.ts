/**
 * 用户推送记录API路由
 * 用户查看自己的推送记录
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { userPushReceipts } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const userPushRouter = router({
  /**
   * 获取我的推送记录
   */
  getMyPushes: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        isRead: z.boolean().optional(),
        pushType: z.enum(["question", "knowledge", "resource"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection not available");
      }

      const conditions: any[] = [eq(userPushReceipts.userId, ctx.user.id)];

      if (input.isRead !== undefined) {
        conditions.push(eq(userPushReceipts.isRead, input.isRead));
      }

      if (input.pushType) {
        conditions.push(eq(userPushReceipts.pushType, input.pushType));
      }

      const pushes = await db
        .select()
        .from(userPushReceipts)
        .where(and(...conditions))
        .orderBy(desc(userPushReceipts.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // 获取总数
      const [countResult] = await db
        .select({ count: userPushReceipts.id })
        .from(userPushReceipts)
        .where(and(...conditions));

      return {
        pushes,
        total: pushes.length,
        hasMore: pushes.length === input.limit,
      };
    }),

  /**
   * 标记推送为已读
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection not available");
      }

      await db
        .update(userPushReceipts)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(eq(userPushReceipts.id, input.id), eq(userPushReceipts.userId, ctx.user.id)));

      return { success: true };
    }),

  /**
   * 标记推送为已点击
   */
  markAsClicked: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection not available");
      }

      await db
        .update(userPushReceipts)
        .set({
          isClicked: true,
          clickedAt: new Date(),
          isRead: true,
          readAt: new Date(),
        })
        .where(and(eq(userPushReceipts.id, input.id), eq(userPushReceipts.userId, ctx.user.id)));

      return { success: true };
    }),

  /**
   * 批量标记为已读
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    await db
      .update(userPushReceipts)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(eq(userPushReceipts.userId, ctx.user.id), eq(userPushReceipts.isRead, false)));

    return { success: true };
  }),

  /**
   * 获取未读推送数量
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    const [result] = await db
      .select({ count: userPushReceipts.id })
      .from(userPushReceipts)
      .where(and(eq(userPushReceipts.userId, ctx.user.id), eq(userPushReceipts.isRead, false)));

    return { count: result?.count || 0 };
  }),
});
