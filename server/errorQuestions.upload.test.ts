import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("错题上传功能测试", () => {
  let caller: ReturnType<typeof createCaller>;
  let mockUserId: number;

  beforeAll(() => {
    // 创建模拟用户上下文
    mockUserId = 1;
    const mockContext: Context = {
      user: {
        id: mockUserId,
        openId: "test-open-id",
        name: "测试用户",
        email: "test@example.com",
        role: "user",
      },
      req: {} as any,
      res: {} as any,
    };

    const createCaller = appRouter.createCaller;
    caller = createCaller(mockContext);
  });

  it("应该能够创建错题（手动输入）", async () => {
    const result = await caller.errorQuestions.create({
      title: "二次函数综合题",
      content: "已知二次函数 y = ax² + bx + c 的图像经过点 (0, 1), (1, 0), (2, 3)，求该函数的解析式。",
      subject: "math",
      grade: "junior3",
      schoolLevel: "junior",
      difficulty: "medium",
      userAnswer: "y = x² - 2x + 1",
      userNotes: "忘记代入第三个点验证",
    });

    expect(result.success).toBe(true);
    expect(result.questionId).toBeGreaterThan(0);
  });

  it("应该验证必填字段", async () => {
    await expect(
      caller.errorQuestions.create({
        title: "",
        content: "测试内容",
        subject: "math",
        grade: "junior3",
        schoolLevel: "junior",
      })
    ).rejects.toThrow();
  });

  it("应该能够上传图片并OCR识别", async () => {
    // 创建一个简单的测试图片 (1x1 白色像素的PNG)
    const testImageBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    const result = await caller.errorQuestions.uploadWithOCR({
      imageBase64: testImageBase64,
      fileName: "test-question.png",
    });

    expect(result.success).toBe(true);
    expect(result.imageUrl).toBeDefined();
    // OCR可能返回空文本（因为是空白图片），这是正常的
    expect(result.ocrText).toBeDefined();
  });

  it("应该拒绝无效的base64图片", async () => {
    await expect(
      caller.errorQuestions.uploadWithOCR({
        imageBase64: "invalid-base64",
        fileName: "test.png",
      })
    ).rejects.toThrow();
  });

  it("应该能够获取用户的错题列表", async () => {
    const result = await caller.errorQuestions.list({
      limit: 10,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("应该能够按科目筛选错题", async () => {
    const result = await caller.errorQuestions.listBySubjectAndGrade({
      subject: "math",
      grade: "junior3",
    });

    expect(Array.isArray(result)).toBe(true);
    // 如果有结果，验证科目和年级是否正确
    result.forEach((q) => {
      expect(q.subject).toBe("math");
      expect(q.grade).toBe("junior3");
    });
  });
});
