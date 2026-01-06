/**
 * LaTeX命令补全系统
 * 支持智能补全和参数跳转
 */

export interface LatexCompletionItem {
  command: string; // 命令名称（不含反斜杠）
  label: string; // 显示标签
  description: string; // 描述
  template: string; // 补全模板，使用|表示光标位置，使用[]表示参数占位符
  category: 'basic' | 'greek' | 'operator' | 'function' | 'symbol' | 'environment';
  preview: string; // 预览公式
}

// LaTeX命令补全数据库
export const LATEX_COMPLETIONS: LatexCompletionItem[] = [
  // 基础运算
  {
    command: 'frac',
    label: '\\frac - 分数',
    description: '创建分数',
    template: '\\frac{[分子]}{[分母]}',
    category: 'basic',
    preview: '\\frac{a}{b}',
  },
  {
    command: 'sqrt',
    label: '\\sqrt - 平方根',
    description: '创建平方根',
    template: '\\sqrt{[内容]}',
    category: 'basic',
    preview: '\\sqrt{x}',
  },
  {
    command: 'sqrt[',
    label: '\\sqrt[n] - n次根',
    description: '创建n次根',
    template: '\\sqrt[[次数]]{[内容]}',
    category: 'basic',
    preview: '\\sqrt[3]{x}',
  },
  {
    command: 'text',
    label: '\\text - 文本',
    description: '在公式中插入文本',
    template: '\\text{[文本]}',
    category: 'basic',
    preview: '\\text{文本}',
  },

  // 希腊字母（小写）
  {
    command: 'alpha',
    label: '\\alpha - α',
    description: '希腊字母α',
    template: '\\alpha',
    category: 'greek',
    preview: '\\alpha',
  },
  {
    command: 'beta',
    label: '\\beta - β',
    description: '希腊字母β',
    template: '\\beta',
    category: 'greek',
    preview: '\\beta',
  },
  {
    command: 'gamma',
    label: '\\gamma - γ',
    description: '希腊字母γ',
    template: '\\gamma',
    category: 'greek',
    preview: '\\gamma',
  },
  {
    command: 'delta',
    label: '\\delta - δ',
    description: '希腊字母δ',
    template: '\\delta',
    category: 'greek',
    preview: '\\delta',
  },
  {
    command: 'epsilon',
    label: '\\epsilon - ε',
    description: '希腊字母ε',
    template: '\\epsilon',
    category: 'greek',
    preview: '\\epsilon',
  },
  {
    command: 'theta',
    label: '\\theta - θ',
    description: '希腊字母θ',
    template: '\\theta',
    category: 'greek',
    preview: '\\theta',
  },
  {
    command: 'lambda',
    label: '\\lambda - λ',
    description: '希腊字母λ',
    template: '\\lambda',
    category: 'greek',
    preview: '\\lambda',
  },
  {
    command: 'mu',
    label: '\\mu - μ',
    description: '希腊字母μ',
    template: '\\mu',
    category: 'greek',
    preview: '\\mu',
  },
  {
    command: 'pi',
    label: '\\pi - π',
    description: '希腊字母π',
    template: '\\pi',
    category: 'greek',
    preview: '\\pi',
  },
  {
    command: 'sigma',
    label: '\\sigma - σ',
    description: '希腊字母σ',
    template: '\\sigma',
    category: 'greek',
    preview: '\\sigma',
  },
  {
    command: 'phi',
    label: '\\phi - φ',
    description: '希腊字母φ',
    template: '\\phi',
    category: 'greek',
    preview: '\\phi',
  },
  {
    command: 'omega',
    label: '\\omega - ω',
    description: '希腊字母ω',
    template: '\\omega',
    category: 'greek',
    preview: '\\omega',
  },

  // 希腊字母（大写）
  {
    command: 'Gamma',
    label: '\\Gamma - Γ',
    description: '希腊字母Γ',
    template: '\\Gamma',
    category: 'greek',
    preview: '\\Gamma',
  },
  {
    command: 'Delta',
    label: '\\Delta - Δ',
    description: '希腊字母Δ',
    template: '\\Delta',
    category: 'greek',
    preview: '\\Delta',
  },
  {
    command: 'Theta',
    label: '\\Theta - Θ',
    description: '希腊字母Θ',
    template: '\\Theta',
    category: 'greek',
    preview: '\\Theta',
  },
  {
    command: 'Lambda',
    label: '\\Lambda - Λ',
    description: '希腊字母Λ',
    template: '\\Lambda',
    category: 'greek',
    preview: '\\Lambda',
  },
  {
    command: 'Sigma',
    label: '\\Sigma - Σ',
    description: '希腊字母Σ',
    template: '\\Sigma',
    category: 'greek',
    preview: '\\Sigma',
  },
  {
    command: 'Phi',
    label: '\\Phi - Φ',
    description: '希腊字母Φ',
    template: '\\Phi',
    category: 'greek',
    preview: '\\Phi',
  },
  {
    command: 'Omega',
    label: '\\Omega - Ω',
    description: '希腊字母Ω',
    template: '\\Omega',
    category: 'greek',
    preview: '\\Omega',
  },

  // 运算符
  {
    command: 'sum',
    label: '\\sum - 求和',
    description: '求和符号',
    template: '\\sum_{[下标]}^{[上标]}',
    category: 'operator',
    preview: '\\sum_{i=1}^{n}',
  },
  {
    command: 'int',
    label: '\\int - 积分',
    description: '积分符号',
    template: '\\int_{[下限]}^{[上限]}',
    category: 'operator',
    preview: '\\int_{a}^{b}',
  },
  {
    command: 'lim',
    label: '\\lim - 极限',
    description: '极限符号',
    template: '\\lim_{[变量] \\to [值]}',
    category: 'operator',
    preview: '\\lim_{x \\to \\infty}',
  },
  {
    command: 'prod',
    label: '\\prod - 乘积',
    description: '连乘符号',
    template: '\\prod_{[下标]}^{[上标]}',
    category: 'operator',
    preview: '\\prod_{i=1}^{n}',
  },
  {
    command: 'partial',
    label: '\\partial - 偏导',
    description: '偏导数符号',
    template: '\\frac{\\partial [函数]}{\\partial [变量]}',
    category: 'operator',
    preview: '\\frac{\\partial f}{\\partial x}',
  },

  // 三角函数
  {
    command: 'sin',
    label: '\\sin - 正弦',
    description: '正弦函数',
    template: '\\sin{[角度]}',
    category: 'function',
    preview: '\\sin x',
  },
  {
    command: 'cos',
    label: '\\cos - 余弦',
    description: '余弦函数',
    template: '\\cos{[角度]}',
    category: 'function',
    preview: '\\cos x',
  },
  {
    command: 'tan',
    label: '\\tan - 正切',
    description: '正切函数',
    template: '\\tan{[角度]}',
    category: 'function',
    preview: '\\tan x',
  },
  {
    command: 'arcsin',
    label: '\\arcsin - 反正弦',
    description: '反正弦函数',
    template: '\\arcsin{[值]}',
    category: 'function',
    preview: '\\arcsin x',
  },
  {
    command: 'arccos',
    label: '\\arccos - 反余弦',
    description: '反余弦函数',
    template: '\\arccos{[值]}',
    category: 'function',
    preview: '\\arccos x',
  },
  {
    command: 'arctan',
    label: '\\arctan - 反正切',
    description: '反正切函数',
    template: '\\arctan{[值]}',
    category: 'function',
    preview: '\\arctan x',
  },
  {
    command: 'log',
    label: '\\log - 对数',
    description: '对数函数',
    template: '\\log{[值]}',
    category: 'function',
    preview: '\\log x',
  },
  {
    command: 'ln',
    label: '\\ln - 自然对数',
    description: '自然对数函数',
    template: '\\ln{[值]}',
    category: 'function',
    preview: '\\ln x',
  },

  // 符号
  {
    command: 'leq',
    label: '\\leq - ≤',
    description: '小于等于',
    template: '\\leq',
    category: 'symbol',
    preview: '\\leq',
  },
  {
    command: 'geq',
    label: '\\geq - ≥',
    description: '大于等于',
    template: '\\geq',
    category: 'symbol',
    preview: '\\geq',
  },
  {
    command: 'neq',
    label: '\\neq - ≠',
    description: '不等于',
    template: '\\neq',
    category: 'symbol',
    preview: '\\neq',
  },
  {
    command: 'approx',
    label: '\\approx - ≈',
    description: '约等于',
    template: '\\approx',
    category: 'symbol',
    preview: '\\approx',
  },
  {
    command: 'equiv',
    label: '\\equiv - ≡',
    description: '恒等于',
    template: '\\equiv',
    category: 'symbol',
    preview: '\\equiv',
  },
  {
    command: 'pm',
    label: '\\pm - ±',
    description: '正负号',
    template: '\\pm',
    category: 'symbol',
    preview: '\\pm',
  },
  {
    command: 'times',
    label: '\\times - ×',
    description: '乘号',
    template: '\\times',
    category: 'symbol',
    preview: '\\times',
  },
  {
    command: 'div',
    label: '\\div - ÷',
    description: '除号',
    template: '\\div',
    category: 'symbol',
    preview: '\\div',
  },
  {
    command: 'cdot',
    label: '\\cdot - ·',
    description: '点乘',
    template: '\\cdot',
    category: 'symbol',
    preview: '\\cdot',
  },
  {
    command: 'infty',
    label: '\\infty - ∞',
    description: '无穷大',
    template: '\\infty',
    category: 'symbol',
    preview: '\\infty',
  },
  {
    command: 'in',
    label: '\\in - ∈',
    description: '属于',
    template: '\\in',
    category: 'symbol',
    preview: '\\in',
  },
  {
    command: 'notin',
    label: '\\notin - ∉',
    description: '不属于',
    template: '\\notin',
    category: 'symbol',
    preview: '\\notin',
  },
  {
    command: 'subset',
    label: '\\subset - ⊂',
    description: '子集',
    template: '\\subset',
    category: 'symbol',
    preview: '\\subset',
  },
  {
    command: 'supset',
    label: '\\supset - ⊃',
    description: '超集',
    template: '\\supset',
    category: 'symbol',
    preview: '\\supset',
  },
  {
    command: 'cup',
    label: '\\cup - ∪',
    description: '并集',
    template: '\\cup',
    category: 'symbol',
    preview: '\\cup',
  },
  {
    command: 'cap',
    label: '\\cap - ∩',
    description: '交集',
    template: '\\cap',
    category: 'symbol',
    preview: '\\cap',
  },
  {
    command: 'emptyset',
    label: '\\emptyset - ∅',
    description: '空集',
    template: '\\emptyset',
    category: 'symbol',
    preview: '\\emptyset',
  },
  {
    command: 'forall',
    label: '\\forall - ∀',
    description: '任意',
    template: '\\forall',
    category: 'symbol',
    preview: '\\forall',
  },
  {
    command: 'exists',
    label: '\\exists - ∃',
    description: '存在',
    template: '\\exists',
    category: 'symbol',
    preview: '\\exists',
  },
  {
    command: 'to',
    label: '\\to - →',
    description: '箭头',
    template: '\\to',
    category: 'symbol',
    preview: '\\to',
  },
  {
    command: 'rightarrow',
    label: '\\rightarrow - →',
    description: '右箭头',
    template: '\\rightarrow',
    category: 'symbol',
    preview: '\\rightarrow',
  },
  {
    command: 'leftarrow',
    label: '\\leftarrow - ←',
    description: '左箭头',
    template: '\\leftarrow',
    category: 'symbol',
    preview: '\\leftarrow',
  },
  {
    command: 'Rightarrow',
    label: '\\Rightarrow - ⇒',
    description: '双右箭头',
    template: '\\Rightarrow',
    category: 'symbol',
    preview: '\\Rightarrow',
  },
  {
    command: 'Leftarrow',
    label: '\\Leftarrow - ⇐',
    description: '双左箭头',
    template: '\\Leftarrow',
    category: 'symbol',
    preview: '\\Leftarrow',
  },

  // 环境
  {
    command: 'begin{pmatrix}',
    label: '\\begin{pmatrix} - 圆括号矩阵',
    description: '创建圆括号矩阵',
    template: '\\begin{pmatrix}\n[元素] & [元素] \\\\\n[元素] & [元素]\n\\end{pmatrix}',
    category: 'environment',
    preview: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  },
  {
    command: 'begin{bmatrix}',
    label: '\\begin{bmatrix} - 方括号矩阵',
    description: '创建方括号矩阵',
    template: '\\begin{bmatrix}\n[元素] & [元素] \\\\\n[元素] & [元素]\n\\end{bmatrix}',
    category: 'environment',
    preview: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
  },
  {
    command: 'begin{vmatrix}',
    label: '\\begin{vmatrix} - 行列式',
    description: '创建行列式',
    template: '\\begin{vmatrix}\n[元素] & [元素] \\\\\n[元素] & [元素]\n\\end{vmatrix}',
    category: 'environment',
    preview: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
  },
  {
    command: 'begin{cases}',
    label: '\\begin{cases} - 分段函数',
    description: '创建分段函数',
    template: '\\begin{cases}\n[表达式] & [条件] \\\\\n[表达式] & [条件]\n\\end{cases}',
    category: 'environment',
    preview: '\\begin{cases} x & x \\geq 0 \\\\ -x & x < 0 \\end{cases}',
  },
];

