import { getDb } from "../db";
import { emailTemplates, type InsertEmailTemplate } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 邮件模板类型枚举
 */
export const EMAIL_TEMPLATE_TYPES = {
  EMAIL_VERIFICATION: "email_verification",
  REVIEW_REMINDER: "review_reminder",
  SYSTEM_NOTIFICATION: "system_notification",
  WELCOME: "welcome",
} as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[keyof typeof EMAIL_TEMPLATE_TYPES];

/**
 * 模板变量定义
 */
export const TEMPLATE_VARIABLES = {
  [EMAIL_TEMPLATE_TYPES.EMAIL_VERIFICATION]: [
    "userName",
    "userEmail",
    "verificationUrl",
    "expiryHours",
    "systemName",
  ],
  [EMAIL_TEMPLATE_TYPES.REVIEW_REMINDER]: [
    "userName",
    "taskTitle",
    "taskDescription",
    "scheduledDate",
    "taskUrl",
    "systemName",
  ],
  [EMAIL_TEMPLATE_TYPES.SYSTEM_NOTIFICATION]: [
    "userName",
    "notificationTitle",
    "notificationContent",
    "actionUrl",
    "systemName",
  ],
  [EMAIL_TEMPLATE_TYPES.WELCOME]: [
    "userName",
    "userEmail",
    "loginUrl",
    "systemName",
  ],
};

/**
 * 默认模板内容
 */
const DEFAULT_TEMPLATES = {
  [EMAIL_TEMPLATE_TYPES.EMAIL_VERIFICATION]: {
    name: "邮箱验证邮件",
    description: "用户绑定邮箱时发送的验证邮件",
    subject: "验证您的邮箱地址 - {{systemName}}",
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 验证您的邮箱</h1>
    </div>
    <div class="content">
      <p>您好{{userName}}，</p>
      <p>感谢您使用{{systemName}}！</p>
      <p>请点击下面的按钮验证您的邮箱地址：</p>
      <div style="text-align: center;">
        <a href="{{verificationUrl}}" class="button">验证邮箱</a>
      </div>
      <p>或者复制以下链接到浏览器中打开：</p>
      <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
        {{verificationUrl}}
      </p>
      <p style="color: #999; font-size: 14px; margin-top: 30px;">
        ⏰ 此验证链接将在{{expiryHours}}小时后过期。<br>
        ⚠️ 如果这不是您的操作，请忽略此邮件。
      </p>
    </div>
    <div class="footer">
      <p>© 2024 {{systemName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
  },
  [EMAIL_TEMPLATE_TYPES.REVIEW_REMINDER]: {
    name: "复习提醒邮件",
    description: "提醒用户复习任务的邮件",
    subject: "复习提醒：{{taskTitle}} - {{systemName}}",
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .task-info { background: #fff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f5576c; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ 复习提醒</h1>
    </div>
    <div class="content">
      <p>您好{{userName}}，</p>
      <p>您有一个复习任务即将到期：</p>
      <div class="task-info">
        <h3 style="margin-top: 0;">{{taskTitle}}</h3>
        <p>{{taskDescription}}</p>
        <p><strong>计划时间：</strong>{{scheduledDate}}</p>
      </div>
      <div style="text-align: center;">
        <a href="{{taskUrl}}" class="button">立即复习</a>
      </div>
      <p style="color: #999; font-size: 14px; margin-top: 30px;">
        💡 及时复习可以帮助您更好地巩固知识点！
      </p>
    </div>
    <div class="footer">
      <p>© 2024 {{systemName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
  },
  [EMAIL_TEMPLATE_TYPES.SYSTEM_NOTIFICATION]: {
    name: "系统通知邮件",
    description: "系统重要通知邮件",
    subject: "{{notificationTitle}} - {{systemName}}",
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .notification-box { background: #fff; padding: 20px; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 系统通知</h1>
    </div>
    <div class="content">
      <p>您好{{userName}}，</p>
      <div class="notification-box">
        <h3 style="margin-top: 0;">{{notificationTitle}}</h3>
        <p>{{notificationContent}}</p>
      </div>
      <div style="text-align: center;">
        <a href="{{actionUrl}}" class="button">查看详情</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2024 {{systemName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
  },
  [EMAIL_TEMPLATE_TYPES.WELCOME]: {
    name: "欢迎邮件",
    description: "新用户注册后的欢迎邮件",
    subject: "欢迎加入{{systemName}}！",
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #43e97b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 欢迎加入！</h1>
    </div>
    <div class="content">
      <p>您好{{userName}}，</p>
      <p>欢迎加入{{systemName}}！我们很高兴您成为我们的一员。</p>
      <p>您的账号已成功创建：</p>
      <p><strong>邮箱：</strong>{{userEmail}}</p>
      <div style="text-align: center;">
        <a href="{{loginUrl}}" class="button">开始使用</a>
      </div>
      <p style="color: #999; font-size: 14px; margin-top: 30px;">
        💡 如有任何问题，请随时联系我们的客服团队。
      </p>
    </div>
    <div class="footer">
      <p>© 2024 {{systemName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
  },
};

/**
 * 变量替换函数
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  
  // 替换所有 {{variable}} 格式的变量
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value));
  }
  
  return result;
}

/**
 * 初始化默认模板
 */
export async function initializeDefaultTemplates(adminId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    for (const [templateType, template] of Object.entries(DEFAULT_TEMPLATES)) {
      // 检查模板是否已存在
      const existing = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.templateType, templateType))
        .limit(1);

      if (existing.length === 0) {
        // 创建默认模板
        await db.insert(emailTemplates).values({
          templateType,
          name: template.name,
          description: template.description,
          subject: template.subject,
          htmlContent: template.htmlContent,
          availableVariables: TEMPLATE_VARIABLES[templateType as EmailTemplateType] as any,
          isDefault: true,
          isActive: true,
          lastModifiedBy: adminId,
        });
      }
    }
  } catch (error) {
    console.error("Failed to initialize default templates:", error);
    throw new Error("初始化默认模板失败");
  }
}

/**
 * 获取所有模板
 */
export async function getAllTemplates() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    return await db.select().from(emailTemplates);
  } catch (error) {
    console.error("Failed to get all templates:", error);
    throw new Error("获取模板列表失败");
  }
}

/**
 * 根据类型获取模板
 */
export async function getTemplateByType(templateType: string) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const templates = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.templateType, templateType),
          eq(emailTemplates.isActive, true)
        )
      )
      .limit(1);

    return templates.length > 0 ? templates[0] : null;
  } catch (error) {
    console.error("Failed to get template by type:", error);
    throw new Error("获取模板失败");
  }
}

