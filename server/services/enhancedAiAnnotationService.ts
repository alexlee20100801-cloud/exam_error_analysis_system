import { invokeLLM } from "../_core/llm";
import type { Annotation } from "../types/annotationTemplate";
import { getTemplateByType } from "./chartTypeTemplateService";

/**
 * 增强的AI标注服务
 * 集成图表类型识别和针对性的标注生成
 */

export interface EnhancedAnnotationResult {
  chartType: string;
  chartTypeName: string;
  suggestions: Annotation[];
  confidence: number;
  recognizedFeatures: {
    keyPoints?: Array<{ name: string; x: number; y: number }>;
    curveCharacteristics?: string[];
    coordinateFeatures?: string[];
  };
}

/**
 * 第一步：识别图表类型
 */
async function identifyChartType(imageUrl: string, subject?: string): Promise<{
  chartType: string;
  confidence: number;
}> {
  const systemPrompt = `你是一个专业的图表类型识别专家。
请分析图片中的图表，识别其类型。

支持的图表类型：
- quadratic_function: 二次函数图像（抛物线）
- trigonometric_function: 三角函数图像（正弦、余弦、正切等）
- linear_function: 一次函数图像（直线）
- exponential_function: 指数函数图像
- logarithmic_function: 对数函数图像
- circle: 圆的图像
- data_bar_chart: 柱状图
- data_line_chart: 折线图
- other: 其他类型

请返回最匹配的图表类型和置信度。`;

  const userPrompt = subject
    ? `这是一张${subject}学科的图表。请识别其类型。`
    : `请识别这张图表的类型。`;

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
          name: "chart_type_identification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              chartType: {
                type: "string",
                description: "图表类型标识符",
              },
              confidence: {
                type: "number",
                description: "识别置信度，0到1之间",
              },
            },
            required: ["chartType", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI响应为空");
    }

    // @ts-ignore
    return JSON.parse(content);
  } catch (error) {
    console.error("识别图表类型失败:", error);
    return { chartType: "other", confidence: 0 };
  }
}

/**
 * 第二步：根据图表类型生成针对性的标注
 */
async function generateTypedAnnotations(
  imageUrl: string,
  chartType: string,
  subject?: string
): Promise<EnhancedAnnotationResult> {
  // 获取该图表类型的模板
  const template = await getTemplateByType(chartType);

  let systemPrompt = `你是一个专业的图表分析助手，擅长标注${template?.name || "图表"}。

请分析图片中的图表，识别关键点和特征，然后生成精确的标注建议。

坐标系统：假设图片尺寸为600x400，左上角为(0,0)，右下角为(600,400)
标注类型支持：arrow（箭头）, text（文字）, circle（圆圈）, rectangle（矩形）, highlight（高亮）

颜色建议：
- 关键点用红色 (#ef4444)
- 坐标轴用蓝色 (#3b82f6)
- 辅助线用绿色 (#22c55e)
- 文字说明用黑色 (#000000)`;

  // 如果有模板，使用模板的识别提示词
  if (template?.recognitionPrompt) {
    systemPrompt += `\n\n特殊要求：\n${template.recognitionPrompt}`;
  }

  const userPrompt = subject
    ? `这是一张${subject}学科的${template?.name || "图表"}。请生成详细的标注建议。`
    : `请为这张${template?.name || "图表"}生成详细的标注建议。`;

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
          name: "typed_annotation_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
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
              recognizedFeatures: {
                type: "object",
                description: "识别到的图表特征",
                properties: {
                  keyPoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        x: { type: "number" },
                        y: { type: "number" },
                      },
                      required: ["name", "x", "y"],
                      additionalProperties: false,
                    },
                  },
                  curveCharacteristics: {
                    type: "array",
                    items: { type: "string" },
                  },
                  coordinateFeatures: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: [],
                additionalProperties: false,
              },
              confidence: {
                type: "number",
                description: "标注质量置信度，0到1之间",
              },
            },
            required: ["suggestions", "recognizedFeatures", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI响应为空");
    }

    // @ts-ignore
    const result = JSON.parse(content);
    return {
      chartType,
      chartTypeName: template?.name || chartType,
      ...result,
    };
  } catch (error) {
    console.error("生成标注失败:", error);
    throw error;
  }
}

/**
 * 主函数：生成增强的AI标注建议
 */
