import { invokeLLM } from "./_core/llm";

/**
 * AI错题分析服务
 */

export interface AnalysisResult {
  success: boolean;
  errorAnalysis?: string; // 错误点分析
  correctAnswer?: string; // 正确答案
  detailedExplanation?: string; // 详细解析
  knowledgePoints?: string[]; // 涉及的知识点
  difficulty?: "easy" | "medium" | "hard"; // 难度评估
  error?: string;
}

/**
 * 分析错题，识别错误点、知识点和提供详细解析
 */
export async function analyzeErrorQuestion(
  questionContent: string,
  subject: string,
  grade: string,
  userAnswer?: string
): Promise<AnalysisResult> {
  try {
    const gradeMap: Record<string, string> = {
      junior1: "初一",
      junior2: "初二",
      junior3: "初三",
      senior1: "高一",
      senior2: "高二",
      senior3: "高三",
    };

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

    const gradeText = gradeMap[grade] || grade;
    const subjectText = subjectMap[subject] || subject;

    const systemPrompt = `你是一位经验丰富的${gradeText}${subjectText}老师，专门帮助深圳的初高中学生分析错题。请对学生的错题进行深入分析，帮助学生理解错误原因和相关知识点。`;

    const userPrompt = `请分析以下${gradeText}${subjectText}错题：

题目内容：
${questionContent}

${userAnswer ? `学生的错误答案：\n${userAnswer}\n` : ""}

请提供以下分析（使用JSON格式）：
1. errorAnalysis: 详细分析学生的错误点和错误原因
2. correctAnswer: 正确答案
3. detailedExplanation: 详细的解题思路和知识点讲解
4. knowledgePoints: 涉及的知识点列表（数组格式，每个知识点简洁明确）
5. difficulty: 题目难度评估（easy/medium/hard）

请以JSON格式返回，确保格式正确。`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "error_question_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              errorAnalysis: {
                type: "string",
                description: "学生错误点的详细分析"
              },
              correctAnswer: {
                type: "string",
                description: "题目的正确答案"
              },
              detailedExplanation: {
                type: "string",
                description: "详细的解题思路和知识点讲解"
              },
              knowledgePoints: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "涉及的知识点列表"
              },
              difficulty: {
                type: "string",
                enum: ["easy", "medium", "hard"],
                description: "题目难度评估"
              }
            },
            required: ["errorAnalysis", "correctAnswer", "detailedExplanation", "knowledgePoints", "difficulty"],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0]?.message?.content;
    const resultText = typeof messageContent === 'string' ? messageContent : "";

    if (!resultText) {
      return {
        success: false,
        error: "AI分析返回空结果"
      };
    }

    const analysisData = JSON.parse(resultText);

    return {
      success: true,
      errorAnalysis: analysisData.errorAnalysis,
      correctAnswer: analysisData.correctAnswer,
      detailedExplanation: analysisData.detailedExplanation,
      knowledgePoints: analysisData.knowledgePoints,
      difficulty: analysisData.difficulty,
    };
  } catch (error) {
    console.error("[AI Analysis] 分析失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI分析服务异常"
    };
  }
}

/**
 * 提取和标准化知识点
 * 将AI识别的知识点与数据库中的标准知识点进行匹配
 */
export async function matchKnowledgePoints(
  aiKnowledgePoints: string[],
  subject: string,
  grade: string,
  standardKnowledgePoints: Array<{ id: number; name: string }>
): Promise<number[]> {
  try {
    // 使用AI进行智能匹配
    const systemPrompt = `你是一个知识点匹配专家。请将AI识别出的知识点与标准知识点库进行匹配，返回最相关的知识点ID列表。`;

    const userPrompt = `AI识别的知识点：
${aiKnowledgePoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

标准知识点库：
${standardKnowledgePoints.map(kp => `ID: ${kp.id}, 名称: ${kp.name}`).join('\n')}

请返回匹配的知识点ID列表（JSON数组格式，只包含ID数字）。如果某个AI识别的知识点在标准库中找不到合适的匹配，可以忽略。`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "knowledge_point_matching",
          strict: true,
          schema: {
            type: "object",
            properties: {
              matchedIds: {
                type: "array",
                items: {
                  type: "number"
                },
                description: "匹配的知识点ID列表"
              }
            },
            required: ["matchedIds"],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0]?.message?.content;
    const resultText = typeof messageContent === 'string' ? messageContent : "";

    if (!resultText) {
      return [];
    }

    const matchResult = JSON.parse(resultText);
    return matchResult.matchedIds || [];
  } catch (error) {
    console.error("[Knowledge Point Matching] 匹配失败:", error);
    // 如果AI匹配失败，使用简单的字符串匹配作为后备方案
    const matchedIds: number[] = [];
    for (const aiKp of aiKnowledgePoints) {
      const matched = standardKnowledgePoints.find(stdKp => 
        stdKp.name.includes(aiKp) || aiKp.includes(stdKp.name)
      );
      if (matched && !matchedIds.includes(matched.id)) {
        matchedIds.push(matched.id);
      }
    }
    return matchedIds;
  }
}

