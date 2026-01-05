import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import type { IncomingMessage, ServerResponse } from "http";
import { getDb, upsertUser, createErrorQuestion } from "./db";
import type { InsertErrorQuestion } from "../drizzle/schema";

describe("错题标签功能", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  const testUserOpenId = `test-user-${Date.now()}`;
  let testUserId: number;
  let testQuestionId: number;

  beforeAll(async () => {
    // 创建测试用户
    await upsertUser({
      openId: testUserOpenId,
      name: "测试用户",
      avatar: null,
    });
    
    // 获取用户ID
    const { getUserByOpenId } = await import("./db");
    const user = await getUserByOpenId(testUserOpenId);
    if (!user) throw new Error("User not found");
    testUserId = user.id;

    // 创建测试错题
    const question: InsertErrorQuestion = {
      userId: testUserId,
      title: "测试错题",
      content: "这是一道测试错题",
      subject: "math",
      grade: "junior1",
      knowledgePoints: ["代数", "方程"],
      difficulty: "medium",
      masteryLevel: 0,
    };
    const questionId = await createErrorQuestion(question);
    testQuestionId = questionId;

    // 创建caller
    const ctx: Context = {
      req: {} as IncomingMessage,
      res: {} as ServerResponse,
    };

    // 模拟已登录用户
    ctx.user = {
      openId: testUserOpenId,
      name: "测试用户",
      avatar: null,
    };

    caller = appRouter.createCaller(ctx);
  }, 30000);

  it("应该能创建标签", async () => {
    const result = await caller.tags.create({
      name: "易错",
      color: "#EF4444",
      description: "容易出错的题目",
    });

    expect(result.success).toBe(true);
  });

  it("应该能获取用户的所有标签", async () => {
    const tags = await caller.tags.list();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0]).toHaveProperty("name");
    expect(tags[0]).toHaveProperty("color");
    expect(tags[0]).toHaveProperty("errorCount");
  });

  it("应该能为错题添加标签", async () => {
    const tags = await caller.tags.list();
    const tag = tags[0];

    const result = await caller.tags.addToErrorQuestion({
      errorQuestionId: testQuestionId,
      tagId: tag.id,
    });

    expect(result.success).toBe(true);
  });

  it("应该能获取错题的所有标签", async () => {
    const tags = await caller.tags.getErrorQuestionTags({
      errorQuestionId: testQuestionId,
    });

    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0]).toHaveProperty("name");
    expect(tags[0]).toHaveProperty("color");
  });

  it("应该能从错题移除标签", async () => {
    const tags = await caller.tags.getErrorQuestionTags({
      errorQuestionId: testQuestionId,
    });
    const tag = tags[0];

    const result = await caller.tags.removeFromErrorQuestion({
      errorQuestionId: testQuestionId,
      tagId: tag.id,
    });

    expect(result.success).toBe(true);

    // 验证标签已移除
    const updatedTags = await caller.tags.getErrorQuestionTags({
      errorQuestionId: testQuestionId,
    });
    expect(updatedTags.length).toBe(tags.length - 1);
  });

  it("应该能更新标签", async () => {
    const tags = await caller.tags.list();
    const tag = tags[0];

    const result = await caller.tags.update({
      tagId: tag.id,
      name: "重点题目",
      color: "#10B981",
    });

    expect(result.success).toBe(true);

    // 验证标签已更新
    const updatedTags = await caller.tags.list();
    const updatedTag = updatedTags.find((t) => t.id === tag.id);
    expect(updatedTag?.name).toBe("重点题目");
    expect(updatedTag?.color).toBe("#10B981");
  });

  it("应该能删除标签", async () => {
    // 创建一个新标签用于删除
    await caller.tags.create({
      name: "临时标签",
      color: "#F59E0B",
    });

    const tags = await caller.tags.list();
    const tagToDelete = tags.find((t) => t.name === "临时标签");
    if (!tagToDelete) throw new Error("Tag not found");

    const result = await caller.tags.delete({
      tagId: tagToDelete.id,
    });

    expect(result.success).toBe(true);

    // 验证标签已删除
    const updatedTags = await caller.tags.list();
    const deletedTag = updatedTags.find((t) => t.id === tagToDelete.id);
    expect(deletedTag).toBeUndefined();
  });

  it("应该能批量为错题添加标签", async () => {
    // 创建两个新标签
    await caller.tags.create({ name: "标签A", color: "#3B82F6" });
    await caller.tags.create({ name: "标签B", color: "#8B5CF6" });

    const tags = await caller.tags.list();
    const tagA = tags.find((t) => t.name === "标签A");
    const tagB = tags.find((t) => t.name === "标签B");
    if (!tagA || !tagB) throw new Error("Tags not found");

    const result = await caller.tags.batchAdd({
      errorQuestionIds: [testQuestionId],
      tagIds: [tagA.id, tagB.id],
    });

    expect(result.success).toBe(true);

    // 验证标签已添加
    const questionTags = await caller.tags.getErrorQuestionTags({
      errorQuestionId: testQuestionId,
    });
    expect(questionTags.length).toBeGreaterThanOrEqual(2);
  });

  it("应该能批量移除错题的标签", async () => {
    const tags = await caller.tags.list();
    const tagA = tags.find((t) => t.name === "标签A");
    const tagB = tags.find((t) => t.name === "标签B");
    if (!tagA || !tagB) throw new Error("Tags not found");

    const result = await caller.tags.batchRemove({
      errorQuestionIds: [testQuestionId],
      tagIds: [tagA.id, tagB.id],
    });

    expect(result.success).toBe(true);

    // 验证标签已移除
    const questionTags = await caller.tags.getErrorQuestionTags({
      errorQuestionId: testQuestionId,
    });
    const hasTagA = questionTags.some((t) => t.id === tagA.id);
    const hasTagB = questionTags.some((t) => t.id === tagB.id);
    expect(hasTagA).toBe(false);
    expect(hasTagB).toBe(false);
  });
});
