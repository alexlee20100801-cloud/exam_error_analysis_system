/**
 * 学科专用LaTeX公式模板库
 */

export interface LatexTemplate {
  label: string;
  latex: string;
  display: string;
  description: string;
  keywords: string[]; // 用于搜索
}

export interface LatexTemplateCategory {
  title: string;
  icon?: string;
  templates: LatexTemplate[];
}

// 物理公式模板
const physicsTemplates: LatexTemplate[] = [
  {
    label: '牛顿第二定律',
    latex: 'F = ma',
    display: 'F = ma',
    description: '力等于质量乘以加速度',
    keywords: ['力', '质量', '加速度', '牛顿', 'newton', 'force'],
  },
  {
    label: '动能公式',
    latex: 'E_k = \\frac{1}{2}mv^2',
    display: 'E_k = \\frac{1}{2}mv^2',
    description: '动能等于二分之一质量乘以速度平方',
    keywords: ['动能', '能量', 'kinetic', 'energy'],
  },
  {
    label: '重力势能',
    latex: 'E_p = mgh',
    display: 'E_p = mgh',
    description: '重力势能等于质量乘以重力加速度乘以高度',
    keywords: ['势能', '重力', 'potential', 'gravity'],
  },
  {
    label: '欧姆定律',
    latex: 'U = IR',
    display: 'U = IR',
    description: '电压等于电流乘以电阻',
    keywords: ['电压', '电流', '电阻', 'ohm', 'voltage', 'current'],
  },
  {
    label: '电功率',
    latex: 'P = UI = I^2R = \\frac{U^2}{R}',
    display: 'P = UI = I^2R = \\frac{U^2}{R}',
    description: '电功率的三种计算公式',
    keywords: ['功率', '电功率', 'power'],
  },
  {
    label: '光速公式',
    latex: 'c = \\lambda f',
    display: 'c = \\lambda f',
    description: '光速等于波长乘以频率',
    keywords: ['光速', '波长', '频率', 'light', 'wavelength'],
  },
  {
    label: '折射定律',
    latex: '\\frac{\\sin\\theta_1}{\\sin\\theta_2} = \\frac{n_2}{n_1}',
    display: '\\frac{\\sin\\theta_1}{\\sin\\theta_2} = \\frac{n_2}{n_1}',
    description: '斯涅尔折射定律',
    keywords: ['折射', '光学', 'refraction', 'snell'],
  },
  {
    label: '理想气体状态方程',
    latex: 'PV = nRT',
    display: 'PV = nRT',
    description: '压强乘以体积等于物质的量乘以气体常数乘以温度',
    keywords: ['气体', '压强', '温度', 'gas', 'pressure'],
  },
];