/**
 * 详细分析结果接口
 */
export interface DetailedAnalysisResult {
  success: boolean;
  analysis?: {
    // 基础分析
    errorType: string;
    errorAnalysis: string;
    difficulty: "easy" | "medium" | "hard";
    
    // 深度分析
    keyPoints: string[];
    keyPointsExplanation: string;
    commonMistakes: string[];
    mistakesAnalysis: string;
    
    // 知识点关联
    knowledgePoints: Array<{
      name: string;
      category: string;
      importance: "high" | "medium" | "low";
    }>;
    knowledgeGraph: string;
    
    // 解题指导
    solvingSteps: string[];
    solvingStrategy: string;
    tips: string[];
    
    // 学习建议
    studyAdvice: string;
    practiceDirection: string;
  };
  error?: string;
}

/**
 * 深度分析错题（增强版）
 */
export async function analyzeQuestionDetailed(
  questionContent: string,
  userAnswer: string,
  correctAnswer: string,
  subject: string,
  grade: string
): Promise<DetailedAnalysisResult> {
  try {
    const gradeMap: Record<string, string> = {
      junior1: "初一",
      junior2: "初二",
      junior3: "初三",
      senior1: "高一",
      senior2: "高二",
      senior3: "高三",
    };

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

    const gradeText = gradeMap[grade] || grade;
    const subjectText = subjectMap[subject] || subject;

    const systemPrompt = `你是一位资深的${gradeText}${subjectText}教师，拥有20年教学经验，擅长深入分析学生的错题，找出根本原因，并提供针对性的学习建议。`;

    const userPrompt = `请对以下错题进行深入、全面的分析：

**题目内容：**
${questionContent}

**学生答案：**
${userAnswer}

**正确答案：**
${correctAnswer}

请从以下维度进行详细分析并以JSON格式返回。`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "detailed_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              errorType: { type: "string" },
              errorAnalysis: { type: "string" },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              keyPoints: { type: "array", items: { type: "string" } },
              keyPointsExplanation: { type: "string" },
              commonMistakes: { type: "array", items: { type: "string" } },
              mistakesAnalysis: { type: "string" },
              knowledgePoints: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    category: { type: "string" },
                    importance: { type: "string", enum: ["high", "medium", "low"] }
                  },
                  required: ["name", "category", "importance"],
                  additionalProperties: false
                }
              },
              knowledgeGraph: { type: "string" },
              solvingSteps: { type: "array", items: { type: "string" } },
              solvingStrategy: { type: "string" },
              tips: { type: "array", items: { type: "string" } },
              studyAdvice: { type: "string" },
              practiceDirection: { type: "string" }
            },
            required: ["errorType", "errorAnalysis", "difficulty", "keyPoints", "keyPointsExplanation", "commonMistakes", "mistakesAnalysis", "knowledgePoints", "knowledgeGraph", "solvingSteps", "solvingStrategy", "tips", "studyAdvice", "practiceDirection"],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0]?.message?.content;
    const resultText = typeof messageContent === 'string' ? messageContent : "";

    if (!resultText) {
      return { success: false, error: "AI分析返回空结果" };
    }

    const analysisData = JSON.parse(resultText);
    return { success: true, analysis: analysisData };
  } catch (error) {
    console.error("[AI Analysis] 深度分析失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI分析服务异常"
    };
  }
}
