import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

describe('批量操作和AI缓存功能测试', () => {
  let caller: ReturnType<typeof createCaller>;
  let testUserId: number;
  let testQuestionIds: number[] = [];

  beforeAll(async () => {
    // 创建测试用户上下文
    const mockContext: TrpcContext = {
      user: {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        openId: 'test-open-id',
        role: 'user',
        grade: 'junior1',
        school: '测试学校',
        userType: 'student',
        region: '深圳',
        currentSemester: 'first',
      },
      req: {} as any,
      res: {} as any,
    };

    const createCaller = appRouter.createCaller;
    caller = createCaller(mockContext);
    testUserId = mockContext.user.id;
  });

  describe('批量删除功能', () => {
    it('应该能够批量删除错题', async () => {
      // 先创建几个测试错题
      const question1 = await caller.errorQuestions.create({
        title: '批量删除测试题1',
        content: '这是一道测试题目内容1',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
      });

      const question2 = await caller.errorQuestions.create({
        title: '批量删除测试题2',
        content: '这是一道测试题目内容2',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
      });

      const questionId1 = question1.questionId;
      const questionId2 = question2.questionId;

      // 批量删除
      const result = await caller.errorQuestions.batchDelete({
        questionIds: [questionId1, questionId2],
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(0);
    });
  });

  describe('批量标记为已掌握功能', () => {
    it('应该能够批量标记错题为已掌握', async () => {
      // 先创建几个测试错题
      const question1 = await caller.errorQuestions.create({
        title: '批量标记测试题1',
        content: '这是一道测试题目内容1',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
      });

      const question2 = await caller.errorQuestions.create({
        title: '批量标记测试题2',
        content: '这是一道测试题目内容2',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
      });

      const questionId1 = question1.questionId;
      const questionId2 = question2.questionId;
      testQuestionIds.push(questionId1, questionId2);

      // 批量标记为已掌握
      const result = await caller.errorQuestions.batchMarkMastered({
        questionIds: [questionId1, questionId2],
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(0);

      // 验证标记结果
      const updatedQuestion1 = await caller.errorQuestions.getById({
        questionId: questionId1,
      });
      expect(updatedQuestion1.isMastered).toBeTruthy(); // tinyint returns 1 instead of true
    });
  });

  describe('批量修改难度功能', () => {
    it('应该能够批量修改错题难度', async () => {
      // 先创建几个测试错题
      const question1 = await caller.errorQuestions.create({
        title: '批量修改难度测试题1',
        content: '这是一道测试题目内容1',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
        difficulty: 'easy',
      });

      const question2 = await caller.errorQuestions.create({
        title: '批量修改难度测试题2',
        content: '这是一道测试题目内容2',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
        difficulty: 'easy',
      });

      const questionId1 = question1.questionId;
      const questionId2 = question2.questionId;
      testQuestionIds.push(questionId1, questionId2);

      // 批量修改难度
      const result = await caller.errorQuestions.batchUpdateDifficulty({
        questionIds: [questionId1, questionId2],
        difficulty: 'hard',
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(0);

      // 验证修改结果
      const updatedQuestion1 = await caller.errorQuestions.getById({
        questionId: questionId1,
      });
      expect(updatedQuestion1.difficulty).toBe('hard');
    });
  });

  describe('批量导出功能', () => {
    it('应该能够批量导出错题数据', async () => {
      // 先创建几个测试错题
      const question1 = await caller.errorQuestions.create({
        title: '批量导出测试题1',
        content: '这是一道测试题目内容1',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
      });

      const question2 = await caller.errorQuestions.create({
        title: '批量导出测试题2',
        content: '这是一道测试题目内容2',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
      });

      const questionId1 = question1.questionId;
      const questionId2 = question2.questionId;
      testQuestionIds.push(questionId1, questionId2);

      // 批量导出
      const result = await caller.errorQuestions.batchExport({
        questionIds: [questionId1, questionId2],
        format: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(2);
      expect(result.format).toBe('json');
    });
  });

  describe('AI分析缓存功能', () => {
    it('应该能够缓存AI分析结果并在第二次分析时使用缓存', { timeout: 30000 }, async () => {
      // 创建一个测试错题
      const question = await caller.errorQuestions.create({
        title: 'AI缓存测试题',
        content: '求解方程 2x + 3 = 7',
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
      });

      const questionId = question.questionId;
      testQuestionIds.push(questionId);

      // 第一次AI分析(应该调用LLM)
      const startTime1 = Date.now();
      const analysis1 = await caller.errorQuestions.analyze({
        questionId,
      });
      const duration1 = Date.now() - startTime1;

      expect(analysis1.success).toBe(true);
      expect(analysis1.analysis).toBeDefined();

      // 等待1秒确保缓存已保存
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 创建另一个内容相同的错题
      const question2 = await caller.errorQuestions.create({
        title: 'AI缓存测试题2',
        content: '求解方程 2x + 3 = 7', // 相同内容
        subject: 'math',
        grade: 'junior1',
        schoolLevel: 'junior',
      });

      const questionId2 = question2.questionId;
      testQuestionIds.push(questionId2);

      // 第二次AI分析(应该使用缓存,速度更快)
      const startTime2 = Date.now();
      const analysis2 = await caller.errorQuestions.analyze({
        questionId: questionId2,
      });
      const duration2 = Date.now() - startTime2;

      expect(analysis2.success).toBe(true);
      expect(analysis2.analysis).toBeDefined();

      // 验证第二次分析结果与第一次相同
      expect(analysis2.analysis?.correctAnswer).toBe(analysis1.analysis?.correctAnswer);
      
      // 缓存命中应该更快(通常快10倍以上)
      console.log(`第一次分析耗时: ${duration1}ms, 第二次分析耗时: ${duration2}ms`);
      expect(duration2).toBeLessThan(duration1 * 0.5); // 第二次应该快至少50%
    });

    it('应该能够获取缓存统计信息', async () => {
      const stats = await caller.cacheStats.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalCaches).toBeGreaterThanOrEqual(0);
      expect(stats.totalHits).toBeGreaterThanOrEqual(0);
      expect(stats.avgHitCount).toBeGreaterThanOrEqual(0);

      console.log('缓存统计信息:', stats);
    });
  });
});
