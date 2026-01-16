import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  /**
   * 初始化邮件服务
   */
  async initialize(config: EmailConfig) {
    this.config = config;
    try {
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465, // 465端口使用SSL，587端口使用TLS
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      // 测试连接
      await this.transporter.verify();
      console.log("邮件服务初始化成功");
      return true;
    } catch (error) {
      console.error("邮件服务初始化失败:", error);
      return false;
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.warn("邮件服务未初始化，邮件发送失败");
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html,
      });
      console.log(`邮件已发送到 ${options.to}`);
      return true;
    } catch (error) {
      console.error("邮件发送失败:", error);
      return false;
    }
  }

  /**
   * 发送验证码邮件
   */
  async sendVerificationCodeEmail(email: string, code: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>邮箱验证码</h2>
        <p>您的验证码是：</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center;">
          <h1 style="color: #007bff; margin: 0;">${code}</h1>
        </div>
        <p>此验证码有效期为10分钟，请勿分享给他人。</p>
        <p>如果您没有请求此验证码，请忽略此邮件。</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: "邮箱验证码",
      html,
    });
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>密码重置请求</h2>
        <p>您请求重置密码。请点击下方链接进行重置：</p>
        <p>
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            重置密码
          </a>
        </p>
        <p>此链接有效期为1小时。</p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: "密码重置请求",
      html,
    });
  }

  /**
   * 发送告警通知邮件
   */
  async sendAlertEmail(email: string, alertTitle: string, alertContent: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">${alertTitle}</h2>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          ${alertContent}
        </div>
        <p style="color: #666; font-size: 12px;">
          这是一封自动生成的邮件，请勿直接回复。
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: alertTitle,
      html,
    });
  }

  /**
   * 测试邮件配置
   */
  async testConfiguration(config: EmailConfig): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      await transporter.verify();
      return { success: true, message: "邮件配置有效" };
    } catch (error) {
      return {
        success: false,
        message: `邮件配置错误: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }
}

// 导出单例
export const emailService = new EmailService();

// 初始化邮件服务（在应用启动时调用）
export async function initializeEmailService() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
    console.warn("SMTP配置不完整，邮件功能已禁用");
    return false;
  }

  return emailService.initialize({
    host: smtpHost,
    port: parseInt(smtpPort),
    user: smtpUser,
    pass: smtpPass,
    from: smtpFrom,
  });
}
