/**
 * LaTeX公式悬浮预览组件
 * 鼠标悬停时显示大尺寸公式预览和详细说明
 */

import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { LatexPreview } from './LatexPreview';

interface LatexFormulaTooltipProps {
  latex: string;
  label?: string;
  description?: string;
  children: ReactNode;
  delayDuration?: number;
}

export function LatexFormulaTooltip({
  latex,
  label,
  description,
  children,
  delayDuration = 300,
}: LatexFormulaTooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          className="max-w-md p-4 space-y-3"
          sideOffset={10}
        >
          {/* 标题 */}
          {label && (
            <div className="font-semibold text-sm border-b pb-2">{label}</div>
          )}

          {/* 大尺寸公式预览 */}
          <div className="bg-background rounded-md p-4 border flex items-center justify-center min-h-[80px]">
            <div className="text-xl">
              <LatexPreview latex={latex} displayMode={true} />
            </div>
          </div>

          {/* 详细说明 */}
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}

          {/* LaTeX代码 */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              LaTeX代码：
            </div>
            <div className="bg-muted rounded px-2 py-1 font-mono text-xs break-all">
              {latex}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