/**
 * 搜索补全项
 */
export function searchCompletions(query: string): LatexCompletionItem[] {
  const lowerQuery = query.toLowerCase();
  return LATEX_COMPLETIONS.filter(
    (item) =>
      item.command.toLowerCase().includes(lowerQuery) ||
      item.label.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // 限制返回数量
}

/**
 * 提取模板中的参数占位符
 */
export function extractPlaceholders(template: string): string[] {
  const regex = /\[([^\]]+)\]/g;
  const placeholders: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    placeholders.push(match[1]);
  }
  return placeholders;
}

/**
 * 应用补全模板
 * @param template 模板字符串
 * @param cursorOffset 返回光标相对于插入位置的偏移量
 */
export function applyCompletionTemplate(template: string): {
  text: string;
  cursorOffset: number;
  placeholders: Array<{ start: number; end: number; text: string }>;
} {
  // 提取所有占位符位置
  const placeholders: Array<{ start: number; end: number; text: string }> = [];
  let text = template;
  let offset = 0;

  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    const placeholder = match[1];
    const start = match.index - offset;
    const end = start + placeholder.length;
    placeholders.push({ start, end, text: placeholder });

    // 替换占位符
    text = text.replace(`[${placeholder}]`, placeholder);
    offset += 2; // 减去方括号的长度
  }

  // 光标位置：第一个占位符的开始位置
  const cursorOffset = placeholders.length > 0 ? placeholders[0].start : text.length;

  return { text, cursorOffset, placeholders };
}
