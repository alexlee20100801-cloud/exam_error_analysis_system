import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { userNotifications } from "../../drizzle/notification_schema";
import { eq, and, desc, count } from "drizzle-orm";

export const userNotificationHistoryRouter = router({
  // 获取用户通知列表
  getNotifications: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(50).default(10),
      type: z.string().optional(),
      channel: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, type } = input;
      const userId = ctx.user.id;
      const offset = (page - 1) * pageSize;

      // 构建查询条件
      const conditions: any[] = [eq(userNotifications.userId, userId)];
      
      if (type) {
        conditions.push(eq(userNotifications.type, type));
      }

      // 查询通知列表
      const notifications = await db
        .select()
        .from(userNotifications)
        .where(and(...conditions))
        .orderBy(desc(userNotifications.createdAt))
        .limit(pageSize)
        .offset(offset);

      // 获取总数
      const totalResult = await db
        .select({ count: count() })
        .from(userNotifications)
        .where(and(...conditions));

      const total = totalResult[0]?.count || 0;

      return {
        items: notifications.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          type: n.type,
          channel: "system",
          status: "sent",
          isRead: n.isRead === 1,
          sentAt: n.createdAt,
          readAt: n.readAt,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // 获取通知统计
  getNotificationStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // 总通知数
    const totalResult = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId));

    // 未读通知数
    const unreadResult = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.isRead, 0)
      ));

    return {
      total: totalResult[0]?.count || 0,
      unread: unreadResult[0]?.count || 0,
      sent: totalResult[0]?.count || 0,
      failed: 0,
    };
  }),

  // 标记单个通知为已读
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      await db
        .update(userNotifications)
        .set({
          isRead: 1,
          readAt: new Date(),
        })
        .where(and(
          eq(userNotifications.id, input.notificationId),
          eq(userNotifications.userId, userId)
        ));

      return { success: true };
    }),

  // 标记所有通知为已读
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    await db
      .update(userNotifications)
      .set({
        isRead: 1,
        readAt: new Date(),
      })
      .where(and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.isRead, 0)
      ));

    return { success: true };
  }),

  // 删除已读通知
  clearReadNotifications: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    await db
      .delete(userNotifications)
      .where(and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.isRead, 1)
      ));

    return { success: true };
  }),
});
