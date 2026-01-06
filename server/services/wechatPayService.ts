import { getPaymentConfig } from "./paymentConfigService";
import crypto from "crypto";
import axios from "axios";

/**
 * 微信支付配置接口
 */
interface WechatPayConfig {
  appId: string; // 应用ID
  mchId: string; // 商户号
  apiV3Key: string; // APIv3密钥
  serialNo: string; // 证书序列号
  privateKey: string; // 商户私钥（PEM格式）
}

/**
 * 生成微信支付签名
 */
function generateWechatSignature(params: {
  method: string;
  url: string;
  timestamp: number;
  nonce: string;
  body: string;
  privateKey: string;
}): string {
  const signStr = `${params.method}\n${params.url}\n${params.timestamp}\n${params.nonce}\n${params.body}\n`;
  
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signStr);
  return sign.sign(params.privateKey, "base64");
}

/**
 * 生成微信支付Authorization头
 */
function generateAuthorizationHeader(params: {
  mchId: string;
  serialNo: string;
  nonce: string;
  timestamp: number;
  signature: string;
}): string {
  return `WECHATPAY2-SHA256-RSA2048 mchid="${params.mchId}",nonce_str="${params.nonce}",signature="${params.signature}",timestamp="${params.timestamp}",serial_no="${params.serialNo}"`;
}

/**
 * 创建微信扫码支付订单
 */
export async function createWechatNativePayment(params: {
  orderNo: string;
  amount: number; // 单位：分
  description: string;
  notifyUrl: string;
}): Promise<{ codeUrl: string } | null> {
  const config = await getPaymentConfig("wechat");
  
  if (!config || !config.isEnabled) {
    throw new Error("微信支付未配置或未启用");
  }
  
  const wechatConfig = config.config as WechatPayConfig;
  
  const url = "/v3/pay/transactions/native";
  const method = "POST";
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString("hex");
  
  const body = JSON.stringify({
    appid: wechatConfig.appId,
    mchid: wechatConfig.mchId,
    description: params.description,
    out_trade_no: params.orderNo,
    notify_url: params.notifyUrl,
    amount: {
      total: params.amount,
      currency: "CNY",
    },
  });
  
  const signature = generateWechatSignature({
    method,
    url,
    timestamp,
    nonce,
    body,
    privateKey: wechatConfig.privateKey,
  });
  
  const authorization = generateAuthorizationHeader({
    mchId: wechatConfig.mchId,
    serialNo: wechatConfig.serialNo,
    nonce,
    timestamp,
    signature,
  });
  
  try {
    const response = await axios.post(
      `https://api.mch.weixin.qq.com${url}`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
          Accept: "application/json",
        },
      }
    );
    
    return {
      codeUrl: response.data.code_url,
    };
  } catch (error: any) {
    console.error("微信支付创建订单失败:", error.response?.data || error.message);
    throw new Error(`微信支付创建订单失败: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * 查询微信支付订单状态
 */
export async function queryWechatPayment(orderNo: string): Promise<{
  status: "SUCCESS" | "REFUND" | "NOTPAY" | "CLOSED" | "REVOKED" | "USERPAYING" | "PAYERROR";
  transactionId?: string;
  paidAt?: string;
} | null> {
  const config = await getPaymentConfig("wechat");
  
  if (!config || !config.isEnabled) {
    return null;
  }
  
  const wechatConfig = config.config as WechatPayConfig;
  
  const url = `/v3/pay/transactions/out-trade-no/${orderNo}?mchid=${wechatConfig.mchId}`;
  const method = "GET";
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString("hex");
  
  const signature = generateWechatSignature({
    method,
    url,
    timestamp,
    nonce,
    body: "",
    privateKey: wechatConfig.privateKey,
  });
  
  const authorization = generateAuthorizationHeader({
    mchId: wechatConfig.mchId,
    serialNo: wechatConfig.serialNo,
    nonce,
    timestamp,
    signature,
  });
  
  try {
    const response = await axios.get(
      `https://api.mch.weixin.qq.com${url}`,
      {
        headers: {
          Authorization: authorization,
          Accept: "application/json",
        },
      }
    );
    
    return {
      status: response.data.trade_state,
      transactionId: response.data.transaction_id,
      paidAt: response.data.success_time,
    };
  } catch (error: any) {
    console.error("查询微信支付订单失败:", error.response?.data || error.message);
    return null;
  }
}

/**
 * 验证微信支付回调签名
 * 注意：这是简化版本，生产环境需要下载并使用微信支付平台证书验签
 */
export async function verifyWechatPayCallback(params: {
  timestamp: string;
  nonce: string;
  body: string;
  signature: string;
  serialNo: string;
}): Promise<boolean> {
  // 简化处理：实际生产环境需要：
  // 1. 下载微信支付平台证书
  // 2. 使用平台证书公钥验签
  // 3. 定期更新证书
  
  console.log("微信支付回调验签（简化版本）");
  return true;
}

/**
 * 解密微信支付回调数据
 */
export async function decryptWechatPayCallback(params: {
  ciphertext: string;
  nonce: string;
  associatedData: string;
}): Promise<any> {
  const config = await getPaymentConfig("wechat");
  
  if (!config) {
    throw new Error("微信支付未配置");
  }
  
  const wechatConfig = config.config as WechatPayConfig;
  
  // Base64解码密文
  const ciphertextBuffer = Buffer.from(params.ciphertext, "base64");
  
  // 提取tag（最后16字节）
  const tag = ciphertextBuffer.slice(-16);
  const encryptedData = ciphertextBuffer.slice(0, -16);
  
  // 使用APIv3密钥解密
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    wechatConfig.apiV3Key,
    params.nonce
  );
  
  decipher.setAuthTag(tag);
  decipher.setAAD(Buffer.from(params.associatedData));
  
  let decrypted = decipher.update(encryptedData, undefined, "utf8");
  decrypted += decipher.final("utf8");
  
  return JSON.parse(decrypted);
}
