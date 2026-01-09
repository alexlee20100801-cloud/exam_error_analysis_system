import { db } from "../db";
import {
  knowledgePointHotness,
  questionTypeHotness,
  warmupTasks,
  questionAnalysisCache,
  errorQuestions,
  knowledgePoints,
  type NewKnowledgePointHotness,
  type NewQuestionTypeHotness,
  type NewWarmupTask,
} from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * 缓存预热服务
 * 负责识别热门知识点和题目类型,预先生成AI分析缓存
 */

/**
 * 更新知识点热度统计
 * 基于错题数量、访问频率等计算热度分数
 */
export async function updateKnowledgePointHotness() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 查询最近30天的知识点使用情况(从 errorQuestions 表的 knowledgePointIds 字段获取)
  // 简化实现:直接统计 errorQuestions 表中的数据
  const knowledgePointStats = await db
    .select({
      knowledgePointId: knowledgePoints.id,
      knowledgePointName: knowledgePoints.name,
      subject: knowledgePoints.subject,
      schoolLevel: sql<string>`CASE WHEN ${knowledgePoints.grade} IN ('junior1', 'junior2', 'junior3') THEN 'junior' ELSE 'senior' END`,
      questionCount: sql<number>`COUNT(DISTINCT ${errorQuestions.id})`,
      recentAccessCount: sql<number>`COUNT(*)`,
    })
    .from(knowledgePoints)
    .leftJoin(
      errorQuestions,
      sql`JSON_CONTAINS(${errorQuestions.knowledgePointIds}, CAST(${knowledgePoints.id} AS JSON))`
    )
    // @ts-ignore
    .where(gte(errorQuestions.createdAt, thirtyDaysAgo))
    .groupBy(
      knowledgePoints.id,
      knowledgePoints.name,
      knowledgePoints.subject,
      knowledgePoints.grade
    );

  // 计算热度分数并更新数据库
  const updates: NewKnowledgePointHotness[] = knowledgePointStats.map((stat: any) => {
    // 热度分数 = 错题数量 * 0.6 + 访问次数 * 0.4
    const hotnessScore = stat.questionCount * 0.6 + stat.recentAccessCount * 0.4;

    return {
      knowledgePointId: stat.knowledgePointId,
      knowledgePointName: stat.knowledgePointName,
      subject: stat.subject,
      schoolLevel: stat.schoolLevel,
      accessCount: stat.recentAccessCount,
      analysisCount: 0, // 将在后续查询中更新
      questionCount: stat.questionCount,
      hotnessScore,
      lastAccessAt: new Date(),
      statisticsDate: new Date(),
    };
  });

  // 批量插入或更新
  for (const update of updates) {
    await db
      .insert(knowledgePointHotness)
      .values(update)
      .onDuplicateKeyUpdate({
        set: {
          accessCount: update.accessCount,
          questionCount: update.questionCount,
          hotnessScore: update.hotnessScore,
          lastAccessAt: update.lastAccessAt,
          updatedAt: new Date(),
        },
      });
  }

  return updates.length;
}

/**
 * 更新题目类型热度统计
 * 分析题目特征模式,识别热门题型
 */
export async function updateQuestionTypeHotness() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 查询最近30天的题目类型分布
  const questionTypeStats = await db
    .select({
      subject: errorQuestions.subject,
      schoolLevel: errorQuestions.schoolLevel,
      difficulty: errorQuestions.difficulty,
      occurrenceCount: sql<number>`COUNT(*)`,
    })
    .from(errorQuestions)
    // @ts-ignore
    .where(gte(errorQuestions.createdAt, thirtyDaysAgo))
    .groupBy(
      errorQuestions.subject,
      errorQuestions.schoolLevel,
      errorQuestions.difficulty
    );

  // 生成题目类型特征并更新数据库
  const updates: NewQuestionTypeHotness[] = questionTypeStats.map((stat: any) => {
    // 题目类型特征(简化版,实际可以更复杂)
    const questionTypePattern = JSON.stringify({
      subject: stat.subject,
      schoolLevel: stat.schoolLevel,
      difficulty: stat.difficulty,
    });

    // 热度分数 = 出现次数的对数(避免极端值)
    const hotnessScore = Math.log10(stat.occurrenceCount + 1) * 10;

    return {
      subject: stat.subject,
      schoolLevel: stat.schoolLevel,
      difficulty: stat.difficulty,
      questionTypePattern,
      occurrenceCount: stat.occurrenceCount,
      analysisCount: 0,
      hotnessScore,
      statisticsDate: new Date(),
    };
  });

  // 批量插入或更新
  for (const update of updates) {
    await db
      .insert(questionTypeHotness)
      .values(update)
      .onDuplicateKeyUpdate({
        set: {
          occurrenceCount: update.occurrenceCount,
          hotnessScore: update.hotnessScore,
          updatedAt: new Date(),
        },
      });
  }

  return updates.length;
}

