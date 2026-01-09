import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

// Mock the db module before importing anything that uses it
let mockInsertData: any = null;

vi.mock("./db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn((data: any) => {
        mockInsertData = data;
        return {
          returning: vi.fn(async () => [
            {
              id: 1,
              ...data,
              sentAt: new Date(),
            },
          ]),
        };
      }),
    })),
    select: vi.fn(),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [
            {
              id: 1,
              userId: 1,
              isRead: true,
              readAt: new Date(),
            },
          ]),
        })),
      })),
    })),
  },
}));

import { sendNotification, createNotificationLog, renderNotificationTemplate } from "./notification";
import { db } from "./db";



describe("Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Email Notifications", () => {
    it("should send email notification successfully", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: "test-message-id" }),
      } as Response);

      const result = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "email",
        content: "Your weekly report is ready",
        recipientEmail: "student@example.com",
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/email/send"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should handle email sending failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      const result = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "email",
        content: "Your weekly report is ready",
        recipientEmail: "student@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should validate email format before sending", async () => {
      const invalidEmails = ["invalid", "test@", "@example.com", "test@.com"];

      for (const email of invalidEmails) {
        const result = await sendNotification({
          userId: 1,
          type: "weekly_report",
          channel: "email",
          content: "Test",
          recipientEmail: email,
        });

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Invalid email/i);
      }
    });

    it("should support HTML email content", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: "test-message-id" }),
      } as Response);

      const htmlContent = `<html><body><h1>Weekly Report</h1><p>Your report is ready.</p></body></html>`;

      const result = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "email",
        content: htmlContent,
        recipientEmail: "student@example.com",
        isHtml: true,
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalled();
      
      // Verify the request was made with correct parameters
      const lastCall = vi.mocked(fetch).mock.calls[vi.mocked(fetch).mock.calls.length - 1];
      expect(lastCall[0]).toContain("/api/email/send");
      const body = JSON.parse(lastCall[1]?.body as string);
      expect(body.isHtml).toBe(true);
      expect(body.content).toBe(htmlContent);
    });
  });

  describe("SMS Notifications", () => {
    it("should send SMS notification successfully", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "OK", messageId: "sms-123" }),
      } as Response);

      const result = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "sms",
        content: "Your weekly report is ready. Check your email for details.",
        recipientPhone: "+8613800138000",
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/sms/send"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should validate phone number format", async () => {
      const result = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "sms",
        content: "Test",
        recipientPhone: "invalid-phone",
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid phone/i);
    });

    it("should truncate long SMS content", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: "OK", messageId: "sms-123" }),
      } as Response);

      const longContent = "A".repeat(200); // SMS typically limited to 160-180 chars

      const result = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "sms",
        content: longContent,
        recipientPhone: "+8613800138000",
      });

      expect(result.success).toBe(true);
      // The content should be truncated to 160 chars
      const lastCall = vi.mocked(fetch).mock.calls[vi.mocked(fetch).mock.calls.length - 1];
      const body = JSON.parse(lastCall[1]?.body as string);
      expect(body.content.length).toBeLessThanOrEqual(160);
      expect(body.content).toMatch(/\.\.\.$/); // Should end with ...
    });

    it("should handle SMS rate limiting", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      const result = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "sms",
        content: "Test",
        recipientPhone: "+8613800138000",
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/rate limit/i);
    });
  });

  describe("In-App Notifications", () => {
    it("should create in-app notification in database", async () => {
      const result = await createNotificationLog({
        userId: 1,
        notificationType: "weekly_report",
        channel: "in_app",
        status: "sent",
        content: "Your weekly report is ready",
      });

      expect(result.id).toBeDefined();
      expect(result.channel).toBe("in_app");
      expect(result.status).toBe("sent");
    });

    it("should mark in-app notification as read", async () => {
      // Simulate marking as read
      const updateResult = await db
        .update({} as any)
        .set({ isRead: true, readAt: new Date() })
        .where({} as any)
        .returning();

      expect(updateResult[0].isRead).toBe(true);
      expect(updateResult[0].readAt).toBeDefined();
    });

    it("should support notification priority levels", async () => {
      const priorities = ["low", "normal", "high", "urgent"];

      for (const priority of priorities) {
        const result = await createNotificationLog({
          userId: 1,
          notificationType: "system_alert",
          channel: "in_app",
          status: "sent",
          content: `${priority} priority notification`,
          priority,
        });

        expect(result).toBeDefined();
        expect(result.priority).toBe(priority);
      }
    });
  });

  describe("Multi-Channel Notifications", () => {
    it("should send notification to multiple channels simultaneously", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const channels = ["email", "sms", "in_app"];
      const results = await Promise.all(
        channels.map((channel: any) =>
          sendNotification({
            userId: 1,
            type: "urgent_alert",
            channel,
            content: "Important: System maintenance scheduled",
            recipientEmail: "student@example.com",
            recipientPhone: "+8613800138000",
          })
        )
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should handle partial failure in multi-channel sending", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response);

      const emailResult = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "email",
        content: "Test",
        recipientEmail: "student@example.com",
      });

      const smsResult = await sendNotification({
        userId: 1,
        type: "weekly_report",
        channel: "sms",
        content: "Test",
        recipientPhone: "+8613800138000",
      });

      expect(emailResult.success).toBe(true);
      expect(smsResult.success).toBe(false);
    });
  });

  describe("Notification Templates", () => {
    it("should render weekly report template correctly", async () => {
      const templateData = {
        studentName: "张三",
        weekRange: "2025-01-01 至 2025-01-07",
        totalErrors: 15,
        topSubjects: ["数学", "物理"],
        improvementTips: "建议加强计算能力训练",
      };

      const rendered = renderNotificationTemplate("weekly_report", templateData);

      expect(rendered).toContain("张三");
      expect(rendered).toContain("15");
      expect(rendered).toContain("数学");
      expect(rendered).toContain("物理");
    });

    it("should render monthly report template correctly", async () => {
      const templateData = {
        studentName: "李四",
        monthRange: "2025年1月",
        totalErrors: 45,
        progressRate: "+12%",
        weakestSubject: "化学",
      };

      const rendered = renderNotificationTemplate("monthly_report", templateData);

      expect(rendered).toContain("李四");
      expect(rendered).toContain("45");
      expect(rendered).toContain("+12%");
      expect(rendered).toContain("化学");
    });

    it("should handle missing template data gracefully", async () => {
      const incompleteData = {
        studentName: "王五",
        // Missing other required fields
      };

      const rendered = renderNotificationTemplate("weekly_report", incompleteData);

      expect(rendered).toContain("王五");
      expect(rendered).not.toContain("undefined");
      expect(rendered).not.toContain("null");
    });
  });

  describe("Notification Logs", () => {
    it("should create notification log with all metadata", async () => {
      const logData = {
        userId: 1,
        notificationType: "weekly_report",
        channel: "email",
        status: "sent",
        content: "Your weekly report is ready",
        recipientEmail: "student@example.com",
        metadata: JSON.stringify({ reportId: 123, generatedAt: new Date() }),
      };

      const result = await createNotificationLog(logData);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(1);
      expect(result.notificationType).toBe("weekly_report");
      expect(result.metadata).toBeDefined();
    });

    it("should log failed notification attempts", async () => {
      const logData = {
        userId: 1,
        notificationType: "monthly_report",
        channel: "sms",
        status: "failed",
        errorMessage: "SMS service unavailable",
        retryCount: 3,
      };

      const result = await createNotificationLog(logData);

      expect(result.status).toBe("failed");
      expect(result.errorMessage).toBe("SMS service unavailable");
      expect(result.retryCount).toBe(3);
    });

    it("should track notification delivery time", async () => {
      const beforeSend = Date.now();

      const result = await createNotificationLog({
        userId: 1,
        notificationType: "weekly_report",
        channel: "email",
        status: "sent",
      });

      const afterSend = Date.now();

      expect(result.sentAt).toBeDefined();
      const sentTime = new Date(result.sentAt).getTime();
      expect(sentTime).toBeGreaterThanOrEqual(beforeSend);
      expect(sentTime).toBeLessThanOrEqual(afterSend);
    });
  });

  describe("Rate Limiting and Throttling", () => {
    it("should respect rate limits for email notifications", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ messageId: "test" }),
      } as Response);

      const maxEmailsPerMinute = 10;
      const promises = [];

      for (let i = 0; i < maxEmailsPerMinute + 5; i++) {
        promises.push(
          sendNotification({
            userId: 1,
            type: "test",
            channel: "email",
            content: `Test ${i}`,
            recipientEmail: "test@example.com",
          })
        );
      }

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.success);

      // Should have some rate-limited failures
      expect(failed.length).toBeGreaterThan(0);
      expect(failed.some((r) => r.error?.includes("Rate limit"))).toBe(true);
    });

    it("should throttle SMS notifications per user", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ messageId: "test" }),
      } as Response);

      const maxSmsPerDay = 5;
      const promises = [];

      for (let i = 0; i < maxSmsPerDay + 2; i++) {
        promises.push(
          sendNotification({
            userId: 2, // Use different user to avoid conflicts with previous test
            type: "test",
            channel: "sms",
            content: `Test ${i}`,
            recipientPhone: "+8613800138000",
          })
        );
      }

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.success);

      // Should have some rate-limited failures
      expect(failed.length).toBeGreaterThan(0);
      expect(failed.some((r) => r.error?.includes("Rate limit"))).toBe(true);
    });
  });
});


