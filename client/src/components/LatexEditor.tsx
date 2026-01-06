/**
 * LaTeX编辑器组件
 * 支持实时预览和常用公式快捷插入
 */

import { useState, useRef } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LatexPreview, LatexText } from './LatexPreview';
import {
  Eye,
  EyeOff,
  Type,
  Sigma,
  Radical,
  Superscript,
  Subscript,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

// 常用LaTeX符号和公式模板
const latexSymbols = {
  基础运算: [
    { label: '分数', latex: '\\frac{a}{b}', display: '\\frac{a}{b}' },
    { label: '根号', latex: '\\sqrt{x}', display: '\\sqrt{x}' },
    { label: 'n次根', latex: '\\sqrt[n]{x}', display: '\\sqrt[n]{x}' },
    { label: '上标', latex: 'x^{2}', display: 'x^{2}' },
    { label: '下标', latex: 'x_{i}', display: 'x_{i}' },
  ],
  希腊字母: [
    { label: 'α', latex: '\\alpha', display: '\\alpha' },
    { label: 'β', latex: '\\beta', display: '\\beta' },
    { label: 'γ', latex: '\\gamma', display: '\\gamma' },
    { label: 'Δ', latex: '\\Delta', display: '\\Delta' },
    { label: 'θ', latex: '\\theta', display: '\\theta' },
    { label: 'π', latex: '\\pi', display: '\\pi' },
    { label: 'Σ', latex: '\\Sigma', display: '\\Sigma' },
    { label: 'Ω', latex: '\\Omega', display: '\\Omega' },
  ],
  运算符: [
    { label: '求和', latex: '\\sum_{i=1}^{n}', display: '\\sum_{i=1}^{n}' },
    { label: '积分', latex: '\\int_{a}^{b}', display: '\\int_{a}^{b}' },
    { label: '极限', latex: '\\lim_{x \\to \\infty}', display: '\\lim_{x \\to \\infty}' },
    { label: '乘积', latex: '\\prod_{i=1}^{n}', display: '\\prod_{i=1}^{n}' },
    { label: '偏导', latex: '\\frac{\\partial f}{\\partial x}', display: '\\frac{\\partial f}{\\partial x}' },
  ],
  关系符号: [
    { label: '≤', latex: '\\leq', display: '\\leq' },
    { label: '≥', latex: '\\geq', display: '\\geq' },
    { label: '≠', latex: '\\neq', display: '\\neq' },
    { label: '≈', latex: '\\approx', display: '\\approx' },
    { label: '∈', latex: '\\in', display: '\\in' },
    { label: '∞', latex: '\\infty', display: '\\infty' },
  ],
  矩阵: [
    {
      label: '2x2矩阵',
      latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
      display: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    },
    {
      label: '行列式',
      latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
      display: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
    },
  ],
};

export function LatexEditor({
  value,
  onChange,
  placeholder = '输入内容，支持LaTeX公式（使用 $ 包裹行内公式，$$ 包裹块级公式）',
  className = '',
  rows = 6,
}: LatexEditorProps) {
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 插入LaTeX符号
  const insertLatex = (latex: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    // 插入LaTeX符号，并用$包裹
    const newValue = before + '$' + latex + '$' + after;
    onChange(newValue);

    // 设置光标位置
    setTimeout(() => {
      const newCursorPos = start + latex.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              隐藏预览
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              显示预览
            </>
          )}
        </Button>

        {/* 常用符号快捷插入 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Type className="h-4 w-4 mr-1" />
              插入公式
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] max-h-[400px] overflow-y-auto">
            <Tabs defaultValue="基础运算">
              <TabsList className="grid w-full grid-cols-5">
                {Object.keys(latexSymbols).map((category) => (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(latexSymbols).map(([category, symbols]) => (
                <TabsContent key={category} value={category} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {symbols.map((symbol, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start h-auto py-2"
                        onClick={() => insertLatex(symbol.latex)}
                      >
                        <div className="flex flex-col items-start gap-1 w-full">
                          <span className="text-xs text-muted-foreground">
                            {symbol.label}
                          </span>
                          <div className="text-sm">
                            <LatexPreview latex={symbol.display} displayMode={false} />
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </PopoverContent>
        </Popover>

        <div className="text-xs text-muted-foreground">
          提示：使用 $ 包裹行内公式，$$ 包裹块级公式
        </div>
      </div>

      {/* 编辑器和预览 */}
      {showPreview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 编辑区 */}
          <div>
            <label className="text-sm font-medium mb-2 block">编辑</label>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              className="font-mono text-sm"
            />
          </div>

          {/* 预览区 */}
          <div>
            <label className="text-sm font-medium mb-2 block">预览</label>
            <div className="border rounded-md p-3 min-h-[150px] bg-muted/30">
              {value ? (
                <LatexText text={value} className="prose prose-sm max-w-none" />
              ) : (
                <p className="text-sm text-muted-foreground">预览区域</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
}


