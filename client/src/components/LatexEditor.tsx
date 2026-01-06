/**
 * LaTeX编辑器组件
 * 支持实时预览和常用公式快捷插入
 */

import { useState, useRef, useEffect } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LatexPreview, LatexText } from './LatexPreview';
import {
  Eye,
  EyeOff,
  Type,
  History,
  Trash2,
  BookTemplate,
  Keyboard,
  Tag,
  Filter,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { LatexHelpPanel } from './LatexHelpPanel';
import { LatexFormulaTooltip } from './LatexFormulaTooltip';
import { LatexShortcutSettings } from './LatexShortcutSettings';
import { LatexCompletionList } from './LatexCompletionList';
import { LatexTagManager } from './LatexTagManager';
import { latexTemplateCategories } from '../lib/latexTemplates';
import { latexShortcutManager } from '../lib/latexShortcuts';
import { latexTagManager, LatexTag } from '../lib/latexTags';
import {
  searchCompletions,
  applyCompletionTemplate,
  LatexCompletionItem,
} from '../lib/latexCompletion';
import {
  getLatexHistory,
  addToLatexHistory,
  clearLatexHistory,
  removeFromLatexHistory,
  formatHistoryTime,
} from '../lib/latexHistory';

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
  const [isMobile, setIsMobile] = useState(false);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [latexHistory, setLatexHistory] = useState(getLatexHistory());
  const [showShortcutSettings, setShowShortcutSettings] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'AND' | 'OR'>('OR');
  
  // 补全相关状态
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionItems, setCompletionItems] = useState<LatexCompletionItem[]>([]);
  const [completionIndex, setCompletionIndex] = useState(0);
  const [completionPosition, setCompletionPosition] = useState({ top: 0, left: 0 });
  const [currentPlaceholders, setCurrentPlaceholders] = useState<
    Array<{ start: number; end: number; text: string }>
  >([]);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 快捷键监听和补全逻辑
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点不在textarea上，不处理
      if (document.activeElement !== textareaRef.current) return;

      // 如果补全列表显示，处理补全导航
      if (showCompletion) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCompletionIndex((prev) => (prev + 1) % completionItems.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCompletionIndex((prev) =>
            prev === 0 ? completionItems.length - 1 : prev - 1
          );
          return;
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          applyCompletion(completionItems[completionIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCompletion(false);
          return;
        }
      }

      // 处理参数跳转 (Ctrl+右箭头)
      if (e.ctrlKey && e.key === 'ArrowRight' && currentPlaceholders.length > 0) {
        e.preventDefault();
        jumpToNextPlaceholder();
        return;
      }

      // 构建快捷键字符串
      const keys: string[] = [];
      if (e.ctrlKey) keys.push('ctrl');
      if (e.shiftKey) keys.push('shift');
      if (e.altKey) keys.push('alt');
      if (e.metaKey) keys.push('meta');
      
      const key = e.key.toLowerCase();
      if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
        keys.push(key);
      }

      if (keys.length < 2) return;

      const keyString = keys.sort().join('+');
      const template = latexShortcutManager.getTemplateByKey(keyString);

      if (template) {
        e.preventDefault();
        insertLatexTemplate(template);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, showCompletion, completionItems, completionIndex, currentPlaceholders]);

  // 监听输入触发补全
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const cursorPos = textarea.selectionStart;
      const text = value.substring(0, cursorPos);
      
      // 查找最后一个反斜杠
      const lastBackslash = text.lastIndexOf('\\');
      if (lastBackslash === -1 || cursorPos - lastBackslash > 20) {
        setShowCompletion(false);
        return;
      }

      // 提取命令
      const command = text.substring(lastBackslash + 1, cursorPos);
      
      // 如果命令为空或包含空格，不显示补全
      if (!command || command.includes(' ')) {
        setShowCompletion(false);
        return;
      }

      // 搜索补全项
      const items = searchCompletions(command);
      if (items.length === 0) {
        setShowCompletion(false);
        return;
      }

      // 计算补全列表位置
      const rect = textarea.getBoundingClientRect();
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      setCompletionPosition({
        top: rect.top + lineHeight + window.scrollY,
        left: rect.left + window.scrollX,
      });

      setCompletionItems(items);
      setCompletionIndex(0);
      setShowCompletion(true);
    };

    textarea.addEventListener('input', handleInput);
    return () => textarea.removeEventListener('input', handleInput);
  }, [value]);

  // 检查LaTeX语法错误
  useEffect(() => {
    if (!value) {
      setSyntaxError(null);
      return;
    }

    // 检查常见错误
    const errors: string[] = [];

    // 1. 检查未闭合的$
    const dollarCount = (value.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
      errors.push('未闭合的 $ 符号');
    }

    // 2. 检查未闭合的花括号
    let braceCount = 0;
    for (const char of value) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (braceCount < 0) {
        errors.push('花括号不匹配');
        break;
      }
    }
    if (braceCount > 0) {
      errors.push('未闭合的花括号 {');
    }

    // 3. 检查\begin和\end匹配
    const beginMatches = value.match(/\\begin\{(\w+)\}/g) || [];
    const endMatches = value.match(/\\end\{(\w+)\}/g) || [];
    if (beginMatches.length !== endMatches.length) {
      errors.push('\\begin 和 \\end 不匹配');
    }

    // 4. 检查常见未定义命令
    const commonCommands = [
      'frac', 'sqrt', 'sum', 'int', 'lim', 'prod',
      'alpha', 'beta', 'gamma', 'delta', 'theta', 'pi',
      'sin', 'cos', 'tan', 'log', 'ln',
      'leq', 'geq', 'neq', 'approx', 'infty',
      'left', 'right', 'begin', 'end',
    ];
    const commandMatches = value.match(/\\(\w+)/g) || [];
    for (const match of commandMatches) {
      const command = match.slice(1); // 移除\
      if (!commonCommands.includes(command) && command.length > 1) {
        // 这可能是自定义命令，不报错，只是提示
      }
    }

    if (errors.length > 0) {
      setSyntaxError(errors[0]); // 只显示第一个错误
    } else {
      setSyntaxError(null);
    }
  }, [value]);

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

    // 添加到历史记录
    addToLatexHistory(latex);
    setLatexHistory(getLatexHistory());

    // 设置光标位置
    setTimeout(() => {
      const newCursorPos = start + latex.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 插入LaTeX模板（支持光标位置占位符）
  const insertLatexTemplate = (template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    // 找到光标位置占位符 |
    const cursorIndex = template.indexOf('|');
    const cleanTemplate = template.replace('|', '');

    // 插入LaTeX模板，并用$包裹
    const newValue = before + '$' + cleanTemplate + '$' + after;
    onChange(newValue);

    // 添加到历史记录
    addToLatexHistory(cleanTemplate);
    setLatexHistory(getLatexHistory());

    // 设置光标位置到占位符位置
    setTimeout(() => {
      let newCursorPos = start + 1; // $ 后面
      if (cursorIndex !== -1) {
        newCursorPos = start + 1 + cursorIndex;
      } else {
        newCursorPos = start + cleanTemplate.length + 1;
      }
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 应用补全
  const applyCompletion = (item: LatexCompletionItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const text = value;
    
    // 找到反斜杠位置
    const beforeCursor = text.substring(0, cursorPos);
    const lastBackslash = beforeCursor.lastIndexOf('\\');
    if (lastBackslash === -1) return;

    // 应用模板
    const { text: templateText, cursorOffset, placeholders } = applyCompletionTemplate(item.template);
    
    const before = text.substring(0, lastBackslash);
    const after = text.substring(cursorPos);
    const newValue = before + templateText + after;
    
    onChange(newValue);
    setShowCompletion(false);

    // 添加到历史记录
    addToLatexHistory(templateText);
    setLatexHistory(getLatexHistory());

    // 设置占位符
    if (placeholders.length > 0) {
      const adjustedPlaceholders = placeholders.map((p) => ({
        start: lastBackslash + p.start,
        end: lastBackslash + p.end,
        text: p.text,
      }));
      setCurrentPlaceholders(adjustedPlaceholders);
      setCurrentPlaceholderIndex(0);

      // 选中第一个占位符
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          adjustedPlaceholders[0].start,
          adjustedPlaceholders[0].end
        );
      }, 0);
    } else {
      // 没有占位符，光标移动到末尾
      setTimeout(() => {
        const newCursorPos = lastBackslash + templateText.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // 跳转到下一个参数占位符
  const jumpToNextPlaceholder = () => {
    const textarea = textareaRef.current;
    if (!textarea || currentPlaceholders.length === 0) return;

    const nextIndex = (currentPlaceholderIndex + 1) % currentPlaceholders.length;
    setCurrentPlaceholderIndex(nextIndex);

    const placeholder = currentPlaceholders[nextIndex];
    textarea.focus();
    textarea.setSelectionRange(placeholder.start, placeholder.end);

    // 如果跳转到最后一个后再次跳转，清除占位符
    if (nextIndex === currentPlaceholders.length - 1) {
      setTimeout(() => {
        setCurrentPlaceholders([]);
        setCurrentPlaceholderIndex(0);
      }, 100);
    }
  };

  // 清除历史记录
  const handleClearHistory = () => {
    if (confirm('确定要清除所有历史记录吗？')) {
      clearLatexHistory();
      setLatexHistory([]);
    }
  };

  // 删除单条历史记录
  const handleRemoveHistory = (latex: string) => {
    removeFromLatexHistory(latex);
    setLatexHistory(getLatexHistory());
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
              基础符号
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
                      <LatexFormulaTooltip
                        key={index}
                        latex={symbol.latex}
                        label={symbol.label}
                        description={`常用${category}符号`}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto py-2 w-full"
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
                      </LatexFormulaTooltip>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* 学科模板库 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <BookTemplate className="h-4 w-4 mr-1" />
              学科模板
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[600px] max-h-[500px] overflow-y-auto">
            <Tabs defaultValue={latexTemplateCategories[0]?.title}>
              <TabsList className="grid w-full grid-cols-4">
                {latexTemplateCategories.map((category) => (
                  <TabsTrigger key={category.title} value={category.title} className="text-xs">
                    {category.icon} {category.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {latexTemplateCategories.map((category) => (
                <TabsContent key={category.title} value={category.title} className="space-y-2">
                  <div className="space-y-2">
                    {category.templates.map((template, index) => (
                      <LatexFormulaTooltip
                        key={index}
                        latex={template.latex}
                        label={template.label}
                        description={template.description}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto py-3 w-full"
                          onClick={() => insertLatex(template.latex)}
                        >
                          <div className="flex flex-col items-start gap-1 w-full">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm font-medium">{template.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {template.description}
                              </span>
                            </div>
                            <div className="text-sm w-full">
                              <LatexPreview latex={template.display} displayMode={false} />
                            </div>
                          </div>
                        </Button>
                      </LatexFormulaTooltip>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* 快捷键设置 */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowShortcutSettings(true)}
        >
          <Keyboard className="h-4 w-4 mr-1" />
          快捷键
        </Button>

        {/* 标签管理 */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowTagManager(true)}
        >
          <Tag className="h-4 w-4 mr-1" />
          标签
        </Button>

        {/* 历史记录 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <History className="h-4 w-4 mr-1" />
              历史记录
              {latexHistory.length > 0 && (
                <span className="ml-1 text-xs">({latexHistory.length})</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">最近使用的公式</h4>
                {latexHistory.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistory}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    清空
                  </Button>
                )}
              </div>
              {latexHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无历史记录
                </p>
              ) : (
                <div className="space-y-1">
                  {latexHistory.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted group"
                    >
                      <LatexFormulaTooltip
                        latex={item.latex}
                        label={`历史公式 #${index + 1}`}
                        description={`使用 ${item.usageCount} 次，${formatHistoryTime(item.timestamp)}`}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="flex-1 justify-start h-auto py-2"
                          onClick={() => insertLatex(item.latex)}
                        >
                          <div className="flex flex-col items-start gap-1 w-full">
                            <div className="text-sm">
                              <LatexPreview latex={item.latex} displayMode={false} />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span>使用 {item.usageCount} 次</span>
                              <span>•</span>
                              <span>{formatHistoryTime(item.timestamp)}</span>
                              {latexTagManager.getFormulaTags(item.latex).map((tag) => (
                                <span
                                  key={tag.id}
                                  className={`px-1.5 py-0.5 rounded text-xs text-white bg-${tag.color}-500`}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </Button>
                      </LatexFormulaTooltip>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemoveHistory(item.latex)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="text-xs text-muted-foreground">
          提示：使用 $ 包裹行内公式，$$ 包裹块级公式
        </div>
      </div>

      {/* 语法错误提示 */}
      {syntaxError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
          <strong>语法错误：</strong> {syntaxError}
          <div className="mt-1 text-xs">
            建议：检查括号和符号是否成对出现
          </div>
        </div>
      )}

      {/* LaTeX语法帮助面板 */}
      <LatexHelpPanel />

      {/* 快捷键设置对话框 */}
      <LatexShortcutSettings
        open={showShortcutSettings}
        onOpenChange={setShowShortcutSettings}
      />

      {/* 标签管理对话框 */}
      <LatexTagManager
        open={showTagManager}
        onOpenChange={setShowTagManager}
      />

      {/* 补全列表 */}
      {showCompletion && (
        <LatexCompletionList
          items={completionItems}
          selectedIndex={completionIndex}
          onSelect={applyCompletion}
          onClose={() => setShowCompletion(false)}
          position={completionPosition}
        />
      )}

      {/* 编辑器和预览 */}
      {showPreview ? (
        <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-4`}>
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
            <div className={`border rounded-md p-3 min-h-[150px] bg-muted/30 ${isMobile ? 'text-base' : ''}`}>
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


