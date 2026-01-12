import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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

const SUBJECT_KEYS = [
  { value: "all", labelKey: "dashboard.allSubjects" },
  { value: "chinese", labelKey: "errorQuestion.subjects.chinese" },
  { value: "math", labelKey: "errorQuestion.subjects.math" },
  { value: "english", labelKey: "errorQuestion.subjects.english" },
  { value: "physics", labelKey: "errorQuestion.subjects.physics" },
  { value: "chemistry", labelKey: "errorQuestion.subjects.chemistry" },
  { value: "biology", labelKey: "errorQuestion.subjects.biology" },
  { value: "politics", labelKey: "errorQuestion.subjects.politics" },
  { value: "history", labelKey: "errorQuestion.subjects.history" },
  { value: "geography", labelKey: "errorQuestion.subjects.geography" },
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
  const { t } = useTranslation();
  const [selectedSubject, setSelectedSubject] = useState("all");
  
  const SUBJECTS = useMemo(() => SUBJECT_KEYS.map(s => ({
    value: s.value,
    label: t(s.labelKey)
  })), [t]);

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
          {[1, 2, 3, 4].map((i: any) => (
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
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((subject: any) => (
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
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.totalErrors')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalErrorQuestions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.stats.masteredPoints')}: {stats?.masteredKnowledgePoints || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.masteryRate')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats as any)?.totalErrorQuestions || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.stats.analyzed')}: {(stats as any)?.totalErrorQuestions || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.reviewCount')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats as any)?.totalReviews || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.stats.monthlyReviews')}: {(stats as any)?.monthlyReviews || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.studyDays')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats as any)?.studyDays || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.stats.streakDays')}: {(stats as any)?.streakDays || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 掌握度趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.charts.masteryTrend.title')}</CardTitle>
            <CardDescription>{t('dashboard.charts.masteryTrend.description')}</CardDescription>
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
                    formatter={(value: number) => [`${value.toFixed(1)}%`, t('dashboard.charts.masteryTrend.yAxisLabel')]}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="masteryRate"
                    name={t('dashboard.charts.masteryTrend.yAxisLabel')}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                {t('common.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 科目分布 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.charts.subjectDistribution.title')}</CardTitle>
            <CardDescription>{t('dashboard.charts.subjectDistribution.description')}</CardDescription>
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
                {t('common.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 掌握度分布 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.charts.masteryDistribution.title')}</CardTitle>
            <CardDescription>{t('dashboard.charts.masteryDistribution.description')}</CardDescription>
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
                  <Bar dataKey="count" name={t('dashboard.charts.masteryDistribution.questionCount')} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                {t('common.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 薄弱知识点 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.charts.weakPoints.title')}</CardTitle>
            <CardDescription>{t('dashboard.charts.weakPoints.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {weakPointsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i: any) => (
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
                          {t('dashboard.charts.weakPoints.errorCount', { count: point.errorCount })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        {point.masteryRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{t('dashboard.charts.weakPoints.masteryRate')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                {t('common.noData')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
