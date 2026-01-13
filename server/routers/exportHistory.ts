import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as exportHistoryService from "../exportHistoryService";

export const exportHistoryRouter = router({
  // ==================== 导出历史记录 ====================
  
  // 获取用户导出历史
  getUserExportHistory: protectedProcedure
    .input(z.object({
      exportType: z.string().optional(),
      exportFormat: z.string().optional(),
      status: z.string().optional(),
      includeExpired: z.boolean().default(false),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      return await exportHistoryService.getUserExportHistory(ctx.user.id, input || {});
    }),
  
  // 获取导出历史详情
  getExportHistoryById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await exportHistoryService.getExportHistoryById(input.id, ctx.user.id);
    }),
  
  // 检查文件是否可下载
  checkFileAvailability: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await exportHistoryService.checkFileAvailability(input.id, ctx.user.id);
    }),
  
  // 记录下载
  recordDownload: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // 先验证用户权限
      const record = await exportHistoryService.getExportHistoryById(input.id, ctx.user.id);
      if (!record) {
        throw new Error("记录不存在或无权访问");
      }
      return await exportHistoryService.recordDownload(input.id);
    }),
  
  // 延长过期时间
  extendExpiry: protectedProcedure
    .input(z.object({
      id: z.number(),
      additionalDays: z.number().min(1).max(90).default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      return await exportHistoryService.extendExpiry(input.id, ctx.user.id, input.additionalDays);
    }),
  
  // 删除导出历史
  deleteExportHistory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await exportHistoryService.deleteExportHistory(input.id, ctx.user.id);
    }),
  
  // ==================== 统计功能 ====================
  
  // 获取用户导出统计
  getUserExportStats: protectedProcedure
    .query(async ({ ctx }) => {
      return await exportHistoryService.getUserExportStats(ctx.user.id);
    }),
  
  // 获取系统导出统计（管理员）
  getSystemExportStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }).optional())
    .query(async ({ input, ctx }) => {
      // 这里可以添加管理员权限检查
      return await exportHistoryService.getSystemExportStats(input?.days || 30);
    }),
  
  // ==================== 清理功能 ====================
  
  // 获取清理统计
  getCleanupStats: protectedProcedure
    .query(async () => {
      return await exportHistoryService.getCleanupStats();
    }),
  
  // 手动触发清理（管理员）
  triggerCleanup: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .mutation(async ({ input }) => {
      return await exportHistoryService.batchCleanupExpiredFiles(input?.limit || 50);
    }),
});
