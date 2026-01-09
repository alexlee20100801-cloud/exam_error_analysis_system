import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, TrendingUp, AlertCircle, Star, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaperAlgorithmOptimization() {
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedConfigIds] = useState([1, 2]); // 示例：对比两个配置

  // 获取满意度趋势数据
  const { data: trendData, isLoading: trendLoading } = trpc.optimization.getPaperAlgorithmTrend.useQuery({
    days: selectedDays,
  });

  // 获取历史指标数据
  const { data: metricsHistory, isLoading: metricsLoading } = trpc.optimization.getPaperAlgorithmMetricsHistory.useQuery({
    limit: 10,
  });

  // 获取权重参数对比数据
  const { data: weightComparison, isLoading: weightLoading } = trpc.optimization.getWeightParametersComparison.useQuery({
    configIds: selectedConfigIds,
  });

  // 获取待处理告警
  const { data: pendingAlerts } = trpc.optimization.getPendingAlerts.useQuery({
    limit: 5,
  });

  // 计算统计数据
  const stats = {
    avgSatisfaction: trendData && trendData.length > 0
      ? (trendData.reduce((sum, d) => sum + (d.satisfactionScore || 0), 0) / trendData.length).toFixed(2)
      : "0.00",
    latestSatisfaction: trendData && trendData.length > 0 && trendData[trendData.length - 1].satisfactionScore
      ? trendData[trendData.length - 1].satisfactionScore!.toFixed(2)
      : "0.00",
    totalEvaluations: metricsHistory?.length || 0,
    pendingAlertsCount: pendingAlerts?.filter(a => a.metricType === "paper_algorithm").length || 0,
  };

  // 准备雷达图数据
  const radarData = weightComparison?.map((config: any) => ({
    subject: "满意度",
    value: config.satisfactionScore,
    configId: config.configId,
  })).concat(
    weightComparison?.map((config: any) => ({
      subject: "知识覆盖",
      value: config.knowledgeCoverageScore,
      configId: config.configId,
    })) || []
  ).concat(
    weightComparison?.map((config: any) => ({
      subject: "难度分布",
      value: config.difficultyDistributionScore,
      configId: config.configId,
    })) || []
  ).concat(
    weightComparison?.map((config: any) => ({
      subject: "题型多样性",
      value: config.questionTypeVarietyScore,
      configId: config.configId,
    })) || []
  );

  // 按configId分组雷达图数据
  const radarChartData = weightComparison ? [
    {
      subject: "满意度",
      ...Object.fromEntries(weightComparison.map(c => [`配置${c.configId}`, c.satisfactionScore])),
    },
    {
      subject: "知识覆盖",
      ...Object.fromEntries(weightComparison.map(c => [`配置${c.configId}`, c.knowledgeCoverageScore])),
    },
    {
      subject: "难度分布",
      ...Object.fromEntries(weightComparison.map(c => [`配置${c.configId}`, c.difficultyDistributionScore])),
    },
    {
      subject: "题型多样性",
      ...Object.fromEntries(weightComparison.map(c => [`配置${c.configId}`, c.questionTypeVarietyScore])),
    },
  ] : [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">组卷算法优化管理</h1>
          <p className="text-muted-foreground mt-2">
            监控组卷算法性能，调整权重参数，提升组卷质量
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
            <CardTitle className="text-sm font-medium">平均满意度</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSatisfaction}/5.0</div>
            <p className="text-xs text-muted-foreground">
              最近{selectedDays}天
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最新满意度</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.latestSatisfaction}/5.0</div>
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
          <TabsTrigger value="trend">满意度趋势</TabsTrigger>
          <TabsTrigger value="radar">权重参数对比</TabsTrigger>
          <TabsTrigger value="metrics">性能指标</TabsTrigger>
          <TabsTrigger value="alerts">告警管理</TabsTrigger>
        </TabsList>

        {/* 满意度趋势 */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>满意度变化曲线</CardTitle>
                  <CardDescription>
                    展示组卷算法满意度随时间的变化趋势
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
                    <YAxis domain={[0, 5]} />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: any) => value?.toFixed(2)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="satisfactionScore"
                      stroke="#8884d8"
                      name="满意度"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="knowledgeCoverageScore"
                      stroke="#82ca9d"
                      name="知识覆盖"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="difficultyDistributionScore"
                      stroke="#ffc658"
                      name="难度分布"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="questionTypeVarietyScore"
                      stroke="#ff7c7c"
                      name="题型多样性"
                      strokeWidth={2}
                    />
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

        {/* 权重参数雷达图 */}
        <TabsContent value="radar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>权重参数对比雷达图</CardTitle>
              <CardDescription>
                对比不同配置的权重参数分布
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weightLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : radarChartData && radarChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    {weightComparison?.map((config, index) => (
                      <Radar
                        key={config.configId}
                        name={`配置${config.configId}`}
                        dataKey={`配置${config.configId}`}
                        stroke={["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c"][index % 4]}
                        fill={["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c"][index % 4]}
                        fillOpacity={0.3}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  暂无对比数据
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
                查看最近的组卷算法性能评估结果
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
                  {metricsHistory.map((metric: any) => (
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
                            配置 {metric.configId}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(metric.evaluationDate).toLocaleString()} · 
                          反馈数: {metric.feedbackCount}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {metric.avgSatisfactionScore
                            ? parseFloat(metric.avgSatisfactionScore as any).toFixed(2)
                            : "N/A"}
                          /5.0
                        </div>
                        <div className="text-sm text-muted-foreground">满意度</div>
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
              {pendingAlerts && pendingAlerts.filter(a => a.metricType === "paper_algorithm").length > 0 ? (
                <div className="space-y-4">
                  {pendingAlerts
                    .filter(a => a.metricType === "paper_algorithm")
                    .map((alert: any) => (
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
      </Tabs>
    </div>
  );
}
