import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  buildSearchQuery,
  analyzeSearchResults,
  generateQuestionFromSource,
  batchGenerateQuestions,
  SHENZHEN_TOP_SCHOOLS,
  type SearchResult,
  type GeneratedQuestion,
} from '../services/aiQuestionCollectionService';

/**
 * AI题目收集路由
 * 提供从网络搜索名校试题信息并生成原创题目的功能
 */
export const aiQuestionCollectionRouter = router({
  /**
   * 获取深圳名校列表
   */
  getSchools: protectedProcedure
    .input(
      z.object({
        schoolLevel: z.enum(['junior', 'senior']),
      })
    )
    .query(({ input }) => {
      const { schoolLevel } = input;
      return {
        schools: schoolLevel === 'junior' ? SHENZHEN_TOP_SCHOOLS.junior : SHENZHEN_TOP_SCHOOLS.senior,
      };
    }),

  /**
   * 搜索名校试题信息
   * 注意：这里使用模拟数据，实际应该调用搜索API
   */
  searchExamInfo: protectedProcedure
    .input(
      z.object({
        schools: z.array(z.string()).min(1).max(10),
        subject: z.enum(['math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
        grade: z.enum(['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']),
        examType: z.string().optional(),
        year: z.number().optional(),
        semester: z.enum(['first', 'second']).optional(),
        count: z.number().min(1).max(20).default(5),
      })
    )
    .mutation(async ({ input }) => {
      const { schools, subject, grade, examType, year, semester, count } = input;

      // 构建搜索关键词
      const searchQueries = buildSearchQuery({
        schools,
        subject,
        grade,
        examType,
        year,
        semester,
        count,
      });

      // 这里应该调用实际的搜索API
      // 为了演示，我们使用模拟数据
      const mockSearchResults = generateMockSearchResults(schools, subject, grade, examType, year, semester);

      // 使用AI分析搜索结果
      const analyzedResults: SearchResult[] = [];
      for (const query of searchQueries.slice(0, 3)) {
        // 限制查询次数
        try {
          const results = await analyzeSearchResults(
            query,
            JSON.stringify(mockSearchResults),
            subject,
            grade
          );
          analyzedResults.push(...results);
        } catch (error) {
          console.error('Error analyzing search results:', error);
        }
      }

      // 去重并按相关性排序
      const uniqueResults = Array.from(
        new Map(analyzedResults.map((r: any) => [r.sourceName, r])).values()
      ).sort((a, b) => b.relevanceScore - a.relevanceScore);

      return {
        success: true,
        results: uniqueResults.slice(0, count),
        totalFound: uniqueResults.length,
        searchQueries: searchQueries.slice(0, 3),
      };
    }),

  /**
   * 生成单个题目
   */
  generateQuestion: protectedProcedure
    .input(
      z.object({
        source: z.object({
          sourceName: z.string(),
          sourceSchool: z.string(),
          examYear: z.number().optional(),
          examSemester: z.enum(['first', 'second']).optional(),
          examType: z.string().optional(),
          topicSummary: z.string(),
          knowledgePoints: z.array(z.string()),
          difficulty: z.enum(['easy', 'medium', 'hard']),
          relevanceScore: z.number(),
          searchQuery: z.string(),
        }),
        generationMethod: z.enum(['ai_inspired', 'ai_similar', 'ai_original']).default('ai_inspired'),
        subject: z.enum(['math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
        grade: z.enum(['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']),
        difficulty: z.enum(['easy', 'medium', 'hard']),
      })
    )
    .mutation(async ({ input }) => {
      const { source, generationMethod, subject, grade, difficulty } = input;

      try {
        const question = await generateQuestionFromSource({
          source,
          generationMethod,
          subject,
          grade,
          difficulty,
        });

        return {
          success: true,
          question,
        };
      } catch (error) {
        console.error('Error generating question:', error);
        return {
          success: false,
          error: 'Failed to generate question',
        };
      }
    }),

  /**
   * 批量生成题目
   */
  batchGenerateQuestions: protectedProcedure
    .input(
      z.object({
        sources: z.array(
          z.object({
            sourceName: z.string(),
            sourceSchool: z.string(),
            examYear: z.number().optional(),
            examSemester: z.enum(['first', 'second']).optional(),
            examType: z.string().optional(),
            topicSummary: z.string(),
            knowledgePoints: z.array(z.string()),
            difficulty: z.enum(['easy', 'medium', 'hard']),
            relevanceScore: z.number(),
            searchQuery: z.string(),
          })
        ),
        subject: z.enum(['math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
        grade: z.enum(['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']),
        difficulty: z.enum(['easy', 'medium', 'hard']),
        count: z.number().min(1).max(10).default(5),
        generationMethod: z.enum(['ai_inspired', 'ai_similar', 'ai_original']).default('ai_inspired'),
      })
    )
    .mutation(async ({ input }) => {
      const { sources, subject, grade, difficulty, count, generationMethod } = input;

      try {
        const questions = await batchGenerateQuestions(sources, {
          subject,
          grade,
          difficulty,
          count,
          generationMethod,
        });

        return {
          success: true,
          questions,
          generatedCount: questions.length,
        };
      } catch (error) {
        console.error('Error batch generating questions:', error);
        return {
          success: false,
          error: 'Failed to generate questions',
          questions: [],
          generatedCount: 0,
        };
      }
    }),
});

/**
 * 生成模拟搜索结果（用于演示）
 * 实际应用中应该调用真实的搜索API
 */
function generateMockSearchResults(
  schools: string[],
  subject: string,
  grade: string,
  examType?: string,
  year?: number,
  semester?: 'first' | 'second'
): any[] {
  const subjectNames: Record<string, string> = {
    math: '数学',
    chinese: '语文',
    english: '英语',
    physics: '物理',
    chemistry: '化学',
    biology: '生物',
    politics: '政治',
    history: '历史',
    geography: '地理',
  };

  const gradeNames: Record<string, string> = {
    grade7: '初一',
    grade8: '初二',
    grade9: '初三',
    grade10: '高一',
    grade11: '高二',
    grade12: '高三',
  };

  const mockResults = [];
  const currentYear = new Date().getFullYear();
  const targetYear = year || currentYear;
  const targetSemester = semester || 'first';
  const targetExamType = examType || '期中考试';

  for (const school of schools) {
    mockResults.push({
      title: `${school}${targetYear}年${targetSemester === 'first' ? '上' : '下'}学期${targetExamType}`,
      content: `${gradeNames[grade]}${subjectNames[subject]}试题，涉及多个知识点，难度适中，适合学生练习。`,
      url: `https://example.com/${school}/${targetYear}/${grade}/${subject}`,
    });
  }

  return mockResults;
}
