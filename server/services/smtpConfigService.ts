import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const SMTP_CONFIG_KEY = "smtp_config";
const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.JWT_SECRET || "default-encryption-key-change-me";

/**
 * SMTP配置接口
 */
export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

/**
 * 加密敏感数据
 */
function encrypt(text: string): string {
  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * 解密敏感数据
 */
function decrypt(encryptedText: string): string {
  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const parts = encryptedText.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * 获取SMTP配置
 */
export async function getSMTPConfig(): Promise<SMTPConfig | null> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const setting = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, SMTP_CONFIG_KEY))
      .limit(1);

    if (setting.length === 0) {
      return null;
    }

    const configData = setting[0];
    let configValue = configData.settingValue;

    // 如果是加密存储，先解密
    if (configData.isEncrypted) {
      configValue = decrypt(configValue);
    }

    return JSON.parse(configValue) as SMTPConfig;
  } catch (error) {
    console.error("Failed to get SMTP config:", error);
    return null;
  }
}

/**
 * 保存SMTP配置（管理员操作）
 */
export async function saveSMTPConfig(
  config: SMTPConfig,
  adminId: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    // 加密配置（因为包含密码）
    const configJson = JSON.stringify(config);
    const encryptedConfig = encrypt(configJson);

    // 检查是否已存在配置
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, SMTP_CONFIG_KEY))
      .limit(1);

    if (existing.length > 0) {
      // 更新现有配置
      await db
        .update(systemSettings)
        .set({
          settingValue: encryptedConfig,
          // @ts-ignore
          isEncrypted: true,
          lastModifiedBy: adminId,
          // @ts-ignore
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.settingKey, SMTP_CONFIG_KEY));
    } else {
      // 创建新配置
      await db.insert(systemSettings as any).values({
        settingKey: SMTP_CONFIG_KEY,
        settingValue: encryptedConfig,
        description: "SMTP邮件服务器配置",
        isEncrypted: true,
        lastModifiedBy: adminId,
      });
    }
  } catch (error) {
    console.error("Failed to save SMTP config:", error);
    throw new Error("保存SMTP配置失败");
  }
}

/**
 * 删除SMTP配置（管理员操作）
 */
export async function deleteSMTPConfig(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    await db
      .delete(systemSettings)
      .where(eq(systemSettings.settingKey, SMTP_CONFIG_KEY));
  } catch (error) {
    console.error("Failed to delete SMTP config:", error);
    throw new Error("删除SMTP配置失败");
  }
}

/**
 * 测试SMTP配置是否有效
 */
export async function testSMTPConfig(config: SMTPConfig): Promise<boolean> {
  try {
    const nodemailer = await import("nodemailer");
    
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    // 验证连接
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("SMTP config test failed:", error);
    return false;
  }
}

/**
 * 获取SMTP配置状态（不返回敏感信息）
 */
export async function getSMTPConfigStatus(): Promise<{
  configured: boolean;
  host?: string;
  port?: number;
  fromEmail?: string;
  fromName?: string;
}> {
  const config = await getSMTPConfig();
  
  if (!config) {
    return { configured: false };
  }

  return {
    configured: true,
    host: config.host,
    port: config.port,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
  };
}
