import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { captchaCodes } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  createCaptcha,
  verifyCaptcha,
  cleanExpiredCaptchas,
} from "./services/captchaService";

describe("图形验证码服务", () => {
  let testCaptchaId: string;
  let testCode: string;

  afterAll(async () => {
    // 清理测试数据
    if (testCaptchaId) {
      await db.delete(captchaCodes).where(eq(captchaCodes.captchaId, testCaptchaId));
    }
  });

  describe("createCaptcha", () => {
    it("应该成功创建图形验证码", async () => {
      const result = await createCaptcha();
      
      expect(result).toHaveProperty("captchaId");
      expect(result).toHaveProperty("svg");
      expect(result).toHaveProperty("expiresAt");
      expect(result.captchaId).toBeTruthy();
      expect(result.svg).toContain("<svg");
      expect(result.expiresAt).toBeInstanceOf(Date);
      
      // 保存用于后续测试
      testCaptchaId = result.captchaId;
      
      // 从数据库获取验证码
      const dbRecord = await db
        .select()
        .from(captchaCodes)
        .where(eq(captchaCodes.captchaId, testCaptchaId))
        .limit(1);
      
      expect(dbRecord.length).toBe(1);
      expect(dbRecord[0].used).toBe(0);
      testCode = dbRecord[0].code;
    });

    it("生成的SVG应该包含验证码字符", async () => {
      const result = await createCaptcha();
      
      // SVG应该包含text元素
      expect(result.svg).toContain("<text");
      expect(result.svg).toContain("</svg>");
      
      // 清理
      await db.delete(captchaCodes).where(eq(captchaCodes.captchaId, result.captchaId));
    });
  });

  describe("verifyCaptcha", () => {
    it("应该成功验证正确的验证码", async () => {
      // 创建新的验证码用于测试
      const captcha = await createCaptcha();
      const dbRecord = await db
        .select()
        .from(captchaCodes)
        .where(eq(captchaCodes.captchaId, captcha.captchaId))
        .limit(1);
      
      const isValid = await verifyCaptcha({
        captchaId: captcha.captchaId,
        code: dbRecord[0].code,
      });
      
      expect(isValid).toBe(true);
      
      // 验证后应该标记为已使用
      const updatedRecord = await db
        .select()
        .from(captchaCodes)
        .where(eq(captchaCodes.captchaId, captcha.captchaId))
        .limit(1);
      
      expect(updatedRecord[0].used).toBe(1);
    });

    it("应该拒绝错误的验证码", async () => {
      const captcha = await createCaptcha();
      
      const isValid = await verifyCaptcha({
        captchaId: captcha.captchaId,
        code: "WRONG",
      });
      
      expect(isValid).toBe(false);
      
      // 清理
      await db.delete(captchaCodes).where(eq(captchaCodes.captchaId, captcha.captchaId));
    });

    it("应该拒绝已使用的验证码", async () => {
      const captcha = await createCaptcha();
      const dbRecord = await db
        .select()
        .from(captchaCodes)
        .where(eq(captchaCodes.captchaId, captcha.captchaId))
        .limit(1);
      
      // 第一次验证
      const firstResult = await verifyCaptcha({
        captchaId: captcha.captchaId,
        code: dbRecord[0].code,
      });
      expect(firstResult).toBe(true);
      
      // 第二次验证同一个验证码
      const secondResult = await verifyCaptcha({
        captchaId: captcha.captchaId,
        code: dbRecord[0].code,
      });
      expect(secondResult).toBe(false);
    });

    it("应该拒绝不存在的验证码ID", async () => {
      const isValid = await verifyCaptcha({
        captchaId: "non-existent-id",
        code: "ABCD",
      });
      
      expect(isValid).toBe(false);
    });

    it("验证码应该不区分大小写", async () => {
      const captcha = await createCaptcha();
      const dbRecord = await db
        .select()
        .from(captchaCodes)
        .where(eq(captchaCodes.captchaId, captcha.captchaId))
        .limit(1);
      
      // 使用小写验证
      const isValid = await verifyCaptcha({
        captchaId: captcha.captchaId,
        code: dbRecord[0].code.toLowerCase(),
      });
      
      expect(isValid).toBe(true);
    });
  });

  describe("cleanExpiredCaptchas", () => {
    it("应该清理过期的验证码", async () => {
      // 创建一个已过期的验证码
      const expiredCaptchaId = "test-expired-" + Date.now();
      await db.insert(captchaCodes).values({
        captchaId: expiredCaptchaId,
        code: "TEST",
        expiresAt: new Date(Date.now() - 1000), // 已过期
      });
      
      // 验证已插入
      const beforeClean = await db
        .select()
        .from(captchaCodes)
        .where(eq(captchaCodes.captchaId, expiredCaptchaId))
        .limit(1);
      expect(beforeClean.length).toBe(1);
      
      // 清理过期验证码
      await cleanExpiredCaptchas();
      
      // 验证已删除
      const afterClean = await db
        .select()
        .from(captchaCodes)
        .where(eq(captchaCodes.captchaId, expiredCaptchaId))
        .limit(1);
      expect(afterClean.length).toBe(0);
    });
  });
});
