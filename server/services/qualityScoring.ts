import { db } from "../db";
import { rawQuestions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * 质量评分维度
 */
interface QualityDimensions {
  completeness: number; // 完整性 0-100
  accuracy: number; // 准确性 0-100
  clarity: number; // 清晰度 0-100
  difficulty: number; // 难度适宜性 0-100
  formatting: number; // 格式规范性 0-100
}

/**
 * 评估试题完整性
 */
function assessCompleteness(content: string, hasImages: boolean): number {
  let score = 0;
  
  // 基础内容长度检查
  if (content.length >= 50) score += 30;
  else if (content.length >= 20) score += 15;
  
  // 检查是否有题干
  if (content.length > 10) score += 20;
  
  // 检查是否有答案
  if (content.includes('答案') || content.includes('【答】') || content.includes('解析')) {
    score += 30;
  }
  
  // 检查是否有选项 (对于选择题)
  const optionPattern = /[A-D][\.、:：]/g;
  const options = content.match(optionPattern);
  if (options && options.length >= 2) {
    score += 10;
  }
  
  // 如果有图片,加分
  if (hasImages) {
    score += 10;
  }
  
  return Math.min(score, 100);
}

/**
 * 评估试题准确性
 */
function assessAccuracy(content: string, ocrConfidence?: number): number {
  let score = 80; // 基础分
  
  // OCR置信度影响
  if (ocrConfidence) {
    const confidence = parseFloat(ocrConfidence.toString());
    if (confidence >= 0.9) score += 20;
    else if (confidence >= 0.7) score += 10;
    else if (confidence < 0.5) score -= 30;
  }
  
  // 检查乱码
  const garbledPattern = /[^\u4e00-\u9fa5a-zA-Z0-9\s\.,;:!?()（）。，；：！？]/g;
  const garbledChars = content.match(garbledPattern) || [];
  const garbledRatio = garbledChars.length / content.length;
  
  if (garbledRatio > 0.3) score -= 40;
  else if (garbledRatio > 0.1) score -= 20;
  
  return Math.max(0, Math.min(score, 100));
}

/**
 * 评估试题清晰度
 */
function assessClarity(content: string): number {
  let score = 70; // 基础分
  
  // 检查句子结构
  const sentences = content.split(/[。！？.!?]/);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
  
  // 句子长度适中加分
  if (avgSentenceLength >= 10 && avgSentenceLength <= 50) {
    score += 15;
  } else if (avgSentenceLength > 100) {
    score -= 20; // 句子过长,不够清晰
  }
  
  // 检查标点符号使用
  const punctuationPattern = /[，。！？、；：""''（）]/g;
  const punctuations = content.match(punctuationPattern) || [];
  if (punctuations.length > content.length * 0.05) {
    score += 10; // 标点使用合理
  }
  
  // 检查是否有明确的问题陈述
  if (content.includes('?') || content.includes('？') || content.includes('求') || content.includes('计算')) {
    score += 5;
  }
  
  return Math.min(score, 100);
}

/**
 * 评估格式规范性
 */
function assessFormatting(content: string): number {
  let score = 60; // 基础分
  
  // 检查段落结构
  const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
  if (paragraphs.length >= 2) {
    score += 15; // 有明确的段落划分
  }
  
  // 检查选项格式 (对于选择题)
  const optionPattern = /[A-D][\.、:：]\s*.+/g;
  const options = content.match(optionPattern);
  if (options && options.length >= 2) {
    score += 15; // 选项格式规范
  }
  
  // 检查数学公式格式
  if (content.includes('$') || content.includes('\\frac') || content.includes('\\sqrt')) {
    score += 5; // 包含LaTeX格式
  }
  
  // 检查过多的HTML标签
  const htmlTagPattern = /<[^>]+>/g;
  const htmlTags = content.match(htmlTagPattern) || [];
  if (htmlTags.length > 10) {
    score -= 20; // HTML标签过多,格式混乱
  }
  
  return Math.max(0, Math.min(score, 100));
}

/**
 * 使用AI评估难度适宜性
 */
async function assessDifficulty(
  content: string,
  expectedGrade: string,
  subject: string
): Promise<number> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个教育评估专家。请评估试题难度是否适合指定年级,返回0-100的分数。100分表示难度完全适宜,0分表示难度严重不适宜。"
        },
        {
          role: "user",
          content: `年级: ${expectedGrade}\n学科: ${subject}\n\n试题内容:\n${content}\n\n请评估这道题的难度适宜性。`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "difficulty_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number", description: "难度适宜性分数 0-100" },
              reason: { type: "string", description: "评分理由" }
            },
            required: ["score", "reason"],
            additionalProperties: false
          }
        }
      }
    });
    
    // @ts-ignore
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.score || 70;
  } catch (error) {
    console.error("难度评估失败:", error);
    return 70; // 默认分数
  }
}

