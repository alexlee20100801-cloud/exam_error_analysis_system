import nodemailer from "nodemailer";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 邮件通知服务
 * 使用SMTP发送邮件提醒
 */

// SMTP配置（从环境变量读取）
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
};

// 发件人信息
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
const FROM_NAME = process.env.SMTP_FROM_NAME || "错题分析学习系统";

/**
 * 创建邮件传输器
 */
function createTransporter() {
  // 如果没有配置SMTP，返回null
  if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    console.warn("[EmailService] SMTP not configured, email notifications will be skipped");
    return null;
  }

  return nodemailer.createTransport(SMTP_CONFIG);
}

/**
 * 发送邮件
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log("[EmailService] Skipping email send (SMTP not configured)");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log("[EmailService] Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("[EmailService] Failed to send email:", error);
    return false;
  }
}

/**
 * 发送复习任务提醒邮件
 */
export async function sendReviewTaskReminderEmail(
  userId: string,
  taskInfo: {
    subject: string;
    knowledgePoint?: string;
    reason: string;
    suggestedTime: string;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[EmailService] Database not available");
    return false;
  }

  // 获取用户邮箱
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId as any))
    .limit(1);

  // @ts-ignore
  if (!user || !user.email || !user.emailVerified) {
    console.log("[EmailService] User email not available or not verified");
    return false;
  }

  // 构建邮件内容
  const subject = "📚 复习任务提醒";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .task-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .task-title { font-size: 18px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
        .task-detail { margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 复习任务提醒</h1>
          <p>你有一个复习任务需要完成</p>
        </div>
        <div class="content">
          <div class="task-card">
            <div class="task-title">${taskInfo.subject}${taskInfo.knowledgePoint ? ` - ${taskInfo.knowledgePoint}` : ""}</div>
            <div class="task-detail">
              <strong>📝 任务原因：</strong><br>
              ${taskInfo.reason}
            </div>
            <div class="task-detail">
              <strong>⏰ 建议时间：</strong><br>
              ${taskInfo.suggestedTime}
            </div>
          </div>
          <p style="text-align: center;">
            <a href="${process.env.VITE_APP_URL || "https://example.com"}/dashboard" class="button">
              立即开始复习
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            💡 提示：及时复习可以帮助你更好地巩固知识点，提高学习效率！
          </p>
        </div>
        <div class="footer">
          <p>这是一封系统自动发送的邮件，请勿直接回复</p>
          <p>如需取消邮件提醒，请在系统设置中关闭邮件通知</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
}

/**
 * 发送邮箱验证邮件
 */
export async function sendEmailVerification(
  email: string,
  verificationToken: string
): Promise<boolean> {
  const verificationUrl = `${process.env.VITE_APP_URL || "https://example.com"}/verify-email?token=${verificationToken}`;

  const subject = "验证你的邮箱地址";
  const html = `
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
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ 验证你的邮箱</h1>
        </div>
        <div class="content">
          <p>感谢你注册错题分析学习系统！</p>
          <p>请点击下面的按钮验证你的邮箱地址：</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">验证邮箱</a>
          </p>
          <p style="color: #666; font-size: 14px;">
            如果按钮无法点击，请复制以下链接到浏览器中打开：<br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
          <p style="color: #999; font-size: 12px;">
            此链接将在24小时后失效。
          </p>
        </div>
        <div class="footer">
          <p>如果你没有注册过此账号，请忽略此邮件</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, html);
}

/**
 * 测试邮件配置
 */
export async function testEmailConfiguration(): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    return false;
  }

  try {
    await transporter.verify();
    console.log("[EmailService] SMTP configuration is valid");
    return true;
  } catch (error) {
    console.error("[EmailService] SMTP configuration error:", error);
    return false;
  }
}
