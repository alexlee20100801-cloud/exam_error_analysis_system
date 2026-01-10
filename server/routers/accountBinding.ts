import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getBindingStatus,
  getBindingHistory,
  bindUsername,
  unbindUsername,
  canUnbind,
} from "../services/accountBinding";

export const accountBindingRouter = router({
  // 获取账号绑定状态
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return getBindingStatus(ctx.user.id);
  }),

  // 获取账号绑定历史
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return getBindingHistory(ctx.user.id, input?.limit);
    }),

  // 绑定用户名和密码
  bindUsername: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
        password: z.string().min(6).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await bindUsername({
        userId: ctx.user.id,
        username: input.username,
        password: input.password,
      });
      return { success: true };
    }),

  // 解绑用户名
  unbindUsername: protectedProcedure.mutation(async ({ ctx }) => {
    await unbindUsername(ctx.user.id);
    return { success: true };
  }),

  // 检查是否可以解绑某种登录方式
  canUnbind: protectedProcedure
    .input(
      z.object({
        type: z.enum(["phone", "wechat", "username"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await canUnbind(ctx.user.id, input.type);
      return { canUnbind: result };
    }),
});
