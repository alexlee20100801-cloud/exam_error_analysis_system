import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getUserReminderSettings,
  updateUserReminderSettings,
  getUserReminderHistory,
} from "../services/reviewTaskReminderService";

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
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      await updateUserReminderSettings(
        ctx.user.id,
        input.enabled,
        input.reminderMinutes
      );

      return {
        success: true,
        message: "提醒设置已更新",
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
