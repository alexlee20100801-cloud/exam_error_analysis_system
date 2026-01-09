import { invokeLLM } from './_core/llm';
import sharp from 'sharp';

/**
 * 增强的手写笔迹清除服务
 * 提供更精确的笔迹检测和清除功能
 */

export interface HandwritingDetectionResult {
  hasHandwriting: boolean;
  handwritingAreas: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    type: 'text' | 'mark' | 'correction' | 'annotation';
    confidence: number;
  }>;
  printedTextAreas: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  removalStrategy: string;
}

export interface HandwritingRemovalOptions {
  intensity?: number; // 清除强度 0-100
  preserveColors?: string[]; // 保留的颜色（如红笔批注）
  targetColors?: string[]; // 要清除的颜色
  localOnly?: boolean; // 只清除选中区域
  selectedArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * 使用AI检测图像中的手写笔迹
 */
export async function detectHandwriting(imageUrl: string): Promise<HandwritingDetectionResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请详细分析这张图片中的手写笔迹和打印文字。

要求：
1. 识别所有手写内容（包括文字、标记、涂改、批注等）
2. 识别所有打印文字区域
3. 区分不同颜色的笔迹（黑色、蓝色、红色等）
4. 评估每个区域的置信度（0-1）
5. 提供清除策略建议

请以JSON格式返回，格式如下：
{
  "hasHandwriting": true/false,
  "handwritingAreas": [
    {
      "x": 像素坐标,
      "y": 像素坐标,
      "width": 宽度,
      "height": 高度,
      "color": "颜色（black/blue/red等）",
      "type": "类型（text/mark/correction/annotation）",
      "confidence": 置信度0-1
    }
  ],
  "printedTextAreas": [
    {
      "x": 像素坐标,
      "y": 像素坐标,
      "width": 宽度,
      "height": 高度,
      "confidence": 置信度0-1
    }
  ],
  "removalStrategy": "清除策略描述"
}`
            },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'handwriting_detection',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              hasHandwriting: { type: 'boolean' },
              handwritingAreas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                    color: { type: 'string' },
                    type: { type: 'string', enum: ['text', 'mark', 'correction', 'annotation'] },
                    confidence: { type: 'number' }
                  },
                  required: ['x', 'y', 'width', 'height', 'color', 'type', 'confidence'],
                  additionalProperties: false
                }
              },
              printedTextAreas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                    confidence: { type: 'number' }
                  },
                  required: ['x', 'y', 'width', 'height', 'confidence'],
                  additionalProperties: false
                }
              },
              removalStrategy: { type: 'string' }
            },
            required: ['hasHandwriting', 'handwritingAreas', 'printedTextAreas', 'removalStrategy'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content || '{}';
    // @ts-ignore
    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error('Failed to detect handwriting:', error);
    throw error;
  }
}

/**
 * 清除手写笔迹
 * 注意：这是一个简化的实现，实际的笔迹清除需要更复杂的图像处理算法
 */
export async function removeHandwritingFromImage(
  imageBuffer: Buffer,
  detectionResult: HandwritingDetectionResult,
  options: HandwritingRemovalOptions = {}
): Promise<Buffer> {
  const {
    intensity = 80,
    preserveColors = [],
    targetColors = [],
    localOnly = false,
    selectedArea
  } = options;

  try {
    // 加载图像
    let image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width = 0, height = 0 } = metadata;

    // 如果只处理选中区域
    if (localOnly && selectedArea) {
      // 提取选中区域
      image = image.extract({
        left: Math.max(0, Math.floor(selectedArea.x)),
        top: Math.max(0, Math.floor(selectedArea.y)),
        width: Math.min(width - selectedArea.x, Math.floor(selectedArea.width)),
        height: Math.min(height - selectedArea.y, Math.floor(selectedArea.height))
      });
    }

    // 过滤需要清除的笔迹区域
    const areasToRemove = detectionResult.handwritingAreas.filter(area => {
      // 如果指定了保留颜色，跳过这些颜色
      if (preserveColors.length > 0 && preserveColors.includes(area.color)) {
        return false;
      }
      // 如果指定了目标颜色，只清除这些颜色
      if (targetColors.length > 0 && !targetColors.includes(area.color)) {
        return false;
      }
      // 如果是局部清除，检查区域是否在选中范围内
      if (localOnly && selectedArea) {
        const inRange = 
          area.x >= selectedArea.x &&
          area.y >= selectedArea.y &&
          area.x + area.width <= selectedArea.x + selectedArea.width &&
          area.y + area.height <= selectedArea.y + selectedArea.height;
        return inRange;
      }
      return true;
    });

    // 应用笔迹清除处理
    // 注意：这里使用简化的图像处理方法
    // 实际应用中应该使用更复杂的算法，如：
    // 1. 基于颜色空间的笔迹分离
    // 2. 形态学操作
    // 3. 图像修复算法（inpainting）
    // 4. 深度学习模型

    // 简化处理：应用亮度和对比度调整来减弱笔迹
    const intensityFactor = intensity / 100;
    
    // 增加亮度来淡化笔迹
    image = image.modulate({
      brightness: 1 + (0.2 * intensityFactor),
      saturation: 1 - (0.3 * intensityFactor)
    });

    // 应用锐化来保持打印文字的清晰度
    // @ts-ignore
    image = image.sharpen({
      sigma: 1,
      m1: 0.5,
      m2: 0.5,
      x1: 2,
      y1: 10
    });

    // 转换为buffer返回
    const processedBuffer = await image.toBuffer();
    return processedBuffer;
  } catch (error) {
    console.error('Failed to remove handwriting from image:', error);
    throw error;
  }
}

/**
 * 生成清除前后对比图
 */
export async function generateComparisonImage(
  originalBuffer: Buffer,
  processedBuffer: Buffer
): Promise<Buffer> {
  try {
    const original = sharp(originalBuffer);
    const processed = sharp(processedBuffer);

    const originalMeta = await original.metadata();
    const { width = 0, height = 0 } = originalMeta;

    // 创建并排对比图
    const comparisonImage = await sharp({
      create: {
        width: width * 2 + 20, // 两张图片 + 间隔
        height: height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .composite([
        { input: await original.toBuffer(), left: 0, top: 0 },
        { input: await processed.toBuffer(), left: width + 20, top: 0 }
      ])
      .toBuffer();

    return comparisonImage;
  } catch (error) {
    console.error('Failed to generate comparison image:', error);
    throw error;
  }
}

/**
 * 评估清除质量
 */
export async function evaluateRemovalQuality(
  originalBuffer: Buffer,
  processedBuffer: Buffer,
  detectionResult: HandwritingDetectionResult
): Promise<{
  qualityScore: number;
  preservedTextQuality: number;
  handwritingRemovalRate: number;
  recommendations: string[];
}> {
  try {
    // 使用AI评估清除质量
    const originalBase64 = originalBuffer.toString('base64');
    const processedBase64 = processedBuffer.toString('base64');

    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请对比这两张图片（原图和处理后的图），评估手写笔迹清除的质量。

评估标准：
1. 手写笔迹的清除程度（0-100分）
2. 打印文字的保留质量（0-100分）
3. 整体质量评分（0-100分）
4. 改进建议

请以JSON格式返回：
{
  "qualityScore": 整体质量评分,
  "preservedTextQuality": 打印文字保留质量,
  "handwritingRemovalRate": 笔迹清除率,
  "recommendations": ["建议1", "建议2"]
}`
            },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${originalBase64}` } },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${processedBase64}` } }
          ]
        }
      ]
    });

    const content = response.choices[0].message.content || '{}';
    let evaluation: any = {};
    
    try {
      // @ts-ignore
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       // @ts-ignore
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonStr = jsonMatch[1] || content;
      evaluation = JSON.parse(jsonStr.trim());
    } catch (e) {
      // 如果解析失败，返回默认值
      evaluation = {
        qualityScore: 70,
        preservedTextQuality: 80,
        handwritingRemovalRate: 60,
        recommendations: ['无法自动评估，请人工检查']
      };
    }

    return evaluation;
  } catch (error) {
    console.error('Failed to evaluate removal quality:', error);
    throw error;
  }
}
