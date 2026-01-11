/**
 * IP封禁管理页面
 * 管理员可以查看、添加、删除IP黑名单
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Trash2, Ban, Clock, AlertTriangle, Search, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function IpBlockManager() {
  // 所有hooks必须在组件顶层调用，不能在条件语句中
  const [, setLocation] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newDuration, setNewDuration] = useState("permanent");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 使用稳定的查询参数
  const queryParams = useMemo(() => ({
    page,
    pageSize,
    ipAddress: searchQuery || undefined
  }), [page, pageSize, searchQuery]);

  // 获取IP黑名单列表
  const blacklistQuery = trpc.ipBlacklist.list.useQuery(queryParams);
  
  // 获取统计数据
  const statsQuery = trpc.ipBlacklist.statistics.useQuery();

  // 添加IP到黑名单
  const addMutation = trpc.ipBlacklist.add.useMutation({
    onSuccess: () => {
      toast.success("IP已添加到黑名单");
      setShowAddDialog(false);
      setNewIp("");
      setNewReason("");
      setNewDuration("permanent");
      blacklistQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    }
  });

  // 从黑名单移除IP
  const removeMutation = trpc.ipBlacklist.remove.useMutation({
    onSuccess: () => {
      toast.success("IP已从黑名单移除");
      blacklistQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`移除失败: ${error.message}`);
    }
  });

  // 处理函数
  const handleAddIp = () => {
    if (!newIp.trim()) {
      toast.error("请输入IP地址");
      return;
    }
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIp.trim())) {
      toast.error("请输入有效的IP地址格式");
      return;
    }
    let expiresAt: string | undefined;
    if (newDuration !== "permanent") {
      const hours = parseInt(newDuration);
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }
    addMutation.mutate({
      ipAddress: newIp.trim(),
      reason: newReason.trim() || "手动添加",
      expiresAt
    });
  };

  const handleRemoveIp = (ip: string) => {
    if (confirm(`确定要从黑名单中移除 ${ip} 吗？`)) {
      removeMutation.mutate({ ipAddress: ip });
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "永久";
    return new Date(date).toLocaleString("zh-CN");
  };

  const getStatusBadge = (expiresAt: Date | string | null) => {
    if (!expiresAt) {
      return <Badge variant="destructive">永久封禁</Badge>;
    }
    const now = new Date();
    const expires = new Date(expiresAt);
    if (expires > now) {
      return <Badge className="bg-yellow-600">临时封禁</Badge>;
    }
    return <Badge variant="outline">已过期</Badge>;
  };

  // 从查询结果中提取数据
  const blacklistData = blacklistQuery.data;
  const stats = statsQuery.data;
  const isLoading = blacklistQuery.isLoading;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              IP封禁管理
            </h1>
            <p className="text-muted-foreground mt-2">
              管理被封禁的IP地址，保护系统安全
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加IP
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              总封禁数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.active ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              当前黑名单中的IP数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              永久封禁
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats?.permanent ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              永久封禁的IP数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              临时封禁
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {(stats?.active ?? 0) - (stats?.permanent ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              临时封禁的IP数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              今日新增
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.dailyStats?.find(d => d.date === new Date().toISOString().split('T')[0])?.count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              今日新增封禁数量
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>IP黑名单列表</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索IP地址..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  blacklistQuery.refetch();
                  statsQuery.refetch();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : blacklistData?.entries && blacklistData.entries.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP地址</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>封禁原因</TableHead>
                    <TableHead>封禁时间</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blacklistData.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.ipAddress}</TableCell>
                      <TableCell>{getStatusBadge(entry.expiresAt)}</TableCell>
                      <TableCell className="max-w-xs truncate">{entry.reason}</TableCell>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell>{formatDate(entry.expiresAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveIp(entry.ipAddress)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  共 {blacklistData.total} 条记录
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm">
                    第 {page} / {Math.ceil((blacklistData.total || 1) / pageSize)} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil((blacklistData.total || 1) / pageSize)}
                    onClick={() => setPage(p => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Ban className="h-12 w-12 mb-4 opacity-50" />
              <p>暂无封禁的IP地址</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加IP对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加IP到黑名单</DialogTitle>
            <DialogDescription>
              输入要封禁的IP地址和相关信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ip">IP地址</Label>
              <Input
                id="ip"
                placeholder="例如: 192.168.1.1"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">封禁原因</Label>
              <Textarea
                id="reason"
                placeholder="请输入封禁原因..."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">封禁时长</Label>
              <Select value={newDuration} onValueChange={setNewDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="选择封禁时长" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">永久封禁</SelectItem>
                  <SelectItem value="1">1小时</SelectItem>
                  <SelectItem value="6">6小时</SelectItem>
                  <SelectItem value="24">24小时</SelectItem>
                  <SelectItem value="72">3天</SelectItem>
                  <SelectItem value="168">7天</SelectItem>
                  <SelectItem value="720">30天</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddIp} disabled={addMutation.isPending}>
              {addMutation.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
