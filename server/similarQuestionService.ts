import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { errorQuestions } from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { eq, and, ne, inArray } from "drizzle-orm";

interface KnowledgePoint {
  name: string;
  category: string;
  difficulty: string;
}

interface SimilarQuestion {
  id: number;
  title: string;
  content: string;
  subject: string;
  difficulty: string;
  knowledgePointIds: number[];
  similarity: number;
  reason: string;
}

/**
 * 使用AI分析错题的知识点
 */
export async function analyzeKnowledgePoints(
  questionContent: string,
  subject: string,
  grade: string
): Promise<KnowledgePoint[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system" as const,
          content: `你是一位资深的${subject}学科教师。请分析题目涉及的知识点，返回JSON格式的知识点列表。
每个知识点包含：name（知识点名称）、category（所属章节/类别）、difficulty（难度：easy/medium/hard）。`,
        },
        {
          role: "user" as const,
          content: `请分析以下${grade}${subject}题目的知识点：\n\n${questionContent}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "knowledge_points",
          strict: true,
          schema: {
            type: "object",
            properties: {
              knowledgePoints: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "知识点名称" },
                    category: { type: "string", description: "所属章节或类别" },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                      description: "难度等级",
                    },
                  },
                  required: ["name", "category", "difficulty"],
                  additionalProperties: false,
                },
              },
            },
            required: ["knowledgePoints"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0].message.content;
    const contentString = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
    const result = JSON.parse(contentString || "{}");
    return result.knowledgePoints || [];
  } catch (error) {
    console.error("AI知识点分析失败:", error);
    return [];
  }
}

/**
 * 计算两个题目的相似度
 */
async function calculateSimilarity(
  sourceQuestion: { content: string; knowledgePoints: string[]; subject: string },
  targetQuestion: { content: string; knowledgePoints: string[]; subject: string }
): Promise<{ similarity: number; reason: string }> {
  try {
    // 如果学科不同，相似度为0
    if (sourceQuestion.subject !== targetQuestion.subject) {
      return { similarity: 0, reason: "学科不同" };
    }

    // 计算知识点重叠度
    const sourceKPs = new Set(sourceQuestion.knowledgePoints);
    const targetKPs = new Set(targetQuestion.knowledgePoints);
    const sourceArray = Array.from(sourceKPs);
    const targetArray = Array.from(targetKPs);
    const intersection = new Set(sourceArray.filter((x) => targetKPs.has(x)));
    const union = new Set([...sourceArray, ...targetArray]);
    
    const kpSimilarity = union.size > 0 ? intersection.size / union.size : 0;

    // 如果知识点相似度很低，直接返回
    if (kpSimilarity < 0.3) {
      return { similarity: kpSimilarity * 100, reason: "知识点重叠较少" };
    }

    // 使用AI进行深度相似度分析
    const response = await invokeLLM({
      messages: [
        {
          role: "system" as const,
          content: "你是一位教育专家。请分析两道题目的相似度（0-100分），并说明相似的原因。",
        },
        {
          role: "user" as const,
          content: `题目1：${sourceQuestion.content}\n\n题目2：${targetQuestion.content}\n\n请分析这两道题的相似度。`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "similarity_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              similarity: {
                type: "number",
                description: "相似度分数（0-100）",
              },
              reason: {
                type: "string",
                description: "相似的原因说明",
              },
            },
            required: ["similarity", "reason"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0].message.content;
    const contentString = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
    const result = JSON.parse(contentString || "{}");
    return {
      similarity: result.similarity || kpSimilarity * 100,
      reason: result.reason || "知识点相似",
    };
  } catch (error) {
    console.error("相似度计算失败:", error);
    // 降级到基于知识点的简单计算
    const sourceKPs = new Set(sourceQuestion.knowledgePoints);
    const targetKPs = new Set(targetQuestion.knowledgePoints);
    const sourceArray = Array.from(sourceKPs);
    const targetArray = Array.from(targetKPs);
    const intersection = new Set(sourceArray.filter((x) => targetKPs.has(x)));
    const union = new Set([...sourceArray, ...targetArray]);
    const similarity = union.size > 0 ? (intersection.size / union.size) * 100 : 0;
    
    return {
      similarity,
      reason: intersection.size > 0 ? `共同知识点：${Array.from(intersection).join("、")}` : "知识点不同",
    };
  }
}

/**
 * 为指定错题推荐相似题目
 */
export async function recommendSimilarQuestions(
  errorQuestionId: number,
  userId: number,
  limit: number = 5
): Promise<SimilarQuestion[]> {
  try {
    // 获取源错题
    const db = await getDb();
    if (!db) return [];
    
    const sourceQuestions = await db.select().from(errorQuestions).where(
      and(
        eq(errorQuestions.id, errorQuestionId),
        eq(errorQuestions.userId, userId)
      )
    ).limit(1);
    
    const sourceQuestion = sourceQuestions[0];
    if (!sourceQuestion) {
      return [];
    }
    
    // 获取候选题目（同学科、不同题目）
    const candidateQuestions = await db.select().from(errorQuestions).where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.subject, sourceQuestion.subject),
        ne(errorQuestions.id, errorQuestionId)
      )
    ).limit(20);
    
    /*
    const sourceQuestion = await db.query.errorQuestions.findFirst({
    */

    if (candidateQuestions.length === 0) {
      return [];
    }

    // 计算每个候选题目的相似度
    const similarityResults: SimilarQuestion[] = await Promise.all(
      candidateQuestions.map(async (candidate: typeof candidateQuestions[0]): Promise<SimilarQuestion> => {
        const { similarity, reason } = await calculateSimilarity(
          {
            content: sourceQuestion.content,
            knowledgePoints: (sourceQuestion.knowledgePointIds || []).map(String),
            subject: sourceQuestion.subject,
          },
          {
            content: candidate.content,
            knowledgePoints: (candidate.knowledgePointIds || []).map(String),
            subject: candidate.subject,
          }
        );

        return {
          id: candidate.id,
          title: candidate.title,
          content: candidate.content,
          subject: candidate.subject,
          difficulty: candidate.difficulty || "medium",
          knowledgePointIds: candidate.knowledgePointIds || [],
          similarity,
          reason,
        };
      })
    );

    // 按相似度排序并返回前N个
    return similarityResults
      .filter((item: SimilarQuestion) => item.similarity >= 30) // 过滤掉相似度太低的
      .sort((a: SimilarQuestion, b: SimilarQuestion) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error("推荐相似题目失败:", error);
    return [];
  }
}

/**
 * 批量更新错题的知识点
 */
export async function updateQuestionKnowledgePoints(
  questionId: number,
  userId: number
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    const questions = await db.select().from(errorQuestions).where(
      and(
        eq(errorQuestions.id, questionId),
        eq(errorQuestions.userId, userId)
      )
    ).limit(1);
    
    const question = questions[0];
    /*
    const question = await db.query.errorQuestions.findFirst({
    */

    if (!question) {
      return false;
    }

    // 如果已经有知识点，跳过
    if (question.knowledgePointIds && question.knowledgePointIds.length > 0) {
      return true;
    }

    // 分析知识点
    const kps = await analyzeKnowledgePoints(
      question.content,
      question.subject,
      question.grade
    );

    // 注意：这里只是示例，实际应该将知识点先存入knowledgePoints表，然后关联ID
    // 暂时跳过更新，因为需要先实现知识点表的逻辑
    console.log("分析到的知识点:", kps);

    return true;
  } catch (error) {
    console.error("更新知识点失败:", error);
    return false;
  }
}
