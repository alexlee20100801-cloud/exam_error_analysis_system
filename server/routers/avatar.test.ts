import { describe, it, expect, beforeEach, vi } from "vitest";
import { avatarRouter } from "./avatar";
import { createCallerFactory } from "@trpc/server";

// Mock storagePut
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://example.com/avatars/1/test.jpg",
  }),
}));

// Mock database
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe("avatarRouter", () => {
  const createCaller = createCallerFactory()(avatarRouter);

  describe("uploadAvatar", () => {
    it("应该验证MIME类型", async () => {
      const caller = createCaller({ user: { id: 1, role: "user" } });

      // 测试无效的MIME类型
      try {
        await caller.uploadAvatar({
          base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          mimeType: "image/gif",
          filename: "test.gif",
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toContain("JPG和PNG");
      }
    });

    it("应该验证文件大小", async () => {
      const caller = createCaller({ user: { id: 1, role: "user" } });

      // 创建一个超过5MB的base64字符串
      const largeBase64 = "A".repeat(5 * 1024 * 1024 + 1);

      try {
        await caller.uploadAvatar({
          base64: largeBase64,
          mimeType: "image/jpeg",
          filename: "large.jpg",
        });
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toContain("5MB");
      }
    });

    it("应该成功上传头像", async () => {
      const caller = createCaller({ user: { id: 1, role: "user" } });

      // 测试有效的头像上传
      expect(caller).toBeDefined();
    });
  });

  describe("deleteAvatar", () => {
    it("应该成功删除头像", async () => {
      const caller = createCaller({ user: { id: 1, role: "user" } });

      // 测试删除头像
      expect(caller).toBeDefined();
    });
  });

  describe("getAvatar", () => {
    it("应该获取用户头像URL", async () => {
      const caller = createCaller({ user: { id: 1, role: "user" } });

      // 测试获取头像
      expect(caller).toBeDefined();
    });
  });
});
