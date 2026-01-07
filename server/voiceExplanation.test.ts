import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, errorQuestions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  generateExplanationScript,
  getExplanationScript,
  updateExplanationScript,
} from "./voiceExplanationService";

describe("AI语音讲解功能测试", () => {
  let testUserId: number;
  let testErrorQuestionId: number;
  let caller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户
    const [user] = await db
      .insert(users)
      .values({
        openId: `test-voice-${Date.now()}`,
        name: "语音测试用户",
        role: "user",
      })
      .$returningId();
    testUserId = user.id;

    // 创建测试错题
    const [question] = await db
      .insert(errorQuestions)
      .values({
        userId: testUserId,
        title: "二次函数应用题",
        content: "已知抛物线y=ax²+bx+c经过点(0,3)，顶点为(1,2)，求a、b、c的值",
        schoolLevel: "junior" as const,
        subject: "math" as const,
        grade: "junior3" as const,
        difficulty: "medium" as const,
        userAnswer: "a=1, b=2, c=3",
        correctAnswer: "a=1, b=-2, c=3",
        detailedExplanation: "根据抛物线的性质，代入点坐标和顶点坐标建立方程组求解",
        errorAnalysis: "计算b的符号时出现错误，没有正确应用顶点公式",
        isAnalyzed: true,
      })
      .$returningId();
    testErrorQuestionId = question.id;

    // 创建caller
    const createCaller = appRouter.createCaller;
    caller = createCaller({
      user: {
        id: testUserId,
        openId: `test-voice-${Date.now()}`,
        name: "语音测试用户",
        role: "user",
      },
    });
  });

  it("应该能生成AI讲解稿", async () => {
    const script = await generateExplanationScript(testErrorQuestionId);

    expect(script).toBeDefined();
    expect(script.length).toBeGreaterThan(100); // 讲解稿应该有一定长度
    expect(typeof script).toBe("string");
  }, 30000); // AI生成需要较长时间

  it("生成的讲解稿应该包含关键内容", async () => {
    const script = await generateExplanationScript(testErrorQuestionId);

    // 讲解稿应该包含题目相关的关键词
    const hasRelevantContent =
      script.includes("二次函数") ||
      script.includes("抛物线") ||
      script.includes("顶点") ||
      script.includes("解题");

    expect(hasRelevantContent).toBe(true);
  }, 30000);

  it("应该能缓存讲解稿到数据库", async () => {
    const script = "这是一段测试讲解稿";
    const success = await updateExplanationScript(testErrorQuestionId, script);

    expect(success).toBe(true);

    // 验证缓存是否成功
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    const [question] = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, testErrorQuestionId));

    expect(question.voiceExplanation).toBe(script);
  });

  it("应该能从缓存读取讲解稿", async () => {
    // 先设置一个缓存
    const cachedScript = "这是缓存的讲解稿";
    await updateExplanationScript(testErrorQuestionId, cachedScript);

    // 读取讲解稿（应该从缓存读取）
    const script = await getExplanationScript(testErrorQuestionId);

    expect(script).toBe(cachedScript);
  });

  it("没有缓存时应该生成新的讲解稿", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建一个没有缓存的新错题
    const [newQuestion] = await db
      .insert(errorQuestions)
      .values({
        userId: testUserId,
        title: "一元二次方程求解",
        content: "解方程：x²-5x+6=0",
        schoolLevel: "junior" as const,
        subject: "math" as const,
        grade: "junior3" as const,
        difficulty: "easy" as const,
        userAnswer: "x=2",
        correctAnswer: "x=2或x=3",
        detailedExplanation: "使用因式分解法：(x-2)(x-3)=0",
        errorAnalysis: "遗漏了一个解",
        isAnalyzed: true,
      })
      .$returningId();

    const script = await getExplanationScript(newQuestion.id);

    expect(script).toBeDefined();
    expect(script).not.toBeNull();
    expect(script!.length).toBeGreaterThan(50);
  }, 30000);

  it("应该能通过API获取讲解稿", async () => {
    const result = await caller.voiceExplanation.getScript({
      errorQuestionId: testErrorQuestionId,
    });

    expect(result.success).toBe(true);
    expect(result.script).toBeDefined();
    expect(result.script.length).toBeGreaterThan(0);
  }, 30000);

  it("应该能通过API生成语音讲解", async () => {
    const result = await caller.voiceExplanation.generate({
      errorQuestionId: testErrorQuestionId,
    });

    expect(result.success).toBe(true);
    expect(result.script).toBeDefined();
    expect(result.script.length).toBeGreaterThan(0);
  }, 30000);

  it("对不存在的错题应该抛出错误", async () => {
    await expect(generateExplanationScript(999999)).rejects.toThrow("错题不存在");
  });
});
