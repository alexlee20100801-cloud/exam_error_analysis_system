import { invokeLLM } from "../_core/llm";
import { db } from "../db";
import { questions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * AI难度分析服务
 * 使用LLM对题目进行难度评估和分析
 */

export interface DifficultyAnalysisResult {
  questionId: number;
  estimatedDifficulty: "easy" | "medium" | "hard";
  difficultyScore: number; // 0-100
  analysisReason: string;
  keyPoints: string[];
  requiredKnowledge: string[];
  estimatedSolveTime: number; // 秒
  commonMistakes: string[];
  confidence: number; // 0-1
  timestamp: Date;
}

/**
 * 分析单个题目的难度
 */
export async function analyzeDifficulty(
  questionId: number,
  questionContent: string,
  questionType?: string,
  subject?: string
): Promise<DifficultyAnalysisResult> {
  const prompt = buildDifficultyAnalysisPrompt(
    questionContent,
    questionType,
    subject
  );

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是一位经验丰富的教育专家，擅长评估学生考试题目的难度。
你需要根据题目内容、类型和学科，给出准确的难度评估。
请以JSON格式返回分析结果，包含以下字段：
- difficulty: "easy" | "medium" | "hard"
- difficultyScore: 0-100的数字
- reason: 难度评估的原因（中文）
- keyPoints: 题目涉及的关键知识点数组
- requiredKnowledge: 解题所需的知识点数组
- estimatedSolveTime: 估计解题时间（秒）
- commonMistakes: 常见错误数组
- confidence: 评估的置信度（0-1）`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "difficulty_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            difficulty: {
              type: "string",
              enum: ["easy", "medium", "hard"],
              description: "题目难度等级",
            },
            difficultyScore: {
              type: "number",
              description: "难度分数（0-100）",
              minimum: 0,
              maximum: 100,
            },
            reason: {
              type: "string",
              description: "难度评估原因",
            },
            keyPoints: {
              type: "array",
              items: { type: "string" },
              description: "关键知识点",
            },
            requiredKnowledge: {
              type: "array",
              items: { type: "string" },
              description: "所需知识点",
            },
            estimatedSolveTime: {
              type: "number",
              description: "估计解题时间（秒）",
            },
            commonMistakes: {
              type: "array",
              items: { type: "string" },
              description: "常见错误",
            },
            confidence: {
              type: "number",
              description: "置信度（0-1）",
              minimum: 0,
              maximum: 1,
            },
          },
          required: [
            "difficulty",
            "difficultyScore",
            "reason",
            "keyPoints",
            "requiredKnowledge",
            "estimatedSolveTime",
            "commonMistakes",
            "confidence",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM返回空响应");
  }

  const analysisData = JSON.parse(content);

  const result: DifficultyAnalysisResult = {
    questionId,
    estimatedDifficulty: analysisData.difficulty,
    difficultyScore: analysisData.difficultyScore,
    analysisReason: analysisData.reason,
    keyPoints: analysisData.keyPoints,
    requiredKnowledge: analysisData.requiredKnowledge,
    estimatedSolveTime: analysisData.estimatedSolveTime,
    commonMistakes: analysisData.commonMistakes,
    confidence: analysisData.confidence,
    timestamp: new Date(),
  };

  return result;
}

/**
 * 批量分析题目难度
 */
export async function analyzeDifficultyBatch(
  questions_data: Array<{
    id: number;
    content: string;
    type?: string;
    subject?: string;
  }>
): Promise<DifficultyAnalysisResult[]> {
  const results: DifficultyAnalysisResult[] = [];

  for (const q of questions_data) {
    try {
      const result = await analyzeDifficulty(q.id, q.content, q.type, q.subject);
      results.push(result);
      // 添加延迟以避免API速率限制
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`分析题目 ${q.id} 失败:`, error);
      // 继续处理其他题目
    }
  }

  return results;
}

/**
 * 更新数据库中题目的难度信息
 */
export async function updateQuestionDifficulty(
  questionId: number,
  analysisResult: DifficultyAnalysisResult
) {
  await db
    .update(questions)
    .set({
      difficulty: analysisResult.estimatedDifficulty,
      difficultyScore: analysisResult.difficultyScore,
      analysisMetadata: JSON.stringify({
        reason: analysisResult.analysisReason,
        keyPoints: analysisResult.keyPoints,
        requiredKnowledge: analysisResult.requiredKnowledge,
        estimatedSolveTime: analysisResult.estimatedSolveTime,
        commonMistakes: analysisResult.commonMistakes,
        confidence: analysisResult.confidence,
        analyzedAt: analysisResult.timestamp.toISOString(),
      }),
    })
    .where(eq(questions.id, questionId));
}

/**
 * 获取题目的难度分析历史
 */
export async function getDifficultyAnalysisHistory(questionId: number) {
  const question = await db
    .select({
      id: questions.id,
      difficulty: questions.difficulty,
      difficultyScore: questions.difficultyScore,
      analysisMetadata: questions.analysisMetadata,
    })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!question || !question[0]) {
    return null;
  }

  const q = question[0];
  const metadata = q.analysisMetadata ? JSON.parse(q.analysisMetadata) : null;

  return {
    questionId: q.id,
    currentDifficulty: q.difficulty,
    difficultyScore: q.difficultyScore,
    analysisMetadata: metadata,
  };
}

/**
 * 获取难度统计信息
 */
export async function getDifficultyStatistics(
  subject?: string,
  grade?: string
) {
  const conditions = [];
  if (subject) {
    conditions.push(sql`subject = ${subject}`);
  }
  if (grade) {
    conditions.push(sql`grade = ${grade}`);
  }

  const whereClause =
    conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const stats = await db.execute(sql`
    SELECT 
      difficulty,
      COUNT(*) as count,
      AVG(difficultyScore) as avgScore,
      MIN(difficultyScore) as minScore,
      MAX(difficultyScore) as maxScore
    FROM questions
    ${whereClause}
    GROUP BY difficulty
  `);

  return stats.rows || [];
}

/**
 * 构建难度分析提示词
 */
function buildDifficultyAnalysisPrompt(
  questionContent: string,
  questionType?: string,
  subject?: string
): string {
  let prompt = `请分析以下${subject || ""}题目的难度：\n\n`;

  if (questionType) {
    prompt += `题目类型：${questionType}\n`;
  }

  prompt += `题目内容：\n${questionContent}\n\n`;

  prompt += `请考虑以下因素进行难度评估：
1. 题目涉及的知识点数量和复杂度
2. 解题所需的逻辑推理能力
3. 计算复杂度（如果适用）
4. 需要的背景知识
5. 常见的解题陷阱
6. 与同类题目相比的相对难度

请提供详细的分析和建议。`;

  return prompt;
}

/**
 * 批量更新题目难度（基于分析结果）
 */
export async function batchUpdateDifficulty(
  analysisResults: DifficultyAnalysisResult[]
) {
  for (const result of analysisResults) {
    try {
      await updateQuestionDifficulty(result.questionId, result);
    } catch (error) {
      console.error(`更新题目 ${result.questionId} 难度失败:`, error);
    }
  }
}

/**
 * 获取需要重新分析的题目列表
 * （难度信息缺失或过期的题目）
 */
export async function getQuestionsNeedingAnalysis(
  limit: number = 100,
  maxAgeHours: number = 24 * 30 // 默认30天
) {
  const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  const results = await db.execute(sql`
    SELECT 
      id,
      content,
      type,
      subject,
      grade
    FROM questions
    WHERE 
      (difficulty IS NULL OR difficulty = 'unknown')
      OR (analysisMetadata IS NULL)
      OR (JSON_EXTRACT(analysisMetadata, '$.analyzedAt') < ${cutoffDate.toISOString()})
    LIMIT ${limit}
  `);

  return results.rows || [];
}
