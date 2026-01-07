import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

interface HandwritingRemovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onComplete: (processedImageUrl: string) => void;
}

export function HandwritingRemovalDialog({
  open,
  onOpenChange,
  imageUrl,
  onComplete
}: HandwritingRemovalDialogProps) {
  const [intensity, setIntensity] = useState(80);
  const [preserveRed, setPreserveRed] = useState(true);
  const [targetColors, setTargetColors] = useState<string[]>(['black', 'blue']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'before' | 'after' | 'split'>('split');

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      // 模拟处理过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: 调用实际的笔迹清除API
      // const result = await trpc.handwriting.remove.mutate({
      //   imageUrl,
      //   intensity,
      //   preserveColors: preserveRed ? ['red'] : [],
      //   targetColors
      // });
      
      // 暂时使用原图作为处理结果
      setProcessedImageUrl(imageUrl);
      toast.success('笔迹清除完成');
    } catch (error) {
      toast.error('处理失败', {
        description: '请重试'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (processedImageUrl) {
      onComplete(processedImageUrl);
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setProcessedImageUrl(null);
    setIntensity(80);
    setPreserveRed(true);
    setTargetColors(['black', 'blue']);
  };

  const toggleTargetColor = (color: string) => {
    setTargetColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            智能手写笔迹清除
          </DialogTitle>
          <DialogDescription>
            调整参数以获得最佳的笔迹清除效果，保留打印文字的同时清除手写内容
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 参数设置 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>清除强度: {intensity}%</Label>
              <Slider
                value={[intensity]}
                onValueChange={(value) => setIntensity(value[0])}
                min={0}
                max={100}
                step={5}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                强度越高，清除效果越明显，但可能影响打印文字质量
              </p>
            </div>

            <div className="space-y-2">
              <Label>目标颜色</Label>
              <div className="flex gap-2 flex-wrap">
                {['black', 'blue', 'pencil'].map(color => (
                  <Badge
                    key={color}
                    variant={targetColors.includes(color) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => !isProcessing && toggleTargetColor(color)}
                  >
                    {color === 'black' && '黑色笔迹'}
                    {color === 'blue' && '蓝色笔迹'}
                    {color === 'pencil' && '铅笔笔迹'}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserve-red"
                checked={preserveRed}
                onCheckedChange={(checked) => setPreserveRed(checked as boolean)}
                disabled={isProcessing}
              />
              <Label
                htmlFor="preserve-red"
                className="text-sm font-normal cursor-pointer"
              >
                保留红色笔迹（如老师批注）
              </Label>
            </div>
          </div>

          {/* 预览区域 */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <Tabs value={comparisonMode} onValueChange={(v) => setComparisonMode(v as any)}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="before">原图</TabsTrigger>
                  <TabsTrigger value="after" disabled={!processedImageUrl}>
                    处理后
                  </TabsTrigger>
                  <TabsTrigger value="split" disabled={!processedImageUrl}>
                    对比
                  </TabsTrigger>
                </TabsList>
                
                {processedImageUrl && (
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </Button>
                )}
              </div>

              <TabsContent value="before" className="mt-0">
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="原图"
                    className="w-full h-auto rounded-lg"
                  />
                  <Badge className="absolute top-2 left-2">原图</Badge>
                </div>
              </TabsContent>

              <TabsContent value="after" className="mt-0">
                {processedImageUrl ? (
                  <div className="relative">
                    <img
                      src={processedImageUrl}
                      alt="处理后"
                      className="w-full h-auto rounded-lg"
                    />
                    <Badge className="absolute top-2 left-2">处理后</Badge>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    点击"开始处理"查看效果
                  </div>
                )}
              </TabsContent>

              <TabsContent value="split" className="mt-0">
                {processedImageUrl ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt="原图"
                        className="w-full h-auto rounded-lg"
                      />
                      <Badge className="absolute top-2 left-2">原图</Badge>
                    </div>
                    <div className="relative">
                      <img
                        src={processedImageUrl}
                        alt="处理后"
                        className="w-full h-auto rounded-lg"
                      />
                      <Badge className="absolute top-2 left-2">处理后</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    点击"开始处理"查看对比效果
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isProcessing}
          >
            重置参数
          </Button>
          
          {!processedImageUrl ? (
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始处理
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleProcess}
                disabled={isProcessing}
              >
                重新处理
              </Button>
              <Button onClick={handleConfirm}>
                <Eye className="mr-2 h-4 w-4" />
                确认使用
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
