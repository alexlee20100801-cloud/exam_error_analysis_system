/**
 * 通知渠道服务
 * 支持微信模板消息、短信、邮件等多种通知方式
 */

// 通知服务配置通过环境变量获取

// ==================== 类型定义 ====================

export interface WechatTemplateMessage {
  touser: string; // 接收者openid
  template_id: string; // 模板ID
  url?: string; // 点击跳转链接
  miniprogram?: {
    appid: string;
    pagepath: string;
  };
  data: Record<string, { value: string; color?: string }>;
}

export interface SmsMessage {
  phoneNumber: string;
  templateCode: string;
  templateParam: Record<string, string>;
  signName?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  content: string;
  isHtml?: boolean;
}

export interface NotificationResult {
  success: boolean;
  channel: 'wechat' | 'sms' | 'email' | 'app';
  messageId?: string;
  error?: string;
}

// ==================== 微信服务配置 ====================

// 微信公众号配置（需要在环境变量中配置）
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID || '',
  appSecret: process.env.WECHAT_APP_SECRET || '',
  // 模板消息ID
  templates: {
    goalComplete: process.env.WECHAT_TEMPLATE_GOAL_COMPLETE || '',
    achievement: process.env.WECHAT_TEMPLATE_ACHIEVEMENT || '',
    inactiveWarning: process.env.WECHAT_TEMPLATE_INACTIVE_WARNING || '',
    weeklyReport: process.env.WECHAT_TEMPLATE_WEEKLY_REPORT || '',
    examResult: process.env.WECHAT_TEMPLATE_EXAM_RESULT || '',
    errorIncrease: process.env.WECHAT_TEMPLATE_ERROR_INCREASE || '',
  },
};

// 短信服务配置（以阿里云短信为例）
const SMS_CONFIG = {
  accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',
  signName: process.env.SMS_SIGN_NAME || '错题分析系统',
  // 短信模板ID
  templates: {
    goalComplete: process.env.SMS_TEMPLATE_GOAL_COMPLETE || '',
    achievement: process.env.SMS_TEMPLATE_ACHIEVEMENT || '',
    inactiveWarning: process.env.SMS_TEMPLATE_INACTIVE_WARNING || '',
    weeklyReport: process.env.SMS_TEMPLATE_WEEKLY_REPORT || '',
    verificationCode: process.env.SMS_TEMPLATE_VERIFICATION || '',
  },
};

// 邮件服务配置
const EMAIL_CONFIG = {
  host: process.env.EMAIL_SMTP_HOST || '',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '465'),
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  user: process.env.EMAIL_SMTP_USER || '',
  pass: process.env.EMAIL_SMTP_PASS || '',
  from: process.env.EMAIL_FROM || 'noreply@example.com',
};

// ==================== 微信服务 ====================

let wechatAccessToken: string | null = null;
let wechatTokenExpireTime = 0;

/**
 * 获取微信access_token
 */
async function getWechatAccessToken(): Promise<string | null> {
  // 检查token是否过期
  if (wechatAccessToken && Date.now() < wechatTokenExpireTime) {
    return wechatAccessToken;
  }

  if (!WECHAT_CONFIG.appId || !WECHAT_CONFIG.appSecret) {
    console.warn('[Wechat] 微信配置未设置');
    return null;
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_CONFIG.appId}&secret=${WECHAT_CONFIG.appSecret}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.access_token) {
      wechatAccessToken = data.access_token;
      // 提前5分钟过期
      wechatTokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
      return wechatAccessToken;
    } else {
      console.error('[Wechat] 获取access_token失败:', data);
      return null;
    }
  } catch (error) {
    console.error('[Wechat] 获取access_token异常:', error);
    return null;
  }
}

/**
 * 发送微信模板消息
 */
