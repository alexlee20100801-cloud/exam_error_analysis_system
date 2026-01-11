import crypto from "crypto";
import { db } from "../db";
import { smsServiceConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// 环境变量配置
const SMS_ACCESS_KEY_ID = process.env.SMS_ACCESS_KEY_ID || "";
const SMS_ACCESS_KEY_SECRET = process.env.SMS_ACCESS_KEY_SECRET || "";

interface SmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  region?: string;
}

/**
 * 获取短信服务配置
 * 优先从环境变量获取，其次从数据库获取
 */
async function getSmsConfig(): Promise<SmsConfig | null> {
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
 * 发送阿里云短信
 */
export async function sendAliyunSms(params: {
  phone: string;
  code: string;
}): Promise<{ success: boolean; message: string; requestId?: string }> {
  const { phone, code } = params;
  
  const config = await getSmsConfig();
  
  if (!config) {
    console.log("[SMS] 短信服务未配置，使用模拟发送");
    console.log(`[SMS] 模拟发送验证码到 ${phone}: ${code}`);
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
      SignName: config.signName,
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: nonce,
      SignatureVersion: "1.0",
      TemplateCode: config.templateCode,
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
    };
    
    if (result.Code === "OK") {
      console.log(`[SMS] 短信发送成功: ${phone}`);
      return {
        success: true,
        message: "验证码已发送",
        requestId: result.RequestId,
      };
    } else {
      console.error(`[SMS] 短信发送失败: ${result.Code} - ${result.Message}`);
      return {
        success: false,
        message: result.Message || "短信发送失败",
        requestId: result.RequestId,
      };
    }
  } catch (error) {
    console.error("[SMS] 短信发送异常:", error);
    return {
      success: false,
      message: "短信服务异常，请稍后重试",
    };
  }
}

/**
 * 检查短信服务是否已配置
 */
export async function isSmsServiceConfigured(): Promise<boolean> {
  const config = await getSmsConfig();
  return config !== null;
}
