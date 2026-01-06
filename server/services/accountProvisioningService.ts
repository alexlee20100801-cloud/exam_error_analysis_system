import { getDb } from "../db";
import { users, accountCredentials, userSubscriptions, orders } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "./emailVerificationService";
import { renderTemplate, EMAIL_TEMPLATE_TYPES } from "./emailTemplateService";
import { getSMTPConfig } from "./smtpConfigService";

/**
 * 生成随机密码
 */
function generateRandomPassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

/**
 * 发送账号凭证邮件
 */
async function sendCredentialsEmail(params: {
  email: string;
  loginAccount: string;
  password: string;
  userName?: string;
}): Promise<void> {
  try {
    const smtpConfig = await getSMTPConfig();
    if (!smtpConfig) {
      throw new Error("SMTP配置未设置");
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

    const loginUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/login`;

    // 尝试使用模板
    const rendered = await renderTemplate("account_credentials", {
      userName: params.userName || "用户",
      loginAccount: params.loginAccount,
      password: params.password,
      loginUrl,
      systemName: "深圳初高中错题分析学习系统",
    });

    let subject: string;
    let htmlContent: string;

    if (rendered) {
      subject = rendered.subject;
      htmlContent = rendered.htmlContent;
    } else {
      // 回退到默认模板
      subject = "您的账号已创建 - 深圳初高中错题分析学习系统";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 欢迎使用深圳初高中错题分析学习系统</h1>
            </div>
            <div class="content">
              <p>尊敬的 <strong>${params.userName || "用户"}</strong>，您好！</p>
              <p>感谢您购买我们的服务！您的账号已成功创建，以下是您的登录凭证：</p>
              
              <div class="credentials">
                <p><strong>登录账号：</strong>${params.loginAccount}</p>
                <p><strong>初始密码：</strong><code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${params.password}</code></p>
              </div>

              <div class="warning">
                <strong>⚠️ 安全提示：</strong>
                <ul>
                  <li>请妥善保管您的账号密码</li>
                  <li>首次登录后请立即修改密码</li>
                  <li>不要将密码告知他人</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">立即登录</a>
              </div>

              <p style="margin-top: 30px;">如有任何问题，请随时联系我们的客服团队。</p>
            </div>
            <div class="footer">
              <p>此邮件由系统自动发送，请勿直接回复</p>
              <p>© 2024 深圳初高中错题分析学习系统 版权所有</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: params.email,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send credentials email:", error);
    throw new Error("发送账号凭证邮件失败");
  }
}

/**
 * 为订单创建账号并分发凭证
 */
export async function provisionAccountForOrder(params: {
  orderId: number;
  email?: string;
  phone?: string;
  name?: string;
}): Promise<{ userId: number; loginAccount: string; password: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // 获取订单信息
    const [order] = await db.select().from(orders).where(eq(orders.id, params.orderId));
    if (!order) {
      throw new Error("订单不存在");
    }

    if (order.status !== "paid") {
      throw new Error("订单未支付");
    }

    // 确定登录账号和联系方式
    const loginAccount = params.email || params.phone;
    if (!loginAccount) {
      throw new Error("必须提供邮箱或手机号");
    }

    // 检查账号是否已存在
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, loginAccount));

    let userId: number;

    if (existingUser) {
      // 用户已存在，直接使用
      userId = existingUser.id;
    } else {
      // 创建新用户
      const password = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db.insert(users).values({
        openId: `local_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        name: params.name || "新用户",
        email: loginAccount,
        userType: "student",
        role: "user",
      });

      userId = newUser.insertId;

      // 保存账号凭证
      await db.insert(accountCredentials).values({
        userId,
        loginAccount,
        initialPassword: hashedPassword,
        passwordChanged: false,
        deliveryMethod: params.email ? "email" : "sms",
        deliveryStatus: "pending",
      });

      // 发送凭证邮件
      if (params.email) {
        try {
          await sendCredentialsEmail({
            email: params.email,
            loginAccount,
            password,
            userName: params.name,
          });

          // 更新发送状态
          await db
            .update(accountCredentials)
            .set({
              deliveryStatus: "sent",
              sentAt: new Date(),
            })
            .where(eq(accountCredentials.userId, userId));
        } catch (emailError) {
          console.error("Failed to send credentials email:", emailError);
          // 邮件发送失败，但账号已创建
          await db
            .update(accountCredentials)
            .set({ deliveryStatus: "failed" })
            .where(eq(accountCredentials.userId, userId));
        }
      }

      return { userId, loginAccount, password };
    }

    // 更新订单的用户ID
    await db.update(orders).set({ userId }).where(eq(orders.id, params.orderId));

    // 如果用户已存在，返回空密码
    return { userId, loginAccount, password: "" };
  } catch (error) {
    console.error("Failed to provision account:", error);
    throw new Error("账号分发失败");
  }
}

/**
 * 创建用户订阅记录
 */
export async function createUserSubscription(params: {
  userId: number;
  planId: number;
  orderId: number;
  durationDays: number;
}): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + params.durationDays);

    const [result] = await db.insert(userSubscriptions).values({
      userId: params.userId,
      planId: params.planId,
      orderId: params.orderId,
      startDate,
      endDate,
      status: "active",
      usedAiAnalysis: 0,
    });

    return result.insertId;
  } catch (error) {
    console.error("Failed to create user subscription:", error);
    throw new Error("创建用户订阅失败");
  }
}

/**
 * 获取用户当前订阅
 */
export async function getUserActiveSubscription(userId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const now = new Date();
    const subscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    // 过滤活跃且未过期的订阅
    const activeSubscription = subscriptions.find(
      (sub) => sub.status === "active" && new Date(sub.endDate) > now
    );

    return activeSubscription || null;
  } catch (error) {
    console.error("Failed to get user subscription:", error);
    return null;
  }
}
