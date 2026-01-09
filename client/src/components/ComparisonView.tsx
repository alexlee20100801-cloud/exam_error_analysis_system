import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  Link2,
  Unlink,
  X
} from 'lucide-react';
import { ChartVisualization } from './ChartVisualization';

interface ComparisonItem {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
  subject: string;
  difficulty: string;
  knowledgePoints?: string[];
}

interface ComparisonViewProps {
  items: ComparisonItem[];
  onClose?: () => void;
}

export function ComparisonView({ items, onClose }: ComparisonViewProps) {
  const [scales, setScales] = useState<number[]>(items.map(() => 1));
  const [syncZoom, setSyncZoom] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 同步缩放
  const handleZoom = (index: number, delta: number) => {
    if (syncZoom) {
      // 同步所有项目的缩放
      setScales(prev => prev.map(scale => Math.max(0.5, Math.min(3, scale + delta))));
    } else {
      // 只缩放当前项目
      setScales(prev => prev.map((scale, i) => 
        i === index ? Math.max(0.5, Math.min(3, scale + delta)) : scale
      ));
    }
  };

  // 同步滚动
  useEffect(() => {
    if (!syncScroll) return;

    const handleScroll = (sourceIndex: number) => (e: Event) => {
      const source = e.target as HTMLDivElement;
      scrollRefs.current.forEach((ref, i) => {
        if (ref && i !== sourceIndex) {
          ref.scrollTop = source.scrollTop;
          ref.scrollLeft = source.scrollLeft;
        }
      });
    };

    const listeners = scrollRefs.current.map((ref, index) => {
      if (ref) {
        const listener = handleScroll(index);
        ref.addEventListener('scroll', listener);
        return { ref, listener };
      }
      return null;
    });

    return () => {
      listeners.forEach(item => {
        if (item) {
          item.ref.removeEventListener('scroll', item.listener);
        }
      });
    };
  }, [syncScroll, items.length]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return difficulty;
    }
  };

  if (fullscreenIndex !== null) {
    const item = items[fullscreenIndex];
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoom(fullscreenIndex, 0.1)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoom(fullscreenIndex, -0.1)}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullscreenIndex(null)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div style={{ transform: `scale(${scales[fullscreenIndex]})`, transformOrigin: 'top left' }}>
              <ChartVisualization content={item.content} imageUrl={item.imageUrl} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">对比学习模式</h2>
            <Badge variant="outline">{items.length} 个题目</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant={syncZoom ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSyncZoom(!syncZoom)}
            >
              {syncZoom ? <Link2 className="h-4 w-4 mr-2" /> : <Unlink className="h-4 w-4 mr-2" />}
              同步缩放
            </Button>
            <Button
              variant={syncScroll ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSyncScroll(!syncScroll)}
            >
              {syncScroll ? <Link2 className="h-4 w-4 mr-2" /> : <Unlink className="h-4 w-4 mr-2" />}
              同步滚动
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className={`grid gap-4 ${items.length === 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {items.map((item, index) => (
          <Card key={item.id} className="flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{item.subject}</Badge>
                    <Badge className={`text-xs ${getDifficultyColor(item.difficulty)}`}>
                      {getDifficultyLabel(item.difficulty)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleZoom(index, 0.1)}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleZoom(index, -0.1)}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFullscreenIndex(index)}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {item.knowledgePoints && item.knowledgePoints.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.knowledgePoints.slice(0, 3).map((kp, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {kp}
                    </Badge>
                  ))}
                  {item.knowledgePoints.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.knowledgePoints.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div 
              // @ts-ignore
              ref={el => scrollRefs.current[index] = el}
              className="flex-1 overflow-auto p-4"
              style={{ maxHeight: '600px' }}
            >
              <div style={{ 
                transform: `scale(${scales[index]})`, 
                transformOrigin: 'top left',
                transition: syncZoom ? 'transform 0.2s' : 'none'
              }}>
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="content">题目内容</TabsTrigger>
                    <TabsTrigger value="chart">图表展示</TabsTrigger>
                  </TabsList>
                  <TabsContent value="content" className="space-y-2">
                    <div className="text-sm whitespace-pre-wrap">{item.content}</div>
                  </TabsContent>
                  <TabsContent value="chart">
                    <ChartVisualization content={item.content} imageUrl={item.imageUrl} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {items.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">对比分析</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">难度分布</div>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map(diff => {
                  const count = items.filter(item => item.difficulty === diff).length;
                  return count > 0 ? (
                    <Badge key={diff} className={getDifficultyColor(diff)}>
                      {getDifficultyLabel(diff)}: {count}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">学科分布</div>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(items.map(item => item.subject))).map(subject => {
                  const count = items.filter(item => item.subject === subject).length;
                  return (
                    <Badge key={subject} variant="outline">
                      {subject}: {count}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">共同知识点</div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const allKnowledgePoints = items.flatMap(item => item.knowledgePoints || []);
                  const commonPoints = allKnowledgePoints.filter((kp, index, arr) => 
                    arr.filter(k => k === kp).length > 1
                  );
                  const uniqueCommon = Array.from(new Set(commonPoints));
                  return uniqueCommon.slice(0, 5).map((kp, i) => (
                    <Badge key={i} variant="secondary">{kp}</Badge>
                  ));
                })()}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
