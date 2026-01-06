import React, { useEffect, useRef } from 'react';
import { LatexCompletionItem } from '@/lib/latexCompletion';
import { LatexPreview } from './LatexPreview';
import { Badge } from './ui/badge';

interface LatexCompletionListProps {
  items: LatexCompletionItem[];
  selectedIndex: number;
  onSelect: (item: LatexCompletionItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

const CATEGORY_LABELS = {
  basic: '基础',
  greek: '希腊',
  operator: '运算',
  function: '函数',
  symbol: '符号',
  environment: '环境',
};

export function LatexCompletionList({
  items,
  selectedIndex,
  onSelect,
  onClose,
  position,
}: LatexCompletionListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // 滚动到选中项
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (items.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="fixed z-50 w-[500px] max-h-[400px] overflow-y-auto bg-popover border rounded-lg shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="p-2 space-y-1">
        {items.map((item, index) => (
          <div
            key={item.command}
            ref={index === selectedIndex ? selectedItemRef : null}
            className={`p-3 rounded-md cursor-pointer transition-colors ${
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
            onClick={() => onSelect(item)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium">
                    {item.label.split(' - ')[0]}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[item.category]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <div className="flex-shrink-0 text-sm">
                <LatexPreview latex={item.preview} displayMode={false} />
              </div>
            </div>
            {index === selectedIndex && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                按 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Tab</kbd>{' '}
                或 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd>{' '}
                补全，<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd>{' '}
                取消
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
