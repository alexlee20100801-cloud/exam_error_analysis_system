import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };

  return { ctx };
}

describe('AI Question Collection Router', () => {
  describe('getSchools', () => {
    it('should return junior schools list', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.aiQuestionCollection.getSchools({
        schoolLevel: 'junior',
      });

      expect(result).toBeDefined();
      expect(result.schools).toBeDefined();
      expect(Array.isArray(result.schools)).toBe(true);
      expect(result.schools.length).toBeGreaterThan(0);
      expect(result.schools).toContain('深圳中学初中部');
    });

    it('should return senior schools list', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.aiQuestionCollection.getSchools({
        schoolLevel: 'senior',
      });

      expect(result).toBeDefined();
      expect(result.schools).toBeDefined();
      expect(Array.isArray(result.schools)).toBe(true);
      expect(result.schools.length).toBeGreaterThan(0);
      expect(result.schools).toContain('深圳中学');
      expect(result.schools).toContain('深圳实验学校高中部');
    });
  });

  describe('searchExamInfo', () => {
    it('should search exam information with valid parameters', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.aiQuestionCollection.searchExamInfo({
        schools: ['深圳中学', '深圳实验学校高中部'],
        subject: 'math',
        grade: 'grade10',
        examType: '期中考试',
        year: 2024,
        semester: 'first',
        count: 5,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.totalFound).toBeGreaterThanOrEqual(0);
      expect(result.searchQueries).toBeDefined();
      expect(Array.isArray(result.searchQueries)).toBe(true);
    }, 30000); // Increase timeout for AI processing

    it('should handle single school search', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.aiQuestionCollection.searchExamInfo({
        schools: ['深圳中学'],
        subject: 'physics',
        grade: 'grade11',
        count: 3,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('generateQuestion', () => {
    it('should generate question from source', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockSource = {
        sourceName: '深圳中学2024年上学期期中考试',
        sourceSchool: '深圳中学',
        examYear: 2024,
        examSemester: 'first' as const,
        examType: '期中考试',
        topicSummary: '二次函数的图像和性质',
        knowledgePoints: ['二次函数', '函数图像', '最值问题'],
        difficulty: 'medium' as const,
        relevanceScore: 85,
        searchQuery: '深圳中学 高一 数学 2024年上学期期中考试题',
      };

      const result = await caller.aiQuestionCollection.generateQuestion({
        source: mockSource,
        generationMethod: 'ai_inspired',
        subject: 'math',
        grade: 'grade10',
        difficulty: 'medium',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success && result.question) {
        expect(result.question.title).toBeDefined();
        expect(result.question.content).toBeDefined();
        expect(result.question.questionType).toBeDefined();
        expect(['choice', 'blank', 'short_answer', 'calculation', 'essay']).toContain(
          result.question.questionType
        );
        expect(result.question.answer).toBeDefined();
        expect(result.question.explanation).toBeDefined();
        expect(result.question.knowledgePoints).toBeDefined();
        expect(Array.isArray(result.question.knowledgePoints)).toBe(true);
        expect(result.question.difficulty).toBeDefined();
        expect(['easy', 'medium', 'hard']).toContain(result.question.difficulty);
        expect(result.question.qualityScore).toBeGreaterThanOrEqual(0);
        expect(result.question.qualityScore).toBeLessThanOrEqual(100);
        expect(result.question.originalityScore).toBeGreaterThanOrEqual(0);
        expect(result.question.originalityScore).toBeLessThanOrEqual(100);
      }
    }, 60000); // Longer timeout for LLM call
  });

  describe('batchGenerateQuestions', () => {
    it('should batch generate multiple questions', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const mockSources = [
        {
          sourceName: '深圳中学2024年期中考试',
          sourceSchool: '深圳中学',
          topicSummary: '函数与导数',
          knowledgePoints: ['导数', '函数单调性'],
          difficulty: 'medium' as const,
          relevanceScore: 88,
          searchQuery: '深圳中学 高二 数学 期中',
        },
        {
          sourceName: '深圳外国语学校2024年月考',
          sourceSchool: '深圳外国语学校',
          topicSummary: '三角函数应用',
          knowledgePoints: ['三角函数', '解三角形'],
          difficulty: 'medium' as const,
          relevanceScore: 85,
          searchQuery: '深圳外国语学校 高二 数学 月考',
        },
      ];

      const result = await caller.aiQuestionCollection.batchGenerateQuestions({
        sources: mockSources,
        subject: 'math',
        grade: 'grade11',
        difficulty: 'medium',
        count: 2,
        generationMethod: 'ai_inspired',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.questions).toBeDefined();
        expect(Array.isArray(result.questions)).toBe(true);
        expect(result.generatedCount).toBeGreaterThanOrEqual(0);
        expect(result.generatedCount).toBeLessThanOrEqual(2);
        
        // Verify each generated question
        result.questions.forEach((question) => {
          expect(question.title).toBeDefined();
          expect(question.content).toBeDefined();
          expect(question.questionType).toBeDefined();
          expect(question.answer).toBeDefined();
          expect(question.explanation).toBeDefined();
          expect(Array.isArray(question.knowledgePoints)).toBe(true);
        });
      }
    }, 120000); // Longer timeout for batch generation
  });
});
