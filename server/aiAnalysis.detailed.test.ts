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

describe("AI详细分析功能", () => {
  it("should create error question and perform detailed analysis", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 创建一道错题
    const createResult = await caller.errorQuestions.create({
      title: "二次函数综合应用题",
      content: "已知二次函数y=ax²+bx+c的图像经过点A(0,3)，B(1,0)，C(3,0)。\n(1) 求该二次函数的解析式；\n(2) 求该函数图像的对称轴和顶点坐标；\n(3) 当x取何值时，y>0？",
      subject: "math",
      grade: "junior3",
      userAnswer: "我设了y=a(x-1)(x-3)，但是忘记代入A点求a的值了。",
    });

    expect(createResult.success).toBe(true);
    expect(createResult.questionId).toBeGreaterThan(0);

    // 执行详细分析
    const analysisResult = await caller.aiAnalysis.analyzeQuestionDetailed({
      questionId: createResult.questionId,
    });

    expect(analysisResult.success).toBe(true);
    expect(analysisResult.analysis).toBeDefined();
    
    if (analysisResult.analysis) {
      // 验证基础分析
      expect(analysisResult.analysis.errorType).toBeTruthy();
      expect(analysisResult.analysis.errorAnalysis).toBeTruthy();
      expect(analysisResult.analysis.difficulty).toMatch(/easy|medium|hard/);

      // 验证考点解读
      expect(Array.isArray(analysisResult.analysis.keyPoints)).toBe(true);
      expect(analysisResult.analysis.keyPoints.length).toBeGreaterThan(0);
      expect(analysisResult.analysis.keyPointsExplanation).toBeTruthy();

      // 验证易错点分析
      expect(Array.isArray(analysisResult.analysis.commonMistakes)).toBe(true);
      expect(analysisResult.analysis.commonMistakes.length).toBeGreaterThan(0);
      expect(analysisResult.analysis.mistakesAnalysis).toBeTruthy();

      // 验证知识点关联
      expect(Array.isArray(analysisResult.analysis.knowledgePoints)).toBe(true);
      expect(analysisResult.analysis.knowledgePoints.length).toBeGreaterThan(0);
      analysisResult.analysis.knowledgePoints.forEach(kp => {
        expect(kp.name).toBeTruthy();
        expect(kp.category).toBeTruthy();
        expect(kp.importance).toMatch(/high|medium|low/);
      });
      expect(analysisResult.analysis.knowledgeGraph).toBeTruthy();

      // 验证解题指导
      expect(Array.isArray(analysisResult.analysis.solvingSteps)).toBe(true);
      expect(analysisResult.analysis.solvingSteps.length).toBeGreaterThan(0);
      expect(analysisResult.analysis.solvingStrategy).toBeTruthy();
      expect(Array.isArray(analysisResult.analysis.tips)).toBe(true);

      // 验证学习建议
      expect(analysisResult.analysis.studyAdvice).toBeTruthy();
      expect(analysisResult.analysis.practiceDirection).toBeTruthy();
    }

    // 验证知识点已关联
    expect(Array.isArray(analysisResult.knowledgePointIds)).toBe(true);
  }, 60000); // AI分析可能需要较长时间

  it("should retrieve question with detailed analysis", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 创建错题
    const createResult = await caller.errorQuestions.create({
      title: "物理力学问题",
      content: "一个质量为2kg的物体，在水平面上受到10N的拉力作用，摩擦力为4N，求物体的加速度。",
      subject: "physics",
      grade: "senior1",
      userAnswer: "我直接用F=ma，算出a=5m/s²，但忘记减去摩擦力了。",
    });

    // 执行详细分析
    await caller.aiAnalysis.analyzeQuestionDetailed({
      questionId: createResult.questionId,
    });

    // 获取错题详情
    const question = await caller.errorQuestions.getById({
      questionId: createResult.questionId,
    });

    expect(question).toBeDefined();
    expect(question.isAnalyzed).toBe(true);
    expect(question.detailedAnalysis).toBeTruthy();

    // 验证详细分析数据可以被解析
    if (question.detailedAnalysis) {
      const analysis = JSON.parse(question.detailedAnalysis);
      expect(analysis.errorType).toBeTruthy();
      expect(analysis.keyPoints).toBeDefined();
      expect(analysis.solvingSteps).toBeDefined();
    }
  }, 60000);
});
