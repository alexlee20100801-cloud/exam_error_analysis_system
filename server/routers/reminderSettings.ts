import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getUserReminderSettings,
  updateUserReminderSettings,
  getUserReminderHistory,
} from "../services/reviewTaskReminderService";
import { getDb } from "../db";
import { users, userReminderSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEmailVerification } from "../services/emailNotificationService";
import { unbindWechatAccount, generateWechatBindQRCode } from "../services/wechatNotificationService";

export const reminderSettingsRouter = router({
  /**
   * 获取用户的提醒设置
   */
  getSettings: protectedProcedure.query(async ({ ctx }: any) => {
    const settings = await getUserReminderSettings(ctx.user.id);
    return {
      success: true,
      data: settings,
    };
  }),

  /**
   * 更新用户的提醒设置
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        reminderMinutes: z.array(z.number()).min(1).max(10),
        notificationChannels: z.array(z.enum(["system", "email", "wechat"])).optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      // 如果指定了通知渠道，需要更新userReminderSettings
      if (input.notificationChannels) {
        const [existing] = await db
          .select()
          .from(userReminderSettings)
          .where(eq(userReminderSettings.userId, ctx.user.id))
          .limit(1);

        if (existing) {
          await db
            .update(userReminderSettings)
            .set({
              enabled: input.enabled,
              reminderMinutes: input.reminderMinutes as any,
              notificationChannels: input.notificationChannels as any,
              // @ts-ignore
              updatedAt: new Date(),
            })
            .where(eq(userReminderSettings.userId, ctx.user.id));
        } else {
          await db.insert(userReminderSettings).values({
            userId: ctx.user.id,
            enabled: input.enabled,
            reminderMinutes: input.reminderMinutes as any,
            notificationChannels: input.notificationChannels as any,
          });
        }
      } else {
        // 如果没有指定通知渠道，使用原有的更新逻辑
        await updateUserReminderSettings(
          ctx.user.id,
          input.enabled,
          input.reminderMinutes
        );
      }

      return {
        success: true,
        message: "提醒设置已更新",
      };
    }),

  /**
   * 绑定邮箱
   */
  bindEmail: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      // 更新用户邮箱
      await db
        .update(users)
        .set({
          email: input.email,
          emailVerified: false, // 需要验证
          // @ts-ignore
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      // 发送验证邮件
      const verificationToken = `${ctx.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      // TODO: 将token存储到数据库或Redis，设置24小时过期
      await sendEmailVerification(input.email, verificationToken);

      return {
        success: true,
        message: "验证邮件已发送，请检查你的邮箱",
      };
    }),

  /**
   * 解绑邮箱
   */
  unbindEmail: protectedProcedure
    .mutation(async ({ ctx }: any) => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      await db
        .update(users)
        .set({
          email: null,
          emailVerified: false,
          // @ts-ignore
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "邮箱已解绑",
      };
    }),

  /**
   * 生成微信绑定二维码
   */
  generateWechatQRCode: protectedProcedure
    .query(async ({ ctx }: any) => {
      const qrCode = await generateWechatBindQRCode(ctx.user.id);

      if (!qrCode) {
        return {
          success: false,
          message: "微信功能未配置",
        };
      }

      return {
        success: true,
        data: qrCode,
      };
    }),

  /**
   * 解绑微信
   */
  unbindWechat: protectedProcedure
    .mutation(async ({ ctx }: any) => {
      const success = await unbindWechatAccount(ctx.user.id);

      return {
        success,
        message: success ? "微信已解绑" : "解绑失败",
      };
    }),

  /**
   * 获取提醒历史
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }: any) => {
      const history = await getUserReminderHistory(ctx.user.id, input.limit);

      return {
        success: true,
        data: history,
      };
    }),
});
