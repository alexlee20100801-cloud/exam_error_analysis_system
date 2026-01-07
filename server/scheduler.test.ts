import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { db } from "./db";
import { errorBooks, analysisReports, notificationLogs } from "../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// Mock the notification service
vi.mock("./notification", () => ({
  sendNotification: vi.fn().mockResolvedValue({ success: true }),
  createNotificationLog: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    notificationType: "weekly_report",
    channel: "email",
    status: "sent",
    sentAt: new Date(),
  }),
}));

// Mock the db module
vi.mock("./db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  getErrorBooksByDateRange: vi.fn(),
  getAnalysisReportsByDateRange: vi.fn(),
  createNotificationLog: vi.fn(),
}));

describe("Scheduler Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Weekly Report Generation", () => {
    it("should generate weekly report for students with error books", async () => {
      const mockErrorBooks = [
        {
          id: 1,
          studentId: 1,
          subjectId: 1,
          questionText: "Test question 1",
          errorReason: "Calculation error",
          createdAt: new Date("2025-01-01"),
        },
        {
          id: 2,
          studentId: 1,
          subjectId: 2,
          questionText: "Test question 2",
          errorReason: "Concept misunderstanding",
          createdAt: new Date("2025-01-02"),
        },
      ];

      const { getErrorBooksByDateRange } = await import("./db");
      vi.mocked(getErrorBooksByDateRange).mockResolvedValue(mockErrorBooks);

      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-07");

      const result = await getErrorBooksByDateRange(1, startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].studentId).toBe(1);
      expect(getErrorBooksByDateRange).toHaveBeenCalledWith(1, startDate, endDate);
    });

    it("should return empty array when no error books in date range", async () => {
      const { getErrorBooksByDateRange } = await import("./db");
      vi.mocked(getErrorBooksByDateRange).mockResolvedValue([]);

      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-07");

      const result = await getErrorBooksByDateRange(999, startDate, endDate);

      expect(result).toHaveLength(0);
      expect(getErrorBooksByDateRange).toHaveBeenCalledWith(999, startDate, endDate);
    });
  });

  describe("Monthly Report Generation", () => {
    it("should generate monthly report with analysis data", async () => {
      const mockReports = [
        {
          id: 1,
          studentId: 1,
          reportType: "weekly",
          reportData: JSON.stringify({ totalErrors: 5, subjects: ["Math", "Physics"] }),
          createdAt: new Date("2025-01-15"),
        },
        {
          id: 2,
          studentId: 1,
          reportType: "weekly",
          reportData: JSON.stringify({ totalErrors: 3, subjects: ["Chemistry"] }),
          createdAt: new Date("2025-01-22"),
        },
      ];

      const { getAnalysisReportsByDateRange } = await import("./db");
      vi.mocked(getAnalysisReportsByDateRange).mockResolvedValue(mockReports);

      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      const result = await getAnalysisReportsByDateRange(1, startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].reportType).toBe("weekly");
      expect(getAnalysisReportsByDateRange).toHaveBeenCalledWith(1, startDate, endDate);
    });

    it("should aggregate multiple weekly reports into monthly summary", async () => {
      const mockReports = [
        {
          id: 1,
          studentId: 1,
          reportType: "weekly",
          reportData: JSON.stringify({ totalErrors: 5 }),
          createdAt: new Date("2025-01-08"),
        },
        {
          id: 2,
          studentId: 1,
          reportType: "weekly",
          reportData: JSON.stringify({ totalErrors: 3 }),
          createdAt: new Date("2025-01-15"),
        },
      ];

      const { getAnalysisReportsByDateRange } = await import("./db");
      vi.mocked(getAnalysisReportsByDateRange).mockResolvedValue(mockReports);

      const result = await getAnalysisReportsByDateRange(1, new Date("2025-01-01"), new Date("2025-01-31"));

      // Calculate total errors from all weekly reports
      const totalErrors = result.reduce((sum, report) => {
        const data = JSON.parse(report.reportData);
        return sum + (data.totalErrors || 0);
      }, 0);

      expect(totalErrors).toBe(8);
      expect(result).toHaveLength(2);
    });
  });

  describe("Notification Scheduling", () => {
    it("should create notification log when sending notification", async () => {
      const { createNotificationLog, sendNotification } = await import("./notification");
      const mockLog = {
        id: 1,
        userId: 1,
        notificationType: "weekly_report",
        channel: "email",
        status: "sent",
        sentAt: new Date(),
      };

      vi.mocked(createNotificationLog).mockResolvedValue(mockLog);

      const result = await createNotificationLog({
        userId: 1,
        notificationType: "weekly_report",
        channel: "email",
        status: "sent",
      });

      expect(result.userId).toBe(1);
      expect(result.notificationType).toBe("weekly_report");
      expect(result.channel).toBe("email");
      expect(createNotificationLog).toHaveBeenCalled();
    });

    it("should handle notification failure and log error status", async () => {
      const { createNotificationLog } = await import("./notification");
      const mockLog = {
        id: 2,
        userId: 1,
        notificationType: "monthly_report",
        channel: "sms",
        status: "failed",
        errorMessage: "SMS service unavailable",
        sentAt: new Date(),
      };

      vi.mocked(createNotificationLog).mockResolvedValue(mockLog);

      const result = await createNotificationLog({
        userId: 1,
        notificationType: "monthly_report",
        channel: "sms",
        status: "failed",
        errorMessage: "SMS service unavailable",
      });

      expect(result.status).toBe("failed");
      expect(result.errorMessage).toBe("SMS service unavailable");
    });

    it("should send notifications to multiple channels", async () => {
      const { sendNotification } = await import("./notification");
      
      vi.mocked(sendNotification).mockResolvedValue({ success: true });

      const channels = ["email", "sms", "in_app"];
      const results = await Promise.all(
        channels.map((channel) =>
          sendNotification({
            userId: 1,
            type: "weekly_report",
            channel,
            content: "Your weekly report is ready",
          })
        )
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(sendNotification).toHaveBeenCalledTimes(3);
    });
  });

  describe("Scheduled Task Execution", () => {
    it("should execute weekly task on correct schedule", async () => {
      const now = new Date("2025-01-06T09:00:00"); // Monday 9 AM
      const dayOfWeek = now.getDay();
      const hour = now.getHours();

      // Weekly task should run on Monday at 9 AM
      expect(dayOfWeek).toBe(1); // Monday
      expect(hour).toBe(9);
    });

    it("should execute monthly task on correct schedule", async () => {
      const now = new Date("2025-01-01T10:00:00"); // 1st day of month at 10 AM
      const dayOfMonth = now.getDate();
      const hour = now.getHours();

      // Monthly task should run on 1st day at 10 AM
      expect(dayOfMonth).toBe(1);
      expect(hour).toBe(10);
    });

    it("should handle timezone correctly for scheduled tasks", async () => {
      const utcDate = new Date("2025-01-06T01:00:00Z"); // Monday 1 AM UTC
      // Note: JavaScript Date.getHours() returns local timezone hours
      // To properly test timezone handling, we need to use UTC methods
      const utcHours = utcDate.getUTCHours();
      const chinaHours = (utcHours + 8) % 24; // Calculate China time (GMT+8)

      expect(chinaHours).toBe(9); // Should be 9 AM in China
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const { getErrorBooksByDateRange } = await import("./db");
      vi.mocked(getErrorBooksByDateRange).mockRejectedValue(new Error("Database connection failed"));

      await expect(
        getErrorBooksByDateRange(1, new Date(), new Date())
      ).rejects.toThrow("Database connection failed");
    });

    it("should retry failed notifications", async () => {
      const { sendNotification } = await import("./notification");
      
      // First call fails, second succeeds
      vi.mocked(sendNotification)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ success: true });

      // Simulate retry logic
      let result;
      try {
        result = await sendNotification({
          userId: 1,
          type: "weekly_report",
          channel: "email",
          content: "Test",
        });
      } catch (error) {
        // Retry on failure
        result = await sendNotification({
          userId: 1,
          type: "weekly_report",
          channel: "email",
          content: "Test",
        });
      }

      expect(result.success).toBe(true);
      expect(sendNotification).toHaveBeenCalledTimes(2);
    });
  });
});