export async function generateEnhancedAnnotationSuggestions(
  imageUrl: string,
  subject?: string
): Promise<EnhancedAnnotationResult> {
  // 第一步：识别图表类型
  const { chartType, confidence: typeConfidence } = await identifyChartType(imageUrl, subject);

  console.log(`识别到图表类型: ${chartType}, 置信度: ${typeConfidence}`);

  // 第二步：生成针对性的标注
  const result = await generateTypedAnnotations(imageUrl, chartType, subject);

  // 综合置信度（类型识别置信度 × 标注质量置信度）
  result.confidence = typeConfidence * result.confidence;

  return result;
}

/**
 * 针对二次函数的专用标注生成
 */
export async function generateQuadraticFunctionAnnotations(
  imageUrl: string
): Promise<EnhancedAnnotationResult> {
  const systemPrompt = `你是一个专业的二次函数图像分析专家。

请分析这个二次函数图像，精确识别以下关键特征：

1. **顶点**：抛物线的最高点或最低点，标注坐标(h, k)
2. **对称轴**：通过顶点的垂直线，标注x = h
3. **开口方向**：向上或向下
4. **y轴截距**：与y轴的交点，标注(0, c)
5. **x轴截距**（零点）：与x轴的交点（如果存在），标注坐标
6. **坐标轴刻度**：识别x轴和y轴的刻度范围

标注要求：
- 用红色圆圈标记关键点（顶点、截距）
- 用蓝色虚线标记对称轴
- 用绿色箭头指向并说明开口方向
- 用黑色文字标注坐标和数学意义

坐标系统：图片尺寸600x400，左上角(0,0)`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "请分析这个二次函数图像并生成详细标注。" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quadratic_function_annotations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
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
              recognizedFeatures: {
                type: "object",
                properties: {
                  keyPoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        x: { type: "number" },
                        y: { type: "number" },
                      },
                      required: ["name", "x", "y"],
                      additionalProperties: false,
                    },
                  },
                  curveCharacteristics: {
                    type: "array",
                    items: { type: "string" },
                  },
                  coordinateFeatures: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: [],
                additionalProperties: false,
              },
              confidence: { type: "number" },
            },
            required: ["suggestions", "recognizedFeatures", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI响应为空");
    }

    // @ts-ignore
    const result = JSON.parse(content);
    return {
      chartType: "quadratic_function",
      chartTypeName: "二次函数图像",
      ...result,
    };
  } catch (error) {
    console.error("生成二次函数标注失败:", error);
    throw error;
  }
}

/**
 * 针对三角函数的专用标注生成
 */
export async function generateTrigonometricFunctionAnnotations(
  imageUrl: string
): Promise<EnhancedAnnotationResult> {
  const systemPrompt = `你是一个专业的三角函数图像分析专家。

请分析这个三角函数图像，精确识别以下关键特征：

1. **振幅A**：最大值和最小值之间的距离的一半
2. **周期T**：完整波形的长度（相邻两个最大值或最小值之间的距离）
3. **相位φ**：初始相位偏移
4. **最大值点**：波峰位置，标注坐标
5. **最小值点**：波谷位置，标注坐标
6. **零点**：与x轴的交点，标注坐标
7. **对称中心**：标注位置（如果是正弦或余弦函数）

标注要求：
- 用红色圆圈标记最大值和最小值点
- 用蓝色虚线标记周期T
- 用绿色箭头标记振幅A
- 用黑色文字标注关键参数和坐标

坐标系统：图片尺寸600x400，左上角(0,0)`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "请分析这个三角函数图像并生成详细标注。" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "trigonometric_function_annotations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
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
              recognizedFeatures: {
                type: "object",
                properties: {
                  keyPoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        x: { type: "number" },
                        y: { type: "number" },
                      },
                      required: ["name", "x", "y"],
                      additionalProperties: false,
                    },
                  },
                  curveCharacteristics: {
                    type: "array",
                    items: { type: "string" },
                  },
                  coordinateFeatures: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: [],
                additionalProperties: false,
              },
              confidence: { type: "number" },
            },
            required: ["suggestions", "recognizedFeatures", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI响应为空");
    }

    // @ts-ignore
    const result = JSON.parse(content);
    return {
      chartType: "trigonometric_function",
      chartTypeName: "三角函数图像",
      ...result,
    };
  } catch (error) {
    console.error("生成三角函数标注失败:", error);
    throw error;
  }
}
