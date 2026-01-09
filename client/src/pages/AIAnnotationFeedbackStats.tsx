import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { Star, TrendingUp, BarChart3, MessageSquare, Target, Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * AI标注反馈统计页面
 * 显示反馈数据分析和准确率统计
 */
export function AIAnnotationFeedbackStats() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  const { data: stats, isLoading: statsLoading } = trpc.aiAnnotationFeedback.getStats.useQuery();
  const { data: chartTypeAccuracy, isLoading: chartTypeLoading } =
    trpc.aiAnnotationFeedback.getChartTypeAccuracy.useQuery();
  const { data: feedbackTrend, isLoading: trendLoading } =
    trpc.aiAnnotationFeedback.getFeedbackTrend.useQuery({ days: 30 });
  const { data: suggestions, isLoading: suggestionsLoading } =
    trpc.aiAnnotationFeedback.getImprovementSuggestions.useQuery({ limit: 20 });

  const feedbackTypeLabels = {
    accurate: '准确',
    partially_accurate: '部分准确',
    inaccurate: '不准确',
    missing_features: '缺少关键特征',
  };

  // 导出CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      // @ts-ignore
      const result = await trpc.aiAnnotationFeedback.exportFeedbackCSV.query({});
      
      // 创建Blob并下载
      const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai_feedback_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('导出成功', {
        description: 'CSV文件已下载',
      });
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败', {
        description: '请稍后重试',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI标注反馈统计</h1>
          <p className="text-muted-foreground mt-2">
            查看AI标注的准确率和用户反馈数据
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? '导出中...' : '导出CSV'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            总览
          </TabsTrigger>
          <TabsTrigger value="chartTypes">
            <Target className="h-4 w-4 mr-2" />
            图表类型分析
          </TabsTrigger>
          <TabsTrigger value="trend">
            <TrendingUp className="h-4 w-4 mr-2" />
            趋势分析
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            <MessageSquare className="h-4 w-4 mr-2" />
            改进建议
          </TabsTrigger>
        </TabsList>

        {/* 总览 */}
        <TabsContent value="overview" className="space-y-6">
          {statsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i: any) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">总反馈数</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalFeedback}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">平均评分</CardTitle>
                    <Star className="h-4 w-4 text-yellow-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.averageRating.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">满分 5.00</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">准确率</CardTitle>
                    <Target className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.accuracyRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">准确+部分准确</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">准确反馈</CardTitle>
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.feedbackByType.accurate}</div>
                    <p className="text-xs text-muted-foreground">完全准确的标注</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>反馈类型分布</CardTitle>
                  <CardDescription>各类反馈的数量统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.feedbackByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {feedbackTypeLabels[type as keyof typeof feedbackTypeLabels]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-64 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width: `${stats.totalFeedback > 0 ? (count / stats.totalFeedback) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>评分分布</CardTitle>
                  <CardDescription>1-5星评分的数量分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[5, 4, 3, 2, 1].map((star: any) => (
                      <div key={star} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: star }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-64 bg-muted rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  stats.totalFeedback > 0
                                    ? (stats.ratingDistribution[star] / stats.totalFeedback) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {stats.ratingDistribution[star]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无反馈数据
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 图表类型分析 */}
        <TabsContent value="chartTypes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>按图表类型的准确率统计</CardTitle>
              <CardDescription>不同图表类型的AI标注准确率对比</CardDescription>
            </CardHeader>
            <CardContent>
              {chartTypeLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i: any) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : chartTypeAccuracy && chartTypeAccuracy.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>图表类型</TableHead>
                      <TableHead>反馈数</TableHead>
                      <TableHead>平均评分</TableHead>
                      <TableHead>准确率</TableHead>
                      <TableHead>准确</TableHead>
                      <TableHead>部分准确</TableHead>
                      <TableHead>不准确</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartTypeAccuracy.map((item: any) => (
                      <TableRow key={item.chartType}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.totalFeedback}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {item.averageRating.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.accuracyRate >= 80 ? 'default' : 'destructive'}
                          >
                            {item.accuracyRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{item.feedbackByType.accurate}</TableCell>
                        <TableCell>{item.feedbackByType.partially_accurate}</TableCell>
                        <TableCell>{item.feedbackByType.inaccurate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  暂无图表类型数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 趋势分析 */}
        <TabsContent value="trend" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>反馈趋势（近30天）</CardTitle>
              <CardDescription>每日反馈数量和准确率变化</CardDescription>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : feedbackTrend && feedbackTrend.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>反馈数</TableHead>
                      <TableHead>平均评分</TableHead>
                      <TableHead>准确率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbackTrend.map((item: any) => (
                      <TableRow key={item.date}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {item.averageRating.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>{item.accuracyRate.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  暂无趋势数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 改进建议 */}
        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>用户改进建议</CardTitle>
              <CardDescription>用户提供的反馈和改进建议</CardDescription>
            </CardHeader>
            <CardContent>
              {suggestionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i: any) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestions.map((item: any) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.chartType && (
                            <Badge variant="outline">{item.chartType}</Badge>
                          )}
                          <Badge
                            variant={
                              item.feedbackType === 'accurate'
                                ? 'default'
                                : item.feedbackType === 'inaccurate'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {feedbackTypeLabels[item.feedbackType as keyof typeof feedbackTypeLabels]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm">{item.improvementSuggestion}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  暂无改进建议
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
