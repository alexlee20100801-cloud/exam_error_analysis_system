import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Play,
  X,
  FileText,
  Image as ImageIcon,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QueueItem {
  id: string;
  file: File;
  status: 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  preview?: string;
  result?: any;
  error?: string;
}

interface BatchUploadQueueProps {
  items: QueueItem[];
  onProcess: (item: QueueItem) => Promise<void>;
  onCancel: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
  isPaused: boolean;
  onPauseToggle: () => void;
}

export function BatchUploadQueue({
  items,
  onProcess,
  onCancel,
  onRemove,
  onClear,
  isPaused,
  onPauseToggle
}: BatchUploadQueueProps) {
  const waitingCount = items.filter(i => i.status === 'waiting').length;
  const processingCount = items.filter(i => i.status === 'processing').length;
  const completedCount = items.filter(i => i.status === 'completed').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  const totalProgress = items.length > 0
    ? (completedCount / items.length) * 100
    : 0;

  const getStatusIcon = (status: QueueItem['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: QueueItem['status']) => {
    const variants: Record<QueueItem['status'], string> = {
      waiting: 'bg-gray-100 text-gray-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500'
    };

    const labels: Record<QueueItem['status'], string> = {
      waiting: '等待中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消'
    };

    return (
      <Badge variant="secondary" className={cn('text-xs', variants[status])}>
        {labels[status]}
      </Badge>
    );
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (file.type.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <FileCheck className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>批量处理队列</CardTitle>
            <CardDescription>
              共 {items.length} 个文件 · 等待 {waitingCount} · 处理中 {processingCount} · 已完成 {completedCount} · 失败 {failedCount}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPauseToggle}
                  disabled={waitingCount === 0 && processingCount === 0}
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      继续
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      暂停
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClear}
                  disabled={processingCount > 0}
                >
                  清空队列
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 总体进度 */}
        {items.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">总体进度</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(totalProgress)}%
              </span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>
        )}

        {/* 队列列表 */}
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无文件</p>
            <p className="text-sm">选择文件后将显示在这里</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors',
                    item.status === 'processing' && 'border-blue-300 bg-blue-50/50'
                  )}
                >
                  {/* 文件图标/预览 */}
                  <div className="flex-shrink-0">
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
                        {getFileIcon(item.file)}
                      </div>
                    )}
                  </div>

                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {getStatusBadge(item.status)}
                      </div>
                    </div>

                    {/* 进度条 */}
                    {item.status === 'processing' && (
                      <div className="mb-2">
                        <Progress value={item.progress} className="h-1.5" />
                      </div>
                    )}

                    {/* 错误信息 */}
                    {item.status === 'failed' && item.error && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2 mt-2">
                      {item.status === 'waiting' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel(item.id)}
                          className="h-7 text-xs"
                        >
                          取消
                        </Button>
                      )}
                      {(item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(item.id)}
                          className="h-7 text-xs"
                        >
                          移除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
