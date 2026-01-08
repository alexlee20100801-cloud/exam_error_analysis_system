import { db } from "../db";
import {
  aiClassificationTestSet,
  aiClassificationEvaluationHistory,
  aiPromptVersions,
  type AiClassificationTestSet,
  type NewAiClassificationTestSet,
  type AiClassificationEvaluationHistory,
  type NewAiClassificationEvaluationHistory,
  type AiPromptVersion,
  type NewAiPromptVersion,
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * 添加测试样本到测试集
 */
export async function addTestSample(sample: NewAiClassificationTestSet) {
  const [newSample] = await db.insert(aiClassificationTestSet).values(sample);
  return newSample;
}

/**
 * 获取所有测试样本
 */
export async function getAllTestSamples(filters?: {
  subject?: string;
  grade?: string;
  dataSource?: string;
}) {
  const conditions = [];

  if (filters?.subject) {
    conditions.push(eq(aiClassificationTestSet.expectedSubject, filters.subject as any));
  }

  if (filters?.grade) {
    conditions.push(eq(aiClassificationTestSet.expectedGrade, filters.grade as any));
  }

  if (filters?.dataSource) {
    conditions.push(eq(aiClassificationTestSet.dataSource, filters.dataSource as any));
  }

  return await db
    .select()
    .from(aiClassificationTestSet)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiClassificationTestSet.createdAt));
}

/**
 * 删除测试样本
 */
export async function deleteTestSample(id: number) {
  await db.delete(aiClassificationTestSet).where(eq(aiClassificationTestSet.id, id));
}

/**
 * 创建新的prompt版本
 */
export async function createPromptVersion(version: NewAiPromptVersion) {
  const [newVersion] = await db.insert(aiPromptVersions).values(version);
  return newVersion;
}

/**
 * 获取所有prompt版本
 */
export async function getAllPromptVersions(promptType?: string) {
  const conditions = [];

  if (promptType) {
    conditions.push(eq(aiPromptVersions.promptType, promptType as any));
  }

  return await db
    .select()
    .from(aiPromptVersions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiPromptVersions.createdAt));
}

/**
 * 获取当前激活的prompt版本
 */
export async function getActivePromptVersion(promptType: string) {
  const [activeVersion] = await db
    .select()
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptType, promptType as any),
        eq(aiPromptVersions.isActive, 1)
      )
    )
    .limit(1);

  return activeVersion;
}

/**
 * 激活prompt版本
 */
export async function activatePromptVersion(id: number, promptType: string) {
  // 先禁用同类型的所有版本
  await db
    .update(aiPromptVersions)
    .set({ isActive: 0 })
    .where(eq(aiPromptVersions.promptType, promptType as any));

  // 激活指定版本
  await db
    .update(aiPromptVersions)
    .set({ isActive: 1, updatedAt: new Date().toISOString() })
    .where(eq(aiPromptVersions.id, id));

  return await db
    .select()
    .from(aiPromptVersions)
    .where(eq(aiPromptVersions.id, id))
    .then(rows => rows[0]);
}

/**
 * 更新prompt版本
 */
export async function updatePromptVersion(id: number, updates: Partial<AiPromptVersion>) {
  await db
    .update(aiPromptVersions)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(aiPromptVersions.id, id));

  return await db
    .select()
    .from(aiPromptVersions)
    .where(eq(aiPromptVersions.id, id))
    .then(rows => rows[0]);
}

/**
 * 使用指定prompt版本对题目进行分类
 */
export async function classifyQuestion(
  questionContent: string,
  questionImage: string | null,
  promptVersionId: number
) {
  // 获取prompt版本
  const [promptVersion] = await db
    .select()
    .from(aiPromptVersions)
    .where(eq(aiPromptVersions.id, promptVersionId));

  if (!promptVersion) {
    throw new Error("Prompt版本不存在");
  }

  // 构建消息
  const messages: any[] = [];

  if (promptVersion.systemMessage) {
    messages.push({
      role: "system",
      content: promptVersion.systemMessage,
    });
  }

  // 构建用户消息
  const userContent: any[] = [
    {
      type: "text",
      text: `${promptVersion.promptContent}\n\n题目内容：${questionContent}`,
    },
  ];

  if (questionImage) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: questionImage,
      },
    });
  }

  messages.push({
    role: "user",
    content: userContent,
  });

  // 调用LLM
  const response = await invokeLLM({
    messages,
    temperature: parseFloat(promptVersion.temperature || "0.7"),
    max_tokens: promptVersion.maxTokens || 2000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            subject: {
              type: "string",
              enum: ["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"],
            },
            grade: {
              type: "string",
              enum: ["grade7", "grade8", "grade9", "grade10", "grade11", "grade12"],
            },
            difficulty: {
              type: "string",
              enum: ["easy", "medium", "hard"],
            },
            knowledgePoints: {
              type: "array",
              items: { type: "string" },
            },
            confidence: {
              type: "number",
              description: "分类置信度，0-1之间",
            },
          },
          required: ["subject", "grade", "difficulty", "knowledgePoints", "confidence"],
          additionalProperties: false,
        },
      },
    },
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result;
}

/**
 * 评估prompt版本的性能
 */
