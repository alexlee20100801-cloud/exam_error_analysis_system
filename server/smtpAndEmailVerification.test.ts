import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, systemSettings, emailVerificationTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  saveSMTPConfig,
  getSMTPConfig,
  deleteSMTPConfig,
  getSMTPConfigStatus,
  type SMTPConfig,
} from "./services/smtpConfigService";
import {
  createEmailVerificationToken,
  verifyEmailToken,
  isEmailVerified,
} from "./services/emailVerificationService";

describe("SMTP配置和邮箱验证功能测试", () => {
  let testUserId: number;
  let testAdminId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建测试用户
    const [testUser] = await db.insert(users).values({
      openId: `test-smtp-user-${Date.now()}`,
      name: "SMTP测试用户",
      email: "test@example.com",
      emailVerified: false,
      role: "user",
      userType: "student",
    });
    testUserId = testUser.insertId;

    // 创建测试管理员
    const [testAdmin] = await db.insert(users).values({
      openId: `test-smtp-admin-${Date.now()}`,
      name: "SMTP测试管理员",
      role: "admin",
      userType: "student",
    });
    testAdminId = testAdmin.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, testAdminId));
    await db.delete(systemSettings).where(eq(systemSettings.settingKey, "smtp_config"));
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, testUserId));
  });

  describe("SMTP配置管理", () => {
    it("应该能够保存SMTP配置", async () => {
      const config: SMTPConfig = {
        host: "smtp.example.com",
        port: 465,
        secure: true,
        user: "test@example.com",
        password: "test-password",
        fromEmail: "noreply@example.com",
        fromName: "测试系统",
      };

      await saveSMTPConfig(config, testAdminId);

      // 验证配置已保存
      const savedConfig = await getSMTPConfig();
      expect(savedConfig).toBeDefined();
      expect(savedConfig?.host).toBe(config.host);
      expect(savedConfig?.port).toBe(config.port);
      expect(savedConfig?.user).toBe(config.user);
      expect(savedConfig?.fromEmail).toBe(config.fromEmail);
    });

    it("应该能够获取SMTP配置状态", async () => {
      const status = await getSMTPConfigStatus();
      expect(status.configured).toBe(true);
      expect(status.host).toBe("smtp.example.com");
      expect(status.port).toBe(465);
      expect(status.fromEmail).toBe("noreply@example.com");
    });

    it("应该能够更新SMTP配置", async () => {
      const updatedConfig: SMTPConfig = {
        host: "smtp.updated.com",
        port: 587,
        secure: false,
        user: "updated@example.com",
        password: "updated-password",
        fromEmail: "noreply@updated.com",
        fromName: "更新后的系统",
      };

      await saveSMTPConfig(updatedConfig, testAdminId);

      const savedConfig = await getSMTPConfig();
      expect(savedConfig?.host).toBe("smtp.updated.com");
      expect(savedConfig?.port).toBe(587);
    });

    it("应该能够删除SMTP配置", async () => {
      await deleteSMTPConfig();

      const config = await getSMTPConfig();
      expect(config).toBeNull();

      const status = await getSMTPConfigStatus();
      expect(status.configured).toBe(false);
    });
  });

  describe("邮箱验证流程", () => {
    let verificationToken: string;

    it("应该能够创建邮箱验证令牌", async () => {
      const email = "verify-test@example.com";
      verificationToken = await createEmailVerificationToken(testUserId, email);

      expect(verificationToken).toBeDefined();
      expect(verificationToken.length).toBeGreaterThan(0);

      // 验证令牌已存储在数据库
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      const [tokenRecord] = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.token, verificationToken))
        .limit(1);

      expect(tokenRecord).toBeDefined();
      expect(tokenRecord.userId).toBe(testUserId);
      expect(tokenRecord.email).toBe(email);
      expect(tokenRecord.status).toBe("pending");
    });

    it("应该能够验证邮箱令牌", async () => {
      const result = await verifyEmailToken(verificationToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe("邮箱验证成功！");
      expect(result.userId).toBe(testUserId);

      // 验证用户邮箱已更新
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(user.emailVerified).toBe(true);
    });

    it("应该能够检查邮箱验证状态", async () => {
      const isVerified = await isEmailVerified(testUserId);
      expect(isVerified).toBe(true);
    });

    it("应该拒绝无效的验证令牌", async () => {
      const result = await verifyEmailToken("invalid-token-12345");

      expect(result.success).toBe(false);
      expect(result.message).toContain("无效");
    });

    it("应该拒绝已使用的验证令牌", async () => {
      const result = await verifyEmailToken(verificationToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain("无效或已被使用");
    });

    it("应该能够处理过期的验证令牌", async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      // 创建一个过期的令牌
      const expiredEmail = "expired@example.com";
      const expiredToken = await createEmailVerificationToken(testUserId, expiredEmail);

      // 手动将令牌设置为过期
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25); // 25小时前
      await db
        .update(emailVerificationTokens)
        .set({ expiresAt: expiredDate })
        .where(eq(emailVerificationTokens.token, expiredToken));

      // 尝试验证过期令牌
      const result = await verifyEmailToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain("过期");
    });
  });

  describe("集成测试：完整邮箱验证流程", () => {
    it("应该能够完成从绑定到验证的完整流程", async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库不可用");

      // 1. 创建新用户
      const [newUser] = await db.insert(users).values({
        openId: `test-integration-${Date.now()}`,
        name: "集成测试用户",
        role: "user",
        userType: "student",
      });
      const newUserId = newUser.insertId;

      try {
        // 2. 用户绑定邮箱（创建验证令牌）
        const email = "integration-test@example.com";
        const token = await createEmailVerificationToken(newUserId, email);

        // 3. 验证邮箱未验证
        let verified = await isEmailVerified(newUserId);
        expect(verified).toBe(false);

        // 4. 用户点击验证链接（验证令牌）
        const result = await verifyEmailToken(token);
        expect(result.success).toBe(true);

        // 5. 验证邮箱已验证
        verified = await isEmailVerified(newUserId);
        expect(verified).toBe(true);

        // 6. 验证用户数据已更新
        const [updatedUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, newUserId))
          .limit(1);

        expect(updatedUser.email).toBe(email);
        expect(updatedUser.emailVerified).toBe(true);
      } finally {
        // 清理测试数据
        await db.delete(users).where(eq(users.id, newUserId));
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, newUserId));
      }
    });
  });
});
