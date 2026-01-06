import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllTemplates,
  getTemplateByType,
  saveTemplate,
  deleteTemplate,
  initializeDefaultTemplates,
  EMAIL_TEMPLATE_TYPES,
  TEMPLATE_VARIABLES,
  replaceTemplateVariables,
} from "../services/emailTemplateService";

/**
 * 管理员权限检查
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有管理员可以管理邮件模板",
    });
  }
  return next({ ctx });
});

export const emailTemplateRouter = router({
  /**
   * 获取所有模板
   */
  getAll: adminProcedure.query(async () => {
    return await getAllTemplates();
  }),

  /**
   * 根据类型获取模板
   */
  getByType: adminProcedure
    .input(
      z.object({
        templateType: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await getTemplateByType(input.templateType);
    }),

  /**
   * 保存模板（创建或更新）
   */
  save: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        templateType: z.string(),
        name: z.string(),
        description: z.string().optional(),
        subject: z.string(),
        htmlContent: z.string(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await saveTemplate(input, ctx.user.id);
      return { success: true, message: "模板保存成功" };
    }),

  /**
   * 删除模板
   */
  delete: adminProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await deleteTemplate(input.id);
      return { success: true, message: "模板删除成功" };
    }),

  /**
   * 初始化默认模板
   */
  initializeDefaults: adminProcedure.mutation(async ({ ctx }) => {
    await initializeDefaultTemplates(ctx.user.id);
    return { success: true, message: "默认模板初始化成功" };
  }),

  /**
   * 获取模板类型列表
   */
  getTemplateTypes: adminProcedure.query(() => {
    return Object.entries(EMAIL_TEMPLATE_TYPES).map(([key, value]) => ({
      key,
      value,
    }));
  }),

  /**
   * 获取模板可用变量
   */
  getAvailableVariables: adminProcedure
    .input(
      z.object({
        templateType: z.string(),
      })
    )
    .query(({ input }) => {
      return TEMPLATE_VARIABLES[input.templateType as keyof typeof TEMPLATE_VARIABLES] || [];
    }),

  /**
   * 预览模板（使用示例数据）
   */
  preview: adminProcedure
    .input(
      z.object({
        subject: z.string(),
        htmlContent: z.string(),
        templateType: z.string(),
      })
    )
    .mutation(({ input }) => {
      // 示例变量数据
      const sampleVariables: Record<string, Record<string, string>> = {
        [EMAIL_TEMPLATE_TYPES.EMAIL_VERIFICATION]: {
          userName: "张三",
          userEmail: "zhangsan@example.com",
          verificationUrl: "https://example.com/verify-email/sample-token",
          expiryHours: "24",
          systemName: "深圳初高中错题分析学习系统",
        },
        [EMAIL_TEMPLATE_TYPES.REVIEW_REMINDER]: {
          userName: "张三",
          taskTitle: "数学错题复习",
          taskDescription: "复习本周的数学错题，重点关注函数和几何题型",
          scheduledDate: "2024-01-15 14:00",
          taskUrl: "https://example.com/tasks/123",
          systemName: "深圳初高中错题分析学习系统",
        },
        [EMAIL_TEMPLATE_TYPES.SYSTEM_NOTIFICATION]: {
          userName: "张三",
          notificationTitle: "系统升级通知",
          notificationContent: "系统将于今晚22:00-23:00进行升级维护，期间可能无法访问。",
          actionUrl: "https://example.com/notifications",
          systemName: "深圳初高中错题分析学习系统",
        },
        [EMAIL_TEMPLATE_TYPES.WELCOME]: {
          userName: "张三",
          userEmail: "zhangsan@example.com",
          loginUrl: "https://example.com/login",
          systemName: "深圳初高中错题分析学习系统",
        },
      };

      const variables = sampleVariables[input.templateType] || {};

      return {
        subject: replaceTemplateVariables(input.subject, variables),
        htmlContent: replaceTemplateVariables(input.htmlContent, variables),
      };
    }),
});
