import { invokeLLM } from "./_core/llm";
import { getPathStatistics } from "./learningPathService";

/**
 * 生成个性化学习建议
 */
export async function generateLearningAdvice(pathId: number, userId: number) {
  // 获取统计数据
  const statistics = await getPathStatistics(pathId, userId);

  // 构建提示词
  const prompt = buildAdvicePrompt(statistics);

  // 调用LLM生成建议
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是一位经验丰富的教育专家，擅长分析学生的学习数据并提供个性化的学习建议。请根据学生的学习统计数据，生成具体、可操作的学习建议。",
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
            overall_assessment: {
              type: "string",
              description: "对学生整体学习情况的评价（2-3句话）",
            },
            knowledge_consolidation: {
              type: "array",
              description: "知识点巩固建议列表",
              items: {
                type: "object",
                properties: {
                  knowledge_point: { type: "string", description: "知识点名称" },
                  suggestion: { type: "string", description: "具体建议" },
                  priority: { type: "string", enum: ["high", "medium", "low"], description: "优先级" },
                },
                required: ["knowledge_point", "suggestion", "priority"],
                additionalProperties: false,
              },
            },
            learning_methods: {
              type: "array",
              description: "学习方法建议列表",
              items: {
                type: "object",
                properties: {
                  method: { type: "string", description: "学习方法名称" },
                  description: { type: "string", description: "方法描述和使用场景" },
                },
                required: ["method", "description"],
                additionalProperties: false,
              },
            },
            time_management: {
              type: "object",
              description: "时间管理建议",
              properties: {
                daily_study_time: { type: "string", description: "建议的每日学习时长" },
                focus_areas: {
                  type: "array",
                  description: "需要重点关注的领域",
                  items: { type: "string" },
                },
              },
              required: ["daily_study_time", "focus_areas"],
              additionalProperties: false,
            },
            next_steps: {
              type: "array",
              description: "接下来的行动步骤",
              items: { type: "string" },
            },
          },
          required: [
            "overall_assessment",
            "knowledge_consolidation",
            "learning_methods",
            "time_management",
            "next_steps",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("Failed to generate learning advice");
  }

  return JSON.parse(content);
}

/**
 * 构建学习建议提示词
 */
function buildAdvicePrompt(statistics: any): string {
  const {
    scoresTrend,
    knowledgePointMastery,
    totalStudyTime,
    averageScore,
    improvement,
    completedNodes,
    totalNodes,
  } = statistics;

  let prompt = `请分析以下学生的学习数据，并生成个性化的学习建议：

## 学习进度
- 已完成节点：${completedNodes}/${totalNodes}
- 总学习时长：${totalStudyTime}分钟
- 平均得分：${averageScore}分
- 进步幅度：${improvement > 0 ? "+" : ""}${improvement}分

## 得分趋势
`;

  if (scoresTrend.length > 0) {
    prompt += scoresTrend
      .map((item: any) => `- 节点${item.nodeIndex}：${item.score}分`)
      .join("\n");
  } else {
    prompt += "暂无得分数据";
  }

  prompt += `

## 知识点掌握度
`;

  if (knowledgePointMastery.length > 0) {
    prompt += knowledgePointMastery
      .map((item: any) => `- ${item.knowledgePoint}：${item.masteryLevel}%`)
      .join("\n");
  } else {
    prompt += "暂无知识点数据";
  }

  prompt += `

请根据以上数据：
1. 评价学生的整体学习情况
2. 针对薄弱的知识点提供巩固建议（按优先级排序）
3. 推荐适合的学习方法
4. 提供时间管理建议
5. 列出接下来的具体行动步骤

要求：
- 建议要具体、可操作
- 语言要鼓励、积极
- 考虑学生的实际情况和进步空间`;

  return prompt;
}
