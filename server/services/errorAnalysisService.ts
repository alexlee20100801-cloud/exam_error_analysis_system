import { invokeLLM } from "../_core/llm";
import { generateContentHash, getCachedAnalysis, saveAnalysisToCache } from './analysisCacheService';

export interface ErrorAnalysisResult {
  success: boolean;
  analysis?: {
    knowledgePoints: string[];
    errorReason: string;
    correctAnswer: string;
    detailedExplanation: string;
    studyAdvice: string;
    difficulty: "easy" | "medium" | "hard";
  };
  error?: string;
}

/**
 * 使用AI分析错题
 */
export async function analyzeErrorQuestion(
  questionContent: string,
  subject: string,
  grade: string,
  userAnswer?: string
): Promise<ErrorAnalysisResult> {
  try {
    // 1. 生成内容哈希
    const contentHash = generateContentHash(questionContent, subject, grade);
    
    // 2. 查询缓存
    const cachedResult = await getCachedAnalysis(contentHash, subject, grade);
    if (cachedResult) {
      console.log('[ErrorAnalysis] 使用缓存结果');
      return {
        success: true,
        analysis: {
          knowledgePoints: cachedResult.knowledgePointIds 
            ? (typeof cachedResult.knowledgePointIds === 'string' 
              ? JSON.parse(cachedResult.knowledgePointIds) 
              : cachedResult.knowledgePointIds)
            : [],
          errorReason: cachedResult.errorAnalysis || '',
          correctAnswer: cachedResult.correctAnswer || '',
          detailedExplanation: cachedResult.detailedExplanation || '',
          studyAdvice: cachedResult.detailedAnalysis || '',
          difficulty: (cachedResult.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        },
      };
    }
    
    // 3. 缓存未命中,调用AI分析
    console.log('[ErrorAnalysis] 缓存未命中,调用AI分析');
    const gradeLabel = getGradeLabel(grade);
    const subjectLabel = getSubjectLabel(subject);

    const systemPrompt = `你是一位经验丰富的${subjectLabel}教师，擅长分析学生的错题并提供针对性的学习建议。
你的任务是分析学生的错题，识别涉及的知识点，解释错误原因，提供正确答案和详细解析，并给出学习建议。

请严格按照以下JSON格式返回分析结果：
{
  "knowledgePoints": ["知识点1", "知识点2"],
  "errorReason": "错误原因分析",
  "correctAnswer": "正确答案",
  "detailedExplanation": "详细解析",
  "studyAdvice": "学习建议",
  "difficulty": "easy|medium|hard"
}`;

    const userPrompt = `请分析以下${gradeLabel}${subjectLabel}错题：

题目内容：
${questionContent}

${userAnswer ? `学生答案：\n${userAnswer}\n` : ""}

请提供：
1. 涉及的知识点（列举2-5个核心知识点）
2. 错误原因分析（为什么做错）
3. 正确答案
4. 详细解析（步骤清晰，易于理解）
5. 学习建议（如何避免类似错误）
6. 难度评估（easy/medium/hard）`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "error_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              knowledgePoints: {
                type: "array",
                items: { type: "string" },
                description: "涉及的知识点列表",
              },
              errorReason: {
                type: "string",
                description: "错误原因分析",
              },
              correctAnswer: {
                type: "string",
                description: "正确答案",
              },
              detailedExplanation: {
                type: "string",
                description: "详细解析",
              },
              studyAdvice: {
                type: "string",
                description: "学习建议",
              },
              difficulty: {
                type: "string",
                enum: ["easy", "medium", "hard"],
                description: "难度评估",
              },
            },
            required: [
              "knowledgePoints",
              "errorReason",
              "correctAnswer",
              "detailedExplanation",
              "studyAdvice",
              "difficulty",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        error: "AI分析返回内容为空",
      };
    }

    // @ts-ignore
    const analysis = JSON.parse(content);
    
    // 4. 保存分析结果到缓存
    await saveAnalysisToCache(contentHash, subject, grade, analysis);
    console.log('[ErrorAnalysis] 分析结果已缓存');

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    console.error("[ErrorAnalysis] AI分析失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI分析失败",
    };
  }
}

/**
 * 获取年级标签
 */
function getGradeLabel(grade: string): string {
  const gradeMap: Record<string, string> = {
    junior1: "初一",
    junior2: "初二",
    junior3: "初三",
    senior1: "高一",
    senior2: "高二",
    senior3: "高三",
  };
  return gradeMap[grade] || grade;
}

/**
 * 获取科目标签
 */
function getSubjectLabel(subject: string): string {
  const subjectMap: Record<string, string> = {
    chinese: "语文",
    math: "数学",
    english: "英语",
    physics: "物理",
    chemistry: "化学",
    biology: "生物",
    politics: "政治",
    history: "历史",
    geography: "地理",
  };
  return subjectMap[subject] || subject;
}