// 化学公式模板
const chemistryTemplates: LatexTemplate[] = [
  {
    label: '燃烧反应',
    latex: '\\text{CH}_4 + 2\\text{O}_2 \\rightarrow \\text{CO}_2 + 2\\text{H}_2\\text{O}',
    display: '\\text{CH}_4 + 2\\text{O}_2 \\rightarrow \\text{CO}_2 + 2\\text{H}_2\\text{O}',
    description: '甲烷燃烧反应方程式',
    keywords: ['燃烧', '甲烷', '反应', 'combustion', 'methane'],
  },
  {
    label: '酸碱中和',
    latex: '\\text{HCl} + \\text{NaOH} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}',
    display: '\\text{HCl} + \\text{NaOH} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}',
    description: '盐酸和氢氧化钠中和反应',
    keywords: ['中和', '酸碱', 'neutralization', 'acid', 'base'],
  },
  {
    label: '离子方程式',
    latex: '\\text{H}^+ + \\text{OH}^- \\rightarrow \\text{H}_2\\text{O}',
    display: '\\text{H}^+ + \\text{OH}^- \\rightarrow \\text{H}_2\\text{O}',
    description: '酸碱中和的离子方程式',
    keywords: ['离子', '中和', 'ion', 'equation'],
  },
  {
    label: '氧化还原反应',
    latex: '\\text{Zn} + \\text{CuSO}_4 \\rightarrow \\text{ZnSO}_4 + \\text{Cu}',
    display: '\\text{Zn} + \\text{CuSO}_4 \\rightarrow \\text{ZnSO}_4 + \\text{Cu}',
    description: '锌置换铜的氧化还原反应',
    keywords: ['氧化', '还原', 'redox', 'oxidation'],
  },
  {
    label: '可逆反应',
    latex: '\\text{N}_2 + 3\\text{H}_2 \\rightleftharpoons 2\\text{NH}_3',
    display: '\\text{N}_2 + 3\\text{H}_2 \\rightleftharpoons 2\\text{NH}_3',
    description: '合成氨的可逆反应',
    keywords: ['可逆', '平衡', 'reversible', 'equilibrium'],
  },
  {
    label: '电离方程式',
    latex: '\\text{H}_2\\text{SO}_4 \\rightarrow 2\\text{H}^+ + \\text{SO}_4^{2-}',
    display: '\\text{H}_2\\text{SO}_4 \\rightarrow 2\\text{H}^+ + \\text{SO}_4^{2-}',
    description: '硫酸的电离方程式',
    keywords: ['电离', '离子', 'ionization'],
  },
  {
    label: '化学键能',
    latex: '\\Delta H = \\sum E_{\\text{断}} - \\sum E_{\\text{成}}',
    display: '\\Delta H = \\sum E_{\\text{断}} - \\sum E_{\\text{成}}',
    description: '反应热等于断键能量减去成键能量',
    keywords: ['键能', '反应热', 'bond', 'energy', 'enthalpy'],
  },
];

// 几何公式模板
const geometryTemplates: LatexTemplate[] = [
  {
    label: '勾股定理',
    latex: 'a^2 + b^2 = c^2',
    display: 'a^2 + b^2 = c^2',
    description: '直角三角形两直角边平方和等于斜边平方',
    keywords: ['勾股', '三角形', 'pythagorean', 'triangle'],
  },
  {
    label: '三角形面积',
    latex: 'S = \\frac{1}{2}ah = \\frac{1}{2}ab\\sin C',
    display: 'S = \\frac{1}{2}ah = \\frac{1}{2}ab\\sin C',
    description: '三角形面积公式',
    keywords: ['面积', '三角形', 'area', 'triangle'],
  },
  {
    label: '圆的面积',
    latex: 'S = \\pi r^2',
    display: 'S = \\pi r^2',
    description: '圆的面积等于π乘以半径平方',
    keywords: ['圆', '面积', 'circle', 'area'],
  },
  {
    label: '圆的周长',
    latex: 'C = 2\\pi r',
    display: 'C = 2\\pi r',
    description: '圆的周长等于2π乘以半径',
    keywords: ['圆', '周长', 'circle', 'circumference'],
  },
  {
    label: '球的体积',
    latex: 'V = \\frac{4}{3}\\pi r^3',
    display: 'V = \\frac{4}{3}\\pi r^3',
    description: '球的体积公式',
    keywords: ['球', '体积', 'sphere', 'volume'],
  },
  {
    label: '球的表面积',
    latex: 'S = 4\\pi r^2',
    display: 'S = 4\\pi r^2',
    description: '球的表面积公式',
    keywords: ['球', '表面积', 'sphere', 'surface'],
  },
  {
    label: '圆柱体积',
    latex: 'V = \\pi r^2 h',
    display: 'V = \\pi r^2 h',
    description: '圆柱体积等于底面积乘以高',
    keywords: ['圆柱', '体积', 'cylinder', 'volume'],
  },
  {
    label: '圆锥体积',
    latex: 'V = \\frac{1}{3}\\pi r^2 h',
    display: 'V = \\frac{1}{3}\\pi r^2 h',
    description: '圆锥体积公式',
    keywords: ['圆锥', '体积', 'cone', 'volume'],
  },
];

