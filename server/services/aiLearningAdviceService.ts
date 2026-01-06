import { invokeLLM } from "../_core/llm";
import {
  getSubjectDistribution,
  getDifficultyDistribution,
  getKnowledgePointMastery,
  getErrorQuestionOverview,
} from "./errorQuestionStatsService";

/**
 * AI学习建议生成服务
 * 基于错题统计数据生成个性化学习建议和复习计划
 */

/**
 * 学习建议数据结构
 */
export interface LearningAdvice {
  // 总体评估
  overallAssessment: string;
  
  // 个性化学习建议（3-5条）
  learningTips: Array<{
    title: string;
    content: string;
    priority: "high" | "medium" | "low";
  }>;
  
  // 智能复习计划（按优先级排序）
  reviewPlan: Array<{
    subject: string;
    knowledgePoint?: string;
    reason: string;
    suggestedTime: string; // 建议复习时间
    priority: number; // 1-5，数字越小优先级越高
  }>;
  
  // 薄弱点诊断
  weaknesses: Array<{
    area: string; // 学科或知识点
    severity: "critical" | "moderate" | "minor";
    recommendation: string;
  }>;
  
  // 激励语
  encouragement: string;
}

/**
 * 生成AI学习建议
 */
export async function generateLearningAdvice(userId: number): Promise<LearningAdvice> {
  // 获取错题统计数据
  const overview = await getErrorQuestionOverview(userId);
  const subjectDist = await getSubjectDistribution(userId);
  const difficultyDist = await getDifficultyDistribution(userId);
  const knowledgeMastery = await getKnowledgePointMastery(userId, 10);

  // 如果没有错题数据，返回默认建议
  if (overview.totalErrors === 0) {
    return {
      overallAssessment: "目前还没有错题记录。建议开始录入错题，系统将为你提供个性化的学习建议。",
      learningTips: [
        {
          title: "开始记录错题",
          content: "养成记录错题的习惯，每次考试或作业后及时录入错题，帮助系统更好地分析你的学习情况。",
          priority: "high",
        },
        {
          title: "定期复习",
          content: "即使没有错题，也要保持定期复习的习惯，巩固已学知识。",
          priority: "medium",
        },
      ],
      reviewPlan: [],
      weaknesses: [],
      encouragement: "学习之路刚刚开始，加油！",
    };
  }

  // 构建统计数据摘要
  const statsSummary = {
    totalErrors: overview.totalErrors,
    masteredErrors: overview.masteredErrors,
    masteryRate: overview.masteryRate,
    subjectDistribution: subjectDist.map((s) => ({
      subject: getSubjectName(s.subject),
      count: s.count,
    })),
    difficultyDistribution: difficultyDist.map((d) => ({
      difficulty: getDifficultyName(d.difficulty || "medium"),
      count: d.count,
    })),
    knowledgePointMastery: knowledgeMastery.map((k) => ({
      knowledgePoint: k.knowledgePointName,
      masteryLevel: k.masteryLevel,
      totalErrors: k.totalErrors,
    })),
  };

  // 调用LLM生成学习建议
  const prompt = `你是一位经验丰富的学习顾问，专门为深圳初高中学生提供个性化学习建议。

请根据以下学生的错题统计数据，生成详细的学习建议和复习计划：

**错题统计数据：**
- 总错题数：${statsSummary.totalErrors}
- 已掌握错题数：${statsSummary.masteredErrors}
- 掌握率：${statsSummary.masteryRate}%

**学科分布：**
${statsSummary.subjectDistribution.map((s) => `- ${s.subject}：${s.count}道`).join("\n")}

**难度分布：**
${statsSummary.difficultyDistribution.map((d) => `- ${d.difficulty}：${d.count}道`).join("\n")}

**知识点掌握度（前10个）：**
${statsSummary.knowledgePointMastery.map((k) => `- ${k.knowledgePoint}：掌握度${k.masteryLevel}%（${k.totalErrors}道错题）`).join("\n")}

请生成以下内容（必须返回有效的JSON格式）：

1. **总体评估**（overallAssessment）：用1-2句话总结学生的整体学习状况
2. **个性化学习建议**（learningTips）：3-5条具体的学习建议，每条包括标题、内容和优先级（high/medium/low）
3. **智能复习计划**（reviewPlan）：按优先级排序的复习计划，每项包括学科、知识点（可选）、原因、建议复习时间、优先级（1-5）
4. **薄弱点诊断**（weaknesses）：识别2-3个最需要加强的领域，包括区域、严重程度（critical/moderate/minor）、建议
5. **激励语**（encouragement）：一句简短的激励话语

请确保建议具体、可操作，符合深圳初高中学生的实际情况。`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一位专业的学习顾问，擅长分析学生的学习数据并提供个性化建议。请以JSON格式返回结构化的学习建议。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "learning_advice",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallAssessment: {
                type: "string",
                description: "总体评估",
              },
              learningTips: {
                type: "array",
                description: "学习建议列表",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    priority: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                    },
                  },
                  required: ["title", "content", "priority"],
                  additionalProperties: false,
                },
              },
              reviewPlan: {
                type: "array",
                description: "复习计划列表",
                items: {
                  type: "object",
                  properties: {
                    subject: { type: "string" },
                    knowledgePoint: { type: "string" },
                    reason: { type: "string" },
                    suggestedTime: { type: "string" },
                    priority: { type: "number" },
                  },
                  required: ["subject", "reason", "suggestedTime", "priority"],
                  additionalProperties: false,
                },
              },
              weaknesses: {
                type: "array",
                description: "薄弱点列表",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string" },
                    severity: {
                      type: "string",
                      enum: ["critical", "moderate", "minor"],
                    },
                    recommendation: { type: "string" },
                  },
                  required: ["area", "severity", "recommendation"],
                  additionalProperties: false,
                },
              },
              encouragement: {
                type: "string",
                description: "激励语",
              },
            },
            required: [
              "overallAssessment",
              "learningTips",
              "reviewPlan",
              "weaknesses",
              "encouragement",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("LLM返回内容为空或格式错误");
    }

    const advice: LearningAdvice = JSON.parse(content);
    return advice;
  } catch (error) {
    console.error("生成学习建议失败:", error);
    
    // 返回基于规则的默认建议
    return generateRuleBasedAdvice(overview, subjectDist, difficultyDist, knowledgeMastery);
  }
}

