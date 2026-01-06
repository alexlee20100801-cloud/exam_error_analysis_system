import { getDb } from "../db";
import { knowledgePoints, questionBank } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * AI题库批量生成服务
 * 根据知识点、学科、年级、难度自动生成大量题目
 */

// 生成配置接口
export interface BulkGenerationConfig {
  schoolLevel: "junior" | "senior"; // 学段
  grade: string; // 年级
  subject: string; // 学科
  semester?: string; // 学期（可选）
  knowledgePointIds?: number[]; // 指定知识点ID列表（可选，不指定则生成所有知识点）
  questionsPerKnowledgePoint: number; // 每个知识点生成题目数量
  difficultyDistribution?: {
    // 难度分布（可选，默认均匀分布）
    easy: number; // 简单题比例 0-1
    medium: number; // 中等题比例 0-1
    hard: number; // 困难题比例 0-1
  };
  questionTypes?: string[]; // 题型列表（可选，默认全部）
}

// 生成结果接口
export interface BulkGenerationResult {
  totalGenerated: number; // 总生成数量
  successCount: number; // 成功数量
  failedCount: number; // 失败数量
  duplicateCount: number; // 去重数量
  generatedQuestions: Array<{
    id: number;
    title: string;
    knowledgePointId: number;
    difficulty: string;
  }>;
  errors: string[]; // 错误信息列表
}

// 题目质量评分接口
interface QualityScore {
  score: number; // 0-100分
  issues: string[]; // 质量问题列表
  isAcceptable: boolean; // 是否可接受
}

/**
 * 批量生成题目
 */
