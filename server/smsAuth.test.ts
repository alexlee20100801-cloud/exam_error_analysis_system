import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { verificationCodes, accountBindingHistory } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("SMS Auth and Account Binding", () => {
  let testUserId: number;
  let testPhone: string;
  let testCode: string;

  beforeAll(() => {
    testUserId = 1;
    testPhone = "13800138000";
    testCode = "123456";
  });

  describe("验证码表", () => {
    it("should create verification code record", async () => {
      const db = getDb();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      await db.insert(verificationCodes).values({
        phone: testPhone,
        code: testCode,
        type: "login",
        expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
      });

      const [record] = await db.select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phone, testPhone));

      expect(record).toBeDefined();
      expect(record.phone).toBe(testPhone);
      expect(record.code).toBe(testCode);
      expect(record.type).toBe("login");
    });

    it("should mark code as used", async () => {
      const db = getDb();
      
      await db.update(verificationCodes)
        .set({ isUsed: 1 })
        .where(eq(verificationCodes.phone, testPhone));

      const [record] = await db.select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phone, testPhone));

      expect(record.isUsed).toBe(1);
    });

    it("should clean up test data", async () => {
      const db = getDb();
      await db.delete(verificationCodes)
        .where(eq(verificationCodes.phone, testPhone));
    });
  });

  describe("账号绑定历史表", () => {
    it("should create binding history record", async () => {
      const db = getDb();
      
      await db.insert(accountBindingHistory).values({
        userId: testUserId,
        bindingType: "phone",
        action: "bind",
        bindingValue: testPhone,
        ipAddress: "127.0.0.1",
      });

      const [record] = await db.select()
        .from(accountBindingHistory)
        .where(
          and(
            eq(accountBindingHistory.userId, testUserId),
            eq(accountBindingHistory.bindingType, "phone")
          )
        );

      expect(record).toBeDefined();
      expect(record.userId).toBe(testUserId);
      expect(record.bindingType).toBe("phone");
      expect(record.action).toBe("bind");
    });

    it("should clean up test data", async () => {
      const db = getDb();
      await db.delete(accountBindingHistory)
        .where(eq(accountBindingHistory.userId, testUserId));
    });
  });
});
