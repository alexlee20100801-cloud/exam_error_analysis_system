import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  History, 
  TrendingUp, 
  Target, 
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  Calendar
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PracticeHistory() {
  const { user } = useAuth();
  const [selectedDays, setSelectedDays] = useState<number>(30);

  // 获取练习历史
  const { data: history, isLoading: historyLoading } = trpc.practiceRecords.getHistory.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );

  // 获取答题统计
  const { data: stats, isLoading: statsLoading } = trpc.practiceRecords.getStats.useQuery(
    { days: selectedDays },
    { enabled: !!user }
  );

  // 获取学习进度
  const { data: progress, isLoading: progressLoading } = trpc.practiceRecords.getLearningProgress.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 获取错题回顾列表
  const { data: errorsForReview } = trpc.practiceRecords.getErrorsForReview.useQuery(
    { limit: 20 },
    { enabled: !!user }
  );

  if (historyLoading || statsLoading || progressLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">正在加载练习数据...</p>
          </div>
        </div>
      </div>
    );
  }

  const practiceModeName = {
    random: '随机练习',
    chapter: '章节复习',
    timed: '限时练习',
    weakness: '薄弱点练习',
    review: '错题回顾',
  };

  const statusName = {
    in_progress: '进行中',
    completed: '已完成',
    abandoned: '已放弃',
  };

  return (
    <div className="container py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            练习历史
          </h1>
          <p className="text-muted-foreground mt-2">
            查看您的练习记录、统计数据和学习进度
          </p>
        </div>
      </div>

      {/* 整体统计 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总练习次数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.overallProgress.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              累计练习会话
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总答题数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.overallProgress.totalQuestions || 0}</div>
            <p className="text-xs text-muted-foreground">
              累计完成题目
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均正确率</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress?.overallProgress.avgAccuracy 
                ? Number(progress.overallProgress.avgAccuracy).toFixed(1) 
                : 0}%
            </div>
            <Progress 
              value={progress?.overallProgress.avgAccuracy 
                ? Number(progress.overallProgress.avgAccuracy) 
                : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总学习时长</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor((progress?.overallProgress.totalTimeSpent || 0) / 60)}
            </div>
            <p className="text-xs text-muted-foreground">
              分钟
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详细数据 */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history">练习历史</TabsTrigger>
          <TabsTrigger value="stats">统计分析</TabsTrigger>
          <TabsTrigger value="review">错题回顾</TabsTrigger>
        </TabsList>

        {/* 练习历史 */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>最近练习记录</CardTitle>
              <CardDescription>
                显示最近50次练习会话
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history && history.length > 0 ? (
                  history.map((session) => (
                    <Card key={session.id} className="border-l-4" style={{
                      borderLeftColor: session.status === 'completed' ? '#10b981' : 
                                      session.status === 'in_progress' ? '#3b82f6' : '#6b7280'
                    }}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <span>{practiceModeName[session.practiceMode]}</span>
                              <Badge variant={
                                session.status === 'completed' ? 'default' :
                                session.status === 'in_progress' ? 'secondary' :
                                'outline'
                              }>
                                {statusName[session.status]}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {session.subject && `${session.subject} · `}
                              {new Date(session.startedAt).toLocaleString('zh-CN')}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {session.accuracyRate ? Number(session.accuracyRate).toFixed(1) : 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">正确率</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">完成题数</div>
                            <div className="font-medium">{session.completedQuestions} / {session.totalQuestions}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">正确</div>
                            <div className="font-medium text-green-600">{session.correctCount} 题</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">错误</div>
                            <div className="font-medium text-red-600">{session.wrongCount} 题</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">用时</div>
                            <div className="font-medium">{Math.floor(session.totalTimeSpent / 60)} 分钟</div>
                          </div>
                        </div>

                        <Progress 
                          value={session.totalQuestions > 0 
                            ? (session.completedQuestions / session.totalQuestions) * 100 
                            : 0} 
                          className="h-2" 
                        />

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            查看详情
                          </Button>
                          {session.status === 'in_progress' && (
                            <Button size="sm">
                              继续练习
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无练习记录，开始您的第一次练习吧！
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 统计分析 */}
        <TabsContent value="stats" className="space-y-4">
          {/* 时间范围选择 */}
          <div className="flex gap-2">
            <Button 
              variant={selectedDays === 7 ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedDays(7)}
            >
              最近7天
            </Button>
            <Button 
              variant={selectedDays === 30 ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedDays(30)}
            >
              最近30天
            </Button>
            <Button 
              variant={selectedDays === 90 ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedDays(90)}
            >
              最近90天
            </Button>
          </div>

          {/* 总体统计 */}
          <Card>
            <CardHeader>
              <CardTitle>总体统计</CardTitle>
              <CardDescription>
                最近{selectedDays}天的练习数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stats?.totalStats.totalPractices || 0}</div>
                  <div className="text-sm text-muted-foreground">总练习数</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats?.totalStats.correctCount || 0}</div>
                  <div className="text-sm text-muted-foreground">正确数</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{stats?.totalStats.wrongCount || 0}</div>
                  <div className="text-sm text-muted-foreground">错误数</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.totalStats.avgTimeSpent ? Math.floor(stats.totalStats.avgTimeSpent / 60) : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">平均用时(分钟)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 按学科统计 */}
          <Card>
            <CardHeader>
              <CardTitle>学科统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.subjectStats && stats.subjectStats.length > 0 ? (
                  stats.subjectStats.map((subject) => (
                    <div key={subject.subject} className="flex items-center gap-4">
                      <div className="w-20 font-medium">{subject.subject}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{subject.correctCount} / {subject.totalCount}</span>
                          <span className="font-medium">{subject.accuracyRate}%</span>
                        </div>
                        <Progress value={subject.accuracyRate} className="h-2" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    暂无学科统计数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 按练习模式统计 */}
          <Card>
            <CardHeader>
              <CardTitle>练习模式统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.modeStats && stats.modeStats.length > 0 ? (
                  stats.modeStats.map((mode) => (
                    <div key={mode.practiceMode} className="flex items-center gap-4">
                      <div className="w-28 font-medium">
                        {mode.practiceMode ? practiceModeName[mode.practiceMode] : '未知'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{mode.correctCount} / {mode.totalCount}</span>
                          <span className="font-medium">{mode.accuracyRate}%</span>
                        </div>
                        <Progress value={mode.accuracyRate} className="h-2" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    暂无练习模式统计数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 错题回顾 */}
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>需要回顾的错题</CardTitle>
              <CardDescription>
                这些题目您最近做错了,建议重新练习
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorsForReview && errorsForReview.length > 0 ? (
                  errorsForReview.map((error) => (
                    <Card key={error.questionId} className="border-l-4 border-l-red-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              {error.question?.title || `题目 #${error.questionId}`}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {error.subject} · {error.grade}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-red-600">
                              错误 {error.wrongCount} 次
                            </div>
                            <div className="text-xs text-muted-foreground">
                              共练习 {error.totalAttempts} 次
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            查看题目
                          </Button>
                          <Button size="sm">
                            开始练习
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    太棒了！暂时没有需要回顾的错题
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
