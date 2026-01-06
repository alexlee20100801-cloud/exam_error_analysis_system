/**
 * LaTeX语法帮助面板组件
 * 提供常用公式语法速查表
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { LatexPreview } from './LatexPreview';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

interface LatexExample {
  description: string;
  code: string;
  display: string;
}

interface LatexCategory {
  title: string;
  examples: LatexExample[];
}

const latexHelp: LatexCategory[] = [
  {
    title: '基础运算',
    examples: [
      {
        description: '分数',
        code: '\\frac{分子}{分母}',
        display: '\\frac{a}{b}',
      },
      {
        description: '根号',
        code: '\\sqrt{x}',
        display: '\\sqrt{x}',
      },
      {
        description: 'n次根',
        code: '\\sqrt[n]{x}',
        display: '\\sqrt[3]{8}',
      },
      {
        description: '上标（幂）',
        code: 'x^{2}',
        display: 'x^{2}',
      },
      {
        description: '下标',
        code: 'x_{i}',
        display: 'x_{i}',
      },
      {
        description: '上下标组合',
        code: 'x_{i}^{2}',
        display: 'x_{i}^{2}',
      },
    ],
  },
  {
    title: '希腊字母',
    examples: [
      {
        description: 'α (alpha)',
        code: '\\alpha',
        display: '\\alpha',
      },
      {
        description: 'β (beta)',
        code: '\\beta',
        display: '\\beta',
      },
      {
        description: 'γ (gamma)',
        code: '\\gamma',
        display: '\\gamma',
      },
      {
        description: 'Δ (Delta)',
        code: '\\Delta',
        display: '\\Delta',
      },
      {
        description: 'θ (theta)',
        code: '\\theta',
        display: '\\theta',
      },
      {
        description: 'π (pi)',
        code: '\\pi',
        display: '\\pi',
      },
      {
        description: 'Σ (Sigma)',
        code: '\\Sigma',
        display: '\\Sigma',
      },
      {
        description: 'Ω (Omega)',
        code: '\\Omega',
        display: '\\Omega',
      },
    ],
  },
  {
    title: '运算符',
    examples: [
      {
        description: '求和',
        code: '\\sum_{i=1}^{n} x_i',
        display: '\\sum_{i=1}^{n} x_i',
      },
      {
        description: '积分',
        code: '\\int_{a}^{b} f(x)dx',
        display: '\\int_{a}^{b} f(x)dx',
      },
      {
        description: '极限',
        code: '\\lim_{x \\to \\infty} f(x)',
        display: '\\lim_{x \\to \\infty} f(x)',
      },
      {
        description: '乘积',
        code: '\\prod_{i=1}^{n} x_i',
        display: '\\prod_{i=1}^{n} x_i',
      },
      {
        description: '偏导数',
        code: '\\frac{\\partial f}{\\partial x}',
        display: '\\frac{\\partial f}{\\partial x}',
      },
    ],
  },
  {
    title: '关系符号',
    examples: [
      {
        description: '小于等于',
        code: '\\leq 或 \\le',
        display: 'a \\leq b',
      },
      {
        description: '大于等于',
        code: '\\geq 或 \\ge',
        display: 'a \\geq b',
      },
      {
        description: '不等于',
        code: '\\neq 或 \\ne',
        display: 'a \\neq b',
      },
      {
        description: '约等于',
        code: '\\approx',
        display: 'a \\approx b',
      },
      {
        description: '属于',
        code: '\\in',
        display: 'x \\in A',
      },
      {
        description: '无穷',
        code: '\\infty',
        display: '\\infty',
      },
    ],
  },
  {
    title: '矩阵',
    examples: [
      {
        description: '圆括号矩阵',
        code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
        display: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
      },
      {
        description: '方括号矩阵',
        code: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
        display: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
      },
      {
        description: '行列式',
        code: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
        display: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
      },
    ],
  },
  {
    title: '三角函数',
    examples: [
      {
        description: '正弦',
        code: '\\sin x',
        display: '\\sin x',
      },
      {
        description: '余弦',
        code: '\\cos x',
        display: '\\cos x',
      },
      {
        description: '正切',
        code: '\\tan x',
        display: '\\tan x',
      },
      {
        description: '反三角函数',
        code: '\\arcsin x, \\arccos x, \\arctan x',
        display: '\\arcsin x',
      },
    ],
  },
  {
    title: '常用公式',
    examples: [
      {
        description: '二次方程',
        code: 'ax^2 + bx + c = 0',
        display: 'ax^2 + bx + c = 0',
      },
      {
        description: '求根公式',
        code: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
        display: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
      },
      {
        description: '勾股定理',
        code: 'a^2 + b^2 = c^2',
        display: 'a^2 + b^2 = c^2',
      },
      {
        description: '欧拉公式',
        code: 'e^{i\\pi} + 1 = 0',
        display: 'e^{i\\pi} + 1 = 0',
      },
    ],
  },
];

export function LatexHelpPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <HelpCircle className="h-4 w-4 mr-2" />
          LaTeX语法帮助
          {isOpen ? (
            <ChevronUp className="h-4 w-4 ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-auto" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">基本用法</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 行内公式：使用单个 $ 包裹，如 $x^2$</li>
              <li>• 块级公式：使用双 $$ 包裹，如 $$x^2$$</li>
              <li>• 空格：LaTeX会忽略空格，使用 \, 或 \quad 添加空格</li>
              <li>• 换行：在块级公式中使用 \\ 换行</li>
            </ul>
          </div>

          {latexHelp.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-2">
              <h4 className="text-sm font-semibold">{category.title}</h4>
              <div className="space-y-2">
                {category.examples.map((example, exampleIndex) => (
                  <div
                    key={exampleIndex}
                    className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 rounded bg-muted/30 text-sm"
                  >
                    <div className="font-medium">{example.description}</div>
                    <div className="font-mono text-xs bg-background px-2 py-1 rounded">
                      {example.code}
                    </div>
                    <div className="flex items-center">
                      <LatexPreview latex={example.display} displayMode={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-semibold">常见问题</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 特殊字符需要转义：{'\{'} {'\}'} \% \# \& \_</li>
              <li>• 多字符上下标需要用花括号：x^{10} 而不是 x^10</li>
              <li>• 分数嵌套：\frac{'{'} 1 {'}'} {'{'} \frac{'{'} 1 {'}'} {'{'} x {'}'} {'}'}</li>
              <li>• 括号自适应大小：\left( ... \right)</li>
            </ul>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
