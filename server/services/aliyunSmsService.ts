/**
 * 阿里云短信服务集成
 * 
 * 配置说明：
 * 1. 登录阿里云控制台，创建短信签名和模板
 * 2. 模板内容示例：您的验证码为${code}，有效期5分钟
 * 3. 审核通过后填写以下环境变量：
 *    - ALIYUN_SMS_ACCESS_KEY_ID: 阿里云AccessKey ID
 *    - ALIYUN_SMS_ACCESS_KEY_SECRET: 阿里云AccessKey Secret
 *    或在管理后台配置短信服务
 */

import crypto from "crypto";
import { db } from "../db";
import { smsServiceConfig, smsSendLogs, ipRateLimits } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

// 环境变量配置
const SMS_ACCESS_KEY_ID = process.env.ALIYUN_SMS_ACCESS_KEY_ID || process.env.SMS_ACCESS_KEY_ID || "";
const SMS_ACCESS_KEY_SECRET = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || process.env.SMS_ACCESS_KEY_SECRET || "";

// 发送频率限制
const RATE_LIMITS = {
  perMinute: 1,      // 同一手机号每分钟最多发送1条
  perHour: 5,        // 同一手机号每小时最多发送5条
  perDay: 10,        // 同一手机号每天最多发送10条
  perIpDay: 20,      // 同一IP每天最多发送20条
};

// 验证码缓存（生产环境应使用Redis）
const verificationCodeCache = new Map<string, { code: string; expiry: number; attempts: number }>();

interface SmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  region?: string;
}

interface SendSmsResult {
  success: boolean;
  message: string;
  requestId?: string;
  bizId?: string;
  errorCode?: string;
}

interface VerificationCodeResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
}

/**
 * 获取短信服务配置
 * 优先从环境变量获取，其次从数据库获取
 */
export async function getSmsConfig(): Promise<SmsConfig | null> {
  // 优先使用环境变量
  if (SMS_ACCESS_KEY_ID && SMS_ACCESS_KEY_SECRET) {
    // 从数据库获取签名和模板配置
    const dbConfig = await db
      .select()
      .from(smsServiceConfig)
      .where(eq(smsServiceConfig.isActive, 1))
      .limit(1);
    
    return {
      accessKeyId: SMS_ACCESS_KEY_ID,
      accessKeySecret: SMS_ACCESS_KEY_SECRET,
      signName: dbConfig[0]?.signName || "错题分析系统",
      templateCode: dbConfig[0]?.templateCode || "SMS_123456789",
      region: dbConfig[0]?.region || "cn-hangzhou",
    };
  }
  
  // 从数据库获取完整配置
  const dbConfig = await db
    .select()
    .from(smsServiceConfig)
    .where(eq(smsServiceConfig.isActive, 1))
    .limit(1);
  
  if (dbConfig.length === 0 || !dbConfig[0].accessKeyId || !dbConfig[0].accessKeySecret) {
    return null;
  }
  
  return {
    accessKeyId: dbConfig[0].accessKeyId,
    accessKeySecret: dbConfig[0].accessKeySecret,
    signName: dbConfig[0].signName || "错题分析系统",
    templateCode: dbConfig[0].templateCode || "SMS_123456789",
    region: dbConfig[0].region || "cn-hangzhou",
  };
}

/**
 * 生成阿里云API签名
 */
function generateSignature(params: Record<string, string>, accessKeySecret: string): string {
  // 按参数名排序
  const sortedKeys = Object.keys(params).sort();
  const canonicalizedQueryString = sortedKeys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
  
  // 构造待签名字符串
  const stringToSign = `POST&${encodeURIComponent("/")}&${encodeURIComponent(canonicalizedQueryString)}`;
  
  // 使用HMAC-SHA1计算签名
  const hmac = crypto.createHmac("sha1", accessKeySecret + "&");
  hmac.update(stringToSign);
  return hmac.digest("base64");
}

/**
 * 生成UUID
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成随机验证码
 */
function generateVerificationCode(length: number = 6): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

/**
 * 检查发送频率限制
 */
