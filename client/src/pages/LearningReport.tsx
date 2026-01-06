import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  Brain, 
  Clock, 
  Target, 
  TrendingUp,
  BookOpen,
  FileText
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LearningReportExportDialog } from "@/components/LearningReportExportDialog";
import { Download } from "lucide-react";
import { useState } from "react";
import { ALL_SUBJECTS, SUBJECTS, getSubjectName } from "@shared/subjects";
import { BarChart, Bar, XAxis as RechartsXAxis, YAxis as RechartsYAxis, CartesianGrid as RechartsCartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer as RechartsResponsiveContainer } from "recharts";
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
  const { user, loading: authLoading } = useAuth();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // 获取学习总览数据
  const { data: overview, isLoading: overviewLoading } = trpc.learningStats.getOverview.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 获取知识点掌握度数据（雷达图）
  const { data: masteryData, isLoading: masteryLoading } = trpc.learningStats.getKnowledgePointMastery.useQuery(
    { limit: 8 },
    { enabled: !!user }
  );

  // 获取错题分布数据（饼图）
  const { data: distributionData, isLoading: distributionLoading } = trpc.learningStats.getErrorDistribution.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 获取学习时长趋势数据（折线图）
  const { data: trendData, isLoading: trendLoading } = trpc.learningStats.getLearningTimeTrend.useQuery(
    { days: 30 },
    { enabled: !!user }
  );

  // 获取错题统计数据
  const { data: errorSubjectDist } = trpc.errorQuestionStats.getSubjectDistribution.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: errorDifficultyDist } = trpc.errorQuestionStats.getDifficultyDistribution.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: errorKnowledgeMastery } = trpc.errorQuestionStats.getKnowledgePointMastery.useQuery(
    { limit: 8 },
    { enabled: !!user }
  );

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
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
                <Skeleton className="h-[300px]" />
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
                <Skeleton className="h-[300px]" />
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
                {errorSubjectDist && errorSubjectDist.data && errorSubjectDist.data.length > 0 ? (
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
                {errorDifficultyDist && errorDifficultyDist.data && errorDifficultyDist.data.length > 0 ? (
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
                {errorKnowledgeMastery && errorKnowledgeMastery.data && errorKnowledgeMastery.data.length > 0 ? (
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
    </DashboardLayout>
  );
}
