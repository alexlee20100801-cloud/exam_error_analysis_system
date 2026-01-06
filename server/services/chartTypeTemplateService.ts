import { getDb } from '../db';
import { chartTypeTemplates } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * 图表类型模板服务
 * 管理常见图表类型的识别模板和特征
 */

export interface ChartTypeTemplate {
  chartType: string;
  name: string;
  category: 'math_function' | 'geometry' | 'physics' | 'chemistry' | 'data_visualization';
  description: string;
  featurePatterns: {
    keyPoints?: string[];
    curveCharacteristics?: string[];
    coordinateFeatures?: string[];
  };
  recognitionPrompt: string;
}

/**
 * 预设的图表类型模板
 */
const PRESET_TEMPLATES: ChartTypeTemplate[] = [
  {
    chartType: 'quadratic_function',
    name: '二次函数图像',
    category: 'math_function',
    description: '抛物线形状的二次函数y=ax²+bx+c图像',
    featurePatterns: {
      keyPoints: ['vertex', 'axis_of_symmetry', 'y_intercept', 'x_intercepts'],
      curveCharacteristics: ['parabola', 'opening_direction', 'symmetry'],
      coordinateFeatures: ['cartesian_coordinate', 'grid_lines', 'axis_labels'],
    },
    recognitionPrompt: `分析这个二次函数图像，识别以下关键特征：
1. 顶点坐标（最高点或最低点）
2. 对称轴位置（x = h的直线）
3. 开口方向（向上或向下）
4. 与y轴的交点（c值）
5. 与x轴的交点（零点，如果存在）
6. 坐标轴的刻度和范围

请标注这些关键点，并用箭头和文字说明它们的数学意义。`,
  },
  {
    chartType: 'trigonometric_function',
    name: '三角函数图像',
    category: 'math_function',
    description: '正弦、余弦、正切等三角函数图像',
    featurePatterns: {
      keyPoints: ['maximum_points', 'minimum_points', 'zero_crossings', 'inflection_points'],
      curveCharacteristics: ['periodicity', 'amplitude', 'phase_shift', 'wave_pattern'],
      coordinateFeatures: ['cartesian_coordinate', 'period_markers', 'amplitude_markers'],
    },
    recognitionPrompt: `分析这个三角函数图像，识别以下关键特征：
1. 最大值和最小值点（振幅A）
2. 周期T（完整波形的长度）
3. 相位φ（初始相位偏移）
4. 零点（与x轴的交点）
5. 对称中心或对称轴
6. 坐标轴的刻度（特别是π的倍数）

请标注周期、振幅、相位等关键参数，并用箭头指示波形的变化规律。`,
  },
  {
    chartType: 'linear_function',
    name: '一次函数图像',
    category: 'math_function',
    description: '直线形状的一次函数y=kx+b图像',
    featurePatterns: {
      keyPoints: ['y_intercept', 'x_intercept', 'slope_points'],
      curveCharacteristics: ['straight_line', 'slope', 'direction'],
      coordinateFeatures: ['cartesian_coordinate', 'grid_lines'],
    },
    recognitionPrompt: `分析这个一次函数图像，识别以下关键特征：
1. 斜率k（直线的倾斜程度）
2. y轴截距b（与y轴的交点）
3. x轴截距（与x轴的交点）
4. 直线的方向（上升或下降）
5. 坐标轴的刻度

请标注斜率、截距等关键参数。`,
  },
  {
    chartType: 'exponential_function',
    name: '指数函数图像',
    category: 'math_function',
    description: '指数增长或衰减的函数图像y=a^x',
    featurePatterns: {
      keyPoints: ['y_intercept', 'asymptote_point'],
      curveCharacteristics: ['exponential_growth', 'exponential_decay', 'asymptote'],
      coordinateFeatures: ['cartesian_coordinate', 'asymptote_line'],
    },
    recognitionPrompt: `分析这个指数函数图像，识别以下关键特征：
1. 渐近线（通常是x轴，y=0）
2. 与y轴的交点（x=0时的值）
3. 增长方向（增长或衰减）
4. 增长速率的变化
5. 特殊点坐标

请标注渐近线、关键点和增长趋势。`,
  },
  {
    chartType: 'logarithmic_function',
    name: '对数函数图像',
    category: 'math_function',
    description: '对数函数y=log_a(x)图像',
    featurePatterns: {
      keyPoints: ['x_intercept', 'asymptote_point'],
      curveCharacteristics: ['logarithmic_curve', 'asymptote', 'growth_rate'],
      coordinateFeatures: ['cartesian_coordinate', 'asymptote_line'],
    },
    recognitionPrompt: `分析这个对数函数图像，识别以下关键特征：
1. 渐近线（通常是y轴，x=0）
2. 与x轴的交点（y=0时的x值）
3. 增长方向和速率
4. 定义域限制（x>0）
5. 特殊点坐标

请标注渐近线、关键点和函数性质。`,
  },
  {
    chartType: 'circle',
    name: '圆的图像',
    category: 'geometry',
    description: '圆的标准方程(x-h)²+(y-k)²=r²的图像',
    featurePatterns: {
      keyPoints: ['center', 'radius_endpoints'],
      curveCharacteristics: ['circular_shape', 'symmetry'],
      coordinateFeatures: ['cartesian_coordinate', 'center_marker'],
    },
    recognitionPrompt: `分析这个圆的图像，识别以下关键特征：
1. 圆心坐标(h, k)
2. 半径r的长度
3. 圆与坐标轴的交点
4. 圆的对称性

请标注圆心、半径和关键点。`,
  },
  {
    chartType: 'data_bar_chart',
    name: '柱状图',
    category: 'data_visualization',
    description: '用于比较不同类别数据的柱状图',
    featurePatterns: {
      keyPoints: ['bar_tops', 'axis_labels'],
      curveCharacteristics: ['rectangular_bars', 'spacing'],
      coordinateFeatures: ['category_axis', 'value_axis', 'grid_lines'],
    },
    recognitionPrompt: `分析这个柱状图，识别以下关键特征：
1. 每个柱子的高度（数值）
2. 类别标签（x轴）
3. 数值标签（y轴）
4. 最大值和最小值
5. 数据的比较关系

请标注关键数据点和比较关系。`,
  },
  {
    chartType: 'data_line_chart',
    name: '折线图',
    category: 'data_visualization',
    description: '用于显示数据趋势的折线图',
    featurePatterns: {
      keyPoints: ['data_points', 'peaks', 'valleys', 'trend_points'],
      curveCharacteristics: ['line_segments', 'trend', 'fluctuation'],
      coordinateFeatures: ['time_axis', 'value_axis', 'grid_lines'],
    },
    recognitionPrompt: `分析这个折线图，识别以下关键特征：
1. 数据点的坐标
2. 峰值和谷值
3. 整体趋势（上升、下降、波动）
4. 关键转折点
5. 时间或类别标签

请标注趋势变化和关键数据点。`,
  },
];

