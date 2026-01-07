import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { db } from "./db";
import { notificationConfigs, notificationHistory } from "../drizzle/schema";
import { eq, like } from "drizzle-orm";

// Mock request and response objects
const createMockContext = (userId?: number, role?: string) => {
  const mockReq = {
    headers: {},
    cookies: {},
  } as any;

  const mockRes = {
    setHeader: () => {},
    cookie: () => {},
    clearCookie: () => {},
  } as any;

  const user = userId
    ? {
        id: userId,
        openId: `test-open-id-${userId}`,
        name: `Test User ${userId}`,
        role: role || "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : null;

  return {
    req: mockReq,
    res: mockRes,
    user,
  };
};

describe("Notification Config Management", () => {
  const testTitle = `Test Notification ${Date.now()}`;
  let createdConfigId: number | null = null;

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(notificationConfigs).where(like(notificationConfigs.title, "Test Notification%"));
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(notificationConfigs).where(like(notificationConfigs.title, "Test Notification%"));
  });

  describe("Permission checks", () => {
    it("should deny access to unauthenticated users", async () => {
      const caller = appRouter.createCaller(createMockContext());

      await expect(caller.notificationConfig.list()).rejects.toThrow();
    });

    it("should deny access to regular users", async () => {
      const caller = appRouter.createCaller(createMockContext(3, "user"));

      await expect(caller.notificationConfig.list()).rejects.toThrow();
    });
  });

  describe("CRUD operations", () => {
    it("should create a new notification config as admin", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "admin"));

      const config = await caller.notificationConfig.create({
        notificationType: "system_alert",
        title: testTitle,
        description: "This is a test notification",
        enablePlatformNotification: true,
        enableEmailNotification: true,
        enableSmsNotification: false,
        recipients: {
          emails: ["test@example.com"],
          phones: [],
        },
        emailTemplate: "Test email template",
        isActive: true,
      });

      expect(config).toBeDefined();
      expect(config.title).toBe(testTitle);
      expect(config.notificationType).toBe("system_alert");
      expect(config.enablePlatformNotification).toBe(1);
      expect(config.enableEmailNotification).toBe(1);
      expect(config.enableSmsNotification).toBe(0);
      expect(config.isActive).toBe(1);

      createdConfigId = config.id;
    });

    it("should fail to create config as non-admin", async () => {
      const caller = appRouter.createCaller(createMockContext(2, "user"));

      await expect(
        caller.notificationConfig.create({
          notificationType: "system_alert",
          title: "Test Notification 2",
          enablePlatformNotification: true,
          enableEmailNotification: false,
          enableSmsNotification: false,
          recipients: {
            emails: [],
          },
          isActive: true,
        })
      ).rejects.toThrow();
    });

    it("should list all notification configs as admin", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "admin"));

      const configs = await caller.notificationConfig.list();

      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);

      const testConfig = configs.find((c) => c.title === testTitle);
      expect(testConfig).toBeDefined();
    });

    it("should get a specific notification config", async () => {
      if (!createdConfigId) {
        throw new Error("No config created yet");
      }

      const caller = appRouter.createCaller(createMockContext(1, "admin"));

      const config = await caller.notificationConfig.getById({ id: createdConfigId });

      expect(config).toBeDefined();
      expect(config.id).toBe(createdConfigId);
      expect(config.title).toBe(testTitle);
    });

    it("should update notification config", async () => {
      if (!createdConfigId) {
        throw new Error("No config created yet");
      }

      const caller = appRouter.createCaller(createMockContext(1, "admin"));

      const updated = await caller.notificationConfig.update({
        id: createdConfigId,
        title: `${testTitle} Updated`,
        description: "Updated description",
        enableSmsNotification: true,
      });

      expect(updated).toBeDefined();
      expect(updated.title).toBe(`${testTitle} Updated`);
      expect(updated.description).toBe("Updated description");
      expect(updated.enableSmsNotification).toBe(1);
    });

    it("should delete notification config", async () => {
      if (!createdConfigId) {
        throw new Error("No config created yet");
      }

      const caller = appRouter.createCaller(createMockContext(1, "admin"));

      const result = await caller.notificationConfig.delete({ id: createdConfigId });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify deletion
      await expect(caller.notificationConfig.getById({ id: createdConfigId })).rejects.toThrow(
        "通知配置不存在"
      );

      createdConfigId = null; // Reset to avoid cleanup error
    });
  });

  describe("Statistics and history", () => {
    it("should get notification statistics", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "admin"));

      const stats = await caller.notificationConfig.getStats({ days: 30 });

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.byStatus)).toBe(true);
      expect(Array.isArray(stats.byChannel)).toBe(true);
      expect(Array.isArray(stats.byType)).toBe(true);
    });

    it("should get notification history", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "admin"));

      const history = await caller.notificationConfig.getHistory({
        days: 30,
        limit: 50,
      });

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should throw error for non-existent config", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "admin"));

      await expect(caller.notificationConfig.getById({ id: 999999 })).rejects.toThrow(
        "通知配置不存在"
      );
    });

    it("should fail to update as non-admin", async () => {
      const caller = appRouter.createCaller(createMockContext(2, "user"));

      await expect(
        caller.notificationConfig.update({
          id: 1,
          title: "Unauthorized Update",
        })
      ).rejects.toThrow();
    });

    it("should fail to delete as non-admin", async () => {
      const caller = appRouter.createCaller(createMockContext(2, "user"));

      await expect(caller.notificationConfig.delete({ id: 1 })).rejects.toThrow();
    });
  });
});
