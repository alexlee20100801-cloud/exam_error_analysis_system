import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Target, CheckCircle2, XCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECT_NAMES: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  politics: '政治',
  history: '历史',
  geography: '地理',
};

const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
};

interface RecommendedQuestionsProps {
  subject?: string;
}

export function RecommendedQuestions({ subject }: RecommendedQuestionsProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const utils = trpc.useUtils();

  // 获取推荐题目
  const { data: recommendations, isLoading } = trpc.questionRecommendation.getRecommendations.useQuery({
    subject,
    limit: 10,
  });

  // 获取推荐统计
  const { data: stats } = trpc.questionRecommendation.getStats.useQuery();

  // 生成新推荐
  const generateMutation = trpc.questionRecommendation.generateRecommendations.useMutation({
    onSuccess: (data) => {
      if (data.recommendations.length > 0) {
        toast.success(`已为您推荐 ${data.recommendations.length} 道题目`);
        utils.questionRecommendation.getRecommendations.invalidate();
        utils.questionRecommendation.getStats.invalidate();
      } else {
        toast.info(data.message || '暂无推荐题目');
      }
    },
    onError: (error) => {
      toast.error(`生成推荐失败: ${error.message}`);
    },
  });

  // 标记已点击
  const markClickedMutation = trpc.questionRecommendation.markClicked.useMutation();

  // 记录练习结果
  const recordResultMutation = trpc.questionRecommendation.recordPracticeResult.useMutation({
    onSuccess: () => {
      toast.success('已记录练习结果');
      utils.questionRecommendation.getRecommendations.invalidate();
      utils.questionRecommendation.getStats.invalidate();
      setShowResultDialog(false);
      setShowDetailDialog(false);
    },
    onError: (error) => {
      toast.error(`记录失败: ${error.message}`);
    },
  });

  const handleViewQuestion = (question: any) => {
    setSelectedQuestion(question);
    setShowDetailDialog(true);
    
    // 标记为已点击
    if (!question.isPracticed) {
      markClickedMutation.mutate({ questionId: question.id });
    }
  };

  const handlePracticeComplete = () => {
    setShowDetailDialog(false);
    setShowResultDialog(true);
  };

  const handleRecordResult = (result: 'correct' | 'incorrect' | 'skipped') => {
    if (!selectedQuestion) return;

    recordResultMutation.mutate({
      questionId: selectedQuestion.id,
      result,
    });
  };

  const handleGenerateRecommendations = () => {
    generateMutation.mutate({ subject, limit: 10 });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">加载推荐题目中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  练习统计
                </CardTitle>
                <CardDescription>您的推荐题目练习情况</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateRecommendations}
                disabled={generateMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                生成新推荐
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">推荐题目</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.practiced}</div>
                <div className="text-sm text-muted-foreground">已练习</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.correct}</div>
                <div className="text-sm text-muted-foreground">答对</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.accuracy.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">正确率</div>
              </div>
            </div>
            {stats.practiced > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>完成进度</span>
                  <span>{((stats.practiced / stats.total) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={(stats.practiced / stats.total) * 100} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 推荐题目列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            智能推荐题目
          </CardTitle>
          <CardDescription>
            基于您的错题记录，为您推荐针对性练习题目
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!recommendations?.recommendations.length ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">暂无推荐题目</p>
              <Button onClick={handleGenerateRecommendations} disabled={generateMutation.isPending}>
                <Sparkles className="h-4 w-4 mr-1" />
                生成推荐
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.recommendations.map((question: any) => (
                <Card key={question.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{question.title}</h3>
                          <Badge className={DIFFICULTY_COLORS[question.difficulty]}>
                            {DIFFICULTY_NAMES[question.difficulty]}
                          </Badge>
                          {question.isPracticed && (
                            <Badge variant="outline">
                              {question.practiceResult === 'correct' ? '✓ 已掌握' : '✗ 需加强'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{SUBJECT_NAMES[question.subject]}</span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            匹配度 {question.matchScore.toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {question.recommendationReason}
                        </p>
                      </div>
                      <Button
                        variant={question.isPracticed ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleViewQuestion(question)}
                      >
                        {question.isPracticed ? '再次练习' : '开始练习'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 题目详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>题目详情</DialogTitle>
            <DialogDescription>
              {selectedQuestion?.recommendationReason}
            </DialogDescription>
          </DialogHeader>

          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">题目</h3>
                <p className="whitespace-pre-wrap">{selectedQuestion.content}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">答案</h3>
                <p className="whitespace-pre-wrap">{selectedQuestion.answer}</p>
              </div>

              {selectedQuestion.explanation && (
                <div>
                  <h3 className="font-semibold mb-2">解析</h3>
                  <p className="whitespace-pre-wrap">{selectedQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
            {!selectedQuestion?.isPracticed && (
              <Button onClick={handlePracticeComplete}>
                完成练习
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 练习结果对话框 */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>记录练习结果</DialogTitle>
            <DialogDescription>
              请选择您的练习结果
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 justify-center py-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleRecordResult('correct')}
              disabled={recordResultMutation.isPending}
              className="flex-1"
            >
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
              答对了
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleRecordResult('incorrect')}
              disabled={recordResultMutation.isPending}
              className="flex-1"
            >
              <XCircle className="h-5 w-5 mr-2 text-red-600" />
              答错了
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleRecordResult('skipped')}
              disabled={recordResultMutation.isPending}
            >
              跳过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
