import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, TrendingUp, Target, Award, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SUBJECTS = [
  { value: "all", label: "全部科目" },
  { value: "chinese", label: "语文" },
  { value: "math", label: "数学" },
  { value: "english", label: "英语" },
  { value: "physics", label: "物理" },
  { value: "chemistry", label: "化学" },
  { value: "biology", label: "生物" },
  { value: "politics", label: "政治" },
  { value: "history", label: "历史" },
  { value: "geography", label: "地理" },
];

const SUBJECT_COLORS: Record<string, string> = {
  chinese: "#ef4444",
  math: "#3b82f6",
  english: "#10b981",
  physics: "#f59e0b",
  chemistry: "#8b5cf6",
  biology: "#06b6d4",
  politics: "#ec4899",
  history: "#f97316",
  geography: "#14b8a6",
};

const MASTERY_COLORS = ["#ef4444", "#f59e0b", "#10b981"];

export default function LearningDashboard() {
  const [selectedSubject, setSelectedSubject] = useState("all");

  // 获取统计数据
  const { data: stats, isLoading: statsLoading } = trpc.learningStats.getOverview.useQuery({
    subject: selectedSubject === "all" ? undefined : selectedSubject as any,
  });

  // 获取趋势数据
  const { data: trendData, isLoading: trendLoading } = trpc.learningStats.getMasteryTrend.useQuery({
    days: 30,
    subject: selectedSubject === "all" ? undefined : selectedSubject as any,
  });

  // 获取科目分布
  const { data: subjectDistribution, isLoading: distributionLoading } = trpc.learningStats.getSubjectDistribution.useQuery();

  // 获取掌握度分布
  const { data: masteryDistribution, isLoading: masteryLoading } = trpc.learningStats.getMasteryDistribution.useQuery({
    subject: selectedSubject === "all" ? undefined : selectedSubject as any,
  });

  // 获取薄弱知识点
  const { data: weakPoints, isLoading: weakPointsLoading } = trpc.learningStats.getWeakKnowledgePoints.useQuery({
    limit: 5,
    subject: selectedSubject === "all" ? undefined : selectedSubject as any,
  });

  if (statsLoading) {
    return (
      <div className="container max-w-7xl py-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* 标题和筛选 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">学习仪表盘</h1>
          <p className="text-muted-foreground mt-2">
            查看你的学习数据和进步曲线
          </p>
        </div>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((subject) => (
              <SelectItem key={subject.value} value={subject.value}>
                {subject.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错题总数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalErrors || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              已分析 {stats?.analyzedErrors || 0} 题
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">掌握率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.masteryRate ? `${stats.masteryRate.toFixed(1)}%` : "0%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              已掌握 {stats?.masteredErrors || 0} 题
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">复习次数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReviews || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              本月 {stats?.monthlyReviews || 0} 次
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学习天数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.studyDays || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              连续 {stats?.streakDays || 0} 天
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 掌握度趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>掌握度趋势</CardTitle>
            <CardDescription>最近30天的学习进步</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-64" />
            ) : trendData && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "掌握率"]}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="masteryRate"
                    name="掌握率"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 科目分布 */}
        <Card>
          <CardHeader>
            <CardTitle>科目分布</CardTitle>
            <CardDescription>各科目错题数量占比</CardDescription>
          </CardHeader>
          <CardContent>
            {distributionLoading ? (
              <Skeleton className="h-64" />
            ) : subjectDistribution && subjectDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subjectDistribution}
                    dataKey="count"
                    nameKey="subject"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.subjectLabel}: ${entry.count}`}
                  >
                    {subjectDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SUBJECT_COLORS[entry.subject] || "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 掌握度分布 */}
        <Card>
          <CardHeader>
            <CardTitle>掌握度分布</CardTitle>
            <CardDescription>错题掌握情况统计</CardDescription>
          </CardHeader>
          <CardContent>
            {masteryLoading ? (
              <Skeleton className="h-64" />
            ) : masteryDistribution && masteryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={masteryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="题目数量" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 薄弱知识点 */}
        <Card>
          <CardHeader>
            <CardTitle>薄弱知识点</CardTitle>
            <CardDescription>需要重点关注的知识点</CardDescription>
          </CardHeader>
          <CardContent>
            {weakPointsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : weakPoints && weakPoints.length > 0 ? (
              <div className="space-y-4">
                {weakPoints.map((point, index) => (
                  <div
                    key={point.knowledgePoint}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{point.knowledgePoint}</p>
                        <p className="text-sm text-muted-foreground">
                          错误 {point.errorCount} 次
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        {point.masteryRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">掌握率</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
