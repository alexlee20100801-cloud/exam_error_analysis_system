import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorRetryProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * 错误提示和重试组件
 * 用于显示友好的错误信息并提供重试功能
 */
export function ErrorRetry({
  title = "加载失败",
  message = "数据加载失败,请稍后重试",
  onRetry,
  className = "",
}: ErrorRetryProps) {
  return (
    <Card className={`border-destructive/50 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent>
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * 简单的错误提示组件(不带卡片包装)
 */
export function ErrorMessage({
  message = "加载失败",
  onRetry,
  className = "",
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-8 ${className}`}>
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm">{message}</span>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      )}
    </div>
  );
}

/**
 * 图表错误提示组件
 * 专门用于图表区域的错误显示
 */
export function ChartError({
  message = "图表加载失败",
  onRetry,
  height = 300,
}: {
  message?: string;
  onRetry?: () => void;
  height?: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 border border-destructive/20 rounded-lg bg-destructive/5"
      style={{ height: `${height}px` }}
    >
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm">{message}</span>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      )}
    </div>
  );
}
