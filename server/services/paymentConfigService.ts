import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { paymentConfigs } from "../../drizzle/schema";
import crypto from "crypto";

// 加密密钥（应该从环境变量读取）
const ENCRYPTION_KEY = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY || "default-32-char-encryption-key!";
const ALGORITHM = "aes-256-cbc";

/**
 * 加密支付配置
 */
function encryptConfig(config: any): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    iv
  );
  
  let encrypted = cipher.update(JSON.stringify(config), "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * 解密支付配置
 */
function decryptConfig(encryptedConfig: string): any {
  const parts = encryptedConfig.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    iv
  );
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return JSON.parse(decrypted);
}

/**
 * 保存支付配置
 */
export async function savePaymentConfig(params: {
  paymentMethod: "stripe" | "wechat" | "alipay";
  config: any;
  isEnabled: boolean;
  lastModifiedBy: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const encryptedConfig = encryptConfig(params.config);
  
  // 检查是否已存在
  const existing = await db
    .select()
    .from(paymentConfigs)
    .where(eq(paymentConfigs.paymentMethod, params.paymentMethod))
    .limit(1);
  
  if (existing.length > 0) {
    // 更新
    await db
      .update(paymentConfigs)
      .set({
        config: encryptedConfig,
        isEnabled: params.isEnabled,
        lastModifiedBy: params.lastModifiedBy,
        updatedAt: new Date(),
      })
      .where(eq(paymentConfigs.paymentMethod, params.paymentMethod));
  } else {
    // 插入
    await db.insert(paymentConfigs).values({
      paymentMethod: params.paymentMethod,
      config: encryptedConfig,
      isEnabled: params.isEnabled,
      lastModifiedBy: params.lastModifiedBy,
    });
  }
}

/**
 * 获取支付配置
 */
export async function getPaymentConfig(
  paymentMethod: "stripe" | "wechat" | "alipay"
): Promise<{ config: any; isEnabled: boolean } | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(paymentConfigs)
    .where(eq(paymentConfigs.paymentMethod, paymentMethod))
    .limit(1);
  
  if (result.length === 0) {
    return null;
  }
  
  const decryptedConfig = decryptConfig(result[0].config);
  
  return {
    config: decryptedConfig,
    isEnabled: result[0].isEnabled,
  };
}

/**
 * 获取所有支付配置（管理员用，不返回敏感信息）
 */
export async function getAllPaymentConfigs(): Promise<
  Array<{
    paymentMethod: string;
    isEnabled: boolean;
    hasConfig: boolean;
    updatedAt: Date;
  }>
> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(paymentConfigs);
  
  return results.map((r: any) => ({
    paymentMethod: r.paymentMethod,
    isEnabled: r.isEnabled,
    hasConfig: !!r.config,
    updatedAt: r.updatedAt,
  }));
}

/**
 * 启用/禁用支付方式
 */
export async function togglePaymentMethod(
  paymentMethod: "stripe" | "wechat" | "alipay",
  isEnabled: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(paymentConfigs)
    .set({ isEnabled, updatedAt: new Date() })
    .where(eq(paymentConfigs.paymentMethod, paymentMethod));
}
