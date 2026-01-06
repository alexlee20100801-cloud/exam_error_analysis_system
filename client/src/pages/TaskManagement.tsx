import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * 定时任务管理页面
 * 仅管理员可访问
 */
export default function TaskManagement() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [selectedTaskName, setSelectedTaskName] = useState("");

  // 获取所有任务
  const { data: tasksData, isLoading, refetch } = trpc.scheduledTasks.getAllTasks.useQuery();

  // 手动触发任务
  const triggerMutation = trpc.scheduledTasks.triggerTask.useMutation({
    onSuccess: () => {
      toast.success("任务已成功触发执行");
      setTriggerDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`触发失败: ${error.message}`);
    },
  });

  // 获取任务日志
  const { data: logsData } = trpc.scheduledTasks.getTaskLogs.useQuery(
    { taskId: selectedTaskId!, limit: 20 },
    { enabled: selectedTaskId !== null }
  );

  const handleTriggerTask = (taskName: string) => {
    setSelectedTaskName(taskName);
    setTriggerDialogOpen(true);
  };

  const confirmTrigger = () => {
    triggerMutation.mutate({ taskName: selectedTaskName });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            成功
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            失败
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-blue-500">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            运行中
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            未执行
          </Badge>
        );
    }
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      generate_questions: "生成题目",
      send_reminders: "发送提醒",
      cleanup: "数据清理",
    };
    return labels[type] || type;
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const tasks = tasksData?.tasks || [];

  return (
    <div className="container py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">定时任务管理</h1>
          <p className="text-muted-foreground mt-2">
            查看和管理系统定时任务的执行状态
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 任务概览卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总任务数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              启用任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter((t: any) => t.isEnabled).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总执行次数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.reduce((sum: number, t: any) => sum + (t.executionCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
          <CardDescription>所有定时任务的详细信息和状态</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>执行计划</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后执行</TableHead>
                <TableHead>执行次数</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task: any) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.taskName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTaskTypeLabel(task.taskType)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                      {task.cronExpression}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(task.lastStatus)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.lastExecutedAt
                      ? new Date(task.lastExecutedAt).toLocaleString("zh-CN")
                      : "从未执行"}
                  </TableCell>
                  <TableCell>{task.executionCount || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTriggerTask(task.taskName)}
                        disabled={task.lastStatus === "running"}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        触发
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        查看日志
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 执行日志 */}
      {selectedTaskId && logsData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>执行日志</CardTitle>
                <CardDescription>
                  任务 ID: {selectedTaskId} 的最近 20 条执行记录
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedTaskId(null)}>
                关闭
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>执行时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>耗时</TableHead>
                  <TableHead>处理项数</TableHead>
                  <TableHead>错误信息</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsData.logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.startedAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(log.duration)}
                    </TableCell>
                    <TableCell>{log.itemsProcessed || 0}</TableCell>
                    <TableCell className="text-sm text-red-600 max-w-xs truncate">
                      {log.errorMessage || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 触发确认对话框 */}
      <Dialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认触发任务</DialogTitle>
            <DialogDescription>
              您确定要手动触发任务 <strong>{selectedTaskName}</strong> 吗？
              <br />
              任务将立即开始执行。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTriggerDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmTrigger} disabled={triggerMutation.isPending}>
              {triggerMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  触发中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  确认触发
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
