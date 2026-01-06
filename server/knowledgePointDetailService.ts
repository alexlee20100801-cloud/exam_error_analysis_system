import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { errorQuestions, knowledgePoints, learningProgress, practiceRecords } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";

/**
 * 获取知识点的基本信息
 */
export async function getKnowledgePointInfo(knowledgePointId: number) {
  const db = await getDb();
  if (!db) return null;

  const [kp] = await db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.id, knowledgePointId))
    .limit(1);

  return kp || null;
}

/**
 * 获取知识点相关的所有错题
 */
export async function getKnowledgePointErrors(userId: string, knowledgePointId: number) {
  const db = await getDb();
  if (!db) return [];

  const errors = await db
    .select()
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        sql`JSON_CONTAINS(${errorQuestions.knowledgePointIds}, JSON_ARRAY(${knowledgePointId}))`
      )
    )
    .orderBy(desc(errorQuestions.createdAt));

  return errors;
}

/**
 * 获取知识点的练习记录
 */
export async function getKnowledgePointPractices(userId: string, knowledgePointId: number) {
  const db = await getDb();
  if (!db) return [];

  const practices = await db
    .select()
    .from(practiceRecords)
    .where(
      and(
        eq(practiceRecords.userId, userId),
        sql`JSON_CONTAINS(${practiceRecords.knowledgePointIds}, JSON_ARRAY(${knowledgePointId}))`
      )
    )
    .orderBy(desc(practiceRecords.createdAt))
    .limit(20);

  return practices;
}

/**
 * 获取知识点的学习进度
 */
export async function getKnowledgePointProgress(userId: string, knowledgePointId: number) {
  const db = await getDb();
  if (!db) return null;

  const [progress] = await db
    .select()
    .from(learningProgress)
    .where(
      and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.knowledgePointId, knowledgePointId)
      )
    )
    .limit(1);

  return progress || null;
}

/**
 * 获取知识点的掌握度趋势（按周统计）
 */
export async function getKnowledgePointMasteryTrend(userId: string, knowledgePointId: number, weeks: number = 8) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  // 获取练习记录的正确率趋势
  const results = await db
    .select({
      week: sql<string>`DATE_FORMAT(${practiceRecords.createdAt}, '%Y-%u')`.as('week'),
      totalCount: count(),
      correctCount: sql<number>`SUM(CASE WHEN ${practiceRecords.isCorrect} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(practiceRecords)
    .where(
      and(
        eq(practiceRecords.userId, userId),
        sql`JSON_CONTAINS(${practiceRecords.knowledgePointIds}, JSON_ARRAY(${knowledgePointId}))`,
        gte(practiceRecords.createdAt, startDate)
      )
    )
    .groupBy(sql.raw(`DATE_FORMAT(\`createdAt\`, '%Y-%u')`))
    .orderBy(sql.raw(`DATE_FORMAT(\`createdAt\`, '%Y-%u')`));

  return results.map(r => ({
    week: r.week,
    accuracy: r.totalCount > 0 ? Math.round((Number(r.correctCount) / r.totalCount) * 100) : 0,
    practiceCount: r.totalCount,
  }));
}

/**
 * AI分析知识点的易错原因
 */
export async function analyzeCommonMistakes(userId: string, knowledgePointId: number) {
  const db = await getDb();
  if (!db) return null;

  // 获取知识点信息
  const kpInfo = await getKnowledgePointInfo(knowledgePointId);
  if (!kpInfo) return null;

  // 获取该知识点的所有错题
  const errors = await getKnowledgePointErrors(userId, knowledgePointId);
  
  if (errors.length === 0) {
    return {
      summary: "暂无错题数据，无法分析易错原因。",
      commonPatterns: [],
      suggestions: ["继续练习该知识点，积累更多数据后将为您提供深度分析。"],
    };
  }

  // 构建AI分析提示词
  const errorSummary = errors.slice(0, 10).map((err, index) => {
    return `错题${index + 1}：
题目：${err.title}
用户答案：${err.userAnswer || "未作答"}
正确答案：${err.correctAnswer || "未提供"}
AI分析：${err.errorAnalysis || "未分析"}
`;
  }).join("\n\n");

  const prompt = `你是一位经验丰富的教育专家。请分析学生在"${kpInfo.name}"这个知识点上的错题记录，总结易错原因和改进建议。

知识点信息：
- 名称：${kpInfo.name}
- 学科：${kpInfo.subject}
- 难度：${kpInfo.difficulty}
- 描述：${kpInfo.description || "无"}

学生的错题记录（共${errors.length}道，展示前10道）：
${errorSummary}

请以JSON格式返回分析结果，包含以下字段：
{
  "summary": "整体易错原因总结（50-100字）",
  "commonPatterns": ["常见错误模式1", "常见错误模式2", "常见错误模式3"],
  "suggestions": ["改进建议1", "改进建议2", "改进建议3"]
}

要求：
1. summary要简洁明了，指出最核心的易错原因
2. commonPatterns列出3-5个具体的错误模式或思维误区
3. suggestions给出3-5条可操作的改进建议
4. 语言要通俗易懂，适合中学生阅读`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一位教育专家，擅长分析学生的学习问题并给出针对性建议。" },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mistake_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "整体易错原因总结" },
              commonPatterns: {
                type: "array",
                items: { type: "string" },
                description: "常见错误模式列表",
              },
              suggestions: {
                type: "array",
                items: { type: "string" },
                description: "改进建议列表",
              },
            },
            required: ["summary", "commonPatterns", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("AI返回内容为空或格式错误");
    }

    const analysis = JSON.parse(content);
    return analysis;
  } catch (error) {
    console.error("AI分析易错原因失败:", error);
    return {
      summary: "AI分析暂时不可用，请稍后重试。",
      commonPatterns: ["分析失败"],
      suggestions: ["请稍后重试"],
    };
  }
}

/**
 * 获取知识点的完整详情数据
 */
export async function getKnowledgePointFullDetail(userId: string, knowledgePointId: number) {
  const [info, errors, practices, progress, masteryTrend, aiAnalysis] = await Promise.all([
    getKnowledgePointInfo(knowledgePointId),
    getKnowledgePointErrors(userId, knowledgePointId),
    getKnowledgePointPractices(userId, knowledgePointId),
    getKnowledgePointProgress(userId, knowledgePointId),
    getKnowledgePointMasteryTrend(userId, knowledgePointId),
    analyzeCommonMistakes(userId, knowledgePointId),
  ]);

  return {
    info,
    errors,
    practices,
    progress,
    masteryTrend,
    aiAnalysis,
    stats: {
      errorCount: errors.length,
      practiceCount: practices.length,
      correctRate: progress && progress.correctCount !== null && progress.practiceCount !== null && progress.practiceCount > 0
        ? Math.round((progress.correctCount / progress.practiceCount) * 100)
        : 0,
      masteryLevel: progress ? Math.round(progress.masteryLevel * 100) : 0,
    },
  };
}
