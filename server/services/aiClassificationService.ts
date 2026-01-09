import { db } from "../db";
import { questionsDb, questionTags, questionQuality } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ==================== AI分类服务 ====================
export class AIClassificationService {
  /**
   * 对题目进行AI智能分类
   */
  async classifyQuestion(questionId: number) {
    // 获取题目信息
    const [question] = await db
      .select()
      .from(questionsDb)
      .where(eq(questionsDb.id, questionId));

    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // 如果已经分类过，跳过
    if (question.aiClassified === 1) {
      console.log(`Question ${questionId} already classified`);
      return;
    }

    try {
      // 调用LLM进行分类
      const classification = await this.performAIClassification(question);

      // 更新题目的分类信息
      await db.update(questionsDb)
        .set({
          region: classification.region,
          grade: classification.grade,
          subject: classification.subject,
          knowledgePoints: classification.knowledgePoints,
          questionType: classification.questionType,
          difficulty: classification.difficulty,
          difficultyScore: classification.difficultyScore,
          aiClassified: 1,
          aiConfidence: classification.confidence,
          // @ts-ignore
          aiClassifiedAt: new Date().toISOString(),
        })
        .where(eq(questionsDb.id, questionId));

      // 插入分类标签
      await this.insertClassificationTags(questionId, classification);

      // 评估题目质量
      await this.assessQuestionQuality(questionId);

      console.log(`Question ${questionId} classified successfully`);
    } catch (error) {
      console.error(`Failed to classify question ${questionId}:`, error);
      throw error;
    }
  }

  /**
   * 批量分类未分类的题目
   */
  async classifyPendingQuestions(limit = 100) {
    const questions = await db
      .select()
      .from(questionsDb)
      .where(eq(questionsDb.aiClassified, 0))
      .limit(limit);

    console.log(`Found ${questions.length} questions to classify`);

    for (const question of questions) {
      try {
        await this.classifyQuestion(question.id);
      } catch (error) {
        console.error(`Failed to classify question ${question.id}:`, error);
        // 继续处理下一个
      }
    }
  }

  /**
   * 执行AI分类
   */
  private async performAIClassification(question: any) {
    const prompt = `
你是一个专业的教育题目分类专家。请分析以下题目并提供详细的分类信息。

题目标题：${question.title || "无"}
题目内容：${question.content}
题目答案：${question.answer || "无"}
题目解析：${question.explanation || "无"}

请以JSON格式返回以下信息：
1. region: 地区（如：深圳、广州、北京等，如果无法判断则返回null）
2. grade: 年级（grade7-grade12之一）
3. subject: 学科（chinese/math/english/physics/chemistry/biology/politics/history/geography之一）
4. knowledgePoints: 知识点数组（具体的知识点名称）
5. questionType: 题型（choice/multiple_choice/blank/short_answer/calculation/essay/proof之一）
6. difficulty: 难度（easy/medium/hard之一）
7. difficultyScore: 难度系数（0-1之间的小数，保留2位小数）
8. confidence: 分类置信度（0-100之间的整数）
9. reasoning: 分类理由（简要说明）

注意：
- 仔细分析题目内容，准确判断学科和年级
- 知识点要具体明确，可以有多个
- 难度评估要综合考虑知识点复杂度、计算量、思维深度等因素
- 置信度要真实反映你的判断确定性
`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个专业的教育题目分类专家，擅长准确识别题目的学科、年级、知识点、难度等属性。" },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "question_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              region: { type: ["string", "null"], description: "地区" },
              grade: { 
                type: "string", 
                enum: ["grade7", "grade8", "grade9", "grade10", "grade11", "grade12"],
                description: "年级" 
              },
              subject: { 
                type: "string", 
                enum: ["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"],
                description: "学科" 
              },
              knowledgePoints: { 
                type: "array", 
                items: { type: "string" },
                description: "知识点数组" 
              },
              questionType: { 
                type: "string", 
                enum: ["choice", "multiple_choice", "blank", "short_answer", "calculation", "essay", "proof"],
                description: "题型" 
              },
              difficulty: { 
                type: "string", 
                enum: ["easy", "medium", "hard"],
                description: "难度" 
              },
              difficultyScore: { 
                type: "number", 
                description: "难度系数（0-1）" 
              },
              confidence: { 
                type: "integer", 
                description: "置信度（0-100）" 
              },
              reasoning: { 
                type: "string", 
                description: "分类理由" 
              },
            },
            required: ["grade", "subject", "knowledgePoints", "questionType", "difficulty", "difficultyScore", "confidence", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("AI classification returned empty response");
    }