export async function bulkGenerateQuestions(
  config: BulkGenerationConfig
): Promise<BulkGenerationResult> {
  const result: BulkGenerationResult = {
    totalGenerated: 0,
    successCount: 0,
    failedCount: 0,
    duplicateCount: 0,
    generatedQuestions: [],
    errors: [],
  };

  try {
    // 1. 获取目标知识点列表
    const targetKnowledgePoints = await getTargetKnowledgePoints(config);

    if (targetKnowledgePoints.length === 0) {
      result.errors.push("未找到符合条件的知识点");
      return result;
    }

    // 2. 计算每个知识点的难度分布
    const difficultyDist = config.difficultyDistribution || {
      easy: 0.3,
      medium: 0.5,
      hard: 0.2,
    };

    // 3. 遍历知识点生成题目
    for (const kp of targetKnowledgePoints) {
      // 计算各难度题目数量
      const easyCount = Math.round(
        config.questionsPerKnowledgePoint * difficultyDist.easy
      );
      const mediumCount = Math.round(
        config.questionsPerKnowledgePoint * difficultyDist.medium
      );
      const hardCount =
        config.questionsPerKnowledgePoint - easyCount - mediumCount;

      // 生成各难度题目
      await generateQuestionsForKnowledgePoint(
        kp,
        config,
        easyCount,
        "easy",
        result
      );
      await generateQuestionsForKnowledgePoint(
        kp,
        config,
        mediumCount,
        "medium",
        result
      );
      await generateQuestionsForKnowledgePoint(
        kp,
        config,
        hardCount,
        "hard",
        result
      );
    }

    result.totalGenerated = result.successCount + result.failedCount;
  } catch (error) {
    result.errors.push(`批量生成失败: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * 获取目标知识点列表
 */
async function getTargetKnowledgePoints(config: BulkGenerationConfig) {
  const conditions: any[] = [
    eq(knowledgePoints.grade, config.grade as any),
    eq(knowledgePoints.subject, config.subject as any),
  ];

  if (config.semester) {
    conditions.push(eq(knowledgePoints.semester, config.semester as "first" | "second"));
  }

  if (config.knowledgePointIds && config.knowledgePointIds.length > 0) {
    conditions.push(sql`${knowledgePoints.id} IN ${config.knowledgePointIds}`);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(knowledgePoints)
    .where(and(...conditions));
}

/**
 * 为单个知识点生成指定难度的题目
 */
async function generateQuestionsForKnowledgePoint(
  knowledgePoint: any,
  config: BulkGenerationConfig,
  count: number,
  difficulty: string,
  result: BulkGenerationResult
) {
  for (let i = 0; i < count; i++) {
    try {
      // 随机选择题型
      const questionType = selectRandomQuestionType(config.questionTypes);

      // 使用AI生成题目
      const question = await generateSingleQuestion(
        knowledgePoint,
        difficulty,
        questionType,
        config
      );

      // 质量评估
      const qualityScore = await evaluateQuestionQuality(question);

      if (!qualityScore.isAcceptable) {
        result.failedCount++;
        result.errors.push(
          `知识点"${knowledgePoint.name}"生成的题目质量不合格: ${qualityScore.issues.join(", ")}`
        );
        continue;
      }

      // 去重检测
      const isDuplicate = await checkDuplicate(question, knowledgePoint.id);

      if (isDuplicate) {
        result.duplicateCount++;
        continue;
      }

      // 保存到数据库
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .insert(questionBank)
        .values({
          title: question.title,
          content: question.content,
          answer: question.answer,
          explanation: question.explanation,
          questionType: questionType as "choice" | "blank" | "short_answer" | "essay" | "calculation",
          subject: config.subject as any,
          grade: config.grade as any,
          semester: config.semester as "first" | "second" | undefined,
          difficulty: difficulty as "easy" | "medium" | "hard",
          knowledgePointIds: [knowledgePoint.id],
          source: "ai_generated",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      result.successCount++;
      result.generatedQuestions.push({
        id: 0, // ID将在插入后自动生成
        title: question.title,
        knowledgePointId: knowledgePoint.id,
        difficulty: difficulty,
      });
    } catch (error) {
      result.failedCount++;
      result.errors.push(
        `生成题目失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * 使用AI生成单个题目
 */
async function generateSingleQuestion(
  knowledgePoint: any,
  difficulty: string,
  questionType: string,
  config: BulkGenerationConfig
) {
  const difficultyDesc = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  }[difficulty];

  const typeDesc = {
    choice: "选择题",
    blank: "填空题",
    short_answer: "简答题",
    calculation: "计算题",
    essay: "论述题",
  }[questionType] || "选择题";

  const prompt = `你是一位资深的${config.subject}教师，请根据以下要求生成一道高质量的考试题目：

**知识点信息：**
- 知识点名称：${knowledgePoint.name}
- 知识点描述：${knowledgePoint.description || "无"}
- 学段：${config.schoolLevel === "junior" ? "初中" : "高中"}
- 年级：${config.grade}
- 学科：${config.subject}

**题目要求：**
- 题型：${typeDesc}
- 难度：${difficultyDesc}
- 题目必须紧密围绕该知识点
- 题目要有实际应用场景，贴近学生生活
- 答案要准确无误
- 解析要详细清晰，帮助学生理解

请生成题目，确保题目质量高、有区分度、符合考试标准。`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是一位经验丰富的教育专家，擅长出题和教学。",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_generation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "题目标题（简短概括，20字以内）",
            },
            content: {
              type: "string",
              description: "题目完整内容（包含题干、选项等）",
            },
            answer: {
              type: "string",
              description: "标准答案",
            },
            explanation: {
              type: "string",
              description: "详细解析（包含解题思路和知识点讲解）",
            },
          },
          required: ["title", "content", "answer", "explanation"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("AI未返回有效内容");
  }

  return JSON.parse(content);
}

/**
 * 评估题目质量
 */
async function evaluateQuestionQuality(
  question: any
): Promise<QualityScore> {
  const issues: string[] = [];
  let score = 100;

  // 1. 检查字段完整性
  if (!question.title || question.title.length < 5) {
    issues.push("题目标题过短");
    score -= 20;
  }

  if (!question.content || question.content.length < 20) {
    issues.push("题目内容过短");
    score -= 30;
  }

  if (!question.answer || question.answer.length < 1) {
    issues.push("缺少答案");
    score -= 30;
  }

  if (!question.explanation || question.explanation.length < 10) {
    issues.push("解析过于简单");
    score -= 20;
  }

  // 2. 检查内容质量（简单规则）
  if (question.content.includes("undefined") || question.content.includes("null")) {
    issues.push("题目内容包含异常字符");
    score -= 30;
  }

  // 3. 判断是否可接受（分数>=60分）
  const isAcceptable = score >= 60;

  return {
    score,
    issues,
    isAcceptable,
  };
}