export async function checkRateLimit(phoneNumber: string, ip?: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = Date.now();
  const oneMinuteAgo = new Date(now - 60 * 1000);
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  try {
    // 检查每分钟限制
    const minuteCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(smsSendLogs)
      .where(and(eq(smsSendLogs.phoneNumber, phoneNumber), gte(smsSendLogs.sentAt, oneMinuteAgo)));

    if (Number(minuteCount[0]?.count || 0) >= RATE_LIMITS.perMinute) {
      return { allowed: false, reason: "发送过于频繁，请1分钟后再试" };
    }

    // 检查每小时限制
    const hourCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(smsSendLogs)
      .where(and(eq(smsSendLogs.phoneNumber, phoneNumber), gte(smsSendLogs.sentAt, oneHourAgo)));

    if (Number(hourCount[0]?.count || 0) >= RATE_LIMITS.perHour) {
      return { allowed: false, reason: "该手机号发送次数过多，请1小时后再试" };
    }

    // 检查每天限制
    const dayCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(smsSendLogs)
      .where(and(eq(smsSendLogs.phoneNumber, phoneNumber), gte(smsSendLogs.sentAt, oneDayAgo)));

    if (Number(dayCount[0]?.count || 0) >= RATE_LIMITS.perDay) {
      return { allowed: false, reason: "该手机号今日发送次数已达上限" };
    }

    // 检查IP限制
    if (ip) {
      const ipCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(smsSendLogs)
        .where(and(eq(smsSendLogs.ipAddress, ip), gte(smsSendLogs.sentAt, oneDayAgo)));

      if (Number(ipCount[0]?.count || 0) >= RATE_LIMITS.perIpDay) {
        return { allowed: false, reason: "当前IP发送次数已达上限" };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // 如果检查失败，默认允许发送
    return { allowed: true };
  }
}

/**
 * 发送阿里云短信
 */
export async function sendAliyunSms(params: {
  phone: string;
  code: string;
  templateCode?: string;
  signName?: string;
  ip?: string;
  userId?: number;
}): Promise<SendSmsResult> {
  const { phone, code, templateCode, signName, ip, userId } = params;
  
  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return {
      success: false,
      message: "手机号格式不正确",
    };
  }

  // 检查发送频率限制
  const rateLimitCheck = await checkRateLimit(phone, ip);
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      message: rateLimitCheck.reason || "发送频率受限",
    };
  }
  
  const config = await getSmsConfig();
  
  if (!config) {
    console.log("[SMS] 短信服务未配置，使用模拟发送");
    console.log(`[SMS] 模拟发送验证码到 ${phone}: ${code}`);
    
    // 记录模拟发送日志
    await db.insert(smsSendLogs).values({
      phoneNumber: phone,
      templateCode: templateCode || "MOCK_TEMPLATE",
      templateParam: JSON.stringify({ code }),
      status: "success",
      requestId: `mock-${generateUUID()}`,
      ipAddress: ip,
      userId: userId,
      sentAt: new Date(),
    });
    
    return {
      success: true,
      message: "验证码已发送（模拟模式）",
    };
  }
  
  try {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const nonce = generateUUID();
    
    // 构造请求参数
    const requestParams: Record<string, string> = {
      AccessKeyId: config.accessKeyId,
      Action: "SendSms",
      Format: "JSON",
      PhoneNumbers: phone,
      RegionId: config.region || "cn-hangzhou",
      SignName: signName || config.signName,
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: nonce,
      SignatureVersion: "1.0",
      TemplateCode: templateCode || config.templateCode,
      TemplateParam: JSON.stringify({ code }),
      Timestamp: timestamp,
      Version: "2017-05-25",
    };
    
    // 生成签名
    const signature = generateSignature(requestParams, config.accessKeySecret);
    requestParams.Signature = signature;
    
    // 发送请求
    const response = await fetch("https://dysmsapi.aliyuncs.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(requestParams).toString(),
    });
    
    const result = await response.json() as {
      Code?: string;
      Message?: string;
      RequestId?: string;
      BizId?: string;
    };
    
    // 记录发送日志
    await db.insert(smsSendLogs).values({
      phoneNumber: phone,
      templateCode: templateCode || config.templateCode,
      templateParam: JSON.stringify({ code }),
      status: result.Code === "OK" ? "success" : "failed",
      requestId: result.RequestId,
      bizId: result.BizId,
      errorCode: result.Code !== "OK" ? result.Code : null,
      errorMessage: result.Code !== "OK" ? result.Message : null,
      ipAddress: ip,
      userId: userId,
      sentAt: new Date(),
    });
    
    if (result.Code === "OK") {
      console.log(`[SMS] 短信发送成功: ${phone}`);
      return {
        success: true,
        message: "验证码已发送",
        requestId: result.RequestId,
        bizId: result.BizId,
      };
    } else {
      console.error(`[SMS] 短信发送失败: ${result.Code} - ${result.Message}`);
      return {
        success: false,
        message: getAliyunErrorMessage(result.Code || "") || result.Message || "短信发送失败",
        requestId: result.RequestId,
        errorCode: result.Code,
      };
    }
  } catch (error) {
    console.error("[SMS] 短信发送异常:", error);
    
    // 记录失败日志
    await db.insert(smsSendLogs).values({
      phoneNumber: phone,
      templateCode: templateCode || "unknown",
      templateParam: JSON.stringify({ code }),
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ipAddress: ip,
      userId: userId,
      sentAt: new Date(),
    });
    
    return {
      success: false,
      message: "短信服务异常，请稍后重试",
    };
  }
}

