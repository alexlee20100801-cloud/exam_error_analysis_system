import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, errorQuestions } from "../drizzle/schema";
import {
  getFilteredErrorQuestions,
  generateErrorQuestionsMarkdown,
  exportErrorQuestionsToPdf,
} from "./errorExportService";
import { unlink } from "fs/promises";

describe("错题导出功能测试", () => {
  let testUserId: number;
  let testErrorQuestionIds: number[] = [];
  let caller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");

    // 创建测试用户
    const [user] = await db
      .insert(users)
      .values({
        openId: `test-export-${Date.now()}`,
        name: "导出测试用户",
        role: "user",
      })
      .$returningId();
    testUserId = user.id;

    // 创建多道测试错题
    const errorQuestionsData = [
      {
        userId: testUserId,
        title: "二次函数应用题",
        content: "已知抛物线y=ax²+bx+c经过点(0,3)，求a、b、c的值",
        schoolLevel: "junior" as const,
        subject: "math" as const,
        grade: "junior3" as const,
        difficulty: "medium" as const,
        userAnswer: "a=1, b=2, c=3",
        correctAnswer: "a=1, b=-2, c=3",
        detailedExplanation: "根据抛物线的性质，代入点坐标求解",
        errorAnalysis: "计算b的符号时出现错误",
        userNotes: "需要注意符号",
        isAnalyzed: true,
      },
      {
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
      },
      {
        userId: testUserId,
        title: "物理力学问题",
        content: "一个物体从10m高处自由落下，求落地时的速度",
        schoolLevel: "junior" as const,
        subject: "physics" as const,
        grade: "junior3" as const,
        difficulty: "medium" as const,
        userAnswer: "v=10m/s",
        correctAnswer: "v=14m/s",
        detailedExplanation: "使用自由落体公式：v²=2gh",
        errorAnalysis: "公式记忆错误",
        isAnalyzed: true,
      },
    ];

    for (const data of errorQuestionsData) {
      const [question] = await db.insert(errorQuestions).values(data).$returningId();
      testErrorQuestionIds.push(question.id);
    }

    // 创建caller
    const createCaller = appRouter.createCaller;
    caller = createCaller({
      user: {
        id: testUserId,
        openId: `test-export-${Date.now()}`,
        name: "导出测试用户",
        role: "user",
      },
    });
  });

  it("应该能根据学科筛选错题", async () => {
    const questions = await getFilteredErrorQuestions({
      userId: testUserId,
      subjects: ["math"],
    });

    expect(questions.length).toBe(2);
    expect(questions.every((q) => q.subject === "math")).toBe(true);
  });

  it("应该能根据难度筛选错题", async () => {
    const questions = await getFilteredErrorQuestions({
      userId: testUserId,
      difficulties: ["easy"],
    });

    expect(questions.length).toBe(1);
    expect(questions[0].difficulty).toBe("easy");
  });

  it("应该能根据错题ID列表筛选", async () => {
    const questions = await getFilteredErrorQuestions({
      userId: testUserId,
      errorQuestionIds: [testErrorQuestionIds[0], testErrorQuestionIds[1]],
    });

    expect(questions.length).toBe(2);
    expect(questions.map((q) => q.id)).toEqual(
      expect.arrayContaining([testErrorQuestionIds[0], testErrorQuestionIds[1]])
    );
  });

  it("应该能生成Markdown格式的错题集", async () => {
    const questions = await getFilteredErrorQuestions({
      userId: testUserId,
      subjects: ["math"],
    });

    const markdown = await generateErrorQuestionsMarkdown(questions, {
      includeAnswer: true,
      includeExplanation: true,
      includeAnalysis: true,
      includeNotes: true,
      includeImage: false,
    });

    expect(markdown).toContain("# 错题集");
    expect(markdown).toContain("二次函数应用题");
    expect(markdown).toContain("一元二次方程求解");
    expect(markdown).toContain("### 正确答案");
    expect(markdown).toContain("### 详细解析");
    expect(markdown).toContain("### 错误分析");
  });

  it("应该能预览导出结果", async () => {
    const result = await caller.errorExport.previewExport({
      subjects: ["math"],
    });

    expect(result.totalCount).toBe(2);
    expect(result.preview.length).toBeGreaterThan(0);
    expect(result.preview[0].subject).toBe("math");
  });

  it("应该能导出错题为PDF", async () => {
    const result = await caller.errorExport.exportToPdf({
      subjects: ["math"],
      includeAnswer: true,
      includeExplanation: true,
      includeAnalysis: false,
      includeNotes: false,
      includeImage: false,
    });

    expect(result.success).toBe(true);
    expect(result.pdfData).toBeDefined();
    expect(result.filename).toContain(".pdf");

    // 验证base64格式
    if (result.pdfData) {
      expect(result.pdfData.length).toBeGreaterThan(0);
      // base64字符串应该只包含合法字符
      expect(/^[A-Za-z0-9+/=]+$/.test(result.pdfData)).toBe(true);
    }
  });

  it("应该能完整生成PDF文件", async () => {
    const questions = await getFilteredErrorQuestions({
      userId: testUserId,
      subjects: ["math"],
    });

    const pdfPath = await exportErrorQuestionsToPdf(
      {
        userId: testUserId,
        subjects: ["math"],
      },
      {
        includeAnswer: true,
        includeExplanation: true,
        includeAnalysis: true,
        includeNotes: true,
        includeImage: false,
      }
    );

    expect(pdfPath).toContain(".pdf");
    expect(pdfPath).toContain("/tmp/");

    // 清理临时文件
    try {
      await unlink(pdfPath);
    } catch (error) {
      // 忽略删除错误
    }
  });

  it("没有符合条件的错题时应该抛出错误", async () => {
    await expect(
      exportErrorQuestionsToPdf(
        {
          userId: testUserId,
          subjects: ["english"], // 没有英语错题
        },
        {
          includeAnswer: true,
          includeExplanation: true,
          includeAnalysis: false,
          includeNotes: false,
          includeImage: false,
        }
      )
    ).rejects.toThrow("没有符合条件的错题");
  });
});
