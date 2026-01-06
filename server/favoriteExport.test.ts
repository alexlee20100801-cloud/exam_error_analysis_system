import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import { users, errorQuestions, questions, favorites } from "../drizzle/schema";

describe("收藏题目导出功能测试", () => {
  let testUserId: number;
  let testErrorQuestionId: number;
  let testPracticeQuestionId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试用户
    const [user] = await db.insert(users).values({
      openId: `test-export-${Date.now()}`,
      name: "测试学生",
      role: "user",
      userType: "student",
      grade: "junior1",
    });
    testUserId = user.insertId;

    // 创建测试错题
    const [eq] = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: "测试错题1",
      content: "这是一道测试错题的内容",
      correctAnswer: "正确答案",
      userAnswer: "错误答案",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      difficulty: "medium",
      knowledgePoint: "代数",
    });
    testErrorQuestionId = eq.insertId;

    // 创建测试练习题
    const [q] = await db.insert(questions).values({
      title: "测试练习题1",
      content: "这是一道测试练习题的内容",
      correctAnswer: "答案",
      questionType: "choice",
      schoolLevel: "junior",
      subject: "math",
      grade: "junior1",
      difficulty: "hard",
      knowledgePoint: "几何",
    });
    testPracticeQuestionId = q.insertId;

    // 添加收藏
    await db.insert(favorites).values([
      {
        userId: testUserId,
        questionId: testErrorQuestionId,
        questionType: "error_question",
      },
      {
        userId: testUserId,
        questionId: testPracticeQuestionId,
        questionType: "practice_question",
      },
    ]);
  });

  it("应该能导出PDF格式", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.export({
      format: "pdf",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.filename).toContain(".pdf");
    expect(typeof result.data).toBe("string");
    
    // 验证base64数据可以解码
    const decoded = Buffer.from(result.data, "base64");
    expect(decoded.length).toBeGreaterThan(0);
    
    // 验证PDF文件头
    const header = decoded.toString("utf8", 0, 5);
    expect(header).toBe("%PDF-");
  });

  it("应该能导出Word格式", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.export({
      format: "word",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.filename).toContain(".docx");
    expect(typeof result.data).toBe("string");
    
    // 验证base64数据可以解码
    const decoded = Buffer.from(result.data, "base64");
    expect(decoded.length).toBeGreaterThan(0);
    
    // 验证ZIP文件头（docx是ZIP格式）
    const header = decoded.toString("hex", 0, 4);
    expect(header).toBe("504b0304"); // PK.. (ZIP header)
  });

  it("应该能按题目类型筛选导出", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    // 只导出错题
    const errorResult = await caller.favorites.export({
      format: "pdf",
      questionType: "error_question",
    });

    expect(errorResult.success).toBe(true);
    expect(errorResult.data).toBeDefined();

    // 只导出练习题
    const practiceResult = await caller.favorites.export({
      format: "pdf",
      questionType: "practice_question",
    });

    expect(practiceResult.success).toBe(true);
    expect(practiceResult.data).toBeDefined();
  });

  it("导出的文件名应该包含日期", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.export({
      format: "pdf",
    });

    expect(result.filename).toMatch(/\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD格式
  });

  it("导出空收藏列表应该返回有效文档", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建没有收藏的新用户
    const [user] = await db.insert(users).values({
      openId: `test-export-empty-${Date.now()}`,
      name: "空收藏用户",
      role: "user",
      userType: "student",
      grade: "junior1",
    });
    const emptyUserId = user.insertId;

    const caller = appRouter.createCaller({
      user: { id: emptyUserId, role: "user" },
    } as TrpcContext);

    const result = await caller.favorites.export({
      format: "pdf",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    // 即使没有题目，也应该生成有效的PDF
    const decoded = Buffer.from(result.data, "base64");
    const header = decoded.toString("utf8", 0, 5);
    expect(header).toBe("%PDF-");
  });
});