export async function evaluatePromptVersion(promptVersionId: number) {
  // 获取所有测试样本
  const testSamples = await getAllTestSamples();

  if (testSamples.length === 0) {
    throw new Error("测试集为空，无法进行评估");
  }

  let correctSubject = 0;
  let correctGrade = 0;
  let correctDifficulty = 0;
  const subjectAccuracy: Record<string, { correct: number; total: number }> = {};
  const gradeAccuracy: Record<string, { correct: number; total: number }> = {};
  const difficultyAccuracy: Record<string, { correct: number; total: number }> = {};
  const errorCases: any[] = [];

  // 对每个测试样本进行分类
  for (const sample of testSamples) {
    try {
      const result = await classifyQuestion(
        sample.questionContent,
        sample.questionImage,
        promptVersionId
      );

      // 统计准确率
      if (result.subject === sample.expectedSubject) {
        correctSubject++;
      } else {
        errorCases.push({
          sampleId: sample.id,
          expected: {
            subject: sample.expectedSubject,
            grade: sample.expectedGrade,
            difficulty: sample.expectedDifficulty,
          },
          predicted: result,
        });
      }

      if (result.grade === sample.expectedGrade) {
        correctGrade++;
      }

      if (result.difficulty === sample.expectedDifficulty) {
        correctDifficulty++;
      }

      // 按学科统计
      if (!subjectAccuracy[sample.expectedSubject]) {
        subjectAccuracy[sample.expectedSubject] = { correct: 0, total: 0 };
      }
      subjectAccuracy[sample.expectedSubject].total++;
      if (result.subject === sample.expectedSubject) {
        subjectAccuracy[sample.expectedSubject].correct++;
      }

      // 按年级统计
      if (!gradeAccuracy[sample.expectedGrade]) {
        gradeAccuracy[sample.expectedGrade] = { correct: 0, total: 0 };
      }
      gradeAccuracy[sample.expectedGrade].total++;
      if (result.grade === sample.expectedGrade) {
        gradeAccuracy[sample.expectedGrade].correct++;
      }

      // 按难度统计
      if (!difficultyAccuracy[sample.expectedDifficulty]) {
        difficultyAccuracy[sample.expectedDifficulty] = { correct: 0, total: 0 };
      }
      difficultyAccuracy[sample.expectedDifficulty].total++;
      if (result.difficulty === sample.expectedDifficulty) {
        difficultyAccuracy[sample.expectedDifficulty].correct++;
      }
    } catch (error) {
      console.error(`评估样本 ${sample.id} 时出错:`, error);
      errorCases.push({
        sampleId: sample.id,
        error: error instanceof Error ? error.message : "未知错误",
      });
    }
  }

  // 计算总体准确率
  const overallAccuracy = (
    ((correctSubject + correctGrade + correctDifficulty) / (testSamples.length * 3)) *
    100
  ).toFixed(2);

  // 保存评估结果
  const evaluationData: NewAiClassificationEvaluationHistory = {
    promptVersionId,
    testSetSize: testSamples.length,
    overallAccuracy,
    subjectAccuracy: JSON.stringify(subjectAccuracy),
    gradeAccuracy: JSON.stringify(gradeAccuracy),
    difficultyAccuracy: JSON.stringify(difficultyAccuracy),
    confusionMatrix: JSON.stringify({}), // 可以进一步实现混淆矩阵
    errorCases: JSON.stringify(errorCases),
  };

  const [evaluation] = await db
    .insert(aiClassificationEvaluationHistory)
    .values(evaluationData);

  // 更新prompt版本的性能评分
  await updatePromptVersion(promptVersionId, {
    performanceScore: overallAccuracy,
  });

  return {
    overallAccuracy,
    subjectAccuracy,
    gradeAccuracy,
    difficultyAccuracy,
    errorCases,
    testSetSize: testSamples.length,
  };
}

/**
 * 获取评估历史
 */
export async function getEvaluationHistory(promptVersionId?: number) {
  const conditions = [];

  if (promptVersionId) {
    conditions.push(eq(aiClassificationEvaluationHistory.promptVersionId, promptVersionId));
  }

  return await db
    .select()
    .from(aiClassificationEvaluationHistory)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiClassificationEvaluationHistory.evaluatedAt));
}

/**
 * 生成prompt优化建议
 */
export async function generatePromptOptimizationSuggestions(promptVersionId: number) {
  // 获取评估历史
  const evaluations = await getEvaluationHistory(promptVersionId);

  if (evaluations.length === 0) {
    return {
      suggestions: ["尚未进行评估，请先运行评估以获取优化建议"],
    };
  }

  const latestEvaluation = evaluations[0];
  const suggestions: string[] = [];

  // 分析总体准确率
  const overallAccuracy = parseFloat(latestEvaluation.overallAccuracy);
  if (overallAccuracy < 70) {
    suggestions.push("总体准确率偏低，建议重新设计prompt，提供更明确的分类指导");
  } else if (overallAccuracy < 85) {
    suggestions.push("总体准确率中等，建议增加更多示例和边界情况的说明");
  }

  // 分析学科准确率
  const subjectAccuracy = JSON.parse(latestEvaluation.subjectAccuracy as string);
  for (const [subject, stats] of Object.entries(subjectAccuracy)) {
    const accuracy = ((stats as any).correct / (stats as any).total) * 100;
    if (accuracy < 70) {
      suggestions.push(`${subject}学科识别准确率偏低(${accuracy.toFixed(1)}%)，建议增加该学科的特征描述`);
    }
  }

  // 分析错误案例
  const errorCases = JSON.parse(latestEvaluation.errorCases as string);
  if (errorCases.length > 0) {
    const commonErrors = new Map<string, number>();
    errorCases.forEach((err: any) => {
      if (err.expected && err.predicted) {
        const errorType = `${err.expected.subject} 被误判为 ${err.predicted.subject}`;
        commonErrors.set(errorType, (commonErrors.get(errorType) || 0) + 1);
      }
    });

    // 找出最常见的错误
    const sortedErrors = Array.from(commonErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    sortedErrors.forEach(([errorType, count]) => {
      suggestions.push(`常见错误: ${errorType} (出现${count}次)，建议在prompt中强调这两个学科的区别`);
    });
  }

  return { suggestions };
}
