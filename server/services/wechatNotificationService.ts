import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 微信通知服务（简化版）
 * 
 * 注意：这是一个简化的实现，预留了接口供后续对接真实的微信通知服务
 * 真实的微信通知需要：
 * 1. 微信公众号/企业微信账号
 * 2. 完成企业认证
 * 3. 配置模板消息
 * 4. 获取用户的openid
 * 
 * 当前实现：记录通知请求到日志，供后续对接使用
 */

/**
 * 微信通知配置（从环境变量读取）
 */
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID || "",
  appSecret: process.env.WECHAT_APP_SECRET || "",
  templateId: process.env.WECHAT_TEMPLATE_ID || "",
};

/**
 * 检查微信通知是否已配置
 */
function isWechatConfigured(): boolean {
  return !!(WECHAT_CONFIG.appId && WECHAT_CONFIG.appSecret && WECHAT_CONFIG.templateId);
}

/**
 * 发送微信模板消息（简化版）
 */
async function sendWechatTemplateMessage(
  openId: string,
  templateData: Record<string, { value: string; color?: string }>
): Promise<boolean> {
  if (!isWechatConfigured()) {
    console.log("[WechatService] Wechat not configured, notification will be skipped");
    return false;
  }

  // TODO: 实现真实的微信API调用
  // 1. 获取access_token
  // 2. 调用模板消息接口
  // 3. 处理返回结果

  console.log("[WechatService] Wechat template message (simulated):", {
    openId,
    templateData,
  });

  // 简化版：仅记录日志，返回true表示"已处理"
  return true;
}

/**
 * 发送复习任务提醒微信消息
 */
export async function sendReviewTaskReminderWechat(
  userId: number,
  taskInfo: {
    subject: string;
    knowledgePoint?: string;
    reason: string;
    suggestedTime: string;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[WechatService] Database not available");
    return false;
  }

  // 获取用户微信信息
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.wechatOpenId) {
    console.log("[WechatService] User wechat not bound");
    return false;
  }

  // 构建模板消息数据
  const templateData = {
    first: {
      value: "你有一个复习任务需要完成",
      color: "#173177",
    },
    keyword1: {
      value: `${taskInfo.subject}${taskInfo.knowledgePoint ? ` - ${taskInfo.knowledgePoint}` : ""}`,
      color: "#173177",
    },
    keyword2: {
      value: taskInfo.suggestedTime,
      color: "#173177",
    },
    keyword3: {
      value: taskInfo.reason,
      color: "#173177",
    },
    remark: {
      value: "点击查看详情，立即开始复习！",
      color: "#173177",
    },
  };

  return await sendWechatTemplateMessage(user.wechatOpenId, templateData);
}

/**
 * 生成微信绑定二维码（简化版）
 * 
 * 真实实现需要：
 * 1. 调用微信API生成带参数的二维码
 * 2. 用户扫码后，微信服务器会推送事件到你的服务器
 * 3. 在事件处理中完成用户绑定
 */
export async function generateWechatBindQRCode(userId: number): Promise<{
  qrCodeUrl: string;
  ticket: string;
} | null> {
  if (!isWechatConfigured()) {
    console.log("[WechatService] Wechat not configured");
    return null;
  }

  // TODO: 实现真实的二维码生成
  // 1. 调用微信API创建临时二维码
  // 2. 返回二维码URL和ticket

  console.log("[WechatService] Generate QR code for user:", userId);

  // 简化版：返回模拟数据
  return {
    qrCodeUrl: `https://example.com/wechat-qr?user=${userId}`,
    ticket: `mock-ticket-${userId}-${Date.now()}`,
  };
}

/**
 * 绑定微信账号
 */
export async function bindWechatAccount(
  userId: number,
  wechatOpenId: string,
  wechatNickname: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[WechatService] Database not available");
    return false;
  }

  try {
    await db
      .update(users)
      .set({
        wechatOpenId,
        wechatNickname,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log("[WechatService] Wechat account bound successfully for user:", userId);
    return true;
  } catch (error) {
    console.error("[WechatService] Failed to bind wechat account:", error);
    return false;
  }
}

/**
 * 解绑微信账号
 */
export async function unbindWechatAccount(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[WechatService] Database not available");
    return false;
  }

  try {
    await db
      .update(users)
      .set({
        wechatOpenId: null,
        wechatNickname: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log("[WechatService] Wechat account unbound successfully for user:", userId);
    return true;
  } catch (error) {
    console.error("[WechatService] Failed to unbind wechat account:", error);
    return false;
  }
}

/**
 * 测试微信配置
 */
export async function testWechatConfiguration(): Promise<boolean> {
  if (!isWechatConfigured()) {
    console.log("[WechatService] Wechat not configured");
    return false;
  }

  // TODO: 实现真实的配置测试
  // 1. 尝试获取access_token
  // 2. 验证token是否有效

  console.log("[WechatService] Wechat configuration test (simulated): OK");
  return true;
}
