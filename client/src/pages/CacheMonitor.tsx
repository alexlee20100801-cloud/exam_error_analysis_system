import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Database, 
  TrendingUp, 
  Clock, 
  Zap, 
  RefreshCw, 
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function CacheMonitor() {
  const [refreshing, setRefreshing] = useState(false);
  
  // 获取缓存统计数据
  const { data: stats, isLoading, refetch } = trpc.cache.getStats.useQuery();
  
  // 清理缓存mutation
  const clearCacheMutation = trpc.cache.clearCache.useMutation({
    onSuccess: (data) => {
      toast.success(`成功清理 ${data.deletedCount} 条缓存记录`);
      refetch();
    },
    onError: (error) => {
      toast.error(`清理失败：${error.message}`);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
    toast.success("数据已刷新");
  };

  const handleClearCache = () => {
    if (confirm("确定要清空所有缓存吗？此操作不可恢复。")) {
      clearCacheMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无缓存数据</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // 准备图表数据
  const hitRateData = [
    { name: "命中", value: stats.totalHits, color: "#10b981" },
    { name: "未命中", value: stats.totalMisses, color: "#ef4444" },
  ];

  const subjectDistribution = stats.bySubject.map((item: any) => ({
    name: getSubjectName(item.subject),
    count: item.count,
    hitRate: item.hitRate,
  }));

  const gradeDistribution = stats.byGrade.map((item: any) => ({
    name: getGradeName(item.grade),
    count: item.count,
    hitRate: item.hitRate,
  }));

  const savingsData = [
    { name: "节省的API调用", value: stats.totalHits },
    { name: "实际API调用", value: stats.totalMisses },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">缓存监控面板</h1>
            <p className="text-muted-foreground mt-2">
              实时监控AI分析缓存的性能和使用情况
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              刷新数据
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearCache}
              disabled={clearCacheMutation.isPending}
            >
              {clearCacheMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              清空缓存
            </Button>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总缓存数</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCached}</div>
              <p className="text-xs text-muted-foreground mt-1">
                已缓存的题目分析结果
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">缓存命中率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.hitRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalHits} 次命中 / {stats.totalRequests} 次请求
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">节省API调用</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalHits}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                避免重复分析,节省成本
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均命中次数</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avgHitCount.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                每条缓存的平均使用次数
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 命中率饼图 */}
          <Card>
            <CardHeader>
              <CardTitle>缓存命中分布</CardTitle>
              <CardDescription>
                展示缓存命中与未命中的比例
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={hitRateData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {hitRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 按学科分布 */}
          <Card>
            <CardHeader>
              <CardTitle>学科缓存分布</CardTitle>
              <CardDescription>
                各学科的缓存数量和命中率
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8b5cf6" name="缓存数量" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 按年级分布 */}
          <Card>
            <CardHeader>
              <CardTitle>年级缓存分布</CardTitle>
              <CardDescription>
                各年级的缓存数量和命中率
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="缓存数量" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* API调用节省统计 */}
          <Card>
            <CardHeader>
              <CardTitle>API调用统计</CardTitle>
              <CardDescription>
                缓存带来的API调用节省效果
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#10b981" name="次数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 详细统计表格 */}
        <Card>
          <CardHeader>
            <CardTitle>学科详细统计</CardTitle>
            <CardDescription>
              各学科的缓存使用详情
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">学科</th>
                    <th className="text-right py-3 px-4">缓存数量</th>
                    <th className="text-right py-3 px-4">命中率</th>
                    <th className="text-right py-3 px-4">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bySubject.map((item: any) => (
                    <tr key={item.subject} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{getSubjectName(item.subject)}</td>
                      <td className="text-right py-3 px-4">{item.count}</td>
                      <td className="text-right py-3 px-4">
                        <span
                          className={
                            item.hitRate >= 70
                              ? "text-green-600 font-medium"
                              : item.hitRate >= 40
                              ? "text-yellow-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {item.hitRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        {item.hitRate >= 70 ? (
                          <CheckCircle className="h-5 w-5 text-green-600 inline" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 年级详细统计表格 */}
        <Card>
          <CardHeader>
            <CardTitle>年级详细统计</CardTitle>
            <CardDescription>
              各年级的缓存使用详情
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">年级</th>
                    <th className="text-right py-3 px-4">缓存数量</th>
                    <th className="text-right py-3 px-4">命中率</th>
                    <th className="text-right py-3 px-4">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byGrade.map((item: any) => (
                    <tr key={item.grade} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{getGradeName(item.grade)}</td>
                      <td className="text-right py-3 px-4">{item.count}</td>
                      <td className="text-right py-3 px-4">
                        <span
                          className={
                            item.hitRate >= 70
                              ? "text-green-600 font-medium"
                              : item.hitRate >= 40
                              ? "text-yellow-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {item.hitRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        {item.hitRate >= 70 ? (
                          <CheckCircle className="h-5 w-5 text-green-600 inline" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// 辅助函数
function getSubjectName(subject: string): string {
  const names: Record<string, string> = {
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
  return names[subject] || subject;
}

function getGradeName(grade: string): string {
  const names: Record<string, string> = {
    junior1: "初一",
    junior2: "初二",
    junior3: "初三",
    senior1: "高一",
    senior2: "高二",
    senior3: "高三",
  };
  return names[grade] || grade;
}
