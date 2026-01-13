import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testEmailConfiguration } from "./services/emailNotificationService";
import { getCleanupStats, batchCleanupExpiredFiles } from "./exportHistoryService";

describe("Email Notification Service", () => {
  describe("testEmailConfiguration", () => {
    it("should return false when SMTP is not configured", async () => {
      // 在没有配置SMTP的情况下，应该返回false
      const originalHost = process.env.SMTP_HOST;
      const originalUser = process.env.SMTP_USER;
      const originalPass = process.env.SMTP_PASS;
      
      // 清除SMTP配置
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      
      const result = await testEmailConfiguration();
      
      // 恢复原始配置
      if (originalHost) process.env.SMTP_HOST = originalHost;
      if (originalUser) process.env.SMTP_USER = originalUser;
      if (originalPass) process.env.SMTP_PASS = originalPass;
      
      expect(result).toBe(false);
    });
  });
});

describe("Export History Service", () => {
  describe("getCleanupStats", () => {
    it("should return cleanup statistics", async () => {
      const stats = await getCleanupStats();
      
      expect(stats).toHaveProperty("totalRecords");
      expect(stats).toHaveProperty("expiredRecords");
      expect(stats).toHaveProperty("pendingCleanup");
      expect(stats).toHaveProperty("cleanedLast30Days");
      expect(stats).toHaveProperty("savedStorageBytes");
      expect(stats).toHaveProperty("savedStorageMB");
      
      expect(typeof stats.totalRecords).toBe("number");
      expect(typeof stats.expiredRecords).toBe("number");
      expect(typeof stats.pendingCleanup).toBe("number");
      expect(stats.pendingCleanup).toBeGreaterThanOrEqual(0);
    });
  });

  describe("batchCleanupExpiredFiles", () => {
    it("should return cleanup results", async () => {
      const result = await batchCleanupExpiredFiles(10);
      
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("failed");
      expect(result).toHaveProperty("errors");
      
      expect(typeof result.total).toBe("number");
      expect(typeof result.success).toBe("number");
      expect(typeof result.failed).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
      
      // 验证成功+失败=总数
      expect(result.success + result.failed).toBe(result.total);
    });
  });
});