/**
 * 检查题目是否重复
 */
async function checkDuplicate(
  question: any,
  knowledgePointId: number
): Promise<boolean> {
  // 查询相同知识点的题目
  const db = await getDb();
  if (!db) return false;
  
  const existingQuestions = await db
    .select()
    .from(questionBank)
    .where(sql`JSON_CONTAINS(${questionBank.knowledgePointIds}, ${JSON.stringify([knowledgePointId])})`);

  // 简单的相似度检测：检查标题是否完全相同
  for (const existing of existingQuestions) {
    if (existing.title === question.title) {
      return true;
    }

    // 检查内容相似度（简单版本：前100字符）
    const newContentPrefix = question.content.substring(0, 100);
    const existingContentPrefix = existing.content.substring(0, 100);

    if (newContentPrefix === existingContentPrefix) {
      return true;
    }
  }

  return false;
}

/**
 * 随机选择题型
 */
function selectRandomQuestionType(allowedTypes?: string[]): string {
  const defaultTypes = ["choice", "blank", "short_answer", "calculation"];
  const types = allowedTypes && allowedTypes.length > 0 ? allowedTypes : defaultTypes;

  return types[Math.floor(Math.random() * types.length)];
}

/**
 * 获取题库统计信息
 */
export async function getQuestionBankStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 按学科统计
  const subjectStats = await db
    .select({
      subject: questionBank.subject,
      count: sql<number>`COUNT(*)`,
    })
    .from(questionBank)
    .groupBy(questionBank.subject);

  // 按难度统计
  const difficultyStats = await db
    .select({
      difficulty: questionBank.difficulty,
      count: sql<number>`COUNT(*)`,
    })
    .from(questionBank)
    .groupBy(questionBank.difficulty);

  // 按年级统计
  const gradeStats = await db
    .select({
      grade: questionBank.grade,
      count: sql<number>`COUNT(*)`,
    })
    .from(questionBank)
    .groupBy(questionBank.grade);

  // 总题目数
  const [totalResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(questionBank);

  return {
    total: totalResult.count,
    bySubject: subjectStats,
    byDifficulty: difficultyStats,
    byGrade: gradeStats,
  };
}

/**
 * 智能补充题库（根据缺口自动生成）
 */
export async function smartSupplementQuestionBank(
  targetPerKnowledgePoint: number = 10
): Promise<BulkGenerationResult> {
  const result: BulkGenerationResult = {
    totalGenerated: 0,
    successCount: 0,
    failedCount: 0,
    duplicateCount: 0,
    generatedQuestions: [],
    errors: [],
  };

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 1. 获取所有知识点
    const allKnowledgePoints = await db.select().from(knowledgePoints);

    // 2. 统计每个知识点的题目数量
    for (const kp of allKnowledgePoints) {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(questionBank)
        .where(
          sql`JSON_CONTAINS(${questionBank.knowledgePointIds}, ${JSON.stringify([kp.id])})`
        );

      const currentCount = countResult.count;
      const needCount = targetPerKnowledgePoint - currentCount;

      // 3. 如果题目不足，则生成补充
      if (needCount > 0) {
        // 根据kp.grade推导schoolLevel
        const schoolLevel: "junior" | "senior" = kp.grade.startsWith("junior") ? "junior" : "senior";
        
        const config: BulkGenerationConfig = {
          schoolLevel,
          grade: kp.grade,
          subject: kp.subject,
          semester: kp.semester || undefined,
          knowledgePointIds: [kp.id],
          questionsPerKnowledgePoint: needCount,
        };

        const subResult = await bulkGenerateQuestions(config);

        // 合并结果
        result.totalGenerated += subResult.totalGenerated;
        result.successCount += subResult.successCount;
        result.failedCount += subResult.failedCount;
        result.duplicateCount += subResult.duplicateCount;
        result.generatedQuestions.push(...subResult.generatedQuestions);
        result.errors.push(...subResult.errors);
      }
    }
  } catch (error) {
    result.errors.push(
      `智能补充失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}
