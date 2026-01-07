import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Upload, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function UploadHistory() {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');

  const { data: history, isLoading } = trpc.errorQuestions.getUploadHistory.useQuery({
    timeRange,
  });

  const { data: stats, isLoading: statsLoading } = trpc.errorQuestions.getUploadStats.useQuery({
    timeRange,
  });

  if (isLoading || statsLoading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 准备图表数据
  const uploadTrendData = history?.map((h: any) => ({
    date: format(new Date(h.uploadTime), 'MM-dd', { locale: zhCN }),
    count: h.totalCount,
    accuracy: (h.recognitionAccuracy * 100).toFixed(1),
  })) || [];

  const subjectDistribution = stats?.subjectDistribution.map((s: any) => ({
    name: s.subject,
    value: s.count,
  })) || [];

  const gradeDistribution = stats?.gradeDistribution.map((g: any) => ({
    name: g.grade,
    value: g.count,
  })) || [];

  const accuracyTrendData = history?.map((h: any) => ({
    date: format(new Date(h.uploadTime), 'MM-dd', { locale: zhCN }),
    accuracy: (h.recognitionAccuracy * 100).toFixed(1),
  })) || [];

  return (
    <div className="container py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">上传历史统计</h1>
          <p className="text-muted-foreground mt-2">
            查看错题上传趋势和识别准确率变化
          </p>
        </div>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">最近7天</SelectItem>
            <SelectItem value="30days">最近30天</SelectItem>
            <SelectItem value="90days">最近90天</SelectItem>
            <SelectItem value="all">全部</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总上传次数</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUploads || 0}</div>
            <p className="text-xs text-muted-foreground">
              累计上传 {stats?.totalQuestions || 0} 道错题
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均识别准确率</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgAccuracy ? (stats.avgAccuracy * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              OCR识别质量评估
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最常上传科目</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.mostUploadedSubject || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.mostUploadedSubjectCount || 0} 道错题
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最近上传</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.lastUploadDate
                ? format(new Date(stats.lastUploadDate), 'MM-dd', { locale: zhCN })
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.lastUploadCount || 0} 道错题
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 上传趋势图表 */}
      <Card>
        <CardHeader>
          <CardTitle>上传趋势</CardTitle>
          <CardDescription>每次上传的错题数量变化</CardDescription>
        </CardHeader>
        <CardContent>
          {uploadTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={uploadTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="上传数量" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* 识别准确率趋势 */}
      <Card>
        <CardHeader>
          <CardTitle>识别准确率趋势</CardTitle>
          <CardDescription>OCR识别准确率随时间的变化</CardDescription>
        </CardHeader>
        <CardContent>
          {accuracyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={accuracyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#82ca9d"
                  name="准确率 (%)"
                  strokeWidth={2}
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

      {/* 科目和年级分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>科目分布</CardTitle>
            <CardDescription>各科目错题数量占比</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subjectDistribution.map((entry: any, index: any) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

        <Card>
          <CardHeader>
            <CardTitle>年级分布</CardTitle>
            <CardDescription>各年级错题数量占比</CardDescription>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gradeDistribution.map((entry: any, index: any) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

      {/* 上传历史列表 */}
      <Card>
        <CardHeader>
          <CardTitle>上传记录</CardTitle>
          <CardDescription>详细的上传历史记录</CardDescription>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        上传 {record.totalCount} 道错题
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(record.uploadTime), 'yyyy-MM-dd HH:mm', {
                          locale: zhCN,
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        识别准确率: {(record.recognitionAccuracy * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        成功: {record.successCount} / 失败: {record.failedCount}
                      </div>
                    </div>
                    {record.recognitionAccuracy >= 0.9 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : record.recognitionAccuracy >= 0.7 ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无上传记录
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