/**
 * 发送验证码短信
 */
export async function sendVerificationCode(
  phoneNumber: string,
  ip?: string,
  userId?: number
): Promise<VerificationCodeResult> {
  // 生成6位验证码
  const code = generateVerificationCode(6);

  // 发送短信
  const result = await sendAliyunSms({
    phone: phoneNumber,
    code,
    ip,
    userId,
  });

  if (result.success) {
    // 缓存验证码（5分钟有效期）
    const expiry = Date.now() + 5 * 60 * 1000;
    verificationCodeCache.set(phoneNumber, { code, expiry, attempts: 0 });

    return {
      success: true,
      message: `验证码已发送到 ${phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}`,
    };
  }

  return {
    success: false,
    message: result.message,
  };
}

/**
 * 验证验证码
 */
export async function verifyCode(
  phoneNumber: string,
  code: string
): Promise<VerificationCodeResult> {
  const cached = verificationCodeCache.get(phoneNumber);

  if (!cached) {
    return {
      success: false,
      message: "验证码不存在或已过期，请重新获取",
    };
  }

  // 检查是否过期
  if (Date.now() > cached.expiry) {
    verificationCodeCache.delete(phoneNumber);
    return {
      success: false,
      message: "验证码已过期，请重新获取",
    };
  }

  // 检查尝试次数
  const maxAttempts = 5;
  if (cached.attempts >= maxAttempts) {
    verificationCodeCache.delete(phoneNumber);
    return {
      success: false,
      message: "验证码错误次数过多，请重新获取",
    };
  }

  // 验证码比对
  if (cached.code !== code) {
    cached.attempts++;
    return {
      success: false,
      message: "验证码错误",
      remainingAttempts: maxAttempts - cached.attempts,
    };
  }

  // 验证成功，删除缓存
  verificationCodeCache.delete(phoneNumber);

  return {
    success: true,
    message: "验证成功",
  };
}

/**
 * 获取短信发送日志
 */
