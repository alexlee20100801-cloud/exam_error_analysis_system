import { getDb } from "../db";
import { emailVerificationTokens, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { getSMTPConfig } from "./smtpConfigService";

/**
 * 生成验证令牌（UUID）
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * 创建邮箱验证令牌
 */
export async function createEmailVerificationToken(
  userId: number,
  email: string
): Promise<string> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const token = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24小时后过期

    await db.insert(emailVerificationTokens).values({
      userId,
      email,
      token,
      status: "pending",
      expiresAt,
    });

    return token;
  } catch (error) {
    console.error("Failed to create email verification token:", error);
    throw new Error("创建验证令牌失败");
  }
}

/**
 * 发送验证邮件
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  userName?: string
): Promise<void> {
  try {
    const smtpConfig = await getSMTPConfig();
    if (!smtpConfig) {
      throw new Error("SMTP配置未设置，请先配置邮件服务器");
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });

    // 构建验证链接（使用当前域名）
    const verificationUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/verify-email/${token}`;

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: email,
      subject: "验证您的邮箱地址 - 深圳初高中错题分析学习系统",
      html: `
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
              <p>您好${userName ? ` ${userName}` : ""}，</p>
              <p>感谢您使用深圳初高中错题分析学习系统！</p>
              <p>请点击下面的按钮验证您的邮箱地址：</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">验证邮箱</a>
              </div>
              <p>或者复制以下链接到浏览器中打开：</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
                ${verificationUrl}
              </p>
              <p style="color: #999; font-size: 14px; margin-top: 30px;">
                ⏰ 此验证链接将在24小时后过期。<br>
                ⚠️ 如果这不是您的操作，请忽略此邮件。
              </p>
            </div>
            <div class="footer">
              <p>© 2024 深圳初高中错题分析学习系统. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("发送验证邮件失败");
  }
}

/**
 * 验证邮箱令牌
 */
export async function verifyEmailToken(token: string): Promise<{
  success: boolean;
  message: string;
  userId?: number;
  email?: string;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 查找令牌
    const tokenRecord = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.token, token),
          eq(emailVerificationTokens.status, "pending")
        )
      )
      .limit(1);

    if (tokenRecord.length === 0) {
      return {
        success: false,
        message: "验证链接无效或已被使用",
      };
    }

    const record = tokenRecord[0];

    // 检查是否过期
    if (new Date() > record.expiresAt) {
      await db
        .update(emailVerificationTokens)
        .set({ status: "expired" })
        .where(eq(emailVerificationTokens.id, record.id));

      return {
        success: false,
        message: "验证链接已过期，请重新发送验证邮件",
      };
    }

    // 标记令牌为已验证
    await db
      .update(emailVerificationTokens)
      .set({
        status: "verified",
        verifiedAt: new Date(),
      })
      .where(eq(emailVerificationTokens.id, record.id));

    // 更新用户邮箱验证状态
    await db
      .update(users)
      .set({
        email: record.email,
        emailVerified: true,
      })
      .where(eq(users.id, record.userId));

    return {
      success: true,
      message: "邮箱验证成功！",
      userId: record.userId,
      email: record.email,
    };
  } catch (error) {
    console.error("Failed to verify email token:", error);
    return {
      success: false,
      message: "验证失败，请稍后重试",
    };
  }
}

/**
 * 重新发送验证邮件
 */
export async function resendVerificationEmail(
  userId: number,
  email: string,
  userName?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 将之前的待验证令牌标记为过期
    await db
      .update(emailVerificationTokens)
      .set({ status: "expired" })
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          eq(emailVerificationTokens.status, "pending")
        )
      );

    // 创建新令牌并发送邮件
    const token = await createEmailVerificationToken(userId, email);
    await sendVerificationEmail(email, token, userName);
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    throw new Error("重新发送验证邮件失败");
  }
}

/**
 * 检查邮箱是否已被验证
 */
export async function isEmailVerified(userId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const user = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user.length > 0 && user[0].emailVerified === true;
  } catch (error) {
    console.error("Failed to check email verification status:", error);
    return false;
  }
}
