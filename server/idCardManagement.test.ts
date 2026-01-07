import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { idCards } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 证件管理功能测试
 */
describe("IdCardManagement", () => {
  const mockUser = {
    id: 999999,
    openId: "test-user-id-card",
    name: "Test User",
    email: "test@example.com",
    role: "user" as const,
    createdAt: new Date().toISOString(),
  };

  const mockContext = {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };

  beforeEach(async () => {
    // 清理测试数据
    const db = getDb();
    await db.delete(idCards).where(eq(idCards.userId, mockUser.id));
  });

  describe("getIdCards", () => {
    it("应该返回空列表当用户没有证件时", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.idCardManagement.getIdCards();

      expect(result.success).toBe(true);
      expect(result.cards).toEqual([]);
    });

    it("应该能够按证件类型筛选", async () => {
      const caller = appRouter.createCaller(mockContext);
      
      // 先创建一些测试数据
      const db = getDb();
      await db.insert(idCards).values([
        {
          userId: mockUser.id,
          cardType: "id_card",
          cardName: "测试身份证",
          frontImageUrl: "https://example.com/front1.jpg",
          backImageUrl: "https://example.com/back1.jpg",
        },
        {
          userId: mockUser.id,
          cardType: "student_card",
          cardName: "测试学生证",
          frontImageUrl: "https://example.com/front2.jpg",
        },
      ]);

      // 测试筛选
      const result = await caller.idCardManagement.getIdCards({
        cardType: "id_card",
      });

      expect(result.success).toBe(true);
      expect(result.cards.length).toBe(1);
      expect(result.cards[0].cardType).toBe("id_card");
    });
  });

  describe("updateIdCard", () => {
    it("应该能够更新证件信息", async () => {
      const caller = appRouter.createCaller(mockContext);
      
      // 先创建一个证件
      const db = getDb();
      const [inserted] = await db.insert(idCards).values({
        userId: mockUser.id,
        cardType: "id_card",
        cardName: "原始名称",
        frontImageUrl: "https://example.com/front.jpg",
      });

      const cardId = inserted.insertId;

      // 更新证件
      const updateResult = await caller.idCardManagement.updateIdCard({
        idCardId: cardId,
        cardName: "更新后的名称",
        notes: "测试备注",
      });

      expect(updateResult.success).toBe(true);

      // 验证更新
      const [updated] = await db
        .select()
        .from(idCards)
        .where(eq(idCards.id, cardId));

      expect(updated.cardName).toBe("更新后的名称");
      expect(updated.notes).toBe("测试备注");
    });
  });

  describe("deleteIdCard", () => {
    it("应该能够删除证件", async () => {
      const caller = appRouter.createCaller(mockContext);
      
      // 先创建一个证件
      const db = getDb();
      const [inserted] = await db.insert(idCards).values({
        userId: mockUser.id,
        cardType: "id_card",
        cardName: "待删除证件",
        frontImageUrl: "https://example.com/front.jpg",
      });

      const cardId = inserted.insertId;

      // 删除证件
      const deleteResult = await caller.idCardManagement.deleteIdCard({
        idCardId: cardId,
      });

      expect(deleteResult.success).toBe(true);

      // 验证删除
      const cards = await db
        .select()
        .from(idCards)
        .where(eq(idCards.id, cardId));

      expect(cards.length).toBe(0);
    });
  });

  describe("getIdCardById", () => {
    it("应该能够获取单个证件详情", async () => {
      const caller = appRouter.createCaller(mockContext);
      
      // 先创建一个证件
      const db = getDb();
      const [inserted] = await db.insert(idCards).values({
        userId: mockUser.id,
        cardType: "student_card",
        cardName: "学生证",
        frontImageUrl: "https://example.com/front.jpg",
        backImageUrl: "https://example.com/back.jpg",
        notes: "测试备注",
      });

      const cardId = inserted.insertId;

      // 获取证件详情
      const result = await caller.idCardManagement.getIdCardById({
        idCardId: cardId,
      });

      expect(result.success).toBe(true);
      expect(result.card.cardName).toBe("学生证");
      expect(result.card.cardType).toBe("student_card");
      expect(result.card.notes).toBe("测试备注");
    });

    it("应该在证件不存在时抛出错误", async () => {
      const caller = appRouter.createCaller(mockContext);

      await expect(
        caller.idCardManagement.getIdCardById({
          idCardId: 999999,
        })
      ).rejects.toThrow("证件不存在");
    });
  });
});