/**
 * 获取需要预热的高频知识点
 * @param limit 返回数量限制
 */
export async function getTopHotKnowledgePoints(limit: number = 20) {
  return await db
    .select()
    .from(knowledgePointHotness)
    .orderBy(desc(knowledgePointHotness.hotnessScore))
    .limit(limit);
}

/**
 * 获取需要预热的热门题目类型
 * @param limit 返回数量限制
 */
export async function getTopHotQuestionTypes(limit: number = 10) {
  return await db
    .select()
    .from(questionTypeHotness)
    .orderBy(desc(questionTypeHotness.hotnessScore))
    .limit(limit);
}

/**
 * 为高频知识点预生成AI分析缓存
 * @param knowledgePointId 知识点ID
 */
export async function warmupKnowledgePointCache(knowledgePointId: number) {
  // 查询该知识点下的典型错题(选择最近的、未缓存的)
  const sampleQuestions = await db
    .select({
      id: errorQuestions.id,
      // @ts-ignore
      questionText: errorQuestions.questionText,
      subject: errorQuestions.subject,
      schoolLevel: errorQuestions.schoolLevel,
      difficulty: errorQuestions.difficulty,
      // @ts-ignore
      contentHash: errorQuestions.contentHash,
    })
    .from(errorQuestions)
    .innerJoin(
      // @ts-ignore
      errorQuestionKnowledgePoints,
      // @ts-ignore
      eq(errorQuestions.id, errorQuestionKnowledgePoints.errorQuestionId)
    )
    // @ts-ignore
    .where(eq(errorQuestionKnowledgePoints.knowledgePointId, knowledgePointId))
    .orderBy(desc(errorQuestions.createdAt))
    .limit(5);

  let cachedCount = 0;

  for (const question of sampleQuestions) {
    if (!question.contentHash) continue;

    // 检查是否已有缓存
    const existingCache = await db
      .select()
      .from(questionAnalysisCache)
      .where(eq(questionAnalysisCache.contentHash, question.contentHash))
      .limit(1);

    if (existingCache.length > 0) continue;

    try {
      // 调用AI生成分析
      const analysis = await generateQuestionAnalysis(
        question.questionText,
        question.subject,
        question.schoolLevel,
        question.difficulty
      );

      // 存入缓存
      await db.insert(questionAnalysisCache as any).values({
        contentHash: question.contentHash,
        questionText: question.questionText,
        subject: question.subject,
        schoolLevel: question.schoolLevel,
        difficulty: question.difficulty,
        knowledgePoints: JSON.stringify(analysis.knowledgePoints),
        errorAnalysis: analysis.errorAnalysis,
        learningAdvice: analysis.learningAdvice,
        similarQuestionTypes: JSON.stringify(analysis.similarQuestionTypes),
        reviewStrategy: analysis.reviewStrategy,
        estimatedMasteryTime: analysis.estimatedMasteryTime,
        hitCount: 0,
        lastHitAt: null,
        createdAt: new Date(),
      });

      cachedCount++;
    } catch (error) {
      console.error(`Failed to warmup cache for question ${question.id}:`, error);
    }
  }

  return cachedCount;
}

/**
 * 生成题目分析(AI调用)
 */
