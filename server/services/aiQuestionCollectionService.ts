import { invokeLLM } from '../_core/llm';

/**
 * 深圳名校列表（预设）
 */
export const SHENZHEN_TOP_SCHOOLS = {
  junior: [
    '深圳中学初中部',
    '深圳实验学校中学部',
    '深圳外国语学校初中部',
    '深圳高级中学初中部',
    '深圳市百花外国语学校',
    '深圳第二实验学校初中部',
    '南山实验教育集团麒麟中学',
    '福田区外国语学校',
  ],
  senior: [
    '深圳中学',
    '深圳实验学校高中部',
    '深圳外国语学校',
    '深圳高级中学',
    '深圳市第二高级中学',
    '深圳市第三高级中学',
    '深圳市第七高级中学',
    '南山外国语学校高中部',
    '宝安中学',
    '红岭中学',
  ],
};

/**
 * 学科中文名称映射
 */
const SUBJECT_NAMES: Record<string, string> = {
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

/**
 * 年级中文名称映射
 */
const GRADE_NAMES: Record<string, string> = {
  grade7: '初一',
  grade8: '初二',
  grade9: '初三',
  grade10: '高一',
  grade11: '高二',
  grade12: '高三',
};

/**
 * 搜索参数接口
 */
export interface SearchParams {
  schools: string[]; // 学校列表
  subject: string; // 学科
  grade: string; // 年级
  examType?: string; // 考试类型：期中、期末、月考、模拟考
  year?: number; // 年份
  semester?: 'first' | 'second'; // 学期
  count?: number; // 需要的题目数量
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  sourceName: string; // 来源名称
  sourceSchool: string; // 学校
  examYear?: number;
  examSemester?: 'first' | 'second';
  examType?: string;
  topicSummary: string; // 题目主题摘要
  knowledgePoints: string[]; // 知识点
  difficulty: 'easy' | 'medium' | 'hard';
  relevanceScore: number; // 相关性评分
  searchQuery: string; // 搜索关键词
}

/**
 * 生成题目参数接口
 */
export interface GenerateQuestionParams {
  source: SearchResult;
  generationMethod: 'ai_inspired' | 'ai_similar' | 'ai_original';
  subject: string;
  grade: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * 生成的题目接口
 */
export interface GeneratedQuestion {
  title: string;
  content: string;
  questionType: 'choice' | 'blank' | 'short_answer' | 'calculation' | 'essay';
  answer: string;
  explanation: string;
  knowledgePoints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  qualityScore: number;
  originalityScore: number;
}

/**
 * 构建搜索关键词
 */
export function buildSearchQuery(params: SearchParams): string[] {
  const { schools, subject, grade, examType, year, semester } = params;
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const gradeName = GRADE_NAMES[grade] || grade;
  const semesterName = semester === 'first' ? '上学期' : semester === 'second' ? '下学期' : '';
  const yearStr = year ? `${year}年` : '';
  const examTypeName = examType || '考试';

  const queries: string[] = [];

  // 为每个学校生成搜索关键词
  for (const school of schools) {
    // 基础查询
    queries.push(`${school} ${gradeName} ${subjectName} ${yearStr}${semesterName}${examTypeName}题`);
    
    // 变体查询
    if (year) {
      queries.push(`${school} ${year} ${gradeName} ${subjectName} ${examTypeName}`);
    }
    
    // 知识点查询
    queries.push(`${school} ${gradeName} ${subjectName} 知识点 题型`);
  }

  return queries;
}

/**
 * 使用AI分析搜索结果并提取题目信息
 * 注意：这里不直接复制题目内容，而是提取主题、知识点等元信息
 */
export async function analyzeSearchResults(
  searchQuery: string,
  searchResults: string, // 搜索结果文本
  subject: string,
  grade: string
): Promise<SearchResult[]> {
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const gradeName = GRADE_NAMES[grade] || grade;

  const prompt = `你是一个教育内容分析专家。请分析以下搜索结果，提取出与"${gradeName}${subjectName}"相关的考试题目信息。

**重要提示：**
1. 不要复制完整的题目内容（避免版权问题）
2. 只提取题目的主题、涉及的知识点、难度等元信息
3. 提取的信息将用于生成原创题目

搜索结果：
${searchResults}

请提取以下信息（JSON格式）：
{
  "results": [
    {
      "sourceName": "来源名称（例如：深圳中学2023年期中考试）",
      "sourceSchool": "学校名称",
      "examYear": 2023,
      "examSemester": "first" | "second",
      "examType": "期中" | "期末" | "月考" | "模拟考",
      "topicSummary": "题目主题摘要（不是完整题目）",
      "knowledgePoints": ["知识点1", "知识点2"],
      "difficulty": "easy" | "medium" | "hard",
      "relevanceScore": 85
    }
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: '你是一个教育内容分析专家，擅长从搜索结果中提取考试题目的元信息。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'search_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sourceName: { type: 'string' },
                    sourceSchool: { type: 'string' },
                    examYear: { type: 'number' },
                    examSemester: { type: 'string', enum: ['first', 'second'] },
                    examType: { type: 'string' },
                    topicSummary: { type: 'string' },
                    knowledgePoints: { type: 'array', items: { type: 'string' } },
                    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                    relevanceScore: { type: 'number' },
                  },
                  required: ['sourceName', 'sourceSchool', 'topicSummary', 'knowledgePoints', 'difficulty', 'relevanceScore'],
                  additionalProperties: false,
                },
              },
            },
            required: ['results'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    // @ts-ignore
    const parsed = JSON.parse(content);
    return parsed.results.map((r: any) => ({
      ...r,
      searchQuery,
    }));
  } catch (error) {
    console.error('Error analyzing search results:', error);
    return [];
  }
}

/**
 * 基于搜索结果生成原创题目
 */
export async function generateQuestionFromSource(
  params: GenerateQuestionParams
): Promise<GeneratedQuestion> {
  const { source, generationMethod, subject, grade, difficulty } = params;
  const subjectName = SUBJECT_NAMES[subject] || subject;
  const gradeName = GRADE_NAMES[grade] || grade;

  let methodDescription = '';
  if (generationMethod === 'ai_inspired') {
    methodDescription = '受启发生成一道新题目（参考主题和知识点，但完全原创）';
  } else if (generationMethod === 'ai_similar') {
    methodDescription = '生成一道结构相似但内容不同的题目';
  } else {
    methodDescription = '生成一道完全原创的题目（仅参考知识点）';
  }

  const difficultyMap = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };

  const prompt = `你是一个资深的${subjectName}教师，擅长命题。请${methodDescription}。

**参考信息：**
- 来源：${source.sourceName}
- 学校：${source.sourceSchool}
- 主题摘要：${source.topicSummary}
- 知识点：${source.knowledgePoints.join('、')}
- 难度：${difficultyMap[difficulty]}

**要求：**
1. 题目必须是原创的，不能直接复制任何现有题目
2. 题目内容要符合${gradeName}${subjectName}的教学大纲
3. 题目要有明确的考查目标和知识点
4. 提供详细的解析和标准答案
5. 题目要有区分度，能够考查学生的真实水平

**题型选择：**
- 数学、物理、化学：优先选择计算题或简答题
- 语文：优先选择简答题或作文题
- 英语：优先选择选择题或简答题
- 其他学科：根据知识点特点选择合适题型

请生成题目（JSON格式）：
{
  "title": "题目标题",
  "content": "题目内容（使用LaTeX格式表示数学公式，例如：$x^2$）",
  "questionType": "choice" | "blank" | "short_answer" | "calculation" | "essay",
  "answer": "标准答案",
  "explanation": "详细解析",
  "knowledgePoints": ["知识点1", "知识点2"],
  "difficulty": "easy" | "medium" | "hard",
  "qualityScore": 85,
  "originalityScore": 90
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是一个资深的${subjectName}教师，擅长命题。你的题目必须是原创的，符合教学大纲，有明确的考查目标。`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'generated_question',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              questionType: { type: 'string', enum: ['choice', 'blank', 'short_answer', 'calculation', 'essay'] },
              answer: { type: 'string' },
              explanation: { type: 'string' },
              knowledgePoints: { type: 'array', items: { type: 'string' } },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              qualityScore: { type: 'number' },
              originalityScore: { type: 'number' },
            },
            required: ['title', 'content', 'questionType', 'answer', 'explanation', 'knowledgePoints', 'difficulty', 'qualityScore', 'originalityScore'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Failed to generate question');
    }

    // @ts-ignore
    const question = JSON.parse(content);
    return question;
  } catch (error) {
    console.error('Error generating question:', error);
    throw error;
  }
}

/**
 * 批量生成题目
 */
export async function batchGenerateQuestions(
  sources: SearchResult[],
  params: {
    subject: string;
    grade: string;
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
    generationMethod?: 'ai_inspired' | 'ai_similar' | 'ai_original';
  }
): Promise<GeneratedQuestion[]> {
  const { subject, grade, difficulty, count, generationMethod = 'ai_inspired' } = params;
  const questions: GeneratedQuestion[] = [];

  // 按相关性排序
  const sortedSources = sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // 生成题目
  for (let i = 0; i < Math.min(count, sortedSources.length); i++) {
    try {
      const question = await generateQuestionFromSource({
        source: sortedSources[i],
        generationMethod,
        subject,
        grade,
        difficulty,
      });
      questions.push(question);
    } catch (error) {
      console.error(`Failed to generate question from source ${i}:`, error);
    }
  }

  return questions;
}