/**
 * 基于规则生成默认建议（当LLM调用失败时使用）
 */
function generateRuleBasedAdvice(
  overview: Awaited<ReturnType<typeof getErrorQuestionOverview>>,
  subjectDist: Awaited<ReturnType<typeof getSubjectDistribution>>,
  difficultyDist: Awaited<ReturnType<typeof getDifficultyDistribution>>,
  knowledgeMastery: Awaited<ReturnType<typeof getKnowledgePointMastery>>
): LearningAdvice {
  const masteryRate = overview.masteryRate;
  
  // 总体评估
  let overallAssessment = "";
  if (masteryRate >= 80) {
    overallAssessment = `你的整体掌握率达到${masteryRate}%，表现优秀！继续保持，注意巩固薄弱知识点。`;
  } else if (masteryRate >= 60) {
    overallAssessment = `你的掌握率为${masteryRate}%，还有提升空间。建议重点复习未掌握的错题。`;
  } else {
    overallAssessment = `你的掌握率为${masteryRate}%，需要加强复习。建议制定系统的复习计划。`;
  }

  // 找出错题最多的学科
  const topSubjects = subjectDist
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 找出掌握度最低的知识点
  const weakKnowledgePoints = knowledgeMastery
    .sort((a, b) => a.masteryLevel - b.masteryLevel)
    .slice(0, 3);

  // 生成学习建议
  const learningTips: LearningAdvice["learningTips"] = [];
  
  if (topSubjects.length > 0) {
    learningTips.push({
      title: `重点关注${getSubjectName(topSubjects[0].subject)}`,
      content: `${getSubjectName(topSubjects[0].subject)}有${topSubjects[0].count}道错题，是你目前错题最多的学科。建议每天安排30-45分钟专项复习。`,
      priority: "high",
    });
  }

  if (weakKnowledgePoints.length > 0 && weakKnowledgePoints[0].masteryLevel < 50) {
    learningTips.push({
      title: "加强薄弱知识点",
      content: `"${weakKnowledgePoints[0].knowledgePointName}"的掌握度仅为${weakKnowledgePoints[0].masteryLevel}%，建议优先复习这个知识点。`,
      priority: "high",
    });
  }

  learningTips.push({
    title: "定期复习已掌握的内容",
    content: "已掌握的知识点也需要定期复习，防止遗忘。建议每周复习一次。",
    priority: "medium",
  });

  // 生成复习计划
  const reviewPlan: LearningAdvice["reviewPlan"] = [];
  
  weakKnowledgePoints.forEach((kp, index) => {
    reviewPlan.push({
      subject: "相关学科",
      knowledgePoint: kp.knowledgePointName,
      reason: `掌握度${kp.masteryLevel}%，需要重点复习`,
      suggestedTime: index === 0 ? "今天" : index === 1 ? "明天" : "本周内",
      priority: index + 1,
    });
  });

  // 薄弱点诊断
  const weaknesses: LearningAdvice["weaknesses"] = [];
  
  if (topSubjects.length > 0) {
    weaknesses.push({
      area: getSubjectName(topSubjects[0].subject),
      severity: topSubjects[0].count > 10 ? "critical" : "moderate",
      recommendation: `建议系统复习${getSubjectName(topSubjects[0].subject)}的基础知识，多做相关练习题。`,
    });
  }

  return {
    overallAssessment,
    learningTips,
    reviewPlan,
    weaknesses,
    encouragement: "每一次错题都是进步的机会，坚持下去，你一定能看到成长！",
  };
}

/**
 * 获取学科中文名称
 */
function getSubjectName(subject: string): string {
  const subjectNames: Record<string, string> = {
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
  return subjectNames[subject] || subject;
}

/**
 * 获取难度中文名称
 */
function getDifficultyName(difficulty: string): string {
  const difficultyNames: Record<string, string> = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  };
  return difficultyNames[difficulty] || difficulty;
}
