import * as AlipaySdk from "alipay-sdk";
import { getPaymentConfig } from "./paymentConfigService";

/**
 * 支付宝配置接口
 */
interface AlipayConfig {
  appId: string; // 应用ID
  privateKey: string; // 应用私钥
  alipayPublicKey: string; // 支付宝公钥
  gateway?: string; // 网关地址（可选，默认为正式环境）
}

/**
 * 获取支付宝客户端
 */
async function getAlipayClient(): Promise<any | null> {
  const config = await getPaymentConfig("alipay");
  
  if (!config || !config.isEnabled) {
    return null;
  }
  
  const alipayConfig = config.config as AlipayConfig;
  
  return new (AlipaySdk as any).default({
    appId: alipayConfig.appId,
    privateKey: alipayConfig.privateKey,
    alipayPublicKey: alipayConfig.alipayPublicKey,
    gateway: alipayConfig.gateway || "https://openapi.alipay.com/gateway.do",
    timeout: 30000,
  });
}

/**
 * 创建支付宝扫码支付订单
 */
export async function createAlipayQrCode(params: {
  orderNo: string;
  amount: number; // 单位：分
  subject: string;
  notifyUrl: string;
  returnUrl?: string;
}): Promise<{ qrCode: string } | null> {
  const client = await getAlipayClient();
  
  if (!client) {
    throw new Error("支付宝支付未配置或未启用");
  }
  
  try {
    const result = await client.exec("alipay.trade.precreate", {
      bizContent: {
        out_trade_no: params.orderNo,
        total_amount: (params.amount / 100).toFixed(2), // 转换为元
        subject: params.subject,
        notify_url: params.notifyUrl,
      },
    });
    
    if (result.code === "10000") {
      return {
        qrCode: result.qr_code,
      };
    } else {
      throw new Error(result.sub_msg || result.msg);
    }
  } catch (error: any) {
    console.error("支付宝创建订单失败:", error);
    throw new Error(`支付宝创建订单失败: ${error.message}`);
  }
}

/**
 * 查询支付宝订单状态
 */
export async function queryAlipayOrder(orderNo: string): Promise<{
  status: "WAIT_BUYER_PAY" | "TRADE_CLOSED" | "TRADE_SUCCESS" | "TRADE_FINISHED";
  tradeNo?: string;
  paidAt?: string;
} | null> {
  const client = await getAlipayClient();
  
  if (!client) {
    return null;
  }
  
  try {
    const result = await client.exec("alipay.trade.query", {
      bizContent: {
        out_trade_no: orderNo,
      },
    });
    
    if (result.code === "10000") {
      return {
        status: result.trade_status,
        tradeNo: result.trade_no,
        paidAt: result.send_pay_date,
      };
    } else {
      return null;
    }
  } catch (error: any) {
    console.error("查询支付宝订单失败:", error);
    return null;
  }
}

/**
 * 验证支付宝回调签名
 */
export async function verifyAlipayCallback(params: {
  [key: string]: string;
}): Promise<boolean> {
  const client = await getAlipayClient();
  
  if (!client) {
    return false;
  }
  
  try {
    // 使用SDK的checkNotifySign方法验证签名
    return client.checkNotifySign(params);
  } catch (error) {
    console.error("支付宝回调验签失败:", error);
    return false;
  }
}

/**
 * 关闭支付宝订单
 */
export async function closeAlipayOrder(orderNo: string): Promise<boolean> {
  const client = await getAlipayClient();
  
  if (!client) {
    return false;
  }
  
  try {
    const result = await client.exec("alipay.trade.close", {
      bizContent: {
        out_trade_no: orderNo,
      },
    });
    
    return result.code === "10000";
  } catch (error: any) {
    console.error("关闭支付宝订单失败:", error);
    return false;
  }
}