/**
 * 创建或更新模板
 */
export async function saveTemplate(
  templateData: Partial<InsertEmailTemplate> & { id?: number },
  adminId: number
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    if (templateData.id) {
      // 更新现有模板
      await db
        .update(emailTemplates)
        .set({
          ...templateData,
          lastModifiedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.id, templateData.id));
    } else {
      // 创建新模板
      await db.insert(emailTemplates).values({
        ...templateData,
        lastModifiedBy: adminId,
      } as InsertEmailTemplate);
    }
  } catch (error) {
    console.error("Failed to save template:", error);
    throw new Error("保存模板失败");
  }
}

/**
 * 删除模板
 */
export async function deleteTemplate(templateId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 检查是否为默认模板
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, templateId))
      .limit(1);

    if (template?.isDefault) {
      throw new Error("不能删除系统默认模板");
    }

    await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));
  } catch (error) {
    console.error("Failed to delete template:", error);
    throw error;
  }
}

/**
 * 渲染模板（替换变量）
 */
export async function renderTemplate(
  templateType: string,
  variables: Record<string, string | number>
): Promise<{ subject: string; htmlContent: string } | null> {
  try {
    const template = await getTemplateByType(templateType);
    if (!template) {
      return null;
    }

    return {
      subject: replaceTemplateVariables(template.subject, variables),
      htmlContent: replaceTemplateVariables(template.htmlContent, variables),
    };
  } catch (error) {
    console.error("Failed to render template:", error);
    throw new Error("渲染模板失败");
  }
}
