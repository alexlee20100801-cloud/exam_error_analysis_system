import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
        groupBy: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })),
}));

describe("Terminology Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTerminology", () => {
    it("should create a new terminology entry", async () => {
      const { createTerminology } = await import("./terminologyService");
      
      const result = await createTerminology({
        category: "math",
        termChinese: "方程",
        termJapanese: "方程式",
        termKorean: "방정식",
        termEnglish: "equation",
      });
      
      expect(result).toBeDefined();
    });
  });

  describe("batchCreateTerminology", () => {
    it("should return insertedCount of 0 for empty array", async () => {
      const { batchCreateTerminology } = await import("./terminologyService");
      
      const result = await batchCreateTerminology([]);
      
      expect(result).toEqual({ insertedCount: 0 });
    });

    it("should batch create multiple terminology entries", async () => {
      const { batchCreateTerminology } = await import("./terminologyService");
      
      const terms = [
        { category: "math" as const, termChinese: "方程" },
        { category: "math" as const, termChinese: "函数" },
      ];
      
      const result = await batchCreateTerminology(terms);
      
      expect(result.insertedCount).toBe(2);
    });
  });

  describe("importMathTerminology", () => {
    it("should import math terminology successfully", async () => {
      const { importMathTerminology } = await import("./terminologyService");
      
      const result = await importMathTerminology();
      
      expect(result).toBeDefined();
      expect(result.insertedCount).toBeGreaterThan(0);
    });
  });

  describe("importPhysicsTerminology", () => {
    it("should import physics terminology successfully", async () => {
      const { importPhysicsTerminology } = await import("./terminologyService");
      
      const result = await importPhysicsTerminology();
      
      expect(result).toBeDefined();
      expect(result.insertedCount).toBeGreaterThan(0);
    });
  });

  describe("importChemistryTerminology", () => {
    it("should import chemistry terminology successfully", async () => {
      const { importChemistryTerminology } = await import("./terminologyService");
      
      const result = await importChemistryTerminology();
      
      expect(result).toBeDefined();
      expect(result.insertedCount).toBeGreaterThan(0);
    });
  });

  describe("importAllTerminology", () => {
    it("should import all terminology successfully", async () => {
      const { importAllTerminology } = await import("./terminologyService");
      
      const result = await importAllTerminology();
      
      expect(result).toBeDefined();
      expect(result.math).toBeDefined();
      expect(result.physics).toBeDefined();
      expect(result.chemistry).toBeDefined();
    });
  });
});
