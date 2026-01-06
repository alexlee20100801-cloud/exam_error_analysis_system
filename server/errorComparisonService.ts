import { invokeLLM } from "./_core/llm";
import { getKnowledgePointErrors } from "./knowledgePointDetailService";

/**
 * 错误类型定义
 */
export type ErrorType = 
  | "concept_misunderstanding"      // 概念理解错误
  | "calculation_error"             // 计算错误
  | "careless_mistake"              // 粗心大意
  | "problem_reading_error"         // 审题失误
  | "method_selection_error"        // 方法选择错误
  | "formula_application_error"     // 公式应用错误
  | "logical_reasoning_error"       // 逻辑推理错误
  | "knowledge_gap";                // 知识盲区

/**
 * 错误类型中文名称映射
 */
export const ERROR_TYPE_NAMES: Record<ErrorType, string> = {
  concept_misunderstanding: "概念理解错误",
  calculation_error: "计算错误",
  careless_mistake: "粗心大意",
  problem_reading_error: "审题失误",
  method_selection_error: "方法选择错误",
  formula_application_error: "公式应用错误",
  logical_reasoning_error: "逻辑推理错误",
  knowledge_gap: "知识盲区",
};

/**
 * 错题分组结果
 */
export interface ErrorGroup {
  errorType: ErrorType;
  errorTypeName: string;
  errors: Array<{
    id: number;
    title: string;
    userAnswer: string | null;
    correctAnswer: string | null;
    errorAnalysis: string | null;
  }>;
  commonPattern: string;  // 该组错题的共同模式
  count: number;
}

/**
 * 错题对比分析结果
 */
export interface ErrorComparisonResult {
  totalErrors: number;
  errorGroups: ErrorGroup[];
  overallPattern: string;  // 整体错误模式总结
  targetedSuggestions: string[];  // 举一反三的专项练习建议
}

/**
 * AI分析错题并进行分类
 */
export async function analyzeAndClassifyErrors(userId: string, knowledgePointId: number): Promise<ErrorComparisonResult> {
  // 获取该知识点的所有错题
  const errors = await getKnowledgePointErrors(userId, knowledgePointId);

  if (errors.length === 0) {
    return {
      totalErrors: 0,
      errorGroups: [],
      overallPattern: "暂无错题数据",
      targetedSuggestions: ["继续练习该知识点，积累更多数据后将为您提供专项练习建议。"],
    };
  }

  // 如果只有1道错题，无法进行对比分析
  if (errors.length === 1) {
    return {
      totalErrors: 1,
      errorGroups: [],
      overallPattern: "错题数量较少，暂无法进行横向对比分析",
      targetedSuggestions: ["建议继续练习该知识点，积累更多错题后可进行深度对比分析。"],
    };
  }

  // 构建AI分析提示词
  const errorSummary = errors.map((err, index) => {
    return `错题${index + 1}：
ID: ${err.id}
题目：${err.title}
用户答案：${err.userAnswer || "未作答"}
正确答案：${err.correctAnswer || "未提供"}
AI分析：${err.errorAnalysis || "未分析"}
`;
  }).join("\n\n");

  const prompt = `你是一位经验丰富的教育专家。请对以下${errors.length}道同一知识点的错题进行横向对比分析，识别错误类型并生成举一反三的练习建议。

错题列表：
${errorSummary}

请以JSON格式返回分析结果，包含以下字段：
{
  "errorGroups": [
    {
      "errorType": "错误类型（从以下选项中选择：concept_misunderstanding, calculation_error, careless_mistake, problem_reading_error, method_selection_error, formula_application_error, logical_reasoning_error, knowledge_gap）",
      "errorIds": [错题ID数组],
      "commonPattern": "该组错题的共同错误模式描述（30-50字）"
    }
  ],
  "overallPattern": "整体错误模式总结（50-80字）",
  "targetedSuggestions": [
    "针对性练习建议1（具体、可操作）",
    "针对性练习建议2",
    "针对性练习建议3"
  ]
}

要求：
1. 将错题按错误类型分组，每组至少包含1道错题
2. commonPattern要准确描述该组错题的共同特征
3. overallPattern要总结学生在该知识点上的整体问题
4. targetedSuggestions要给出3-5条具体的"举一反三"练习建议
5. 建议要可操作，例如"多练习含参数的二次函数问题"而不是"加强练习"`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一位教育专家，擅长分析学生的错题模式并给出针对性建议。" },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "error_comparison",
          strict: true,
          schema: {
            type: "object",
            properties: {
              errorGroups: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    errorType: {
                      type: "string",
                      enum: [
                        "concept_misunderstanding",
                        "calculation_error",
                        "careless_mistake",
                        "problem_reading_error",
                        "method_selection_error",
                        "formula_application_error",
                        "logical_reasoning_error",
                        "knowledge_gap",
                      ],
                    },
                    errorIds: {
                      type: "array",
                      items: { type: "number" },
                    },
                    commonPattern: { type: "string" },
                  },
                  required: ["errorType", "errorIds", "commonPattern"],
                  additionalProperties: false,
                },
              },
              overallPattern: { type: "string" },
              targetedSuggestions: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["errorGroups", "overallPattern", "targetedSuggestions"],
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

    // 构建返回结果
    const errorGroups: ErrorGroup[] = analysis.errorGroups.map((group: any) => {
      const groupErrors = errors.filter(err => group.errorIds.includes(err.id));
      return {
        errorType: group.errorType as ErrorType,
        errorTypeName: ERROR_TYPE_NAMES[group.errorType as ErrorType],
        errors: groupErrors.map(err => ({
          id: err.id,
          title: err.title,
          userAnswer: err.userAnswer,
          correctAnswer: err.correctAnswer,
          errorAnalysis: err.errorAnalysis,
        })),
        commonPattern: group.commonPattern,
        count: groupErrors.length,
      };
    });

    return {
      totalErrors: errors.length,
      errorGroups,
      overallPattern: analysis.overallPattern,
      targetedSuggestions: analysis.targetedSuggestions,
    };
  } catch (error) {
    console.error("AI错题对比分析失败:", error);
    return {
      totalErrors: errors.length,
      errorGroups: [],
      overallPattern: "AI分析暂时不可用，请稍后重试。",
      targetedSuggestions: ["请稍后重试"],
    };
  }
}

/**
 * 生成针对特定错误类型的专项练习题提示词
 */
export function generateTargetedPracticePrompt(
  knowledgePointName: string,
  errorType: ErrorType,
  errorPattern: string
): string {
  const errorTypeName = ERROR_TYPE_NAMES[errorType];
  
  return `请生成3道针对"${knowledgePointName}"知识点的专项练习题，重点训练学生克服"${errorTypeName}"问题。

学生的错误模式：${errorPattern}

要求：
1. 题目难度适中，与学生错题难度相当
2. 题目设计要针对学生的具体错误模式
3. 题目要有区分度，能检验学生是否真正掌握
4. 提供详细的解题步骤和易错点提示`;
}
