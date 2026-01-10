import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  registerUser,
  loginUser,
  changePassword,
  isUsernameExists,
  isEmailExists,
  findUserByUsername,
} from "./services/passwordAuth";

describe("密码认证服务测试", () => {
  const testUsername = `test_user_${Date.now()}`;
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "Test123456";
  let testUserId: number;
  let testOpenId: string;

  // 清理测试数据
  afterAll(async () => {
    if (testOpenId) {
      await db.delete(users).where(eq(users.openId, testOpenId));
    }
  });

  describe("密码哈希功能", () => {
    it("应该正确哈希密码", async () => {
      const password = "mySecurePassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("应该正确验证密码", async () => {
      const password = "mySecurePassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("应该拒绝错误的密码", async () => {
      const password = "mySecurePassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("wrongPassword", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("用户注册功能", () => {
    it("应该成功注册新用户", async () => {
      const result = await registerUser({
        username: testUsername,
        password: testPassword,
        email: testEmail,
        name: "测试用户",
      });

      expect(result.userId).toBeDefined();
      expect(result.openId).toBeDefined();
      expect(result.openId).toMatch(/^local_/);

      testUserId = result.userId;
      testOpenId = result.openId;
    });

    it("应该拒绝重复的用户名", async () => {
      await expect(
        registerUser({
          username: testUsername,
          password: testPassword,
        })
      ).rejects.toThrow("用户名已存在");
    });

    it("应该拒绝重复的邮箱", async () => {
      await expect(
        registerUser({
          username: `another_user_${Date.now()}`,
          password: testPassword,
          email: testEmail,
        })
      ).rejects.toThrow("邮箱已被注册");
    });
  });

  describe("用户名和邮箱检查", () => {
    it("应该正确检测已存在的用户名", async () => {
      const exists = await isUsernameExists(testUsername);
      expect(exists).toBe(true);
    });

    it("应该正确检测不存在的用户名", async () => {
      const exists = await isUsernameExists(`nonexistent_${Date.now()}`);
      expect(exists).toBe(false);
    });

    it("应该正确检测已存在的邮箱", async () => {
      const exists = await isEmailExists(testEmail);
      expect(exists).toBe(true);
    });

    it("应该正确检测不存在的邮箱", async () => {
      const exists = await isEmailExists(`nonexistent_${Date.now()}@example.com`);
      expect(exists).toBe(false);
    });
  });

  describe("用户登录功能", () => {
    it("应该使用用户名成功登录", async () => {
      const result = await loginUser({
        account: testUsername,
        password: testPassword,
      });

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe(testUsername);
      expect(result.sessionToken).toBeDefined();
    });

    it("应该使用邮箱成功登录", async () => {
      const result = await loginUser({
        account: testEmail,
        password: testPassword,
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.sessionToken).toBeDefined();
    });

    it("应该拒绝错误的密码", async () => {
      await expect(
        loginUser({
          account: testUsername,
          password: "wrongPassword",
        })
      ).rejects.toThrow("密码错误");
    });

    it("应该拒绝不存在的用户", async () => {
      await expect(
        loginUser({
          account: `nonexistent_${Date.now()}`,
          password: testPassword,
        })
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("修改密码功能", () => {
    const newPassword = "NewTest123456";

    it("应该成功修改密码", async () => {
      await changePassword({
        userId: testUserId,
        oldPassword: testPassword,
        newPassword: newPassword,
      });

      // 验证新密码可以登录
      const result = await loginUser({
        account: testUsername,
        password: newPassword,
      });
      expect(result.user).toBeDefined();
    });

    it("应该拒绝错误的原密码", async () => {
      await expect(
        changePassword({
          userId: testUserId,
          oldPassword: "wrongOldPassword",
          newPassword: "AnotherNew123",
        })
      ).rejects.toThrow("原密码错误");
    });

    it("应该拒绝不存在的用户", async () => {
      await expect(
        changePassword({
          userId: 999999,
          oldPassword: newPassword,
          newPassword: "AnotherNew123",
        })
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("查找用户功能", () => {
    it("应该通过用户名找到用户", async () => {
      const user = await findUserByUsername(testUsername);
      expect(user).toBeDefined();
      expect(user?.username).toBe(testUsername);
    });

    it("应该返回null当用户名不存在", async () => {
      const user = await findUserByUsername(`nonexistent_${Date.now()}`);
      expect(user).toBeNull();
    });
  });
});
