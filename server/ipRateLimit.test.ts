import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkIpRateLimit,
  recordIpRequest,
  isIpBlacklisted,
  addToBlacklist,
  removeFromBlacklist,
  getIpRateLimitStatus,
  getBlockedIps,
  getBlacklist,
  IP_RATE_LIMIT_CONFIG,
} from "./services/ipRateLimitService";
import { db } from "./db";
import { ipRateLimits, ipBlacklist } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("IP频率限制服务", () => {
  const testIp = "192.168.1.100";
  const testIp2 = "192.168.1.101";

  // 清理测试数据
  beforeEach(async () => {
    await db.delete(ipRateLimits).where(eq(ipRateLimits.ipAddress, testIp));
    await db.delete(ipRateLimits).where(eq(ipRateLimits.ipAddress, testIp2));
    await db.delete(ipBlacklist).where(eq(ipBlacklist.ipAddress, testIp));
    await db.delete(ipBlacklist).where(eq(ipBlacklist.ipAddress, testIp2));
  });

  afterEach(async () => {
    await db.delete(ipRateLimits).where(eq(ipRateLimits.ipAddress, testIp));
    await db.delete(ipRateLimits).where(eq(ipRateLimits.ipAddress, testIp2));
    await db.delete(ipBlacklist).where(eq(ipBlacklist.ipAddress, testIp));
    await db.delete(ipBlacklist).where(eq(ipBlacklist.ipAddress, testIp2));
  });

  describe("checkIpRateLimit", () => {
    it("应该允许新IP的首次请求", async () => {
      const result = await checkIpRateLimit(testIp, "SMS_SEND");
      
      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(IP_RATE_LIMIT_CONFIG.SMS_SEND.maxRequests);
      expect(result.blockedUntil).toBeNull();
    });

    it("应该正确计算剩余请求次数", async () => {
      // 记录一些请求
      await recordIpRequest(testIp, "SMS_SEND");
      await recordIpRequest(testIp, "SMS_SEND");
      await recordIpRequest(testIp, "SMS_SEND");

      const result = await checkIpRateLimit(testIp, "SMS_SEND");
      
      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(IP_RATE_LIMIT_CONFIG.SMS_SEND.maxRequests - 3);
    });

    it("应该在超过限制时拒绝请求", async () => {
      // 记录超过限制的请求
      for (let i = 0; i < IP_RATE_LIMIT_CONFIG.SMS_SEND.maxRequests; i++) {
        await recordIpRequest(testIp, "SMS_SEND");
      }

      const result = await checkIpRateLimit(testIp, "SMS_SEND");
      
      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.blockedUntil).not.toBeNull();
      expect(result.reason).toContain("请求过于频繁");
    });
  });

  describe("recordIpRequest", () => {
    it("应该正确记录IP请求", async () => {
      await recordIpRequest(testIp, "SMS_SEND");

      const records = await db
        .select()
        .from(ipRateLimits)
        .where(
          and(
            eq(ipRateLimits.ipAddress, testIp),
            eq(ipRateLimits.action, "sms_send")
          )
        );

      expect(records.length).toBe(1);
      expect(records[0].requestCount).toBe(1);
    });

    it("应该累加同一IP的请求次数", async () => {
      await recordIpRequest(testIp, "SMS_SEND");
      await recordIpRequest(testIp, "SMS_SEND");
      await recordIpRequest(testIp, "SMS_SEND");

      const records = await db
        .select()
        .from(ipRateLimits)
        .where(
          and(
            eq(ipRateLimits.ipAddress, testIp),
            eq(ipRateLimits.action, "sms_send")
          )
        );

      expect(records.length).toBe(1);
      expect(records[0].requestCount).toBe(3);
    });

    it("应该分别记录不同操作类型的请求", async () => {
      await recordIpRequest(testIp, "SMS_SEND");
      await recordIpRequest(testIp, "CAPTCHA_REQUEST");

      const smsRecords = await db
        .select()
        .from(ipRateLimits)
        .where(
          and(
            eq(ipRateLimits.ipAddress, testIp),
            eq(ipRateLimits.action, "sms_send")
          )
        );

      const captchaRecords = await db
        .select()
        .from(ipRateLimits)
        .where(
          and(
            eq(ipRateLimits.ipAddress, testIp),
            eq(ipRateLimits.action, "captcha_request")
          )
        );

      expect(smsRecords.length).toBe(1);
      expect(captchaRecords.length).toBe(1);
    });
  });

  describe("黑名单功能", () => {
    it("应该正确添加IP到黑名单", async () => {
      await addToBlacklist({
        ipAddress: testIp,
        reason: "测试封禁",
        blockedBy: "test",
      });

      const isBlocked = await isIpBlacklisted(testIp);
      expect(isBlocked).toBe(true);
    });

    it("应该正确从黑名单移除IP", async () => {
      await addToBlacklist({
        ipAddress: testIp,
        reason: "测试封禁",
      });

      await removeFromBlacklist(testIp);

      const isBlocked = await isIpBlacklisted(testIp);
      expect(isBlocked).toBe(false);
    });

    it("黑名单IP应该被拒绝所有请求", async () => {
      await addToBlacklist({
        ipAddress: testIp,
        reason: "测试封禁",
      });

      const result = await checkIpRateLimit(testIp, "SMS_SEND");
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("永久封禁");
    });

    it("应该支持带过期时间的黑名单", async () => {
      const expiresAt = new Date(Date.now() - 1000); // 已过期
      await addToBlacklist({
        ipAddress: testIp,
        reason: "测试封禁",
        expiresAt,
      });

      const isBlocked = await isIpBlacklisted(testIp);
      expect(isBlocked).toBe(false);
    });
  });

  describe("getIpRateLimitStatus", () => {
    it("应该返回IP的完整状态", async () => {
      await recordIpRequest(testIp, "SMS_SEND");
      await recordIpRequest(testIp, "CAPTCHA_REQUEST");

      const status = await getIpRateLimitStatus(testIp);
      
      expect(status.actions.length).toBe(2);
      expect(status.isBlacklisted).toBe(false);
    });
  });

  describe("getBlockedIps", () => {
    it("应该返回所有被封禁的IP", async () => {
      // 触发封禁 - 使用较小的限制来加快测试
      for (let i = 0; i < IP_RATE_LIMIT_CONFIG.SMS_SEND.maxRequests; i++) {
        await recordIpRequest(testIp, "SMS_SEND");
      }
      await checkIpRateLimit(testIp, "SMS_SEND"); // 触发封禁

      const blockedIps = await getBlockedIps();
      
      expect(blockedIps.some(ip => ip.ipAddress === testIp)).toBe(true);
    }, 30000); // 增加超时时间到30秒
  });

  describe("getBlacklist", () => {
    it("应该返回所有黑名单IP", async () => {
      await addToBlacklist({
        ipAddress: testIp,
        reason: "测试1",
      });
      await addToBlacklist({
        ipAddress: testIp2,
        reason: "测试2",
      });

      const blacklist = await getBlacklist();
      
      expect(blacklist.length).toBeGreaterThanOrEqual(2);
      expect(blacklist.some(item => item.ipAddress === testIp)).toBe(true);
      expect(blacklist.some(item => item.ipAddress === testIp2)).toBe(true);
    });
  });
});
