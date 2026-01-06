/**
 * 学科特殊符号识别规则库
 * 用于识别和校正各学科的专业符号
 */

export type SymbolRule = {
  pattern: RegExp;
  replacement: string;
  description: string;
  priority: number; // 优先级，数字越大越优先
};

export type SubjectSymbolRules = {
  [subject: string]: SymbolRule[];
};

/**
 * 数学符号规则库
 */
export const mathSymbolRules: SymbolRule[] = [
  // 分数表示
  { pattern: /(\d+)\/(\d+)/g, replacement: '\\frac{$1}{$2}', description: '分数', priority: 10 },
  
  // 根号
  { pattern: /√(\d+)/g, replacement: '\\sqrt{$1}', description: '根号', priority: 10 },
  { pattern: /根号(\d+)/g, replacement: '\\sqrt{$1}', description: '根号（中文）', priority: 10 },
  
  // 平方、立方
  { pattern: /(\w+)\^2/g, replacement: '$1²', description: '平方', priority: 9 },
  { pattern: /(\w+)\^3/g, replacement: '$1³', description: '立方', priority: 9 },
  { pattern: /(\w+)的平方/g, replacement: '$1²', description: '平方（中文）', priority: 9 },
  { pattern: /(\w+)的立方/g, replacement: '$1³', description: '立方（中文）', priority: 9 },
  
  // 希腊字母（常见错误识别）
  { pattern: /阿尔法|alpha/gi, replacement: 'α', description: '希腊字母α', priority: 8 },
  { pattern: /贝塔|beta/gi, replacement: 'β', description: '希腊字母β', priority: 8 },
  { pattern: /伽马|gamma/gi, replacement: 'γ', description: '希腊字母γ', priority: 8 },
  { pattern: /德尔塔|delta/gi, replacement: 'Δ', description: '希腊字母Δ', priority: 8 },
  { pattern: /西格玛|sigma/gi, replacement: 'Σ', description: '希腊字母Σ', priority: 8 },
  { pattern: /派|pi(?!\w)/gi, replacement: 'π', description: '希腊字母π', priority: 8 },
  { pattern: /欧米伽|omega/gi, replacement: 'Ω', description: '希腊字母Ω', priority: 8 },
  { pattern: /西塔|theta/gi, replacement: 'θ', description: '希腊字母θ', priority: 8 },
  
  // 数学运算符
  { pattern: /×/g, replacement: '×', description: '乘号', priority: 7 },
  { pattern: /÷/g, replacement: '÷', description: '除号', priority: 7 },
  { pattern: /≈/g, replacement: '≈', description: '约等于', priority: 7 },
  { pattern: /≠/g, replacement: '≠', description: '不等于', priority: 7 },
  { pattern: /≤/g, replacement: '≤', description: '小于等于', priority: 7 },
  { pattern: /≥/g, replacement: '≥', description: '大于等于', priority: 7 },
  { pattern: /∞/g, replacement: '∞', description: '无穷大', priority: 7 },
  
  // 集合符号
  { pattern: /∈/g, replacement: '∈', description: '属于', priority: 7 },
  { pattern: /∉/g, replacement: '∉', description: '不属于', priority: 7 },
  { pattern: /⊆/g, replacement: '⊆', description: '包含于', priority: 7 },
  { pattern: /∪/g, replacement: '∪', description: '并集', priority: 7 },
  { pattern: /∩/g, replacement: '∩', description: '交集', priority: 7 },
  { pattern: /∅/g, replacement: '∅', description: '空集', priority: 7 },
  
  // 积分和求和
  { pattern: /∫/g, replacement: '∫', description: '积分', priority: 7 },
  { pattern: /∑/g, replacement: '∑', description: '求和', priority: 7 },
  
  // 角度符号
  { pattern: /°/g, replacement: '°', description: '度', priority: 6 },
  { pattern: /′/g, replacement: '′', description: '分', priority: 6 },
  { pattern: /″/g, replacement: '″', description: '秒', priority: 6 },
];

/**
 * 物理符号规则库
 */