/**
 * 计算综合质量分数
 */
export async function calculateQualityScore(questionId: number): Promise<{
  overallScore: number;
  dimensions: QualityDimensions;
  recommendations: string[];
}> {
  // 获取试题
  const [question] = await db
    .select()
    .from(rawQuestions)
    .where(eq(rawQuestions.id, questionId))
    .limit(1);
  
  if (!question) {
    throw new Error("试题不存在");
  }
  
  const content = question.ocrText || question.rawContent || "";
  const hasImages = question.imageUrls && Array.isArray(question.imageUrls) && question.imageUrls.length > 0;
  
  // 评估各个维度
  const completeness = assessCompleteness(content, hasImages);
  const accuracy = assessAccuracy(content, question.ocrConfidence ? parseFloat(question.ocrConfidence) : undefined);
  const clarity = assessClarity(content);
  const formatting = assessFormatting(content);
  
  // AI评估难度 (如果有年级和学科信息)
  let difficulty = 70;
  if (question.grade && question.subject) {
    difficulty = await assessDifficulty(content, question.grade, question.subject);
  }
  
  const dimensions: QualityDimensions = {
    completeness,
    accuracy,
    clarity,
    difficulty,
    formatting
  };
  
  // 计算加权总分
  const weights = {
    completeness: 0.25,
    accuracy: 0.30,
    clarity: 0.20,
    difficulty: 0.15,
    formatting: 0.10
  };
  
  const overallScore = Math.round(
    completeness * weights.completeness +
    accuracy * weights.accuracy +
    clarity * weights.clarity +
    difficulty * weights.difficulty +
    formatting * weights.formatting
  );
  
  // 生成改进建议
  const recommendations: string[] = [];
  
  if (completeness < 70) {
    recommendations.push("试题内容不够完整,建议补充题干、选项或答案解析");
  }
  if (accuracy < 70) {
    recommendations.push("试题准确性较低,可能存在OCR识别错误或乱码,建议人工校对");
  }
  if (clarity < 70) {
    recommendations.push("试题表述不够清晰,建议优化语言表达和句子结构");
  }
  if (difficulty < 60) {
    recommendations.push("试题难度可能不适合目标年级,建议调整或重新分类");
  }
  if (formatting < 60) {
    recommendations.push("试题格式不够规范,建议调整排版和格式");
  }
  
  // 更新数据库中的质量分数
  await db
    .update(rawQuestions)
    .set({ qualityScore: overallScore.toFixed(2) })
    .where(eq(rawQuestions.id, questionId));
  
  return {
    overallScore,
    dimensions,
    recommendations
  };
}

/**
 * 批量质量评分
 */
export async function batchQualityScoring(questionIds: number[]): Promise<{
  total: number;
  highQuality: number; // >= 80
  mediumQuality: number; // 60-79
  lowQuality: number; // < 60
  avgScore: number;
}> {
  let totalScore = 0;
  let highQuality = 0;
  let mediumQuality = 0;
  let lowQuality = 0;
  
  for (const questionId of questionIds) {
    try {
      const result = await calculateQualityScore(questionId);
      totalScore += result.overallScore;
      
      if (result.overallScore >= 80) {
        highQuality++;
      } else if (result.overallScore >= 60) {
        mediumQuality++;
      } else {
        lowQuality++;
      }
    } catch (error) {
      console.error(`评分试题 ${questionId} 失败:`, error);
      lowQuality++;
    }
  }
  
  return {
    total: questionIds.length,
    highQuality,
    mediumQuality,
    lowQuality,
    avgScore: questionIds.length > 0 ? Math.round(totalScore / questionIds.length) : 0
  };
}

/**
 * 获取质量分数分布
 */
export async function getQualityDistribution(): Promise<{
  excellent: number; // 90-100
  good: number; // 80-89
  fair: number; // 70-79
  poor: number; // 60-69
  veryPoor: number; // < 60
}> {
  const allQuestions = await db.select().from(rawQuestions);
  
  let excellent = 0;
  let good = 0;
  let fair = 0;
  let poor = 0;
  let veryPoor = 0;
  
  for (const question of allQuestions) {
    const score = question.qualityScore ? parseFloat(question.qualityScore) : 0;
    
    if (score >= 90) excellent++;
    else if (score >= 80) good++;
    else if (score >= 70) fair++;
    else if (score >= 60) poor++;
    else veryPoor++;
  }
  
  return { excellent, good, fair, poor, veryPoor };
}