async function generateQuestionAnalysis(
  questionText: string,
  subject: string,
  schoolLevel: string,
  difficulty: string
) {
  const prompt = `你是一位经验丰富的${subject}教师。请分析以下${schoolLevel === "junior" ? "初中" : "高中"}${difficulty === "easy" ? "简单" : difficulty === "medium" ? "中等" : "困难"}难度的错题:

${questionText}

请提供:
1. 涉及的知识点(列表形式)
2. 错误原因分析
3. 学习建议
4. 相似题型特征
5. 复习策略
6. 预计掌握时间(天数)

请以JSON格式返回结果。`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "你是一位专业的教育分析助手,擅长分析学生错题并提供个性化学习建议。" },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            knowledgePoints: {
              type: "array",
              items: { type: "string" },
              description: "涉及的知识点列表",
            },
            errorAnalysis: {
              type: "string",
              description: "错误原因分析",
            },
            learningAdvice: {
              type: "string",
              description: "学习建议",
            },
            similarQuestionTypes: {
              type: "array",
              items: { type: "string" },
              description: "相似题型特征",
            },
            reviewStrategy: {
              type: "string",
              description: "复习策略",
            },
            estimatedMasteryTime: {
              type: "integer",
              description: "预计掌握时间(天数)",
            },
          },
          required: [
            "knowledgePoints",
            "errorAnalysis",
            "learningAdvice",
            "similarQuestionTypes",
            "reviewStrategy",
            "estimatedMasteryTime",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  // @ts-ignore
  return JSON.parse(content);
}

/**
 * 创建预热任务
 */
export async function createWarmupTask(
  taskName: string,
  taskType: "knowledge_point" | "question_type" | "recommendation",
  targetConfig: any,
  priority: number = 5
) {
  const [task] = await db
    .insert(warmupTasks)
    .values({
      taskName,
      taskType,
      targetConfig: JSON.stringify(targetConfig),
      priority,
      status: "pending",
      progress: 0,
      cacheGeneratedCount: 0,
      scheduledAt: new Date(),
    })
    .$returningId();

  return task.id;
}

/**
 * 执行预热任务
 */
export async function executeWarmupTask(taskId: number) {
  // 获取任务信息
  const [task] = await db
    .select()
    .from(warmupTasks)
    .where(eq(warmupTasks.id, taskId))
    .limit(1);

  if (!task) {
    throw new Error(`Warmup task ${taskId} not found`);
  }

  // 更新任务状态为运行中
  await db
    .update(warmupTasks)
    .set({
      status: "running",
      startedAt: new Date(),
    })
    .where(eq(warmupTasks.id, taskId));

  const startTime = Date.now();
  let cacheGeneratedCount = 0;

  try {
    const config = JSON.parse(task.targetConfig as string);

    if (task.taskType === "knowledge_point") {
      // 预热知识点缓存
      const knowledgePointIds = config.knowledgePointIds || [];
      for (let i = 0; i < knowledgePointIds.length; i++) {
        const count = await warmupKnowledgePointCache(knowledgePointIds[i]);
        cacheGeneratedCount += count;

        // 更新进度
        const progress = ((i + 1) / knowledgePointIds.length) * 100;
        await db
          .update(warmupTasks)
          .set({ progress, cacheGeneratedCount })
          .where(eq(warmupTasks.id, taskId));
      }
    } else if (task.taskType === "question_type") {
      // 预热题目类型缓存(类似逻辑)
      // TODO: 实现题目类型预热逻辑
    }

    // 任务完成
    const executionTimeMs = Date.now() - startTime;
    await db
      .update(warmupTasks)
      .set({
        status: "completed",
        progress: 100,
        cacheGeneratedCount,
        executionTimeMs,
        completedAt: new Date(),
      })
      .where(eq(warmupTasks.id, taskId));

    return { success: true, cacheGeneratedCount, executionTimeMs };
  } catch (error) {
    // 任务失败
    await db
      .update(warmupTasks)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      })
      .where(eq(warmupTasks.id, taskId));

    throw error;
  }
}

/**
 * 自动预热高频内容
 * 定期调用此函数以保持缓存新鲜
 */
export async function autoWarmupHotContent() {
  // 1. 更新热度统计
  await updateKnowledgePointHotness();
  await updateQuestionTypeHotness();

  // 2. 获取top热门知识点
  const hotKnowledgePoints = await getTopHotKnowledgePoints(10);

  // 3. 创建预热任务
  if (hotKnowledgePoints.length > 0) {
    const taskId = await createWarmupTask(
      "Auto warmup hot knowledge points",
      "knowledge_point",
      {
        knowledgePointIds: hotKnowledgePoints.map((kp: any) => kp.knowledgePointId),
      },
      8 // 高优先级
    );

    // 4. 执行预热任务
    await executeWarmupTask(taskId);

    return { success: true, taskId, knowledgePointCount: hotKnowledgePoints.length };
  }

  return { success: false, message: "No hot knowledge points found" };
}