    // @ts-ignore
    const classification = JSON.parse(content);
    return classification;
  }

  /**
   * 插入分类标签
   */
  private async insertClassificationTags(questionId: number, classification: any) {
    const tags = [];

    // 地区标签
    if (classification.region) {
      tags.push({
        questionId,
        tagType: "region" as const,
        tagValue: classification.region,
        isAiGenerated: 1,
        confidence: classification.confidence,
      });
    }

    // 年级标签
    tags.push({
      questionId,
      tagType: "grade" as const,
      tagValue: classification.grade,
      isAiGenerated: 1,
      confidence: classification.confidence,
    });

    // 学科标签
    tags.push({
      questionId,
      tagType: "subject" as const,
      tagValue: classification.subject,
      isAiGenerated: 1,
      confidence: classification.confidence,
    });

    // 题型标签
    tags.push({
      questionId,
      tagType: "question_type" as const,
      tagValue: classification.questionType,
      isAiGenerated: 1,
      confidence: classification.confidence,
    });

    // 难度标签
    tags.push({
      questionId,
      tagType: "difficulty" as const,
      tagValue: classification.difficulty,
      isAiGenerated: 1,
      confidence: classification.confidence,
    });

    // 知识点标签
    for (const kp of classification.knowledgePoints) {
      tags.push({
        questionId,
        tagType: "knowledge_point" as const,
        tagValue: kp,
        isAiGenerated: 1,
        confidence: classification.confidence,
      });
    }

    // 批量插入标签
    if (tags.length > 0) {
      await db.insert(questionTags).values(tags);
    }
  }

  /**
   * 评估题目质量
   */
  private async assessQuestionQuality(questionId: number) {
    const [question] = await db
      .select()
      .from(questionsDb)
      .where(eq(questionsDb.id, questionId));

    if (!question) {
      return;
    }

    // 计算完整性评分
    const hasTitle = question.title ? 1 : 0;
    const hasContent = question.content ? 1 : 0;
    const hasAnswer = question.answer ? 1 : 0;
    const hasExplanation = question.explanation ? 1 : 0;
    const hasImages = (question.contentImages && Array.isArray(question.contentImages) && question.contentImages.length > 0) ? 1 : 0;

    const completenessScore = ((hasTitle + hasContent + hasAnswer + hasExplanation + hasImages) / 5) * 100;

    // 准确性评分（默认为100，需要人工验证后调整）
    const accuracyScore = 100;

    // 综合评分
    const overallScore = (completenessScore * 0.6 + accuracyScore * 0.4);

    // 插入质量评分
    await db.insert(questionQuality).values({
      questionId,
      hasTitle,
      hasContent,
      hasAnswer,
      hasExplanation,
      hasImages,
      completenessScore: completenessScore.toFixed(2),
      answerReasonable: 1,
      explanationCorrect: 1,
      noTypos: 1,
      accuracyScore: accuracyScore.toFixed(2),
      overallScore: overallScore.toFixed(2),
      scoredBy: "ai",
    });

    // 更新题目的质量评分
    await db.update(questionsDb)
      .set({
        qualityScore: overallScore.toFixed(2),
        completenessScore: completenessScore.toFixed(2),
        accuracyScore: accuracyScore.toFixed(2),
      })
      .where(eq(questionsDb.id, questionId));
  }
}

// ==================== 导出单例 ====================
export const aiClassificationService = new AIClassificationService();
