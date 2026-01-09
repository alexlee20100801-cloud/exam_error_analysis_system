import { useState } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Coins, Trophy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIAnnotationFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotationId: number;
  imageUrl: string;
  chartType?: string;
  aiAnnotations?: any[];
  userCorrectedAnnotations?: any[];
  confidence?: number;
}

const feedbackTypeLabels = {
  accurate: '准确',
  partially_accurate: '部分准确',
  inaccurate: '不准确',
  missing_features: '缺少关键特征',
};

/**
 * AI标注反馈对话框
 * 用户可以对AI生成的标注进行评分和反馈
 */
export function AIAnnotationFeedbackDialog({
  open,
  onOpenChange,
  annotationId,
  imageUrl,
  chartType,
  aiAnnotations,
  userCorrectedAnnotations,
  confidence,
}: AIAnnotationFeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<string>('');
  const [improvementSuggestion, setImprovementSuggestion] = useState('');

  const submitFeedbackMutation = trpc.aiAnnotationFeedback.submitFeedback.useMutation({
    onSuccess: (data) => {
      // 显示奖励信息
      // @ts-ignore
      if (data.rewards) {
        // @ts-ignore
        const { pointsEarned, achievementsUnlocked } = data.rewards;
        let description = `您获得了 ${pointsEarned} 积分！`;
        
        if (achievementsUnlocked && achievementsUnlocked.length > 0) {
          const achievementNames = achievementsUnlocked.map((a: any) => a.name).join('、');
          description += `\n解锁成就：${achievementNames}`;
        }

        toast.success('感谢您的反馈！', {
          description,
        });
      } else {
        toast.success('感谢您的反馈！', {
          description: '您的反馈将帮助我们改进AI标注的准确度',
        });
      }
      
      onOpenChange(false);
      // 重置表单
      setRating(0);
      setFeedbackType('');
      setImprovementSuggestion('');
    },
    onError: (error) => {
      toast.error('提交反馈失败', {
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('请先评分');
      return;
    }

    if (!feedbackType) {
      toast.error('请选择反馈类型');
      return;
    }

    submitFeedbackMutation.mutate({
      annotationId,
      imageUrl,
      chartType,
      rating,
      feedbackType: feedbackType as any,
      improvementSuggestion: improvementSuggestion || undefined,
      aiAnnotations,
      userCorrectedAnnotations,
      confidence,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI标注反馈</DialogTitle>
          <DialogDescription>
            请对AI生成的标注进行评分和反馈,帮助我们改进识别准确度
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 评分 */}
          <div className="space-y-2">
            <Label>整体评分</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star: any) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} 星
                </span>
              )}
            </div>
          </div>

          {/* 反馈类型 */}
          <div className="space-y-2">
            <Label htmlFor="feedbackType">反馈类型</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger id="feedbackType">
                <SelectValue placeholder="选择反馈类型" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(feedbackTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 图表类型显示 */}
          {chartType && (
            <div className="space-y-2">
              <Label>图表类型</Label>
              <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                {chartType}
              </div>
            </div>
          )}

          {/* AI置信度显示 */}
          {confidence !== undefined && (
            <div className="space-y-2">
              <Label>AI置信度</Label>
              <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                {(confidence * 100).toFixed(1)}%
              </div>
            </div>
          )}

          {/* 改进建议 */}
          <div className="space-y-2">
            <Label htmlFor="improvementSuggestion">
              改进建议 <span className="text-muted-foreground">(可选)</span>
            </Label>
            <Textarea
              id="improvementSuggestion"
              placeholder="请描述AI标注存在的问题或您的改进建议..."
              value={improvementSuggestion}
              onChange={(e) => setImprovementSuggestion(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* 积分奖励提示 */}
          <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <Coins className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <div className="space-y-1">
                <div className="font-medium text-blue-900">🎁 提交反馈即可获得积分奖励！</div>
                <ul className="text-blue-700 space-y-0.5 ml-4 list-disc">
                  <li>基础反馈：10 积分</li>
                  <li>高质量反馈（详细建议）：+20 积分</li>
                  <li>提供修正标注：+15 积分</li>
                  <li>首次反馈解锁成就奖励！</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitFeedbackMutation.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitFeedbackMutation.isPending}
          >
            {submitFeedbackMutation.isPending ? '提交中...' : '提交反馈'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
