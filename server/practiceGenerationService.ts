import { invokeLLM } from "./_core/llm";

/**
 * AI练习题生成服务
 */

export interface GeneratedQuestion {
  title: string;
  content: string;
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface PracticeGenerationResult {
  success: boolean;
  questions?: GeneratedQuestion[];
  error?: string;
}

/**
 * 根据知识点生成针对性练习题
 */
export async function generatePracticeQuestions(
  knowledgePoints: string[],
  subject: string,
  grade: string,
  difficulty: "easy" | "medium" | "hard",
  count = 5
): Promise<PracticeGenerationResult> {
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

    const difficultyMap: Record<string, string> = {
      easy: "简单",
      medium: "中等",
      hard: "困难",
    };

    const gradeText = gradeMap[grade] || grade;
    const subjectText = subjectMap[subject] || subject;
    const difficultyText = difficultyMap[difficulty] || difficulty;

    const systemPrompt = `你是一位经验丰富的${gradeText}${subjectText}教师，擅长根据学生的薄弱知识点设计针对性练习题。你的目标是帮助学生通过举一反三的练习，彻底掌握相关知识点。`;

    const userPrompt = `请根据以下知识点，生成${count}道${difficultyText}难度的${gradeText}${subjectText}练习题：

知识点：
${knowledgePoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

要求：
1. 题目要有针对性，紧扣上述知识点
2. 难度为${difficultyText}，适合${gradeText}学生
3. 题目类型多样化（选择题、填空题、解答题等）
4. 每道题都要提供详细的答案和解析
5. 题目之间要有梯度，帮助学生循序渐进

请以JSON数组格式返回，每道题包含：
- title: 题目简短标题
- content: 完整题目内容（使用markdown格式）
- answer: 正确答案
- explanation: 详细解析
- difficulty: 难度等级（easy/medium/hard）`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "practice_questions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description: "题目简短标题"
                    },
                    content: {
                      type: "string",
                      description: "完整题目内容"
                    },
                    answer: {
                      type: "string",
                      description: "正确答案"
                    },
                    explanation: {
                      type: "string",
                      description: "详细解析"
                    },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                      description: "难度等级"
                    }
                  },
                  required: ["title", "content", "answer", "explanation", "difficulty"],
                  additionalProperties: false
                },
                description: "生成的练习题列表"
              }
            },
            required: ["questions"],
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
        error: "AI生成返回空结果"
      };
    }

    const generatedData = JSON.parse(resultText);

    if (!generatedData.questions || generatedData.questions.length === 0) {
      return {
        success: false,
        error: "未能生成练习题"
      };
    }

    return {
      success: true,
      questions: generatedData.questions,
    };
  } catch (error) {
    console.error("[Practice Generation] 生成失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI生成服务异常"
    };
  }
}

/**
 * 根据错题生成相似练习题
 */
export async function generateSimilarQuestions(
  originalQuestion: string,
  subject: string,
  grade: string,
  knowledgePoints: string[],
  count = 3
): Promise<PracticeGenerationResult> {
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

    const systemPrompt = `你是一位经验丰富的${gradeText}${subjectText}教师，擅长设计举一反三的练习题。`;

    const userPrompt = `学生在以下题目上出错了：

${originalQuestion}

涉及的知识点：
${knowledgePoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

请生成${count}道相似的练习题，帮助学生巩固这些知识点。要求：
1. 题目类型和考查方式与原题相似
2. 难度与原题相当或略有提升
3. 紧扣相同的知识点
4. 每道题都要提供详细的答案和解析

请以JSON数组格式返回。`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "similar_questions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description: "题目简短标题"
                    },
                    content: {
                      type: "string",
                      description: "完整题目内容"
                    },
                    answer: {
                      type: "string",
                      description: "正确答案"
                    },
                    explanation: {
                      type: "string",
                      description: "详细解析"
                    },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                      description: "难度等级"
                    }
                  },
                  required: ["title", "content", "answer", "explanation", "difficulty"],
                  additionalProperties: false
                }
              }
            },
            required: ["questions"],
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
        error: "AI生成返回空结果"
      };
    }

    const generatedData = JSON.parse(resultText);

    return {
      success: true,
      questions: generatedData.questions || [],
    };
  } catch (error) {
    console.error("[Similar Questions Generation] 生成失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI生成服务异常"
    };
  }
}
