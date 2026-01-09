import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayCircle, PauseCircle, RefreshCw, Plus, Settings, Database } from "lucide-react";
import { toast } from "sonner";

export default function CrawlerManagement() {
  const [activeTab, setActiveTab] = useState("sources");

  // 获取数据源列表
  const { data: sourcesData, refetch: refetchSources } = trpc.crawler.getSources.useQuery({
    page: 1,
    pageSize: 20,
  });

  // 获取爬虫任务列表
  const { data: tasksData, refetch: refetchTasks } = trpc.crawler.getTasks.useQuery({
    page: 1,
    pageSize: 20,
  });

  // 获取AI分类统计
  const { data: statsData } = trpc.crawler.getClassificationStats.useQuery();

  // 获取爬虫任务监控数据
  const { data: monitoringData } = trpc.crawler.getTaskMonitoring.useQuery();

  // 手动触发爬虫
  const triggerCrawl = trpc.crawler.triggerCrawl.useMutation({
    onSuccess: () => {
      toast.success("爬虫任务已启动");
      refetchTasks();
    },
    onError: (error) => {
      toast.error(`启动失败: ${error.message}`);
    },
  });

  // 启动定时爬虫
  const startScheduled = trpc.crawler.startScheduledCrawl.useMutation({
    onSuccess: () => {
      toast.success("定时爬虫已启动");
      refetchTasks();
    },
    onError: (error) => {
      toast.error(`启动失败: ${error.message}`);
    },
  });

  // 触发AI分类
  const triggerClassification = trpc.crawler.triggerAIClassification.useMutation({
    onSuccess: () => {
      toast.success("AI分类任务已启动");
    },
    onError: (error) => {
      toast.error(`启动失败: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      running: "default",
      completed: "outline",
      failed: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">爬虫管理系统</h1>
          <p className="text-muted-foreground mt-2">
            管理数据源、监控爬虫任务、查看试题数据库统计
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => startScheduled.mutate()}
            disabled={startScheduled.isPending}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            启动定时爬虫
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerClassification.mutate({})}
            disabled={triggerClassification.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            批量AI分类
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">总题目数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">已分类</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.classified || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              分类率: {statsData?.classificationRate || "0"}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">待分类</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.unclassified || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">高质量题目</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.highQuality || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              质量分≥80
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sources">数据源管理</TabsTrigger>
          <TabsTrigger value="tasks">爬虫任务</TabsTrigger>
          <TabsTrigger value="monitoring">任务监控</TabsTrigger>
          <TabsTrigger value="questions">试题数据库</TabsTrigger>
        </TabsList>

        {/* 数据源管理 */}
        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>数据源列表</CardTitle>
                  <CardDescription>
                    管理爬虫数据源配置
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  添加数据源
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>优先级</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>成功/失败</TableHead>
                    <TableHead>最后爬取</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourcesData?.sources.map((source: any) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell>{source.sourceType}</TableCell>
                      <TableCell>{source.priority}</TableCell>
                      <TableCell>
                        {source.isActive ? (
                          <Badge variant="default">启用</Badge>
                        ) : (
                          <Badge variant="secondary">禁用</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {source.successCount} / {source.failureCount}
                      </TableCell>
                      <TableCell>
                        {source.lastCrawledAt
                          ? new Date(source.lastCrawledAt).toLocaleString()
                          : "从未"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => triggerCrawl.mutate({ sourceId: source.id })}
                            disabled={triggerCrawl.isPending}
                          >
                            <PlayCircle className="w-3 h-3 mr-1" />
                            执行
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 任务监控 */}
        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>任务监控</CardTitle>
              <CardDescription>
                实时监控爬虫任务执行情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monitoringData?.tasks.map((task: any) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">任务 #{task.id}</h3>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">进度</p>
                        <p className="font-medium">{task.progress}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">已处理</p>
                        <p className="font-medium">{task.itemsProcessed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">成功</p>
                        <p className="font-medium text-green-600">{task.itemsSucceeded}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">失败</p>
                        <p className="font-medium text-red-600">{task.itemsFailed}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 爬虫任务 */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>爬虫任务列表</CardTitle>
              <CardDescription>
                查看爬虫任务执行状态和日志
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>任务ID</TableHead>
                    <TableHead>数据源ID</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>处理/成功/失败</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>完成时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasksData?.tasks.map((task: any) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.id}</TableCell>
                      <TableCell>{task.sourceId}</TableCell>
                      <TableCell>{task.taskType}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        {task.itemsProcessed} / {task.itemsSucceeded} / {task.itemsFailed}
                      </TableCell>
                      <TableCell>
                        {task.startedAt
                          ? new Date(task.startedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {task.completedAt
                          ? new Date(task.completedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>试题数据库</CardTitle>
              <CardDescription>
                浏览和搜索已爬取的试题
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>试题浏览功能开发中...</p>
                <p className="text-sm mt-2">
                  请使用"试题库"页面查看和管理试题
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
