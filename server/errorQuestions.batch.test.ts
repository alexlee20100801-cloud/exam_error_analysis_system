import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { db } from './db';
import { errorQuestions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { TrpcContext } from './_core/context';

describe('批量上传错题功能测试', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testUserId: string;
  const createdQuestionIds: number[] = [];

  beforeAll(async () => {
    // 创建测试用户上下文
    testUserId = 'test-user-batch-upload';
    const mockContext: TrpcContext = {
      user: {
        id: 1,
        openId: testUserId,
        name: '批量上传测试用户',
        email: 'batch-test@example.com',
        role: 'user',
        grade: 'junior1',
        school: '测试学校',
        userType: 'student',
        region: 'shenzhen',
        currentSemester: '2024-spring',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(mockContext);
  });

  afterAll(async () => {
    // 清理测试数据
    if (createdQuestionIds.length > 0) {
      await db.delete(errorQuestions).where(
        eq(errorQuestions.userId, testUserId)
      );
    }
  });

  it('应该能够批量创建多个错题', async () => {
    const testQuestions = [
      {
        title: '批量测试题目1',
        content: '这是第一道批量上传的测试题目',
        subject: 'math' as const,
        grade: 'junior1' as const,
        schoolLevel: 'junior' as const,
        difficulty: 'medium' as const,
      },
      {
        title: '批量测试题目2',
        content: '这是第二道批量上传的测试题目',
        subject: 'physics' as const,
        grade: 'junior2' as const,
        schoolLevel: 'junior' as const,
        difficulty: 'hard' as const,
      },
      {
        title: '批量测试题目3',
        content: '这是第三道批量上传的测试题目',
        subject: 'chemistry' as const,
        grade: 'junior3' as const,
        schoolLevel: 'junior' as const,
        difficulty: 'easy' as const,
      },
    ];

    // 批量创建错题
    for (const question of testQuestions) {
      const result = await caller.errorQuestions.create(question);
      expect(result.success).toBe(true);
      if (result.questionId) {
        createdQuestionIds.push(result.questionId);
      }
    }

    expect(createdQuestionIds.length).toBe(3);

    // 验证创建的错题
    const questions = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, testUserId));

    expect(questions.length).toBeGreaterThanOrEqual(3);
    
    // 验证每道题的内容
    const titles = questions.map(q => q.title);
    expect(titles).toContain('批量测试题目1');
    expect(titles).toContain('批量测试题目2');
    expect(titles).toContain('批量测试题目3');
  });

  it('应该能够查询批量上传的错题列表', async () => {
    const result = await caller.errorQuestions.list({
      limit: 10,
      offset: 0,
    });

    expect(result.questions.length).toBeGreaterThanOrEqual(3);
    expect(result.total).toBeGreaterThanOrEqual(3);
  });

  it('批量上传时应该正确处理不同科目和难度', async () => {
    const questions = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.userId, testUserId));

    const subjects = new Set(questions.map(q => q.subject));
    const difficulties = new Set(questions.map(q => q.difficulty));

    // 验证包含多个科目
    expect(subjects.size).toBeGreaterThanOrEqual(2);
    
    // 验证包含多个难度级别
    expect(difficulties.size).toBeGreaterThanOrEqual(2);
  });

  it('批量上传后应该能够单独查询每道错题', async () => {
    for (const questionId of createdQuestionIds) {
      const result = await caller.errorQuestions.getById({ questionId });
      
      expect(result).toBeDefined();
      expect(result.id).toBe(questionId);
      expect(result.userId).toBe(testUserId);
    }
  });

  it('批量上传时应该支持带图片的错题', async () => {
    const questionWithImage = await caller.errorQuestions.create({
      title: '带图片的批量测试题',
      content: '这是一道带图片的测试题目',
      subject: 'math' as const,
      grade: 'junior1' as const,
      schoolLevel: 'junior' as const,
      difficulty: 'medium' as const,
      imageUrl: 'https://example.com/test-image.jpg',
      imageKey: 'test-image.jpg',
    });

    expect(questionWithImage.success).toBe(true);
    
    if (questionWithImage.questionId) {
      createdQuestionIds.push(questionWithImage.questionId);
      
      const savedQuestion = await caller.errorQuestions.getById({
        questionId: questionWithImage.questionId,
      });
      
      expect(savedQuestion.imageUrl).toBe('https://example.com/test-image.jpg');
      expect(savedQuestion.imageKey).toBe('test-image.jpg');
    }
  });
});
