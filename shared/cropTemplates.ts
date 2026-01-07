/**
 * 框选模板类型定义
 */

export interface CropArea {
  x: number; // 相对位置 0-100%
  y: number;
  width: number;
  height: number;
  label?: string; // 区域标签，如"题目"、"选项A"等
}

export interface CropTemplate {
  id: string;
  name: string;
  description: string;
  category: 'choice' | 'fill' | 'answer' | 'custom'; // 题型分类
  icon?: string;
  areas: CropArea[]; // 预设的框选区域
  thumbnail?: string; // 模板缩略图
}

/**
 * 预设框选模板
 */
export const PRESET_CROP_TEMPLATES: CropTemplate[] = [
  {
    id: 'single-choice-4',
    name: '单选题（4选项）',
    description: '适用于标准的4选项单选题',
    category: 'choice',
    icon: '📝',
    areas: [
      { x: 10, y: 10, width: 80, height: 15, label: '题目' },
      { x: 10, y: 30, width: 35, height: 10, label: '选项A' },
      { x: 55, y: 30, width: 35, height: 10, label: '选项B' },
      { x: 10, y: 45, width: 35, height: 10, label: '选项C' },
      { x: 55, y: 45, width: 35, height: 10, label: '选项D' },
    ],
  },
  {
    id: 'multiple-choice-4',
    name: '多选题（4选项）',
    description: '适用于标准的4选项多选题',
    category: 'choice',
    icon: '☑️',
    areas: [
      { x: 10, y: 10, width: 80, height: 15, label: '题目' },
      { x: 10, y: 30, width: 35, height: 10, label: '选项A' },
      { x: 55, y: 30, width: 35, height: 10, label: '选项B' },
      { x: 10, y: 45, width: 35, height: 10, label: '选项C' },
      { x: 55, y: 45, width: 35, height: 10, label: '选项D' },
    ],
  },
  {
    id: 'fill-blank-single',
    name: '填空题（单空）',
    description: '适用于单个填空的题目',
    category: 'fill',
    icon: '✏️',
    areas: [
      { x: 10, y: 10, width: 80, height: 20, label: '题目' },
      { x: 10, y: 35, width: 80, height: 15, label: '答案区域' },
    ],
  },
  {
    id: 'fill-blank-multiple',
    name: '填空题（多空）',
    description: '适用于多个填空的题目',
    category: 'fill',
    icon: '✏️',
    areas: [
      { x: 10, y: 10, width: 80, height: 25, label: '题目' },
      { x: 10, y: 40, width: 38, height: 12, label: '答案1' },
      { x: 52, y: 40, width: 38, height: 12, label: '答案2' },
      { x: 10, y: 55, width: 38, height: 12, label: '答案3' },
      { x: 52, y: 55, width: 38, height: 12, label: '答案4' },
    ],
  },
  {
    id: 'answer-short',
    name: '简答题',
    description: '适用于简短的解答题',
    category: 'answer',
    icon: '📄',
    areas: [
      { x: 10, y: 10, width: 80, height: 20, label: '题目' },
      { x: 10, y: 35, width: 80, height: 55, label: '答案区域' },
    ],
  },
  {
    id: 'answer-long',
    name: '解答题（长）',
    description: '适用于需要详细解答的题目',
    category: 'answer',
    icon: '📋',
    areas: [
      { x: 5, y: 5, width: 90, height: 15, label: '题目' },
      { x: 5, y: 22, width: 90, height: 73, label: '答案区域' },
    ],
  },
  {
    id: 'full-page',
    name: '整页题目',
    description: '框选整个页面作为一道题',
    category: 'custom',
    icon: '🖼️',
    areas: [
      { x: 5, y: 5, width: 90, height: 90, label: '完整题目' },
    ],
  },
  {
    id: 'two-columns',
    name: '双栏题目',
    description: '适用于左右分栏的题目',
    category: 'custom',
    icon: '📰',
    areas: [
      { x: 5, y: 5, width: 42, height: 90, label: '左栏' },
      { x: 53, y: 5, width: 42, height: 90, label: '右栏' },
    ],
  },
];

/**
 * 根据分类获取模板
 */
export function getTemplatesByCategory(category: CropTemplate['category']): CropTemplate[] {
  return PRESET_CROP_TEMPLATES.filter(t => t.category === category);
}

/**
 * 根据ID获取模板
 */
export function getTemplateById(id: string): CropTemplate | undefined {
  return PRESET_CROP_TEMPLATES.find(t => t.id === id);
}

/**
 * 将模板区域转换为实际像素坐标
 */
export function templateAreaToPixels(
  area: CropArea,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: (area.x / 100) * imageWidth,
    y: (area.y / 100) * imageHeight,
    width: (area.width / 100) * imageWidth,
    height: (area.height / 100) * imageHeight,
  };
}

/**
 * 将像素坐标转换为模板区域（百分比）
 */
export function pixelsToTemplateArea(
  pixels: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  label?: string
): CropArea {
  return {
    x: (pixels.x / imageWidth) * 100,
    y: (pixels.y / imageHeight) * 100,
    width: (pixels.width / imageWidth) * 100,
    height: (pixels.height / imageHeight) * 100,
    label,
  };
}
