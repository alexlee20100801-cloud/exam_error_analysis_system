import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ArrowLeft, TrendingUp, AlertTriangle, BookOpen, Target } from "lucide-react";
import { ALL_SUBJECTS, SUBJECTS, getSubjectName, type Subject } from "@shared/subjects";

export default function SubjectReport() {
  const params = useParams();
  const [, setLocation] = useLocation();
  // @ts-ignore
  const [selectedSubject, setSelectedSubject] = useState<Subject>((params.subject as Subject) || "math");

  // 获取学科报告数据
  const { data: reportData, isLoading, error } = trpc.subjectReport.getReport.useQuery({
    subject: selectedSubject,
  });

  useEffect(() => {
    // @ts-ignore
    if (params.subject && params.subject !== selectedSubject) {
      // @ts-ignore
      setSelectedSubject(params.subject as Subject);
    }
  // @ts-ignore
  }, [params.subject]);

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject as Subject);
    setLocation(`/subject-report/${subject}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>加载学科报告失败：{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const avgMastery = reportData?.mastery && reportData.mastery.length > 0
    ? Math.round(reportData.mastery.reduce((sum, m) => sum + m.mastery, 0) / reportData.mastery.length)
    : 0;

  const totalErrors = reportData?.errorTrend?.reduce((sum, t) => sum + t.errorCount, 0) || 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/learning-report")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {SUBJECTS[selectedSubject]?.icon} {getSubjectName(selectedSubject)}学习报告
            </h1>
            <p className="text-muted-foreground mt-1">深度分析该学科的学习情况和薄弱环节</p>
          </div>
        </div>

        {/* 学科切换器 */}
        <Select value={selectedSubject} onValueChange={handleSubjectChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="选择学科" />
          </SelectTrigger>
          <SelectContent>
            {ALL_SUBJECTS.map((subject: any) => (
              <SelectItem key={subject} value={subject}>
                {SUBJECTS[subject]?.icon} {getSubjectName(subject)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 整体统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均掌握度</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMastery}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgMastery >= 70 ? "掌握良好" : avgMastery >= 40 ? "需要加强" : "亟待提升"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计错题</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">近8周统计</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">薄弱章节</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.weakChapters?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">需重点关注</p>
          </CardContent>
        </Card>
      </div>

      {/* 知识点掌握度雷达图 */}
      <Card>
        <CardHeader>
          <CardTitle>知识点掌握度分布</CardTitle>
          <CardDescription>各章节知识点的掌握情况雷达图</CardDescription>
        </CardHeader>
        <CardContent>
          {reportData?.mastery && reportData.mastery.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={reportData.mastery}>
                <PolarGrid />
                <PolarAngleAxis dataKey="chapter" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="掌握度"
                  dataKey="mastery"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              暂无知识点掌握度数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* 错题趋势和练习正确率 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 错题趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>错题趋势</CardTitle>
            <CardDescription>近8周错题数量变化</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData?.errorTrend && reportData.errorTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.errorTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="errorCount"
                    name="错题数"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                暂无错题趋势数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 练习正确率趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>练习正确率趋势</CardTitle>
            <CardDescription>近8周练习正确率变化</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData?.accuracyTrend && reportData.accuracyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.accuracyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="正确率(%)"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                暂无练习数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 薄弱章节分析 */}
      <Card>
        <CardHeader>
          <CardTitle>薄弱章节分析</CardTitle>
          <CardDescription>掌握度低于60%的章节，建议重点复习</CardDescription>
        </CardHeader>
        <CardContent>
          {reportData?.weakChapters && reportData.weakChapters.length > 0 ? (
            <div className="space-y-4">
              {reportData.weakChapters.map((chapter, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{chapter.chapter}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>掌握度: {chapter.mastery}%</span>
                      <span>错题数: {chapter.errorCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        chapter.mastery < 30
                          ? "bg-red-100 text-red-700"
                          : chapter.mastery < 50
                          ? "bg-orange-100 text-orange-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {chapter.mastery < 30 ? "急需提升" : chapter.mastery < 50 ? "需要加强" : "待巩固"}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setLocation("/mistakes")}>
                      查看错题
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>太棒了！该学科所有章节掌握度均在60%以上</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 学习建议 */}
      <Card>
        <CardHeader>
          <CardTitle>学习建议</CardTitle>
          <CardDescription>基于数据分析的个性化学习建议</CardDescription>
        </CardHeader>
        <CardContent>
          {reportData?.advice && reportData.advice.length > 0 ? (
            <ul className="space-y-3">
              {reportData.advice.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1 h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">暂无学习建议</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