export const physicsSymbolRules: SymbolRule[] = [
  // 单位符号
  { pattern: /千克|公斤/g, replacement: 'kg', description: '千克', priority: 10 },
  { pattern: /米每秒/g, replacement: 'm/s', description: '米每秒', priority: 10 },
  { pattern: /米每二次方秒/g, replacement: 'm/s²', description: '加速度单位', priority: 10 },
  { pattern: /牛顿/g, replacement: 'N', description: '牛顿', priority: 10 },
  { pattern: /焦耳/g, replacement: 'J', description: '焦耳', priority: 10 },
  { pattern: /瓦特/g, replacement: 'W', description: '瓦特', priority: 10 },
  { pattern: /伏特/g, replacement: 'V', description: '伏特', priority: 10 },
  { pattern: /安培/g, replacement: 'A', description: '安培', priority: 10 },
  { pattern: /欧姆/g, replacement: 'Ω', description: '欧姆', priority: 10 },
  { pattern: /库伦/g, replacement: 'C', description: '库伦', priority: 10 },
  { pattern: /特斯拉/g, replacement: 'T', description: '特斯拉', priority: 10 },
  
  // 物理量符号
  { pattern: /速度v/g, replacement: '速度 v', description: '速度', priority: 9 },
  { pattern: /加速度a/g, replacement: '加速度 a', description: '加速度', priority: 9 },
  { pattern: /力F/g, replacement: '力 F', description: '力', priority: 9 },
  { pattern: /质量m/g, replacement: '质量 m', description: '质量', priority: 9 },
  { pattern: /时间t/g, replacement: '时间 t', description: '时间', priority: 9 },
  { pattern: /位移s/g, replacement: '位移 s', description: '位移', priority: 9 },
  { pattern: /功W/g, replacement: '功 W', description: '功', priority: 9 },
  { pattern: /功率P/g, replacement: '功率 P', description: '功率', priority: 9 },
  { pattern: /电压U/g, replacement: '电压 U', description: '电压', priority: 9 },
  { pattern: /电流I/g, replacement: '电流 I', description: '电流', priority: 9 },
  { pattern: /电阻R/g, replacement: '电阻 R', description: '电阻', priority: 9 },
  
  // 矢量符号
  { pattern: /→/g, replacement: '→', description: '矢量箭头', priority: 8 },
  
  // 希腊字母（物理常用）
  { pattern: /阿尔法|alpha/gi, replacement: 'α', description: '希腊字母α', priority: 8 },
  { pattern: /贝塔|beta/gi, replacement: 'β', description: '希腊字母β', priority: 8 },
  { pattern: /德尔塔|delta/gi, replacement: 'Δ', description: '希腊字母Δ', priority: 8 },
  { pattern: /西塔|theta/gi, replacement: 'θ', description: '希腊字母θ', priority: 8 },
  { pattern: /欧米伽|omega/gi, replacement: 'ω', description: '希腊字母ω', priority: 8 },
  { pattern: /派|pi(?!\w)/gi, replacement: 'π', description: '希腊字母π', priority: 8 },
];

/**
 * 化学符号规则库
 */
