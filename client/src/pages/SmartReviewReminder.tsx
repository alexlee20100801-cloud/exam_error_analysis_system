import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Clock, Bell, BellOff, Play, Pause, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

const SUBJECT_NAMES: Record<string, string> = {
  chinese: '语文',
  math: '数学',
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

export function SmartReviewReminder() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // 获取待复习错题
  const { data: dueQuestions, isLoading: questionsLoading } = trpc.smartReviewReminder.getDueQuestions.useQuery();

  // 获取复习统计
  const { data: statistics, isLoading: statsLoading } = trpc.smartReviewReminder.getStatistics.useQuery();

  // 获取提醒设置
  const { data: settings, isLoading: settingsLoading } = trpc.smartReviewReminder.getSettings.useQuery();

  // 更新设置
  const updateSettings = trpc.smartReviewReminder.updateSettings.useMutation({
    onSuccess: () => {
      toast({
        // @ts-ignore
        title: '设置已保存',
        description: '复习提醒设置已更新',
      });
      utils.smartReviewReminder.getSettings.invalidate();
    },
  });

  // 标记已复习
  const markReviewed = trpc.smartReviewReminder.markAsReviewed.useMutation({
    onSuccess: () => {
      toast({
        // @ts-ignore
        title: '已标记为已复习',
        description: '系统将根据艾宾浩斯遗忘曲线安排下次复习时间',
      });
      utils.smartReviewReminder.getDueQuestions.invalidate();
      utils.smartReviewReminder.getStatistics.invalidate();
    },
  });

  // 暂停提醒
  const pauseReminder = trpc.smartReviewReminder.pauseReminder.useMutation({
    onSuccess: () => {
      toast({
        // @ts-ignore
        title: '已暂停提醒',
        description: '该错题的复习提醒已暂停',
      });
      utils.smartReviewReminder.getDueQuestions.invalidate();
      utils.smartReviewReminder.getStatistics.invalidate();
    },
  });

  const handleReviewQuestion = (questionId: number) => {
    navigate(`/error-questions/${questionId}`);
  };

  const handleMarkReviewed = async (questionId: number) => {
    await markReviewed.mutateAsync({ errorQuestionId: questionId });
  };

  const handlePauseReminder = async (questionId: number) => {
    await pauseReminder.mutateAsync({ errorQuestionId: questionId });
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    await updateSettings.mutateAsync({ isEnabled: enabled ? 1 : 0 });
  };

  const handleUpdateTime = async (time: string) => {
    await updateSettings.mutateAsync({ reminderTime: time });
  };

  const handleUpdateMaxReminders = async (max: number) => {
    await updateSettings.mutateAsync({ maxDailyReminders: max });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">智能复习提醒</h1>
        <p className="text-muted-foreground mt-1">
          基于艾宾浩斯遗忘曲线，科学安排错题复习时间
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待复习</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : statistics?.due || 0}
            </div>
            <p className="text-xs text-muted-foreground">需要复习的错题</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总计</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : statistics?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">复习计划中的错题</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : statistics?.completed || 0}
            </div>
            <p className="text-xs text-muted-foreground">完成所有复习轮次</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已暂停</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : statistics?.paused || 0}
            </div>
            <p className="text-xs text-muted-foreground">暂停提醒的错题</p>
          </CardContent>
        </Card>
      </div>

      {/* 提醒设置 */}
      <Card>
        <CardHeader>
          <CardTitle>提醒设置</CardTitle>
          <CardDescription>
            配置复习提醒的时间和方式
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsLoading ? (
            <div>加载中...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用提醒</Label>
                  <p className="text-sm text-muted-foreground">
                    开启后将在设定时间推送复习提醒
                  </p>
                </div>
                <Switch
                  checked={settings?.isEnabled === 1}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label>提醒时间</Label>
                <Input
                  type="time"
                  value={settings?.reminderTime || '20:00'}
                  onChange={(e) => handleUpdateTime(e.target.value)}
                  className="max-w-[200px]"
                />
                <p className="text-sm text-muted-foreground">
                  每天在此时间推送复习提醒
                </p>
              </div>

              <div className="space-y-2">
                <Label>每日最大提醒数</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={settings?.maxDailyReminders || 10}
                  onChange={(e) => handleUpdateMaxReminders(parseInt(e.target.value))}
                  className="max-w-[200px]"
                />
                <p className="text-sm text-muted-foreground">
                  限制每天推送的复习提醒数量
                </p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium text-sm mb-2">艾宾浩斯遗忘曲线复习间隔</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• 第1次复习：1天后</li>
                  <li>• 第2次复习：3天后</li>
                  <li>• 第3次复习：7天后</li>
                  <li>• 第4次复习：15天后</li>
                  <li>• 第5次复习：30天后</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 待复习错题列表 */}
      <Card>
        <CardHeader>
          <CardTitle>待复习错题</CardTitle>
          <CardDescription>
            这些错题已到复习时间，建议尽快复习
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questionsLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : dueQuestions && dueQuestions.length > 0 ? (
            <div className="space-y-4">
              {dueQuestions.map((question: any) => (
                <div
                  key={question.recordId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {SUBJECT_NAMES[question.questionSubject] || question.questionSubject}
                      </Badge>
                      {question.questionDifficulty && (
                        <Badge variant="secondary">
                          {DIFFICULTY_NAMES[question.questionDifficulty] || question.questionDifficulty}
                        </Badge>
                      )}
                      <Badge variant="default">
                        第{(question.reviewRound || 0) + 1}轮复习
                      </Badge>
                    </div>
                    <h3 className="font-medium truncate">{question.questionTitle}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      应复习时间：{new Date(question.nextReviewAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewQuestion(question.errorQuestionId)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      开始复习
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleMarkReviewed(question.errorQuestionId)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      标记已复习
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePauseReminder(question.errorQuestionId)}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无待复习的错题</p>
              <p className="text-sm mt-2">继续保持，或添加新的错题到复习计划</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
