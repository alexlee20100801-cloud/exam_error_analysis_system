import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AiClassificationOptimization() {
  const [selectedDays, setSelectedDays] = useState(30);

  // 获取准确率趋势数据
  const { data: trendData, isLoading: trendLoading } = trpc.optimization.getAiClassificationTrend.useQuery({
    days: selectedDays,
  });

  // 获取历史指标数据
  const { data: metricsHistory, isLoading: metricsLoading } = trpc.optimization.getAiClassificationMetricsHistory.useQuery({
    limit: 10,
  });

  // 获取待处理告警
  const { data: pendingAlerts } = trpc.optimization.getPendingAlerts.useQuery({
    limit: 5,
  });

  // 计算统计数据
  const stats = {
    avgAccuracy: trendData && trendData.length > 0
      ? (trendData.reduce((sum, d) => sum + d.accuracy, 0) / trendData.length * 100).toFixed(2)
      : "0.00",
    latestAccuracy: trendData && trendData.length > 0
      ? (trendData[trendData.length - 1].accuracy * 100).toFixed(2)
      : "0.00",
    totalEvaluations: metricsHistory?.length || 0,
    pendingAlertsCount: pendingAlerts?.filter(a => a.metricType === "ai_classification").length || 0,
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI分类优化管理</h1>
          <p className="text-muted-foreground mt-2">
            监控AI分类性能，优化prompt版本，提升分类准确率
          </p>
        </div>
        <Button>
          <Activity className="mr-2 h-4 w-4" />
          运行评估
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均准确率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAccuracy}%</div>
            <p className="text-xs text-muted-foreground">
              最近{selectedDays}天
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最新准确率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.latestAccuracy}%</div>
            <p className="text-xs text-muted-foreground">
              最近一次评估
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">评估次数</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              历史记录
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理告警</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAlertsCount}</div>
            <p className="text-xs text-muted-foreground">
              需要关注
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">准确率趋势</TabsTrigger>
          <TabsTrigger value="metrics">性能指标</TabsTrigger>
          <TabsTrigger value="alerts">告警管理</TabsTrigger>
          <TabsTrigger value="config">配置管理</TabsTrigger>
        </TabsList>

        {/* 准确率趋势 */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>准确率变化曲线</CardTitle>
                  <CardDescription>
                    展示AI分类准确率随时间的变化趋势
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedDays === 7 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDays(7)}
                  >
                    7天
                  </Button>
                  <Button
                    variant={selectedDays === 30 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDays(30)}
                  >
                    30天
                  </Button>
                  <Button
                    variant={selectedDays === 90 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDays(90)}
                  >
                    90天
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : trendData && trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis
                      domain={[0, 1]}
                      tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: any) => `${(value * 100).toFixed(2)}%`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#8884d8"
                      name="准确率"
                      strokeWidth={2}
                    />
                    {trendData.some(d => d.precision !== null) && (
                      <Line
                        type="monotone"
                        dataKey="precision"
                        stroke="#82ca9d"
                        name="精确率"
                        strokeWidth={2}
                      />
                    )}
                    {trendData.some(d => d.recall !== null) && (
                      <Line
                        type="monotone"
                        dataKey="recall"
                        stroke="#ffc658"
                        name="召回率"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 性能指标 */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>历史评估记录</CardTitle>
              <CardDescription>
                查看最近的AI分类性能评估结果
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : metricsHistory && metricsHistory.length > 0 ? (
                <div className="space-y-4">
                  {metricsHistory.map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            评估 #{metric.id}
                          </span>
                          <Badge variant="outline">
                            Prompt版本 {metric.promptVersionId}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(metric.evaluationDate).toLocaleString()} · 
                          测试样本: {metric.testSampleCount}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {(parseFloat(metric.accuracy as any) * 100).toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground">准确率</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  暂无评估记录
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警管理 */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>待处理告警</CardTitle>
              <CardDescription>
                需要关注的性能异常告警
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingAlerts && pendingAlerts.filter(a => a.metricType === "ai_classification").length > 0 ? (
                <div className="space-y-4">
                  {pendingAlerts
                    .filter(a => a.metricType === "ai_classification")
                    .map((alert) => (
                      <Alert key={alert.id} variant={alert.severity === "critical" ? "destructive" : "default"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                告警 #{alert.id}
                              </div>
                              <div className="text-sm">
                                指标值: {parseFloat(alert.metricValue as any).toFixed(4)} · 
                                阈值: {parseFloat(alert.threshold as any).toFixed(4)}
                              </div>
                            </div>
                            <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                              {alert.severity}
                            </Badge>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  暂无待处理告警
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配置管理 */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prompt版本管理</CardTitle>
              <CardDescription>
                管理和切换不同的prompt版本
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                功能开发中...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