export const chemistrySymbolRules: SymbolRule[] = [
  // 常见元素符号（避免误识别）
  { pattern: /氢(?!气)/g, replacement: 'H', description: '氢元素', priority: 10 },
  { pattern: /氧(?!气)/g, replacement: 'O', description: '氧元素', priority: 10 },
  { pattern: /碳(?!酸)/g, replacement: 'C', description: '碳元素', priority: 10 },
  { pattern: /氮(?!气)/g, replacement: 'N', description: '氮元素', priority: 10 },
  { pattern: /硫(?!酸)/g, replacement: 'S', description: '硫元素', priority: 10 },
  { pattern: /氯(?!气)/g, replacement: 'Cl', description: '氯元素', priority: 10 },
  { pattern: /钠(?!盐)/g, replacement: 'Na', description: '钠元素', priority: 10 },
  { pattern: /钾(?!盐)/g, replacement: 'K', description: '钾元素', priority: 10 },
  { pattern: /钙(?!盐)/g, replacement: 'Ca', description: '钙元素', priority: 10 },
  { pattern: /铁(?!锈)/g, replacement: 'Fe', description: '铁元素', priority: 10 },
  { pattern: /铜(?!锈)/g, replacement: 'Cu', description: '铜元素', priority: 10 },
  { pattern: /锌(?!盐)/g, replacement: 'Zn', description: '锌元素', priority: 10 },
  { pattern: /银(?!盐)/g, replacement: 'Ag', description: '银元素', priority: 10 },
  { pattern: /金(?!属)/g, replacement: 'Au', description: '金元素', priority: 10 },
  
  // 常见化合物
  { pattern: /水(?!分)/g, replacement: 'H₂O', description: '水', priority: 9 },
  { pattern: /二氧化碳/g, replacement: 'CO₂', description: '二氧化碳', priority: 9 },
  { pattern: /一氧化碳/g, replacement: 'CO', description: '一氧化碳', priority: 9 },
  { pattern: /氧气/g, replacement: 'O₂', description: '氧气', priority: 9 },
  { pattern: /氢气/g, replacement: 'H₂', description: '氢气', priority: 9 },
  { pattern: /氮气/g, replacement: 'N₂', description: '氮气', priority: 9 },
  { pattern: /氯气/g, replacement: 'Cl₂', description: '氯气', priority: 9 },
  { pattern: /硫酸/g, replacement: 'H₂SO₄', description: '硫酸', priority: 9 },
  { pattern: /盐酸/g, replacement: 'HCl', description: '盐酸', priority: 9 },
  { pattern: /硝酸/g, replacement: 'HNO₃', description: '硝酸', priority: 9 },
  { pattern: /氢氧化钠/g, replacement: 'NaOH', description: '氢氧化钠', priority: 9 },
  { pattern: /氢氧化钙/g, replacement: 'Ca(OH)₂', description: '氢氧化钙', priority: 9 },
  { pattern: /碳酸钙/g, replacement: 'CaCO₃', description: '碳酸钙', priority: 9 },
  { pattern: /氯化钠/g, replacement: 'NaCl', description: '氯化钠', priority: 9 },
  
  // 化学反应符号
  { pattern: /→/g, replacement: '→', description: '反应箭头', priority: 8 },
  { pattern: /⇌/g, replacement: '⇌', description: '可逆反应', priority: 8 },
  { pattern: /↑/g, replacement: '↑', description: '气体生成', priority: 8 },
  { pattern: /↓/g, replacement: '↓', description: '沉淀生成', priority: 8 },
  { pattern: /△/g, replacement: 'Δ', description: '加热', priority: 8 },
  
  // 上下标数字
  { pattern: /₀/g, replacement: '₀', description: '下标0', priority: 7 },
  { pattern: /₁/g, replacement: '₁', description: '下标1', priority: 7 },
  { pattern: /₂/g, replacement: '₂', description: '下标2', priority: 7 },
  { pattern: /₃/g, replacement: '₃', description: '下标3', priority: 7 },
  { pattern: /₄/g, replacement: '₄', description: '下标4', priority: 7 },
  { pattern: /⁺/g, replacement: '⁺', description: '正电荷', priority: 7 },
  { pattern: /⁻/g, replacement: '⁻', description: '负电荷', priority: 7 },
];

/**
 * 语文符号规则库
 */
export const chineseSymbolRules: SymbolRule[] = [
  // 古文标点
  { pattern: /。/g, replacement: '。', description: '句号', priority: 10 },
  { pattern: /、/g, replacement: '、', description: '顿号', priority: 10 },
  { pattern: /；/g, replacement: '；', description: '分号', priority: 10 },
  { pattern: /：/g, replacement: '：', description: '冒号', priority: 10 },
  { pattern: /？/g, replacement: '？', description: '问号', priority: 10 },
  { pattern: /！/g, replacement: '！', description: '叹号', priority: 10 },
  { pattern: /\u201c/g, replacement: '\u201c', description: '左双引号', priority: 10 },
  { pattern: /\u201d/g, replacement: '\u201d', description: '右双引号', priority: 10 },
  { pattern: /\u2018/g, replacement: '\u2018', description: '左单引号', priority: 10 },
  { pattern: /\u2019/g, replacement: '\u2019', description: '右单引号', priority: 10 },
  { pattern: /《/g, replacement: '《', description: '左书名号', priority: 10 },
  { pattern: /》/g, replacement: '》', description: '右书名号', priority: 10 },
  { pattern: /（/g, replacement: '（', description: '左括号', priority: 10 },
  { pattern: /）/g, replacement: '）', description: '右括号', priority: 10 },
  { pattern: /——/g, replacement: '——', description: '破折号', priority: 10 },
  { pattern: /…/g, replacement: '……', description: '省略号', priority: 10 },
  
  // 注音符号
  { pattern: /ā/g, replacement: 'ā', description: '拼音一声', priority: 9 },
  { pattern: /á/g, replacement: 'á', description: '拼音二声', priority: 9 },
  { pattern: /ǎ/g, replacement: 'ǎ', description: '拼音三声', priority: 9 },
  { pattern: /à/g, replacement: 'à', description: '拼音四声', priority: 9 },
];