/**
 * 初始化预设模板（如果不存在）
 */
export async function initializePresetTemplates() {
  const db = getDb();
  
  for (const template of PRESET_TEMPLATES) {
    // 检查是否已存在
    const existing = await db
      .select()
      .from(chartTypeTemplates)
      .where(eq(chartTypeTemplates.chartType, template.chartType))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(chartTypeTemplates).values({
        chartType: template.chartType,
        name: template.name,
        category: template.category,
        description: template.description,
        featurePatterns: template.featurePatterns,
        recognitionPrompt: template.recognitionPrompt,
        accuracyRate: '0',
        feedbackCount: 0,
      });
    }
  }
}

/**
 * 获取所有图表类型模板
 */
export async function getAllTemplates() {
  const db = getDb();
  return db.select().from(chartTypeTemplates);
}

/**
 * 获取特定图表类型的模板
 */
export async function getTemplateByType(chartType: string) {
  const db = getDb();
  const results = await db
    .select()
    .from(chartTypeTemplates)
    .where(eq(chartTypeTemplates.chartType, chartType))
    .limit(1);
  
  return results[0] || null;
}

/**
 * 根据类别获取模板
 */
export async function getTemplatesByCategory(category: string) {
  const db = getDb();
  return db
    .select()
    .from(chartTypeTemplates)
    .where(eq(chartTypeTemplates.category, category as any));
}

/**
 * 更新模板的识别提示词
 */
export async function updateTemplatePrompt(chartType: string, recognitionPrompt: string) {
  const db = getDb();
  return db
    .update(chartTypeTemplates)
    .set({ recognitionPrompt })
    .where(eq(chartTypeTemplates.chartType, chartType));
}
