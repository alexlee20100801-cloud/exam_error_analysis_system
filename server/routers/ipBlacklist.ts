/**
 * IP黑名单管理路由
 * 提供管理员管理IP黑名单的API
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  isIpBlocked,
  addToBlacklist,
  removeFromBlacklist,
  getBlacklistEntries,
  getBlacklistStatistics,
  batchAddToBlacklist,
  batchRemoveFromBlacklist,
  cleanupExpiredEntries,
  getIpBlockHistory,
  getIpRateLimitStatus,
  autoBlockAbusiveIps,
} from "../services/ipBlacklistService";

export const ipBlacklistRouter = router({
  // 检查IP是否被封禁（管理员）
  checkIp: adminProcedure
    .input(z.object({
      ipAddress: z.string(),
    }))
    .query(async ({ input }) => {
      return await isIpBlocked(input.ipAddress);
    }),

  // 添加IP到黑名单（管理员）
  add: adminProcedure
    .input(z.object({
      ipAddress: z.string(),
      reason: z.string().min(1, "请填写封禁原因"),
      expiresAt: z.string().optional(), // ISO日期字符串，不填则永久封禁
    }))
    .mutation(async ({ input, ctx }) => {
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      return await addToBlacklist({
        ipAddress: input.ipAddress,
        reason: input.reason,
        blockedBy: ctx.user?.name || "admin",
        expiresAt,
      });
    }),

  // 从黑名单移除IP（管理员）
  remove: adminProcedure
    .input(z.object({
      ipAddress: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await removeFromBlacklist(input.ipAddress);
    }),

  // 获取黑名单列表（管理员）
  list: adminProcedure
    .input(z.object({
      ipAddress: z.string().optional(),
      isActive: z.boolean().optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      return await getBlacklistEntries(input);
    }),

  // 获取黑名单统计（管理员）
  statistics: adminProcedure.query(async () => {
    return await getBlacklistStatistics();
  }),

  // 批量添加IP到黑名单（管理员）
  batchAdd: adminProcedure
    .input(z.object({
      ipAddresses: z.array(z.string()).min(1).max(100),
      reason: z.string().min(1, "请填写封禁原因"),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      return await batchAddToBlacklist(
        input.ipAddresses,
        input.reason,
        ctx.user?.name || "admin",
        expiresAt
      );
    }),

  // 批量解封IP（管理员）
  batchRemove: adminProcedure
    .input(z.object({
      ipAddresses: z.array(z.string()).min(1).max(100),
    }))
    .mutation(async ({ input }) => {
      return await batchRemoveFromBlacklist(input.ipAddresses);
    }),

  // 清理过期封禁记录（管理员）
  cleanupExpired: adminProcedure.mutation(async () => {
    const count = await cleanupExpiredEntries();
    return {
      success: true,
      message: `已清理 ${count} 条过期记录`,
      count,
    };
  }),

  // 获取IP封禁历史（管理员）
  history: adminProcedure
    .input(z.object({
      ipAddress: z.string(),
    }))
    .query(async ({ input }) => {
      return await getIpBlockHistory(input.ipAddress);
    }),

  // 获取IP频率限制状态（管理员）
  rateLimitStatus: adminProcedure
    .input(z.object({
      ipAddress: z.string(),
    }))
    .query(async ({ input }) => {
      return await getIpRateLimitStatus(input.ipAddress);
    }),

  // 自动封禁滥用IP（管理员）
  autoBlock: adminProcedure
    .input(z.object({
      threshold: z.number().min(1).max(100).default(10),
    }))
    .mutation(async ({ input }) => {
      const blockedIps = await autoBlockAbusiveIps(input.threshold);
      return {
        success: true,
        message: `已自动封禁 ${blockedIps.length} 个滥用IP`,
        blockedIps,
      };
    }),
});
