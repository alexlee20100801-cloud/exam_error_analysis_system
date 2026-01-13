import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database with proper chain methods
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

// Setup chain returns
mockOffset.mockResolvedValue([]);
mockLimit.mockReturnValue({ offset: mockOffset });
mockOrderBy.mockReturnValue({ limit: mockLimit });
mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
mockSelect.mockReturnValue({ from: mockFrom });
mockValues.mockResolvedValue([{ insertId: 1 }]);
mockInsert.mockReturnValue({ values: mockValues });
mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
mockUpdate.mockReturnValue({ set: mockSet });
mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

vi.mock("./db", () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Task Alert Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain returns
    mockOffset.mockResolvedValue([]);
    mockLimit.mockReturnValue({ offset: mockOffset });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  describe("createAlertConfig", () => {
    it("should create a new alert config", async () => {
      const { createAlertConfig } = await import("./taskAlertService");
      
      const result = await createAlertConfig({
        taskName: "test-task",
        taskType: "custom",
        consecutiveFailureThreshold: 3,
        timeoutThreshold: 300,
        alertSeverity: "medium",
        enableEmailNotification: 1,
        enableMessageNotification: 1,
        notificationCooldown: 3600,
        maxNotificationsPerDay: 10,
        isActive: 1,
      });
      
      expect(result).toBeDefined();
    });
  });

  describe("getAlertConfigs", () => {
    it("should return alert configs list", async () => {
      mockOrderBy.mockResolvedValue([]);
      const { getAlertConfigs } = await import("./taskAlertService");
      
      const result = await getAlertConfigs({});
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getAlerts", () => {
    it("should return alerts list", async () => {
      mockOffset.mockResolvedValue([]);
      const { getAlerts } = await import("./taskAlertService");
      
      const result = await getAlerts({});
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getAllTaskStatus", () => {
    it("should return all task statuses", async () => {
      mockOrderBy.mockResolvedValue([]);
      const { getAllTaskStatus } = await import("./taskAlertService");
      
      const result = await getAllTaskStatus();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getTaskStatusStats", () => {
    it("should return task status statistics", async () => {
      mockOrderBy.mockResolvedValue([]);
      const { getTaskStatusStats } = await import("./taskAlertService");
      
      const result = await getTaskStatusStats();
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe("number");
      expect(typeof result.healthy).toBe("number");
      expect(typeof result.warning).toBe("number");
      expect(typeof result.critical).toBe("number");
      expect(typeof result.unknown).toBe("number");
    });
  });

  describe("getAlertStats", () => {
    it("should return alert statistics for default 7 days", async () => {
      mockWhere.mockResolvedValue([]);
      const { getAlertStats } = await import("./taskAlertService");
      
      const result = await getAlertStats();
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe("number");
      expect(result.bySeverity).toBeDefined();
      expect(result.byStatus).toBeDefined();
      expect(result.byType).toBeDefined();
    });
  });
});
