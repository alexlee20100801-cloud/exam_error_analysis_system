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
    grade: "junior3",
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

describe("练习题生成和批改功能", () => {
  it("should generate practice questions from error question", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 创建一道错题
    const createResult = await caller.errorQuestions.create({
      title: "一元二次方程求根公式",
      content: "解方程：x² - 5x + 6 = 0",
      subject: "math",
      grade: "junior3",
      userAnswer: "我用了配方法，但是算错了。",
    });

    expect(createResult.success).toBe(true);
    expect(createResult.questionId).toBeGreaterThan(0);

    // 生成练习题
    const practiceResult = await caller.practiceQuestions.generateFromError({
      errorQuestionId: createResult.questionId,
      count: 3,
    });

    expect(practiceResult.success).toBe(true);
    expect(practiceResult.questions).toBeDefined();
    expect(Array.isArray(practiceResult.questions)).toBe(true);
    expect(practiceResult.questions!.length).toBeGreaterThan(0);
    expect(practiceResult.questions!.length).toBeLessThanOrEqual(3);

    // 验证练习题结构
    const firstQuestion = practiceResult.questions![0];
    expect(firstQuestion.title).toBeTruthy();
    expect(firstQuestion.content).toBeTruthy();
    expect(firstQuestion.answer).toBeTruthy();
    expect(firstQuestion.explanation).toBeTruthy();
    expect(firstQuestion.difficulty).toMatch(/easy|medium|hard/);

    // 验证错题信息
    expect(practiceResult.errorQuestion).toBeDefined();
    expect(practiceResult.errorQuestion!.id).toBe(createResult.questionId);
  }, 60000); // AI生成可能需要较长时间

  it("should grade user answer correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 批改正确答案
    const correctGrading = await caller.practiceQuestions.gradeAnswer({
      questionContent: "计算：2 + 3 = ?",
      correctAnswer: "5",
      userAnswer: "5",
      subject: "math",
    });

    expect(correctGrading.success).toBe(true);
    expect(correctGrading.grading).toBeDefined();
    expect(correctGrading.grading!.isCorrect).toMatch(/correct|partial|incorrect/);
    expect(correctGrading.grading!.score).toBeGreaterThanOrEqual(0);
    expect(correctGrading.grading!.score).toBeLessThanOrEqual(100);
    expect(correctGrading.grading!.feedback).toBeTruthy();
    expect(correctGrading.grading!.suggestions).toBeTruthy();

    // 批改错误答案
    const incorrectGrading = await caller.practiceQuestions.gradeAnswer({
      questionContent: "计算：2 + 3 = ?",
      correctAnswer: "5",
      userAnswer: "6",
      subject: "math",
    });

    expect(incorrectGrading.success).toBe(true);
    expect(incorrectGrading.grading).toBeDefined();
    expect(incorrectGrading.grading!.isCorrect).toMatch(/incorrect|partial/);
  }, 60000);

  it("should generate questions with different difficulty levels", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 创建一道困难的错题
    const createResult = await caller.errorQuestions.create({
      title: "函数综合应用",
      content: "已知函数f(x) = x³ - 3x + 1，求f(x)的极值点。",
      subject: "math",
      grade: "senior2",
      difficulty: "hard",
    });

    // 生成练习题
    const practiceResult = await caller.practiceQuestions.generateFromError({
      errorQuestionId: createResult.questionId,
      count: 3,
    });

    expect(practiceResult.success).toBe(true);
    expect(practiceResult.questions).toBeDefined();

    // 验证练习题难度分布
    const difficulties = practiceResult.questions!.map((q) => q.difficulty);
    expect(difficulties.length).toBeGreaterThan(0);
    
    // 至少有一道题的难度是medium或hard
    const hasMediumOrHard = difficulties.some((d) => d === "medium" || d === "hard");
    expect(hasMediumOrHard).toBe(true);
  }, 60000);
});
