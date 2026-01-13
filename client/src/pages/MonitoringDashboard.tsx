import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, Activity, Clock, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function MonitoringDashboard() {
  const [errorStats, setErrorStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
  });

  const [performanceStats, setPerformanceStats] = useState({
    avgResponseTime: 0,
    errorRate: 0,
    totalRequests: 0,
    activeConnections: 0,
  });

  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    // 模拟数据加载
    setErrorStats({
      total: 24,
      critical: 2,
      high: 5,
      medium: 17,
    });

    setPerformanceStats({
      avgResponseTime: 245,
      errorRate: 2.3,
      totalRequests: 15420,
      activeConnections: 42,
    });

    setRecentErrors([
      {
        id: 1,
        type: "API",
        message: "Database connection timeout",
        severity: "critical",
        timestamp: new Date(Date.now() - 5 * 60000),
        resolved: false,
      },
      {
        id: 2,
        type: "Service",
        message: "Memory usage exceeded threshold",
        severity: "high",
        timestamp: new Date(Date.now() - 15 * 60000),
        resolved: false,
      },
      {
        id: 3,
        type: "API",
        message: "Slow query detected",
        severity: "medium",
        timestamp: new Date(Date.now() - 30 * 60000),
        resolved: true,
      },
    ]);

    setRecentAlerts([
      {
        id: 1,
        title: "High CPU Usage",
        description: "CPU usage reached 85%",
        severity: "high",
        timestamp: new Date(Date.now() - 10 * 60000),
        acknowledged: false,
      },
      {
        id: 2,
        title: "API Response Time",
        description: "Average response time exceeded 500ms",
        severity: "medium",
        timestamp: new Date(Date.now() - 25 * 60000),
        acknowledged: true,
      },
    ]);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">监控仪表板</h1>
          <p className="text-gray-600">实时系统监控和错误日志</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 错误统计 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">总错误数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{errorStats.total}</div>
              <p className="text-xs text-gray-500 mt-1">过去24小时</p>
            </CardContent>
          </Card>

          {/* 严重错误 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">严重错误</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{errorStats.critical}</div>
              <p className="text-xs text-gray-500 mt-1">需要立即处理</p>
            </CardContent>
          </Card>

          {/* 平均响应时间 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">平均响应时间</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{performanceStats.avgResponseTime}ms</div>
              <p className="text-xs text-gray-500 mt-1">API性能</p>
            </CardContent>
          </Card>

          {/* 错误率 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">错误率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{performanceStats.errorRate}%</div>
              <p className="text-xs text-gray-500 mt-1">请求失败率</p>
            </CardContent>
          </Card>
        </div>

        {/* 最近错误日志 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              最近错误日志
            </CardTitle>
            <CardDescription>过去24小时内发生的系统错误</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentErrors.length > 0 ? (
                recentErrors.map((error) => (
                  <div
                    key={error.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                        <span className="font-medium text-sm">{error.type}</span>
                        {error.resolved && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(error.timestamp)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      查看详情
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>没有错误日志</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 告警历史 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              告警历史
            </CardTitle>
            <CardDescription>系统性能和资源告警</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlerts.length > 0 ? (
                recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="font-medium text-sm">{alert.title}</span>
                        {alert.acknowledged && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            已确认
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(alert.timestamp)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {alert.acknowledged ? "已处理" : "确认"}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>没有告警</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 系统状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              系统状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✓</div>
                <p className="text-sm text-gray-600 mt-1">数据库</p>
                <p className="text-xs text-green-600">正常</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✓</div>
                <p className="text-sm text-gray-600 mt-1">缓存服务</p>
                <p className="text-xs text-green-600">正常</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✓</div>
                <p className="text-sm text-gray-600 mt-1">消息队列</p>
                <p className="text-xs text-green-600">正常</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">⚠</div>
                <p className="text-sm text-gray-600 mt-1">存储空间</p>
                <p className="text-xs text-yellow-600">75% 已用</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
