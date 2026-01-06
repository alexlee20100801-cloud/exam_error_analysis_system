/**
 * 推送配置API路由
 * 管理员管理推送配置
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createPushConfig,
  updatePushConfig,
  deletePushConfig,
  getPushConfig,
  getAllPushConfigs,
  togglePushConfig,
  previewPushConfig,
} from "../services/push-config.service";
import { executePushTask } from "../services/push-execution.service";
import { getUserGroupStats } from "../services/user-grouping.service";

// 管理员权限验证
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators can access this resource",
    });
  }
  return next({ ctx });
});

export const pushConfigRouter = router({
  /**
   * 创建推送配置
   */
  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        pushType: z.enum(["question", "knowledge", "resource"]),
        targetFilters: z.object({
          schoolLevel: z.enum(["junior", "senior"]).optional(),
          grades: z.array(z.string()).optional(),
          subjects: z.array(z.string()).optional(),
          planIds: z.array(z.number()).optional(),
          subscriptionStatus: z.enum(["active", "expired", "cancelled"]).optional(),
        }),
        contentConfig: z.object({
          questionIds: z.array(z.number()).optional(),
          knowledgePointIds: z.array(z.number()).optional(),
          resourceUrls: z.array(z.string()).optional(),
          customMessage: z.string().optional(),
        }),
        frequency: z.enum(["daily", "weekly", "monthly", "once"]),
        pushTime: z.string().regex(/^\d{2}:\d{2}$/),
        channels: z.array(z.enum(["system", "email", "wechat"])),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const configId = await createPushConfig({
        ...input,
        createdBy: ctx.user.id,
      });
      return { configId };
    }),

  /**
   * 更新推送配置
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        targetFilters: z
          .object({
            schoolLevel: z.enum(["junior", "senior"]).optional(),
            grades: z.array(z.string()).optional(),
            subjects: z.array(z.string()).optional(),
            planIds: z.array(z.number()).optional(),
            subscriptionStatus: z.enum(["active", "expired", "cancelled"]).optional(),
          })
          .optional(),
        contentConfig: z
          .object({
            questionIds: z.array(z.number()).optional(),
            knowledgePointIds: z.array(z.number()).optional(),
            resourceUrls: z.array(z.string()).optional(),
            customMessage: z.string().optional(),
          })
          .optional(),
        frequency: z.enum(["daily", "weekly", "monthly", "once"]).optional(),
        pushTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        channels: z.array(z.enum(["system", "email", "wechat"])).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePushConfig(id, data);
      return { success: true };
    }),

  /**
   * 删除推送配置
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePushConfig(input.id);
      return { success: true };
    }),

  /**
   * 获取推送配置详情
   */
  get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const config = await getPushConfig(input.id);
    if (!config) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Push config not found",
      });
    }
    return config;
  }),

  /**
   * 获取所有推送配置
   */
  getAll: adminProcedure
    .input(
      z
        .object({
          isEnabled: z.boolean().optional(),
          pushType: z.enum(["question", "knowledge", "resource"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await getAllPushConfigs(input);
    }),

  /**
   * 启用/禁用推送配置
   */
  toggle: adminProcedure
    .input(
      z.object({
        id: z.number(),
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await togglePushConfig(input.id, input.isEnabled);
      return { success: true };
    }),

  /**
   * 预览推送配置（获取目标用户数量和统计）
   */
  preview: adminProcedure
    .input(
      z.object({
        schoolLevel: z.enum(["junior", "senior"]).optional(),
        grades: z.array(z.string()).optional(),
        subjects: z.array(z.string()).optional(),
        planIds: z.array(z.number()).optional(),
        subscriptionStatus: z.enum(["active", "expired", "cancelled"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const preview = await previewPushConfig(input);
      const stats = await getUserGroupStats(input);
      return {
        ...preview,
        stats,
      };
    }),

  /**
   * 手动执行推送任务
   */
  execute: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await executePushTask(input.id);
      return result;
    }),
});
