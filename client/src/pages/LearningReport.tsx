import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { LearningReportSkeleton, ChartSkeleton, StatCardSkeleton } from "@/components/LearningReportSkeleton";
import { ErrorRetry, ChartError } from "@/components/ErrorRetry";
import { 
  BarChart3, 
  Brain, 
  Clock, 
  Target, 
  TrendingUp,
  BookOpen,
  FileText,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LearningReportExportDialog } from "@/components/LearningReportExportDialog";
import { Download } from "lucide-react";
import { useState } from "react";
import { NotificationSettingsDialog } from "@/components/NotificationSettingsDialog";
import { ALL_SUBJECTS, SUBJECTS, getSubjectName } from "@shared/subjects";
import { BarChart, Bar, XAxis as RechartsXAxis, YAxis as RechartsYAxis, CartesianGrid as RechartsCartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer as RechartsResponsiveContainer } from "recharts";
import { SEO } from "@/components/SEO";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/**
 * 学科报告卡片组件
 */
function SubjectReportCard({ subject }: { subject: string }) {
  const [, setLocation] = useLocation();
  
  return (
    <Button
      variant="outline"
      className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-accent"
      onClick={() => setLocation(`/subject-report/${subject}`)}
    >
      <span className="text-2xl">{SUBJECTS[subject as keyof typeof SUBJECTS]?.icon}</span>
      <span className="text-sm font-medium">{getSubjectName(subject as any)}</span>
    </Button>
  );
}

/**
 * 学习报告页面
 * 展示学习数据可视化图表
 */