export async function getSmsLogs(params: {
  phoneNumber?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}) {
  const { phoneNumber, status, startDate, endDate, page = 1, pageSize = 20 } = params;

  const conditions = [];

  if (phoneNumber) {
    conditions.push(eq(smsSendLogs.phoneNumber, phoneNumber));
  }

  if (status) {
    conditions.push(eq(smsSendLogs.status, status as any));
  }

  if (startDate) {
    conditions.push(gte(smsSendLogs.sentAt, startDate));
  }

  if (endDate) {
    conditions.push(sql`${smsSendLogs.sentAt} <= ${endDate}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, countResult] = await Promise.all([
    db
      .select()
      .from(smsSendLogs)
      .where(whereClause)
      .orderBy(desc(smsSendLogs.sentAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(smsSendLogs)
      .where(whereClause),
  ]);

  return {
    logs,
    total: Number(countResult[0]?.count || 0),
    page,
    pageSize,
    totalPages: Math.ceil(Number(countResult[0]?.count || 0) / pageSize),
  };
}

/**
 * 获取短信统计
 */
export async function getSmsStatistics(days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await db
    .select({
      status: smsSendLogs.status,
      count: sql<number>`count(*)`,
    })
    .from(smsSendLogs)
    .where(gte(smsSendLogs.sentAt, startDate))
    .groupBy(smsSendLogs.status);

  const dailyStats = await db
    .select({
      date: sql<string>`DATE(${smsSendLogs.sentAt})`,
      count: sql<number>`count(*)`,
      successCount: sql<number>`SUM(CASE WHEN ${smsSendLogs.status} = 'success' THEN 1 ELSE 0 END)`,
    })
    .from(smsSendLogs)
    .where(gte(smsSendLogs.sentAt, startDate))
    .groupBy(sql`DATE(${smsSendLogs.sentAt})`)
    .orderBy(sql`DATE(${smsSendLogs.sentAt})`);

  const totalSent = stats.reduce((sum, s) => sum + Number(s.count), 0);
  const successCount = Number(stats.find((s) => s.status === "success")?.count || 0);
  const failedCount = Number(stats.find((s) => s.status === "failed")?.count || 0);

  return {
    totalSent,
    successCount,
    failedCount,
    successRate: totalSent > 0 ? ((successCount / totalSent) * 100).toFixed(2) : "0",
    dailyStats: dailyStats.map((d) => ({
      date: d.date,
      total: Number(d.count),
      success: Number(d.successCount),
    })),
  };
}

/**
 * 保存短信配置
 */
export async function saveSmsConfig(config: {
  provider?: string;
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  region?: string;
  isActive?: boolean;
}) {
  const provider = config.provider || "aliyun";
  
  // 检查是否已存在配置
  const existing = await db
    .select()
    .from(smsServiceConfig)
    .where(eq(smsServiceConfig.provider, provider as any))
    .limit(1);

  if (existing.length > 0) {
    // 更新现有配置
    await db
      .update(smsServiceConfig)
      .set({
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        signName: config.signName,
        templateCode: config.templateCode,
        region: config.region || "cn-hangzhou",
        isActive: config.isActive !== false ? 1 : 0,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(smsServiceConfig.provider, provider as any));
  } else {
    // 创建新配置
    await db.insert(smsServiceConfig).values({
      provider: provider as any,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      signName: config.signName,
      templateCode: config.templateCode,
      region: config.region || "cn-hangzhou",
      isActive: config.isActive !== false ? 1 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { success: true };
}

/**
 * 获取当前短信配置（不包含敏感信息）
 */
export async function getCurrentSmsConfig() {
  const dbConfig = await db
    .select()
    .from(smsServiceConfig)
    .where(eq(smsServiceConfig.isActive, 1))
    .limit(1);

  if (dbConfig.length === 0) {
    // 检查环境变量
    if (SMS_ACCESS_KEY_ID && SMS_ACCESS_KEY_SECRET) {
      return {
        provider: "aliyun",
        signName: "错题分析系统",
        templateCode: "SMS_123456789",
        region: "cn-hangzhou",
        isConfigured: true,
        source: "environment",
      };
    }
    return {
      isConfigured: false,
    };
  }

  return {
    provider: dbConfig[0].provider,
    signName: dbConfig[0].signName,
    templateCode: dbConfig[0].templateCode,
    region: dbConfig[0].region,
    isConfigured: true,
    source: "database",
  };
}

/**
 * 检查短信服务是否已配置
 */
export async function isSmsServiceConfigured(): Promise<boolean> {
  const config = await getSmsConfig();
  return config !== null;
}

/**
 * 获取阿里云错误信息
 */
function getAliyunErrorMessage(code: string): string | null {
  const errorMessages: Record<string, string> = {
    "isv.OUT_OF_SERVICE": "业务停机，请检查阿里云账户余额",
    "isv.PRODUCT_UN_SUBSCRIPT": "未开通云通信产品的短信功能",
    "isv.PRODUCT_UNSUBSCRIBE": "产品未开通",
    "isv.ACCOUNT_NOT_EXISTS": "账户不存在",
    "isv.ACCOUNT_ABNORMAL": "账户异常",
    "isv.SMS_TEMPLATE_ILLEGAL": "短信模板不合法",
    "isv.SMS_SIGNATURE_ILLEGAL": "短信签名不合法",
    "isv.INVALID_PARAMETERS": "参数异常",
    "isv.MOBILE_NUMBER_ILLEGAL": "非法手机号",
    "isv.MOBILE_COUNT_OVER_LIMIT": "手机号码数量超过限制",
    "isv.TEMPLATE_MISSING_PARAMETERS": "模板缺少变量",
    "isv.BUSINESS_LIMIT_CONTROL": "业务限流",
    "isv.INVALID_JSON_PARAM": "JSON参数不合法",
    "isv.BLACK_KEY_CONTROL_LIMIT": "黑名单管控",
    "isv.PARAM_LENGTH_LIMIT": "参数超出长度限制",
    "isv.PARAM_NOT_SUPPORT_URL": "不支持URL",
    "isv.AMOUNT_NOT_ENOUGH": "账户余额不足",
    "isv.TEMPLATE_PARAMS_ILLEGAL": "模板变量里包含非法关键字",
  };

  return errorMessages[code] || null;
}
