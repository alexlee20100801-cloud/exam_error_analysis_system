import { invokeLLM } from "../_core/llm";
import type { Annotation } from "../types/annotationTemplate";

/**
 * AI分析图表并生成标注建议
 */
export async function generateAnnotationSuggestions(imageUrl: string, subject?: string): Promise<{
  chartType: string;
  suggestions: Annotation[];
  confidence: number;
}> {
  const systemPrompt = `你是一个专业的图表分析助手，擅长识别和标注各种学科的图表。
你的任务是分析图片中的图表，识别关键点和特征，然后生成标注建议。

请识别以下内容：
1. 图表类型（坐标系、函数图像、几何图形、数据图表等）
2. 关键点位置（极值点、交点、拐点、零点等）
3. 重要元素（坐标轴、标题、图例等）

返回JSON格式的标注建议，包含：
- chartType: 图表类型
- suggestions: 标注数组，每个标注包含type, x, y, text, color等属性
- confidence: 置信度(0-1)

标注类型支持：arrow（箭头）, text（文字）, circle（圆圈）, rectangle（矩形）, highlight（高亮）

坐标系统：假设图片尺寸为600x400，左上角为(0,0)，右下角为(600,400)`;

  const userPrompt = subject 
    ? `这是一张${subject}学科的图表。请分析并生成标注建议。`
    : `请分析这张图表并生成标注建议。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "annotation_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              chartType: {
                type: "string",
                description: "图表类型，如：坐标系、函数图像、几何图形、柱状图等",
              },
              suggestions: {
                type: "array",
                description: "标注建议数组",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["arrow", "text", "circle", "rectangle", "highlight"],
                    },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    endX: { type: "number" },
                    endY: { type: "number" },
                    text: { type: "string" },
                    color: { type: "string" },
                    fontSize: { type: "number" },
                  },
                  required: ["id", "type", "x", "y", "color"],
                  additionalProperties: false,
                },
              },
              confidence: {
                type: "number",
                description: "置信度，0到1之间",
              },
            },
            required: ["chartType", "suggestions", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI响应为空");
    }

    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error("AI标注生成失败:", error);
    throw new Error("AI标注生成失败，请稍后重试");
  }
}

/**
 * 识别图表中的关键点
 */
export async function detectKeyPoints(imageUrl: string, chartType: string): Promise<{
  extremePoints: Array<{ x: number; y: number; type: "max" | "min" }>;
  intersections: Array<{ x: number; y: number }>;
  inflectionPoints: Array<{ x: number; y: number }>;
}> {
  const systemPrompt = `你是一个专业的数学图表分析助手。
请分析${chartType}图表，识别以下关键点：
1. 极值点（极大值和极小值）
2. 交点（与坐标轴或其他曲线的交点）
3. 拐点（曲线凹凸性改变的点）

返回JSON格式，坐标系统：假设图片尺寸为600x400，左上角为(0,0)。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "请识别图表中的关键点" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "key_points",
          strict: true,
          schema: {
            type: "object",
            properties: {
              extremePoints: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    type: { type: "string", enum: ["max", "min"] },
                  },
                  required: ["x", "y", "type"],
                  additionalProperties: false,
                },
              },
              intersections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                  },
                  required: ["x", "y"],
                  additionalProperties: false,
                },
              },
              inflectionPoints: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                  },
                  required: ["x", "y"],
                  additionalProperties: false,
                },
              },
            },
            required: ["extremePoints", "intersections", "inflectionPoints"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI响应为空");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("关键点识别失败:", error);
    throw new Error("关键点识别失败，请稍后重试");
  }
}

/**
 * 将关键点转换为标注
 */
export function convertKeyPointsToAnnotations(keyPoints: {
  extremePoints: Array<{ x: number; y: number; type: "max" | "min" }>;
  intersections: Array<{ x: number; y: number }>;
  inflectionPoints: Array<{ x: number; y: number }>;
}): Annotation[] {
  const annotations: Annotation[] = [];
  let idCounter = 1;

  // 极值点标注
  keyPoints.extremePoints.forEach((point) => {
    annotations.push({
      id: `ai-${idCounter++}`,
      type: "circle",
      x: point.x - 10,
      y: point.y - 10,
      width: 20,
      height: 20,
      color: point.type === "max" ? "#ef4444" : "#3b82f6",
    });
    annotations.push({
      id: `ai-${idCounter++}`,
      type: "text",
      x: point.x + 15,
      y: point.y - 5,
      text: point.type === "max" ? "极大值" : "极小值",
      color: point.type === "max" ? "#ef4444" : "#3b82f6",
      fontSize: 14,
    });
  });

  // 交点标注
  keyPoints.intersections.forEach((point) => {
    annotations.push({
      id: `ai-${idCounter++}`,
      type: "circle",
      x: point.x - 8,
      y: point.y - 8,
      width: 16,
      height: 16,
      color: "#10b981",
    });
    annotations.push({
      id: `ai-${idCounter++}`,
      type: "text",
      x: point.x + 12,
      y: point.y - 5,
      text: "交点",
      color: "#10b981",
      fontSize: 12,
    });
  });

  // 拐点标注
  keyPoints.inflectionPoints.forEach((point) => {
    annotations.push({
      id: `ai-${idCounter++}`,
      type: "circle",
      x: point.x - 8,
      y: point.y - 8,
      width: 16,
      height: 16,
      color: "#f59e0b",
    });
    annotations.push({
      id: `ai-${idCounter++}`,
      type: "text",
      x: point.x + 12,
      y: point.y - 5,
      text: "拐点",
      color: "#f59e0b",
      fontSize: 12,
    });
  });

  return annotations;
}
