import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTRPCMsw } from "msw-trpc";
import { taskAlertRouter } from "./taskAlert";
import * as taskAlertService from "../taskAlertService";
import * as emailService from "../services/emailNotificationService";

// Mock the services
vi.mock("../taskAlertService");
vi.mock("../services/emailNotificationService");

describe("Task Alert Router", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    name: "Admin User",
    role: "admin" as const,
  };

  const mockAlertConfig = {
    id: 1,
    taskName: "Test Task",
    taskType: "performance_evaluation" as const,
    consecutiveFailureThreshold: 3,
    timeoutThreshold: 300,
    alertSeverity: "medium" as const,
    enableEmailNotification: 1,
    enableMessageNotification: 1,
    emailRecipients: JSON.stringify(["admin@example.com"]),
    notificationCooldown: 3600,
    maxNotificationsPerDay: 10,
    isActive: 1,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("testAlertRule mutation", () => {
    it("should test alert rule with email notification", async () => {
      vi.mocked(taskAlertService.getAlertConfigById).mockResolvedValue(
        mockAlertConfig
      );
      vi.mocked(emailService.sendTaskAlertEmail).mockResolvedValue({
        success: true,
        sentCount: 1,
        errors: [],
      });

      const ctx = { user: mockUser };
      const result = await taskAlertRouter.createCaller(ctx).testAlertRule({
        configId: 1,
        testType: "email",
      });

      expect(result.success).toBe(true);
      expect(result.configId).toBe(1);
      expect(result.taskName).toBe("Test Task");
      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].type).toBe("email");
      expect(result.tests[0].success).toBe(true);
    });

    it("should test alert rule with message notification", async () => {
      vi.mocked(taskAlertService.getAlertConfigById).mockResolvedValue(
        mockAlertConfig
      );

      const ctx = { user: mockUser };
      const result = await taskAlertRouter.createCaller(ctx).testAlertRule({
        configId: 1,
        testType: "message",
      });

      expect(result.success).toBe(true);
      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].type).toBe("message");
      expect(result.tests[0].success).toBe(true);
    });

    it("should test alert rule with both email and message", async () => {
      vi.mocked(taskAlertService.getAlertConfigById).mockResolvedValue(
        mockAlertConfig
      );
      vi.mocked(emailService.sendTaskAlertEmail).mockResolvedValue({
        success: true,
        sentCount: 1,
        errors: [],
      });

      const ctx = { user: mockUser };
      const result = await taskAlertRouter.createCaller(ctx).testAlertRule({
        configId: 1,
        testType: "both",
      });

      expect(result.success).toBe(true);
      expect(result.tests).toHaveLength(2);
      expect(result.tests[0].type).toBe("email");
      expect(result.tests[1].type).toBe("message");
    });

    it("should handle email notification failure", async () => {
      vi.mocked(taskAlertService.getAlertConfigById).mockResolvedValue(
        mockAlertConfig
      );
      vi.mocked(emailService.sendTaskAlertEmail).mockRejectedValue(
        new Error("SMTP not configured")
      );

      const ctx = { user: mockUser };
      const result = await taskAlertRouter.createCaller(ctx).testAlertRule({
        configId: 1,
        testType: "email",
      });

      expect(result.success).toBe(false);
      expect(result.tests[0].success).toBe(false);
      expect(result.tests[0].message).toContain("异常");
    });

    it("should throw error if alert config not found", async () => {
      vi.mocked(taskAlertService.getAlertConfigById).mockResolvedValue(null);

      const ctx = { user: mockUser };
      await expect(
        taskAlertRouter.createCaller(ctx).testAlertRule({
          configId: 999,
          testType: "both",
        })
      ).rejects.toThrow("告警配置不存在");
    });

    it("should not test email if email notification is disabled", async () => {
      const configWithoutEmail = {
        ...mockAlertConfig,
        enableEmailNotification: 0,
      };
      vi.mocked(taskAlertService.getAlertConfigById).mockResolvedValue(
        configWithoutEmail
      );

      const ctx = { user: mockUser };
      const result = await taskAlertRouter.createCaller(ctx).testAlertRule({
        configId: 1,
        testType: "both",
      });

      expect(result.success).toBe(true);
      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].type).toBe("message");
    });

    it("should not test message if message notification is disabled", async () => {
      const configWithoutMessage = {
        ...mockAlertConfig,
        enableMessageNotification: 0,
      };
      vi.mocked(taskAlertService.getAlertConfigById).mockResolvedValue(
        configWithoutMessage
      );
      vi.mocked(emailService.sendTaskAlertEmail).mockResolvedValue({
        success: true,
        sentCount: 1,
        errors: [],
      });

      const ctx = { user: mockUser };
      const result = await taskAlertRouter.createCaller(ctx).testAlertRule({
        configId: 1,
        testType: "both",
      });

      expect(result.success).toBe(true);
      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].type).toBe("email");
    });
  });

  describe("getSmtpStatus query", () => {
    it("should return SMTP status when configured", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "password";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_FROM = "noreply@example.com";
      process.env.SMTP_FROM_NAME = "Test System";

      const ctx = { user: mockUser };
      const result = await taskAlertRouter.createCaller(ctx).getSmtpStatus();

      expect(result.configured).toBe(true);
      expect(result.host).toBe("smtp.example.com");
      expect(result.port).toBe("587");
      expect(result.fromEmail).toBe("noreply@example.com");
      expect(result.fromName).toBe("Test System");

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    it("should return unconfigured status when SMTP not set", async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const ctx = { user: mockUser };
      const result = await taskAlertRouter.createCaller(ctx).getSmtpStatus();

      expect(result.configured).toBe(false);
      expect(result.host).toBeNull();
    });
  });
});
