/**
 * 推送配置列表页面
 * 管理员查看、管理所有推送配置
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MoreVertical, Play, Pencil, Trash2, Bell, Mail, MessageCircle } from "lucide-react";


const pushTypeLabels = {
  question: "题目推送",
  knowledge: "知识点推送",
  resource: "学习资源推送",
};

const frequencyLabels = {
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
  once: "一次性",
};

const channelIcons = {
  system: <Bell className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  wechat: <MessageCircle className="h-4 w-4" />,
};

export default function PushConfigs() {

  const [selectedType, setSelectedType] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<number | null>(null);

  // 获取推送配置列表
  const { data: configs, isLoading, refetch } = trpc.pushConfig.getAll.useQuery(
    selectedType === "all" ? {} : { pushType: selectedType as any }
  );

  // 启用/禁用推送配置
  const toggleMutation = trpc.pushConfig.toggle.useMutation({
    onSuccess: () => {
      alert("推送配置状态已更新");
      refetch();
    },
    onError: (error) => {
      alert(`操作失败：${error.message}`);
    },
  });

  // 删除推送配置
  const deleteMutation = trpc.pushConfig.delete.useMutation({
    onSuccess: () => {
      alert("推送配置已删除");
      refetch();
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    },
    onError: (error) => {
      alert(`删除失败：${error.message}`);
    },
  });

  // 手动执行推送
  const executeMutation = trpc.pushConfig.execute.useMutation({
    onSuccess: (result) => {
      alert(`推送执行成功！已向 ${result.targetUserCount} 个用户发送推送，成功 ${result.successCount} 个`);
      refetch();
    },
    onError: (error) => {
      alert(`推送执行失败：${error.message}`);
    },
  });

  const handleToggle = (id: number, isEnabled: boolean) => {
    toggleMutation.mutate({ id, isEnabled: !isEnabled });
  };

  const handleDelete = (id: number) => {
    setConfigToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (configToDelete) {
      deleteMutation.mutate({ id: configToDelete });
    }
  };

  const handleExecute = (id: number) => {
    executeMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">推送配置管理</h1>
          <p className="text-muted-foreground mt-2">
            管理智能内容推送配置，自动向目标用户推送学习内容
          </p>
        </div>
        <Link href="/admin/push-configs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            创建推送配置
          </Button>
        </Link>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="question">题目推送</TabsTrigger>
          <TabsTrigger value="knowledge">知识点推送</TabsTrigger>
          <TabsTrigger value="resource">学习资源推送</TabsTrigger>
        </TabsList>
      </Tabs>

      {!configs || configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无推送配置</h3>
            <p className="text-muted-foreground mb-4">创建第一个推送配置，开始向用户推送学习内容</p>
            <Link href="/admin/push-configs/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建推送配置
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>频率</TableHead>
                <TableHead>推送时间</TableHead>
                <TableHead>渠道</TableHead>
                <TableHead>最后推送</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{config.title}</div>
                      {config.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {config.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{pushTypeLabels[config.pushType]}</Badge>
                  </TableCell>
                  <TableCell>{frequencyLabels[config.frequency]}</TableCell>
                  <TableCell>{config.pushTime}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(config.channels as string[]).map((channel) => (
                        <div
                          key={channel}
                          className="inline-flex items-center justify-center w-6 h-6 rounded bg-muted"
                        >
                          {channelIcons[channel as keyof typeof channelIcons]}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {config.lastPushTime
                      ? new Date(config.lastPushTime).toLocaleString("zh-CN")
                      : "未执行"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={config.isEnabled}
                      onCheckedChange={() => handleToggle(config.id, config.isEnabled)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExecute(config.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          立即执行
                        </DropdownMenuItem>
                        <Link href={`/admin/push-configs/${config.id}/edit`}>
                          <DropdownMenuItem>
                            <Pencil className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          onClick={() => handleDelete(config.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。删除后，该推送配置将永久移除，相关的推送记录将保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