/**
 * 英语符号规则库
 */
export const englishSymbolRules: SymbolRule[] = [
  // 音标符号
  { pattern: /\[/g, replacement: '[', description: '音标左括号', priority: 10 },
  { pattern: /\]/g, replacement: ']', description: '音标右括号', priority: 10 },
  { pattern: /ə/g, replacement: 'ə', description: '音标ə', priority: 9 },
  { pattern: /ɪ/g, replacement: 'ɪ', description: '音标ɪ', priority: 9 },
  { pattern: /ʊ/g, replacement: 'ʊ', description: '音标ʊ', priority: 9 },
  { pattern: /ɔ/g, replacement: 'ɔ', description: '音标ɔ', priority: 9 },
  { pattern: /æ/g, replacement: 'æ', description: '音标æ', priority: 9 },
  { pattern: /ʌ/g, replacement: 'ʌ', description: '音标ʌ', priority: 9 },
  { pattern: /ɑ/g, replacement: 'ɑ', description: '音标ɑ', priority: 9 },
  { pattern: /θ/g, replacement: 'θ', description: '音标θ', priority: 9 },
  { pattern: /ð/g, replacement: 'ð', description: '音标ð', priority: 9 },
  { pattern: /ʃ/g, replacement: 'ʃ', description: '音标ʃ', priority: 9 },
  { pattern: /ʒ/g, replacement: 'ʒ', description: '音标ʒ', priority: 9 },
  { pattern: /ŋ/g, replacement: 'ŋ', description: '音标ŋ', priority: 9 },
  
  // 特殊标点
  { pattern: /\u2019/g, replacement: '\u2019', description: '撇号', priority: 8 },
  { pattern: /\u201c/g, replacement: '\u201c', description: '左双引号', priority: 8 },
  { pattern: /\u201d/g, replacement: '\u201d', description: '右双引号', priority: 8 },
  { pattern: /\u2013/g, replacement: '\u2013', description: '短破折号', priority: 8 },
  { pattern: /\u2014/g, replacement: '\u2014', description: '长破折号', priority: 8 },
];

/**
 * 所有学科符号规则库
 */
export const allSubjectSymbolRules: SubjectSymbolRules = {
  数学: mathSymbolRules,
  物理: physicsSymbolRules,
  化学: chemistrySymbolRules,
  语文: chineseSymbolRules,
  英语: englishSymbolRules,
};

/**
 * 常见错误识别映射表
 * 用于纠正OCR常见的符号识别错误
 */
export const commonOCRErrors: { [key: string]: string } = {
  // 数学符号常见错误
  // 'x': '×',  // 小写x误识别为乘号（注释掉避免误判）
  // 'X': '×',  // 大写X误识别为乘号（注释掉避免误判）
  '÷': '÷',  // 除号
  '≈': '≈',  // 约等于
  '≠': '≠',  // 不等于
  '≤': '≤',  // 小于等于
  '≥': '≥',  // 大于等于
  
  // 希腊字母常见错误
  // 'a': 'α',  // 可能是希腊字母α（注释掉避免误判）
  // 'B': 'β',  // 可能是希腊字母β（注释掉避免误判）
  // 'r': 'γ',  // 可能是希腊字母γ（注释掉避免误判）
  // 'A': 'Δ',  // 可能是希腊字母Δ（注释掉避免误判）
  // 'E': 'Σ',  // 可能是希腊字母Σ（注释掉避免误判）
  // 'n': 'π',  // 可能是希腊字母π（注释掉避免误判）
  // 'Q': 'Ω',  // 可能是希腊字母Ω（注释掉避免误判）
  // '0': 'θ',  // 可能是希腊字母θ（注释掉避免误判）
  
  // 化学符号常见错误
  'O2': 'O₂',  // 氧气
  'H2': 'H₂',  // 氢气
  'CO2': 'CO₂',  // 二氧化碳
  'H2O': 'H₂O',  // 水
  'H2SO4': 'H₂SO₄',  // 硫酸
  'Ca(OH)2': 'Ca(OH)₂',  // 氢氧化钙
  'CaCO3': 'CaCO₃',  // 碳酸钙
  
  // 物理单位常见错误
  'm/s2': 'm/s²',  // 加速度单位
  'cm2': 'cm²',  // 平方厘米
  'cm3': 'cm³',  // 立方厘米
  'm2': 'm²',  // 平方米
  'm3': 'm³',  // 立方米
};