export default function LearningReport() {
  const seoData = {
    title: '学习报告',
    description: '个人学习数据分析报告,展示学习时长趋势、学科掌握度、错题分布、薄弱知识点等关键指标,帮助学生全面了解学习情况。',
    keywords: '学习报告,学习分析,学习统计,掌握度分析,薄弱知识点,深圳初中,深圳高中',
    ogImage: 'https://example.com/og-learning-report.jpg',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '学习报告 - 深圳初高中错题分析学习系统',
      description: '个人学习数据分析,全面展示学习进度和掌握情况',
      provider: {
        '@type': 'Organization',
        name: '深圳初高中错题分析学习系统'
      }
    }
  };
  const { user, loading: authLoading } = useAuth();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingCalendar, setExportingCalendar] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // 获取学习总览数据
  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch: refetchOverview } = trpc.learningStats.getOverview.useQuery(
    undefined,
    { 
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
      gcTime: 10 * 60 * 1000, // 缓存保留10分钟
      retry: 2, // 失败后重试2次
      retryDelay: 1000, // 重试延迟1秒
    }
  );

  // 获取知识点掌握度数据（雷达图）
  const { data: masteryData, isLoading: masteryLoading, error: masteryError, refetch: refetchMastery } = trpc.learningStats.getKnowledgePointMastery.useQuery(
    { limit: 8 },
    { 
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: 1000,
    }
  );

  // 获取错题分布数据（饼图）
  const { data: distributionData, isLoading: distributionLoading, error: distributionError, refetch: refetchDistribution } = trpc.learningStats.getErrorDistribution.useQuery(
    undefined,
    { 
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: 1000,
    }
  );

  // 获取学习时长趋势数据（折线图）
  const { data: trendData, isLoading: trendLoading, error: trendError, refetch: refetchTrend } = trpc.learningStats.getLearningTimeTrend.useQuery(
    { days: 30 },
    { 
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: 1000,
    }
  );

  // 获取错题统计数据
  const { data: errorSubjectDist, error: errorSubjectError, refetch: refetchErrorSubject } = trpc.errorQuestionStats.getSubjectDistribution.useQuery(
    undefined,
    { 
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: 1000,
    }
  );
  const { data: errorDifficultyDist, error: errorDifficultyError, refetch: refetchErrorDifficulty } = trpc.errorQuestionStats.getDifficultyDistribution.useQuery(
    undefined,
    { 
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: 1000,
    }
  );
  const { data: errorKnowledgeMastery, error: errorKnowledgeError, refetch: refetchErrorKnowledge } = trpc.errorQuestionStats.getKnowledgePointMastery.useQuery(
    { limit: 8 },
    { 
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: 1000,
    }
  );

  // AI学习建议
  const { data: aiAdvice, isLoading: aiAdviceLoading, error: aiAdviceError, refetch: refetchAiAdvice } = trpc.aiLearningAdvice.generate.useQuery(
    undefined,
    {
      staleTime: 10 * 60 * 1000, // AI建议缓存10分钟
      cacheTime: 30 * 60 * 1000, // 保留30分钟
      retry: 1,
      retryDelay: 2000,
    }
  );
  
  // 复习任务
  const { data: latestTasks, refetch: refetchTasks } = trpc.reviewTasks.getLatest.useQuery();
  const { data: completionStats, refetch: refetchStats } = trpc.reviewTasks.getStats.useQuery();
  const toggleTaskMutation = trpc.reviewTasks.toggle.useMutation({
    onSuccess: () => {
      refetchTasks();
      refetchStats();
    },
  });

  // 导出日历
  const exportCalendarMutation = trpc.aiLearningAdvice.exportCalendar.useMutation();
  
  // 提醒设置
  const { data: reminderSettings } = trpc.reminderSettings.getSettings.useQuery();
  const updateReminderSettingsMutation = trpc.reminderSettings.updateSettings.useMutation();

  const handleExportCalendar = async () => {
    try {
      setExportingCalendar(true);
      const result = await exportCalendarMutation.mutateAsync();
      
      if (result.success && result.data) {
        // 创建Blob并下载
        const blob = new Blob([result.data.content], { type: "text/calendar;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // 显示成功提示
        alert("复习计划已导出！请将.ics文件导入到你的日历应用。");
      }
    } catch (error) {
      console.error("导出日历失败:", error);
      alert("导出失败，请稍后重试。");
    } finally {
      setExportingCalendar(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <LearningReportSkeleton />
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">请先登录</p>
        </div>
      </DashboardLayout>
    );
  }

  // 学科颜色映射
  const subjectColors: Record<string, string> = {
    chinese: "#FF6B6B",
    math: "#4ECDC4",
    english: "#45B7D1",
    physics: "#96CEB4",
    chemistry: "#FFEAA7",
    biology: "#DFE6E9",
    politics: "#FD79A8",
    history: "#FDCB6E",
    geography: "#6C5CE7",
  };

  const subjectNames: Record<string, string> = {
    chinese: "语文",
    math: "数学",
    english: "英语",
    physics: "物理",
    chemistry: "化学",
    biology: "生物",
    politics: "政治",
    history: "历史",
    geography: "地理",
  };

  // 雷达图数据转换
  const radarChartData = masteryData?.map((item) => ({
    subject: item.knowledgePoint,
    value: item.masteryLevel,
    fullMark: 100,
  })) || [];

  // 饼图数据转换
  const pieChartData = distributionData?.map((item) => ({
    name: subjectNames[item.subject] || item.subject,
    value: item.count,
    color: subjectColors[item.subject] || "#999",
  })) || [];

  // 折线图数据转换
  const lineChartData = trendData?.map((item) => ({
    date: new Date(item.date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
    练习次数: item.practiceCount,
    正确率: item.correctRate,
  })) || [];

  return (
    <>
      <SEO {...seoData} />
      <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">学习报告</h1>
            <p className="text-muted-foreground mt-2">查看你的学习进度和数据统计</p>
          </div>
          <Button onClick={() => setExportDialogOpen(true)} size="lg">
            <Download className="mr-2 h-4 w-4" />
            导出PDF报告
          </Button>
        </div>

        {/* 导出对话框 */}
        <LearningReportExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
        />

        {/* AI学习建议 */}
        {aiAdviceLoading ? (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : aiAdviceError ? (
          <ErrorRetry 
            title="AI学习建议加载失败" 
            message="无法生成AI学习建议，请稍后重试" 
            onRetry={() => refetchAiAdvice()} 
          />
        ) : aiAdvice && aiAdvice.data ? (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI个性化学习建议
                  </CardTitle>
                  <CardDescription>基于你的错题数据智能生成</CardDescription>
                </div>
                {aiAdvice.data.reviewPlan.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCalendar}
                      disabled={exportingCalendar}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {exportingCalendar ? "导出中..." : "导出到日历"}
                    </Button>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          id="reminder-enabled"
                          checked={reminderSettings?.data?.enabled ?? true}
                          onChange={async (e) => {
                            const enabled = e.target.checked;
                            try {
                              await updateReminderSettingsMutation.mutateAsync({
                                enabled,
                                reminderMinutes: reminderSettings?.data?.reminderMinutes ?? [1440, 180, 60],
                              });
                              alert(enabled ? "已开启提醒！系统将在复习任务到期前自动发送提醒" : "已关闭提醒");
                            } catch (error) {
                              console.error("更新提醒设置失败:", error);
                              alert("设置失败，请稍后重试");
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="reminder-enabled" className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                          开启任务提醒
                        </label>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNotificationSettings(true)}
                        className="h-8 px-2"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        通知设置
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 总体评估 */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-900 dark:text-blue-100">{aiAdvice.data.overallAssessment}</p>
              </div>

              {/* 学习建议 */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  学习建议
                </h3>
                <div className="space-y-2">
                  {aiAdvice.data.learningTips.map((tip: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        tip.priority === "high"
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                          : tip.priority === "medium"
                          ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                          : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{tip.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{tip.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 复习计划 - 带复选框 */}
              {latestTasks?.data?.tasks && latestTasks.data.tasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    智能复习计划
                  </h3>
                  <div className="space-y-2">
                    {latestTasks.data.tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskMutation.mutate({ taskId: task.id })}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {task.priority}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.subject}
                            </h4>
                            {task.knowledgePoint && (
                              <span className={`text-xs ${task.completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                                · {task.knowledgePoint}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${task.completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                            {task.reason}
                          </p>
                          <p className={`text-xs mt-1 ${task.completed ? 'text-muted-foreground/70' : 'text-primary'}`}>
                            建议时间：{task.suggestedTime}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 薄弱点诊断 */}
              {aiAdvice.data.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    薄弱点诊断
                  </h3>
                  <div className="space-y-2">
                    {aiAdvice.data.weaknesses.map((weakness: any, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          weakness.severity === "critical"
                            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                            : weakness.severity === "moderate"
                            ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
                            : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                        }`}
                      >
                        <h4 className="text-sm font-medium">{weakness.area}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{weakness.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 激励语 */}
              <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent rounded-lg border border-primary/20">
                <p className="text-sm text-center font-medium text-primary">{aiAdvice.data.encouragement}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* 学习总览卡片 */}
        {overviewLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : overview ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  错题总数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalErrorQuestions}</div>
                <p className="text-xs text-muted-foreground mt-1">已收录错题</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  练习次数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalPracticeCount}</div>
                <p className="text-xs text-muted-foreground mt-1">累计练习</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  正确率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.averageCorrectRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">平均正确率</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  学习时长
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalStudyTime}</div>
                <p className="text-xs text-muted-foreground mt-1">分钟</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4 text-green-600" />
                  已掌握
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.masteredKnowledgePoints}</div>
                <p className="text-xs text-muted-foreground mt-1">知识点</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-red-500" />
                  薄弱点
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.weakKnowledgePoints}</div>
                <p className="text-xs text-muted-foreground mt-1">待加强</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 知识点掌握度雷达图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                知识点掌握度分析
              </CardTitle>
              <CardDescription>各知识点的掌握程度（0-100分）</CardDescription>
            </CardHeader>
            <CardContent>
              {masteryLoading ? (
                <ChartSkeleton height={300} />
              ) : masteryError ? (
                <ChartError message="知识点掌握度数据加载失败" onRetry={() => refetchMastery()} height={300} />
              ) : radarChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="掌握度"
                      dataKey="value"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 错题分布饼图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                错题学科分布
              </CardTitle>
              <CardDescription>各学科错题数量占比</CardDescription>
            </CardHeader>
            <CardContent>
              {distributionLoading ? (
                <ChartSkeleton height={300} />
              ) : distributionError ? (
                <ChartError message="错题分布数据加载失败" onRetry={() => refetchDistribution()} height={300} />
              ) : pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 学科学习报告入口 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              学科学习报告
            </CardTitle>
            <CardDescription>查看每个学科的详细分析报告</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {ALL_SUBJECTS.map((subject) => (
                <SubjectReportCard key={subject} subject={subject} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 复习完成率统计 */}
        {completionStats?.data && completionStats.data.totalTasks > 0 && (
          <Card className="border-2 border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                复习任务完成情况
              </CardTitle>
              <CardDescription>查看你的复习计划执行情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 总体完成率 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">总体完成率</span>
                    <span className="text-2xl font-bold text-green-600">
                      {completionStats.data.completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-green-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${completionStats.data.completionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    已完成 {completionStats.data.completedTasks} / {completionStats.data.totalTasks} 个任务
                  </p>
                </div>

                {/* 分学科完成率 */}
                {completionStats.data.subjectStats.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">分学科完成情况</h3>
                    <div className="space-y-3">
                      {completionStats.data.subjectStats.map((stat: any) => (
                        <div key={stat.subject}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">{stat.subject}</span>
                            <span className="text-sm font-medium">
                              {stat.completed}/{stat.total} ({stat.completionRate}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                stat.completionRate >= 80
                                  ? 'bg-green-500'
                                  : stat.completionRate >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${stat.completionRate}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 错题本数据可视化 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              错题本数据分析
            </CardTitle>
            <CardDescription>从多个维度分析你的错题情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 学科分布饼图 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-center">学科分布</h3>
                {errorSubjectError ? (
                  <ChartError message="学科分布数据加载失败" onRetry={() => refetchErrorSubject()} height={250} />
                ) : errorSubjectDist && errorSubjectDist.data && errorSubjectDist.data.length > 0 ? (
                  <RechartsResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={errorSubjectDist.data.map(item => ({
                          name: subjectNames[item.subject] || item.subject,
                          value: item.count,
                          fill: subjectColors[item.subject] || "#999",
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {errorSubjectDist.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={subjectColors[entry.subject] || "#999"} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </RechartsResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    暂无数据
                  </div>
                )}
              </div>

              {/* 难度分布柱状图 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-center">难度分布</h3>
                {errorDifficultyError ? (
                  <ChartError message="难度分布数据加载失败" onRetry={() => refetchErrorDifficulty()} height={250} />
                ) : errorDifficultyDist && errorDifficultyDist.data && errorDifficultyDist.data.length > 0 ? (
                  <RechartsResponsiveContainer width="100%" height={250}>
                    <BarChart data={errorDifficultyDist.data.map(item => ({
                      difficulty: item.difficulty === "easy" ? "简单" : item.difficulty === "medium" ? "中等" : "困难",
                      count: item.count,
                    }))}>
                      <RechartsCartesianGrid strokeDasharray="3 3" />
                      <RechartsXAxis dataKey="difficulty" />
                      <RechartsYAxis />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#8884d8" name="错题数" />
                    </BarChart>
                  </RechartsResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    暂无数据
                  </div>
                )}
              </div>

              {/* 知识点掌握度雷达图 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-center">知识点掌握度</h3>
                {errorKnowledgeError ? (
                  <ChartError message="知识点掌握度数据加载失败" onRetry={() => refetchErrorKnowledge()} height={250} />
                ) : errorKnowledgeMastery && errorKnowledgeMastery.data && errorKnowledgeMastery.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={errorKnowledgeMastery.data.map(item => ({
                      subject: item.knowledgePointName.length > 6 ? item.knowledgePointName.slice(0, 6) + "..." : item.knowledgePointName,
                      value: item.masteryLevel,
                      fullMark: 100,
                    }))}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="掌握度"
                        dataKey="value"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    暂无数据
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 学习时长趋势折线图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              学习趋势分析
            </CardTitle>
            <CardDescription>近30天的练习次数和正确率变化</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[300px]" />
            ) : lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="练习次数"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="正确率"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 通知设置对话框 */}
      <NotificationSettingsDialog
        open={showNotificationSettings}
        onOpenChange={setShowNotificationSettings}
        currentSettings={{
          enabled: reminderSettings?.data?.enabled ?? true,
          reminderMinutes: reminderSettings?.data?.reminderMinutes ?? [1440, 180, 60],
          notificationChannels: reminderSettings?.data?.notificationChannels ?? ["system"],
        }}
        userEmail={user?.email ?? null}
        emailVerified={user?.emailVerified ?? false}
        wechatBound={!!user?.wechatOpenId}
      />
    </DashboardLayout>
    </>
  );
}
