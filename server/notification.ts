import { db } from "./db";
import { notificationLogs } from "../drizzle/schema";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (supports international format)
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

// SMS content max length
const SMS_MAX_LENGTH = 160;

// Rate limiting counters (in-memory, should use Redis in production)
const rateLimitCounters = new Map<string, { count: number; resetAt: number }>();

interface NotificationParams {
  userId: number;
  type: string;
  channel: "email" | "sms" | "in_app";
  content: string;
  recipientEmail?: string;
  recipientPhone?: string;
  isHtml?: boolean;
  priority?: string;
}

interface NotificationResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

interface NotificationLogData {
  userId: number;
  notificationType: string;
  channel: string;
  status: "sent" | "failed" | "pending";
  content?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  errorMessage?: string;
  retryCount?: number;
  priority?: string;
  metadata?: string;
}

/**
 * Send notification through specified channel
 */
export async function sendNotification(params: NotificationParams): Promise<NotificationResult> {
  const { userId, type, channel, content, recipientEmail, recipientPhone, isHtml = false, priority = "normal" } = params;

  try {
    // Check rate limits
    const rateLimitKey = `${userId}-${channel}`;
    if (!checkRateLimit(rateLimitKey, channel)) {
      return {
        success: false,
        error: `Rate limit exceeded for ${channel}`,
      };
    }

    switch (channel) {
      case "email":
        return await sendEmailNotification(userId, type, content, recipientEmail!, isHtml);

      case "sms":
        return await sendSmsNotification(userId, type, content, recipientPhone!);

      case "in_app":
        return await createInAppNotification(userId, type, content, priority);

      default:
        return {
          success: false,
          error: `Unsupported channel: ${channel}`,
        };
    }
  } catch (error) {
    console.error(`Failed to send ${channel} notification:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  userId: number,
  type: string,
  content: string,
  recipientEmail: string,
  isHtml: boolean = false
): Promise<NotificationResult> {
  // Validate email format
  if (!EMAIL_REGEX.test(recipientEmail)) {
    try {
      await createNotificationLog({
        userId,
        notificationType: type,
        channel: "email",
        status: "failed",
        recipientEmail,
        errorMessage: "Invalid email format",
      });
    } catch (logError) {
      console.error("Failed to create notification log:", logError);
    }

    return {
      success: false,
      error: "Invalid email format",
    };
  }

  try {
    // TODO: Integrate with actual SMTP service
    // For now, simulate email sending
    const response = await fetch(`${process.env.SMTP_API_URL || "https://api.example.com"}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SMTP_API_KEY || ""}`,
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: getEmailSubject(type),
        content,
        isHtml,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMTP service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    await createNotificationLog({
      userId,
      notificationType: type,
      channel: "email",
      status: "sent",
      recipientEmail,
      content,
      metadata: JSON.stringify({ messageId: result.messageId }),
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    await createNotificationLog({
      userId,
      notificationType: type,
      channel: "email",
      status: "failed",
      recipientEmail,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send SMS notification
 */
async function sendSmsNotification(
  userId: number,
  type: string,
  content: string,
  recipientPhone: string
): Promise<NotificationResult> {
  // Validate phone format
  if (!PHONE_REGEX.test(recipientPhone)) {
    try {
      await createNotificationLog({
        userId,
        notificationType: type,
        channel: "sms",
        status: "failed",
        recipientPhone,
        errorMessage: "Invalid phone format",
      });
    } catch (logError) {
      console.error("Failed to create notification log:", logError);
    }

    return {
      success: false,
      error: "Invalid phone format",
    };
  }

  // Truncate content if too long
  let smsContent = content;
  if (content.length > SMS_MAX_LENGTH) {
    smsContent = content.substring(0, SMS_MAX_LENGTH - 3) + "...";
  }

  try {
    // TODO: Integrate with actual SMS service
    // For now, simulate SMS sending
    const response = await fetch(`${process.env.SMS_API_URL || "https://api.example.com"}/api/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SMS_API_KEY || ""}`,
      },
      body: JSON.stringify({
        phone: recipientPhone,
        content: smsContent,
      }),
    });

    if (response.status === 429) {
      throw new Error("SMS rate limit exceeded");
    }

    if (!response.ok) {
      throw new Error(`SMS service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    await createNotificationLog({
      userId,
      notificationType: type,
      channel: "sms",
      status: "sent",
      recipientPhone,
      content: smsContent,
      metadata: JSON.stringify({ messageId: result.messageId }),
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    await createNotificationLog({
      userId,
      notificationType: type,
      channel: "sms",
      status: "failed",
      recipientPhone,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create in-app notification
 */
async function createInAppNotification(
  userId: number,
  type: string,
  content: string,
  priority: string = "normal"
): Promise<NotificationResult> {
  try {
    await createNotificationLog({
      userId,
      notificationType: type,
      channel: "in_app",
      status: "sent",
      content,
      priority,
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create notification log in database
 */
export async function createNotificationLog(data: NotificationLogData) {
  const [log] = await db
    .insert(notificationLogs)
    .values({
      userId: data.userId,
      notificationType: data.notificationType,
      channel: data.channel,
      status: data.status,
      content: data.content,
      recipientEmail: data.recipientEmail,
      recipientPhone: data.recipientPhone,
      errorMessage: data.errorMessage,
      retryCount: data.retryCount || 0,
      priority: data.priority || "normal",
      metadata: data.metadata,
      sentAt: new Date(),
    })
    .returning();

  return log;
}

/**
 * Check rate limit for notification channel
 */
function checkRateLimit(key: string, channel: string): boolean {
  const now = Date.now();
  const limits = {
    email: { max: 10, window: 60000 }, // 10 emails per minute
    sms: { max: 5, window: 86400000 }, // 5 SMS per day
    in_app: { max: 100, window: 60000 }, // 100 in-app notifications per minute
  };

  const limit = limits[channel as keyof typeof limits];
  if (!limit) return true;

  const counter = rateLimitCounters.get(key);

  if (!counter || counter.resetAt < now) {
    rateLimitCounters.set(key, {
      count: 1,
      resetAt: now + limit.window,
    });
    return true;
  }

  if (counter.count >= limit.max) {
    return false;
  }

  counter.count++;
  return true;
}

/**
 * Get email subject based on notification type
 */
function getEmailSubject(type: string): string {
  const subjects: Record<string, string> = {
    weekly_report: "您的每周学习报告",
    monthly_report: "您的每月学习报告",
    urgent_alert: "重要通知",
    system_alert: "系统通知",
    review_reminder: "复习提醒",
    goal_reminder: "目标提醒",
  };

  return subjects[type] || "通知";
}

/**
 * Render notification template with data
 */
export function renderNotificationTemplate(templateType: string, data: any): string {
  const templates: Record<string, (data: any) => string> = {
    weekly_report: (d) => `
      <h2>每周学习报告</h2>
      <p>亲爱的${d.studentName || "同学"}，</p>
      <p>本周（${d.weekRange || ""}）学习情况如下：</p>
      <ul>
        <li>错题总数：${d.totalErrors || 0}道</li>
        <li>主要科目：${(d.topSubjects || []).join("、")}</li>
      </ul>
      <p>改进建议：${d.improvementTips || "继续保持良好的学习习惯"}</p>
    `,
    monthly_report: (d) => `
      <h2>每月学习报告</h2>
      <p>亲爱的${d.studentName || "同学"}，</p>
      <p>${d.monthRange || "本月"}学习情况如下：</p>
      <ul>
        <li>错题总数：${d.totalErrors || 0}道</li>
        <li>进步率：${d.progressRate || "0%"}</li>
        <li>薄弱科目：${d.weakestSubject || "无"}</li>
      </ul>
    `,
  };

  const template = templates[templateType];
  if (!template) {
    return JSON.stringify(data);
  }

  return template(data);
}
