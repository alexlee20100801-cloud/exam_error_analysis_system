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

// Mock storage
vi.mock("./storage", () => ({
  storageDelete: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Export History Service", () => {
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

  describe("createExportHistory", () => {
    it("should create a new export history record with default expiry", async () => {
      const { createExportHistory } = await import("./exportHistoryService");
      
      const result = await createExportHistory({
        userId: 1,
        exportType: "error_questions",
        exportFormat: "pdf",
        questionCount: 10,
        status: "completed",
      });
      
      expect(result).toBeDefined();
    });

    it("should create a new export history record with custom expiry", async () => {
      const { createExportHistory } = await import("./exportHistoryService");
      
      const result = await createExportHistory({
        userId: 1,
        exportType: "exam_paper",
        exportFormat: "word",
        questionCount: 20,
        status: "completed",
        expiryDays: 60,
      });
      
      expect(result).toBeDefined();
    });
  });

  describe("getUserExportHistory", () => {
    it("should return user export history list", async () => {
      const { getUserExportHistory } = await import("./exportHistoryService");
      
      const result = await getUserExportHistory(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("checkFileAvailability", () => {
    it("should return unavailable for non-existent record", async () => {
      mockWhere.mockResolvedValue([]);
      const { checkFileAvailability } = await import("./exportHistoryService");
      
      const result = await checkFileAvailability(999, 1);
      
      expect(result.available).toBe(false);
      expect(result.reason).toBe("记录不存在");
    });
  });

  describe("getExpiredRecords", () => {
    it("should return expired records list", async () => {
      mockLimit.mockResolvedValue([]);
      const { getExpiredRecords } = await import("./exportHistoryService");
      
      const result = await getExpiredRecords();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("batchCleanupExpiredFiles", () => {
    it("should return cleanup results", async () => {
      mockLimit.mockResolvedValue([]);
      const { batchCleanupExpiredFiles } = await import("./exportHistoryService");
      
      const result = await batchCleanupExpiredFiles();
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe("number");
      expect(typeof result.success).toBe("number");
      expect(typeof result.failed).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("getUserExportStats", () => {
    it("should return user export statistics", async () => {
      mockWhere.mockResolvedValue([]);
      const { getUserExportStats } = await import("./exportHistoryService");
      
      const result = await getUserExportStats(1);
      
      expect(result).toBeDefined();
      expect(typeof result.totalExports).toBe("number");
      expect(result.byType).toBeDefined();
      expect(result.byFormat).toBeDefined();
      expect(result.byStatus).toBeDefined();
    });
  });

  describe("getSystemExportStats", () => {
    it("should return system export statistics", async () => {
      mockWhere.mockResolvedValue([]);
      const { getSystemExportStats } = await import("./exportHistoryService");
      
      const result = await getSystemExportStats();
      
      expect(result).toBeDefined();
      expect(result.period).toBeDefined();
      expect(typeof result.totalExports).toBe("number");
      expect(typeof result.totalDownloads).toBe("number");
    });
  });
});