export async function sendWechatTemplateMessage(
  message: WechatTemplateMessage
): Promise<NotificationResult> {
  const accessToken = await getWechatAccessToken();
  
  if (!accessToken) {
    return {
      success: false,
      channel: 'wechat',
      error: '微信服务未配置或获取token失败',
    };
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    const data = await response.json();

    if (data.errcode === 0) {
      return {
        success: true,
        channel: 'wechat',
        messageId: data.msgid?.toString(),
      };
    } else {
      return {
        success: false,
        channel: 'wechat',
        error: `微信发送失败: ${data.errmsg}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'wechat',
      error: `微信发送异常: ${error}`,
    };
  }
}

// ==================== 短信服务 ====================

/**
 * 生成阿里云短信签名
 */
function generateAliyunSignature(params: Record<string, string>, secret: string): string {
  // 简化版签名，实际使用需要完整实现阿里云签名算法
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
  
  // 使用HMAC-SHA1签名
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha1', secret + '&');
  hmac.update('GET&%2F&' + encodeURIComponent(stringToSign));
  return hmac.digest('base64');
}

/**
 * 发送短信
 */
export async function sendSms(message: SmsMessage): Promise<NotificationResult> {
  if (!SMS_CONFIG.accessKeyId || !SMS_CONFIG.accessKeySecret) {
    return {
      success: false,
      channel: 'sms',
      error: '短信服务未配置',
    };
  }

  try {
    // 阿里云短信API参数
    const params: Record<string, string> = {
      AccessKeyId: SMS_CONFIG.accessKeyId,
      Action: 'SendSms',
      Format: 'JSON',
      PhoneNumbers: message.phoneNumber,
      SignName: message.signName || SMS_CONFIG.signName,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: Math.random().toString(36).substring(2),
      SignatureVersion: '1.0',
      TemplateCode: message.templateCode,
      TemplateParam: JSON.stringify(message.templateParam),
      Timestamp: new Date().toISOString(),
      Version: '2017-05-25',
    };

    const signature = generateAliyunSignature(params, SMS_CONFIG.accessKeySecret);
    params.Signature = signature;

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    const url = `https://dysmsapi.aliyuncs.com/?${queryString}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.Code === 'OK') {
      return {
        success: true,
        channel: 'sms',
        messageId: data.BizId,
      };
    } else {
      return {
        success: false,
        channel: 'sms',
        error: `短信发送失败: ${data.Message}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'sms',
      error: `短信发送异常: ${error}`,
    };
  }
}

// ==================== 邮件服务 ====================

/**
 * 发送邮件
 */
export async function sendEmail(message: EmailMessage): Promise<NotificationResult> {
  if (!EMAIL_CONFIG.host || !EMAIL_CONFIG.user) {
    return {
      success: false,
      channel: 'email',
      error: '邮件服务未配置',
    };
  }

  try {
    // 使用nodemailer发送邮件（需要安装依赖）
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.pass,
      },
    });

    const mailOptions = {
      from: EMAIL_CONFIG.from,
      to: message.to,
      subject: message.subject,
      [message.isHtml ? 'html' : 'text']: message.content,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      channel: 'email',
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'email',
      error: `邮件发送异常: ${error}`,
    };
  }
}

// ==================== 统一通知接口 ====================

export interface NotificationPayload {
  type: 'goal_complete' | 'achievement' | 'inactive_warning' | 'weekly_report' | 'exam_result' | 'error_increase' | 'custom';
  title: string;
  content: string;
  data?: Record<string, any>;
  url?: string;
}

export interface NotificationTarget {
  wechatOpenId?: string;
  phoneNumber?: string;
  email?: string;
  enableWechat?: boolean;
  enableSms?: boolean;
  enableEmail?: boolean;
}

/**
 * 发送通知（支持多渠道）
 */
export async function sendNotification(
  target: NotificationTarget,
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  // 微信通知
  if (target.enableWechat && target.wechatOpenId) {
    const templateId = getWechatTemplateId(payload.type);
    if (templateId) {
      const result = await sendWechatTemplateMessage({
        touser: target.wechatOpenId,
        template_id: templateId,
        url: payload.url,
        data: {
          first: { value: payload.title },
          keyword1: { value: payload.content },
          keyword2: { value: new Date().toLocaleString('zh-CN') },
          remark: { value: '点击查看详情' },
        },
      });
      results.push(result);
    }
  }

  // 短信通知
  if (target.enableSms && target.phoneNumber) {
    const templateCode = getSmsTemplateCode(payload.type);
    if (templateCode) {
      const result = await sendSms({
        phoneNumber: target.phoneNumber,
        templateCode,
        templateParam: {
          title: payload.title.substring(0, 20),
          content: payload.content.substring(0, 50),
        },
      });
      results.push(result);
    }
  }

  // 邮件通知
  if (target.enableEmail && target.email) {
    const result = await sendEmail({
      to: target.email,
      subject: payload.title,
      content: generateEmailContent(payload),
      isHtml: true,
    });
    results.push(result);
  }

  return results;
}

/**
 * 获取微信模板ID
 */
function getWechatTemplateId(type: NotificationPayload['type']): string {
  const templateMap: Record<string, string> = {
    goal_complete: WECHAT_CONFIG.templates.goalComplete,
    achievement: WECHAT_CONFIG.templates.achievement,
    inactive_warning: WECHAT_CONFIG.templates.inactiveWarning,
    weekly_report: WECHAT_CONFIG.templates.weeklyReport,
    exam_result: WECHAT_CONFIG.templates.examResult,
    error_increase: WECHAT_CONFIG.templates.errorIncrease,
  };
  return templateMap[type] || '';
}

/**
 * 获取短信模板Code
 */
function getSmsTemplateCode(type: NotificationPayload['type']): string {
  const templateMap: Record<string, string> = {
    goal_complete: SMS_CONFIG.templates.goalComplete,
    achievement: SMS_CONFIG.templates.achievement,
    inactive_warning: SMS_CONFIG.templates.inactiveWarning,
    weekly_report: SMS_CONFIG.templates.weeklyReport,
  };
  return templateMap[type] || '';
}

/**
 * 生成邮件HTML内容
 */
function generateEmailContent(payload: NotificationPayload): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .title { font-size: 24px; margin: 0; }
        .message { font-size: 16px; line-height: 1.6; color: #374151; }
        .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">${payload.title}</h1>
        </div>
        <div class="content">
          <p class="message">${payload.content}</p>
          ${payload.url ? `<a href="${payload.url}" class="button">查看详情</a>` : ''}
        </div>
        <div class="footer">
          <p>此邮件由深圳初高中错题分析学习系统自动发送</p>
          <p>如有疑问，请联系系统管理员</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ==================== 验证码服务 ====================

/**
 * 发送短信验证码
 */
export async function sendSmsVerificationCode(
  phoneNumber: string,
  code: string
): Promise<NotificationResult> {
  return await sendSms({
    phoneNumber,
    templateCode: SMS_CONFIG.templates.verificationCode,
    templateParam: { code },
  });
}

// ==================== 服务状态检查 ====================

export interface ChannelStatus {
  wechat: { configured: boolean; healthy: boolean };
  sms: { configured: boolean; healthy: boolean };
  email: { configured: boolean; healthy: boolean };
}

/**
 * 检查通知渠道状态
 */
export async function checkChannelStatus(): Promise<ChannelStatus> {
  const status: ChannelStatus = {
    wechat: {
      configured: !!(WECHAT_CONFIG.appId && WECHAT_CONFIG.appSecret),
      healthy: false,
    },
    sms: {
      configured: !!(SMS_CONFIG.accessKeyId && SMS_CONFIG.accessKeySecret),
      healthy: false,
    },
    email: {
      configured: !!(EMAIL_CONFIG.host && EMAIL_CONFIG.user),
      healthy: false,
    },
  };

  // 检查微信服务
  if (status.wechat.configured) {
    const token = await getWechatAccessToken();
    status.wechat.healthy = !!token;
  }

  // 短信和邮件服务的健康检查需要实际发送测试消息
  // 这里简化为配置即健康
  status.sms.healthy = status.sms.configured;
  status.email.healthy = status.email.configured;

  return status;
}
