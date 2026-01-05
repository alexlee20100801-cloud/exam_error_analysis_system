import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    grade: "junior1",
    school: "深圳中学",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("errorQuestions router", () => {
  it("should create error question manually", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.errorQuestions.create({
      title: "二次函数应用题",
      content: "已知二次函数y=ax²+bx+c的图像经过点(0,3)，(1,0)，(3,0)，求该函数的解析式。",
      subject: "math",
      grade: "junior3",
      difficulty: "medium",
    });

    expect(result.success).toBe(true);
    expect(result.questionId).toBeGreaterThan(0);
  });

  it("should list error questions for user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 先创建一个错题
    await caller.errorQuestions.create({
      title: "测试题目",
      content: "这是一道测试题目",
      subject: "math",
      grade: "junior1",
    });

    // 查询列表
    const questions = await caller.errorQuestions.list({ limit: 10 });

    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
  });

  it("should filter error questions by subject and grade", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 创建特定学科和年级的错题
    await caller.errorQuestions.create({
      title: "物理力学题",
      content: "计算物体的加速度",
      subject: "physics",
      grade: "senior1",
    });

    // 按学科和年级筛选
    const questions = await caller.errorQuestions.listBySubjectAndGrade({
      subject: "physics",
      grade: "senior1",
    });

    expect(Array.isArray(questions)).toBe(true);
    questions.forEach(q => {
      expect(q.subject).toBe("physics");
      expect(q.grade).toBe("senior1");
    });
  });

  it("should update error question", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 创建错题
    const createResult = await caller.errorQuestions.create({
      title: "原标题",
      content: "原内容",
      subject: "math",
      grade: "junior1",
    });

    // 更新错题
    const updateResult = await caller.errorQuestions.update({
      questionId: createResult.questionId,
      title: "新标题",
      userNotes: "这是我的笔记",
    });

    expect(updateResult.success).toBe(true);
  });

  it("should mark question as mastered", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 创建错题
    const createResult = await caller.errorQuestions.create({
      title: "待掌握题目",
      content: "题目内容",
      subject: "math",
      grade: "junior1",
    });

    // 标记为已掌握
    const markResult = await caller.errorQuestions.markAsMastered({
      questionId: createResult.questionId,
    });

    expect(markResult.success).toBe(true);
  });
});
