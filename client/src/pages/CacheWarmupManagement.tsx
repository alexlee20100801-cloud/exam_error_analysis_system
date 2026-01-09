import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Play, Clock, CheckCircle, XCircle, TrendingUp, Database } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CacheWarmupManagement() {
  const [activeTab, setActiveTab] = useState("tasks");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskType, setTaskType] = useState<"knowledge_point" | "question_type" | "recommendation">("recommendation");
  const [priority, setPriority] = useState(5);

  // 查询预热任务列表
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = trpc.cacheWarmup.getWarmupTasks.useQuery({
    limit: 50,
  });

  // 查询统计数据
  const { data: statistics } = trpc.cacheWarmup.getWarmupStatistics.useQuery();

  // 查询热门知识点
  const { data: hotKnowledgePoints } = trpc.cacheWarmup.getHotKnowledgePoints.useQuery({ limit: 20 });

  // 查询热门题目类型
  const { data: hotQuestionTypes } = trpc.cacheWarmup.getHotQuestionTypes.useQuery({ limit: 10 });

  // 查询低峰期状态
  const { data: offPeakStatus } = trpc.cacheWarmup.checkOffPeakTime.useQuery();

  // 执行预热任务
  const executeTaskMutation = trpc.cacheWarmup.executeWarmupTask.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchTasks();
    },
    onError: (error) => {
      toast.error(`执行失败: ${error.message}`);
    },
  });

  // 创建每日自动预热任务
  const createDailyTaskMutation = trpc.cacheWarmup.createDailyTask.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      toast.info(`下次执行时间: ${new Date(data.nextOffPeakTime).toLocaleString()}`);
      refetchTasks();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 创建自定义预热任务
  const scheduleTaskMutation = trpc.cacheWarmup.scheduleWarmupTask.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsCreateDialogOpen(false);
      setTaskName("");
      refetchTasks();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 自动预热
  const autoWarmupMutation = trpc.cacheWarmup.autoWarmup.useMutation({
    onSuccess: (data) => {
      const message = data.success 
        ? `自动预热完成,生成了 ${data.knowledgePointCount} 个知识点的缓存`
        : data.message || '自动预热完成';
      toast.success(message);
      refetchTasks();
    },
    onError: (error) => {
      toast.error(`自动预热失败: ${error.message}`);
    },
  });

  const handleExecuteTask = (taskId: number) => {
    executeTaskMutation.mutate({ taskId });
  };

  const handleCreateDailyTask = () => {
    createDailyTaskMutation.mutate();
  };

  const handleCreateCustomTask = () => {
    if (!taskName.trim()) {
      toast.error("请输入任务名称");
      return;
    }

    scheduleTaskMutation.mutate({
      taskName,
      taskType,
      targetConfig: {
        description: `自定义预热任务: ${taskName}`,
        type: taskType,
      },
      priority,
    });
  };

  const handleAutoWarmup = () => {
    autoWarmupMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "待执行", variant: "secondary" as const },
      running: { label: "执行中", variant: "default" as const },
      completed: { label: "已完成", variant: "default" as const },
      failed: { label: "失败", variant: "destructive" as const },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">缓存预热管理</h1>
          <p className="text-muted-foreground mt-1">管理和监控缓存预热任务,优化系统性能</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAutoWarmup} disabled={autoWarmupMutation.isPending}>
            {autoWarmupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            立即预热
          </Button>
          <Button onClick={handleCreateDailyTask} disabled={createDailyTaskMutation.isPending}>
            {createDailyTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            创建每日任务
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">创建自定义任务</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建自定义预热任务</DialogTitle>
                <DialogDescription>配置预热任务参数,任务将在低峰期自动执行</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="taskName">任务名称</Label>
                  <Input
                    id="taskName"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="输入任务名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taskType">任务类型</Label>
                  <Select value={taskType} onValueChange={(value: any) => setTaskType(value)}>
                    <SelectTrigger id="taskType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="knowledge_point">知识点预热</SelectItem>
                      <SelectItem value="question_type">题目类型预热</SelectItem>
                      <SelectItem value="recommendation">推荐预热</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">优先级 (1-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min={1}
                    max={10}
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateCustomTask} disabled={scheduleTaskMutation.isPending}>
                  {scheduleTaskMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  创建任务
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">热门知识点</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.knowledgePointCount || 0}</div>
            <p className="text-xs text-muted-foreground">已统计的知识点数量</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">题目类型</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.questionTypeCount || 0}</div>
            <p className="text-xs text-muted-foreground">已统计的题目类型数量</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">预热任务</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground">总任务数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成任务</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.completedTasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              完成率: {statistics?.totalTasks ? ((statistics.completedTasks / statistics.totalTasks) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 低峰期状态 */}
      {offPeakStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">调度状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">当前状态:</span>
                <Badge variant={offPeakStatus.isOffPeak ? "default" : "secondary"}>
                  {offPeakStatus.isOffPeak ? "低峰期" : "高峰期"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">下次低峰期:</span>
                <span className="text-sm font-medium">
                  {new Date(offPeakStatus.nextOffPeakTime).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks">预热任务</TabsTrigger>
          <TabsTrigger value="knowledge">热门知识点</TabsTrigger>
          <TabsTrigger value="types">热门题型</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>预热任务列表</CardTitle>
              <CardDescription>查看和管理所有缓存预热任务</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tasks && tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>状态</TableHead>
                      <TableHead>任务名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>进度</TableHead>
                      <TableHead>生成缓存数</TableHead>
                      <TableHead>计划时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task: any) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            {getStatusBadge(task.status)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{task.taskName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {task.taskType === "knowledge_point" && "知识点"}
                            {task.taskType === "question_type" && "题目类型"}
                            {task.taskType === "recommendation" && "推荐"}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.priority}</TableCell>
                        <TableCell>{task.progress.toFixed(1)}%</TableCell>
                        <TableCell>{task.cacheGeneratedCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.scheduledAt ? new Date(task.scheduledAt).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          {task.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleExecuteTask(task.id)}
                              disabled={executeTaskMutation.isPending}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              执行
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">暂无预热任务</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>热门知识点</CardTitle>
              <CardDescription>访问频率最高的知识点列表</CardDescription>
            </CardHeader>
            <CardContent>
              {hotKnowledgePoints && hotKnowledgePoints.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>知识点</TableHead>
                      <TableHead>学科</TableHead>
                      <TableHead>学段</TableHead>
                      <TableHead>访问次数</TableHead>
                      <TableHead>分析次数</TableHead>
                      <TableHead>热度分数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotKnowledgePoints.map((point, index) => (
                      <TableRow key={point.id}>
                        <TableCell className="font-bold">{index + 1}</TableCell>
                        <TableCell className="font-medium">{point.knowledgePointName}</TableCell>
                        <TableCell>{point.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{point.schoolLevel === "junior" ? "初中" : "高中"}</Badge>
                        </TableCell>
                        <TableCell>{point.accessCount}</TableCell>
                        <TableCell>{point.analysisCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${Math.min(point.hotnessScore, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm">{point.hotnessScore.toFixed(1)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">暂无数据</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>热门题目类型</CardTitle>
              <CardDescription>最常见的题目类型统计</CardDescription>
            </CardHeader>
            <CardContent>
              {hotQuestionTypes && hotQuestionTypes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>学科</TableHead>
                      <TableHead>学段</TableHead>
                      <TableHead>难度</TableHead>
                      <TableHead>出现次数</TableHead>
                      <TableHead>分析次数</TableHead>
                      <TableHead>热度分数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotQuestionTypes.map((type, index) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-bold">{index + 1}</TableCell>
                        <TableCell>{type.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{type.schoolLevel === "junior" ? "初中" : "高中"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              type.difficulty === "easy" ? "default" : type.difficulty === "medium" ? "secondary" : "destructive"
                            }
                          >
                            {type.difficulty === "easy" ? "简单" : type.difficulty === "medium" ? "中等" : "困难"}
                          </Badge>
                        </TableCell>
                        <TableCell>{type.occurrenceCount}</TableCell>
                        <TableCell>{type.analysisCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${Math.min(type.hotnessScore, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm">{type.hotnessScore.toFixed(1)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">暂无数据</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