// 数学高级模板
const advancedMathTemplates: LatexTemplate[] = [
  {
    label: '导数定义',
    latex: "f'(x) = \\lim_{\\Delta x \\to 0} \\frac{f(x+\\Delta x) - f(x)}{\\Delta x}",
    display: "f'(x) = \\lim_{\\Delta x \\to 0} \\frac{f(x+\\Delta x) - f(x)}{\\Delta x}",
    description: '导数的定义式',
    keywords: ['导数', '微分', 'derivative', 'differential'],
  },
  {
    label: '定积分',
    latex: '\\int_a^b f(x)dx = F(b) - F(a)',
    display: '\\int_a^b f(x)dx = F(b) - F(a)',
    description: '牛顿-莱布尼茨公式',
    keywords: ['积分', '定积分', 'integral', 'definite'],
  },
  {
    label: '分部积分',
    latex: '\\int u dv = uv - \\int v du',
    display: '\\int u dv = uv - \\int v du',
    description: '分部积分公式',
    keywords: ['积分', '分部', 'integration', 'parts'],
  },
  {
    label: '泰勒展开',
    latex: "f(x) = f(a) + f'(a)(x-a) + \\frac{f''(a)}{2!}(x-a)^2 + \\cdots",
    display: "f(x) = f(a) + f'(a)(x-a) + \\frac{f''(a)}{2!}(x-a)^2 + \\cdots",
    description: '泰勒级数展开式',
    keywords: ['泰勒', '级数', 'taylor', 'series'],
  },
  {
    label: '向量点积',
    latex: '\\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta',
    display: '\\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta',
    description: '向量点积公式',
    keywords: ['向量', '点积', 'vector', 'dot product'],
  },
  {
    label: '向量叉积',
    latex: '|\\vec{a} \\times \\vec{b}| = |\\vec{a}||\\vec{b}|\\sin\\theta',
    display: '|\\vec{a} \\times \\vec{b}| = |\\vec{a}||\\vec{b}|\\sin\\theta',
    description: '向量叉积模长公式',
    keywords: ['向量', '叉积', 'vector', 'cross product'],
  },
  {
    label: '正态分布',
    latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
    display: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
    description: '正态分布概率密度函数',
    keywords: ['正态', '概率', '统计', 'normal', 'distribution'],
  },
  {
    label: '二项分布',
    latex: 'P(X=k) = C_n^k p^k (1-p)^{n-k}',
    display: 'P(X=k) = C_n^k p^k (1-p)^{n-k}',
    description: '二项分布概率公式',
    keywords: ['二项', '概率', 'binomial', 'probability'],
  },
];

// 导出所有模板分类
export const latexTemplateCategories: LatexTemplateCategory[] = [
  {
    title: '物理公式',
    icon: '⚛️',
    templates: physicsTemplates,
  },
  {
    title: '化学公式',
    icon: '🧪',
    templates: chemistryTemplates,
  },
  {
    title: '几何公式',
    icon: '📐',
    templates: geometryTemplates,
  },
  {
    title: '高等数学',
    icon: '∫',
    templates: advancedMathTemplates,
  },
];

// 获取所有模板（用于搜索）
export const getAllTemplates = (): LatexTemplate[] => {
  return latexTemplateCategories.flatMap(category => category.templates);
};

// 搜索模板
export const searchTemplates = (query: string): LatexTemplate[] => {
  if (!query.trim()) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  const allTemplates = getAllTemplates();

  return allTemplates.filter(template => {
    // 搜索标签
    if (template.label.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    // 搜索描述
    if (template.description.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    // 搜索关键词
    if (template.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))) {
      return true;
    }
    // 搜索LaTeX代码
    if (template.latex.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    return false;
  });
};
