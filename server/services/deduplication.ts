import { db } from "../db";
import { 
  questionSimilarities, 
  deduplicationRecords, 
  noiseDetectionRecords,
  deduplicationConfig,
  rawQuestions,
  type NewQuestionSimilarity,
  type NewDeduplicationRecord,
  type NewNoiseDetectionRecord
} from "../../drizzle/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * 计算两个文本之间的余弦相似度
 */
function cosineSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const allWords = Array.from(new Set([...words1, ...words2]));
  const vector1 = allWords.map(word => words1.filter(w => w === word).length);
  const vector2 = allWords.map(word => words2.filter(w => w === word).length);
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return (dotProduct / (magnitude1 * magnitude2)) * 100;
}

/**
 * 计算Jaccard相似度
 */
function jaccardSimilarity(text1: string, text2: string): number {
  const set1 = new Set(text1.toLowerCase().split(/\s+/));
  const set2 = new Set(text2.toLowerCase().split(/\s+/));
  
  // @ts-ignore
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  // @ts-ignore
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return (intersection.size / union.size) * 100;
}

/**
 * 计算Levenshtein距离相似度
 */
function levenshteinSimilarity(text1: string, text2: string): number {
  const len1 = text1.length;
  const len2 = text2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = text1[i - 1] === text2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 100;
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * 使用AI计算语义相似度
 */
async function semanticSimilarity(text1: string, text2: string): Promise<number> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个专业的试题相似度分析助手。请分析两道试题的语义相似度,返回0-100的分数。只返回数字,不要其他内容。"
        },
        {
          role: "user",
          content: `试题1: ${text1}\n\n试题2: ${text2}\n\n请评估这两道试题的语义相似度(0-100):`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "similarity_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number", description: "相似度分数 0-100" },
              reason: { type: "string", description: "相似度判断理由" }
            },
            required: ["score", "reason"],
            additionalProperties: false
          }
        }
      }
    });
    
    // @ts-ignore
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.score || 0;
  } catch (error) {
    console.error("语义相似度计算失败:", error);
    return 0;
  }
}

/**
 * 计算试题相似度
 */
export async function calculateQuestionSimilarity(
  question1Id: number,
  question2Id: number,
  method: 'cosine' | 'jaccard' | 'levenshtein' | 'semantic' = 'cosine'
): Promise<number> {
  // 获取两道试题
  const [q1] = await db.select().from(rawQuestions).where(eq(rawQuestions.id, question1Id)).limit(1);
  const [q2] = await db.select().from(rawQuestions).where(eq(rawQuestions.id, question2Id)).limit(1);
  
  if (!q1 || !q2) {
    throw new Error("试题不存在");
  }
  
  const text1 = q1.ocrText || q1.rawContent || "";
  const text2 = q2.ocrText || q2.rawContent || "";
  
  let textSimilarity = 0;
  let comparisonDetails: any = { method };
  
  switch (method) {
    case 'cosine':
      textSimilarity = cosineSimilarity(text1, text2);
      break;
    case 'jaccard':
      textSimilarity = jaccardSimilarity(text1, text2);
      break;
    case 'levenshtein':
      textSimilarity = levenshteinSimilarity(text1, text2);
      break;
    case 'semantic':
      textSimilarity = await semanticSimilarity(text1, text2);
      break;
  }
  
  // 保存相似度记录
  const similarity: NewQuestionSimilarity = {
    question1Id,
    question2Id,
    textSimilarity: textSimilarity.toFixed(2),
    overallSimilarity: textSimilarity.toFixed(2),
    similarityMethod: method,
    comparisonDetails
  };
  
  await db.insert(questionSimilarities).values(similarity);
  
  return textSimilarity;
}

/**
 * 批量查重
 */
export async function batchDeduplication(
  questionIds: number[],
  threshold: number = 90
): Promise<{
  duplicateGroups: Array<{ original: number; duplicates: number[] }>;
  uniqueQuestions: number[];
}> {
  const duplicateGroups: Array<{ original: number; duplicates: number[] }> = [];
  const processed = new Set<number>();
  const uniqueQuestions: number[] = [];
  
  for (let i = 0; i < questionIds.length; i++) {
    const q1Id = questionIds[i];
    
    if (processed.has(q1Id)) continue;
    
    const duplicates: number[] = [];
    
    for (let j = i + 1; j < questionIds.length; j++) {
      const q2Id = questionIds[j];
      
      if (processed.has(q2Id)) continue;
      
      const similarity = await calculateQuestionSimilarity(q1Id, q2Id, 'cosine');
      
      if (similarity >= threshold) {
        duplicates.push(q2Id);
        processed.add(q2Id);
      }
    }
    
    if (duplicates.length > 0) {
      duplicateGroups.push({ original: q1Id, duplicates });
      processed.add(q1Id);
    } else {
      uniqueQuestions.push(q1Id);
    }
  }
  
  return { duplicateGroups, uniqueQuestions };
}

/**
 * 噪声检测
 */
export async function detectNoise(questionId: number): Promise<{
  noiseTypes: string[];
  noiseScore: number;
  details: any;
}> {
  const [question] = await db.select().from(rawQuestions).where(eq(rawQuestions.id, questionId)).limit(1);
  
  if (!question) {
    throw new Error("试题不存在");
  }
  
  const noiseTypes: string[] = [];
  const details: any = {};
  let noiseScore = 0;
  
  const content = question.ocrText || question.rawContent || "";
  
  // 检测不完整
  if (content.length < 20) {
    noiseTypes.push('incomplete');
    noiseScore += 30;
    details.incomplete = "内容过短";
  }
  
  // 检测乱码
  const garbledRatio = (content.match(/[^\u4e00-\u9fa5a-zA-Z0-9\s\.,;:!?()（）。，；：！？]/g) || []).length / content.length;
  if (garbledRatio > 0.3) {
    noiseTypes.push('garbled');
    noiseScore += 40;
    details.garbled = `乱码比例: ${(garbledRatio * 100).toFixed(2)}%`;
  }
  
  // 检测缺少答案
  if (!content.includes('答案') && !content.includes('解析') && !content.includes('【答】')) {
    noiseTypes.push('missing_answer');
    noiseScore += 20;
    details.missing_answer = "未检测到答案";
  }
  
  // 检测低质量图片
  if (question.ocrConfidence && parseFloat(question.ocrConfidence) < 0.5) {
    noiseTypes.push('low_quality_image');
    noiseScore += 25;
    details.low_quality_image = `OCR置信度: ${question.ocrConfidence}`;
  }
  
  // 保存噪声检测记录
  for (const noiseType of noiseTypes) {
    const record: NewNoiseDetectionRecord = {
      questionId,
      noiseType: noiseType as any,
      noiseScore: noiseScore.toFixed(2),
      detectionDetails: details,
      isFiltered: noiseScore >= 60 ? 1 : 0
    };
    
    await db.insert(noiseDetectionRecords).values(record);
  }
  
  return { noiseTypes, noiseScore, details };
}

/**
 * 获取查重配置
 */
export async function getDeduplicationConfig() {
  const [config] = await db
    .select()
    .from(deduplicationConfig)
    .where(eq(deduplicationConfig.isActive, 1))
    .orderBy(desc(deduplicationConfig.createdAt))
    .limit(1);
  
  return config || null;
}

/**
 * 更新查重配置
 */
export async function updateDeduplicationConfig(configId: number, updates: any) {
  await db
    .update(deduplicationConfig)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(deduplicationConfig.id, configId));
}
