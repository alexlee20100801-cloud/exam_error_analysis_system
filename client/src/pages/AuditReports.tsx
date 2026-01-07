/**
 * 审计报告查询界面
 * 可视化展示审计日志、支持高级筛选和数据对比
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Download, FileText, Clock, User, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AuditReports() {
  const [operationType, setOperationType] = useState<string>("all");
  const [searchUserId, setSearchUserId] = useState<string>("");
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 查询批量操作历史
  const { data: operations, isLoading, refetch } = trpc.batchOperationHistory.listHistory.useQuery({
    limit: 50,
    operationType: operationType === "all" ? undefined : operationType,
    userId: searchUserId ? parseInt(searchUserId) : undefined,
  });

  // 查询审计统计
  const { data: stats } = trpc.auditEnhancement.getAuditStats.useQuery();

  // 导出审计报告
  const exportMutation = trpc.auditEnhancement.exportAuditReport.useMutation({
    onSuccess: (result: any) => {
      if (result.success && result.csvData) {
        // 创建下载链接
        const blob = new Blob([result.csvData], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `audit_report_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast.success("审计报告导出成功");
      } else {
        toast.error("审计报告导出失败");
      }
    },
    onError: (error: any) => {
      toast.error("导出失败", {
        description: error.message,
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      startDate: undefined,
      endDate: undefined,
      operationType: operationType === "all" ? undefined : operationType,
      userId: searchUserId ? parseInt(searchUserId) : undefined,
    });
  };

  const handleViewDetail = (operation: any) => {
    setSelectedOperation(operation);
    setDetailDialogOpen(true);
  };

  const getOperationTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: any }> = {
      batch_delete: { label: "批量删除", variant: "destructive" },
      batch_mark_mastered: { label: "批量标记掌握", variant: "default" },
      batch_export: { label: "批量导出", variant: "outline" },
      batch_update_difficulty: { label: "批量修改难度", variant: "secondary" },
      batch_add_tags: { label: "批量添加标签", variant: "secondary" },
      batch_update_subject: { label: "批量修改科目", variant: "secondary" },
      batch_update_grade: { label: "批量修改年级", variant: "secondary" },
    };

    const config = typeMap[type] || { label: type, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUndoStatusBadge = (status: string) => {
    switch (status) {
      case "none":
        return <Badge variant="outline">未撤销</Badge>;
      case "undone":
        return <Badge variant="default" className="bg-orange-500">已撤销</Badge>;
      case "redo":
        return <Badge variant="default" className="bg-blue-500">已重做</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">审计报告查询</h1>
          <p className="text-muted-foreground mt-1">
            查询和分析批量操作审计日志,支持高级筛选和数据导出
          </p>
        </div>
        <Button onClick={handleExport} disabled={exportMutation.isPending}>
          {exportMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          导出审计报告
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总操作数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOperations || 0}</div>
            <p className="text-xs text-muted-foreground">
              所有批量操作
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">影响记录数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAffectedRecords || 0}</div>
            <p className="text-xs text-muted-foreground">
              累计影响
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">撤销操作数</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.undoneOperations || 0}</div>
            <p className="text-xs text-muted-foreground">
              已撤销
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户数</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              执行过操作
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>操作类型</Label>
              <Select value={operationType} onValueChange={setOperationType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="batch_delete">批量删除</SelectItem>
                  <SelectItem value="batch_mark_mastered">批量标记掌握</SelectItem>
                  <SelectItem value="batch_export">批量导出</SelectItem>
                  <SelectItem value="batch_update_difficulty">批量修改难度</SelectItem>
                  <SelectItem value="batch_add_tags">批量添加标签</SelectItem>
                  <SelectItem value="batch_update_subject">批量修改科目</SelectItem>
                  <SelectItem value="batch_update_grade">批量修改年级</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>用户ID</Label>
              <Input
                placeholder="输入用户ID"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} className="w-full">
                <Search className="w-4 h-4 mr-2" />
                查询
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作历史列表 */}
      <Card>
        <CardHeader>
          <CardTitle>操作历史</CardTitle>
          <CardDescription>
            查看所有批量操作的详细记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : operations && operations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>操作ID</TableHead>
                    <TableHead>操作类型</TableHead>
                    <TableHead>操作描述</TableHead>
                    <TableHead>用户ID</TableHead>
                    <TableHead>影响记录数</TableHead>
                    <TableHead>撤销状态</TableHead>
                    <TableHead>操作时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op: any) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-mono text-sm">{op.id}</TableCell>
                      <TableCell>{getOperationTypeBadge(op.operationType)}</TableCell>
                      <TableCell className="max-w-xs truncate">{op.operationDescription}</TableCell>
                      <TableCell>{op.userId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{op.affectedCount}</Badge>
                      </TableCell>
                      <TableCell>{getUndoStatusBadge(op.undoStatus)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(op.createdAt).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(op)}
                        >
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                暂无操作记录。请调整筛选条件或执行批量操作后再查看。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 操作详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>操作详情 #{selectedOperation?.id}</DialogTitle>
            <DialogDescription>
              {selectedOperation?.operationDescription}
            </DialogDescription>
          </DialogHeader>
          {selectedOperation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">操作类型</div>
                  <div>{getOperationTypeBadge(selectedOperation.operationType)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">撤销状态</div>
                  <div>{getUndoStatusBadge(selectedOperation.undoStatus)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">用户ID</div>
                  <div className="font-mono">{selectedOperation.userId}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">影响记录数</div>
                  <div className="font-bold text-lg">{selectedOperation.affectedCount}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">操作时间</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedOperation.createdAt).toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>

              {selectedOperation.affectedIds && (
                <div>
                  <div className="text-sm font-medium mb-2">受影响的记录ID</div>
                  <div className="border rounded-lg p-3 bg-muted max-h-32 overflow-y-auto">
                    <div className="text-sm font-mono">
                      {JSON.stringify(selectedOperation.affectedIds, null, 2)}
                    </div>
                  </div>
                </div>
              )}

              {selectedOperation.changeDetails && (
                <div>
                  <div className="text-sm font-medium mb-2">变更详情</div>
                  <div className="border rounded-lg p-3 bg-muted max-h-48 overflow-y-auto">
                    <pre className="text-xs">
                      {JSON.stringify(selectedOperation.changeDetails, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedOperation.undoAt && (
                <Alert>
                  <AlertDescription>
                    <div className="text-sm">
                      <strong>撤销时间:</strong> {new Date(selectedOperation.undoAt).toLocaleString("zh-CN")}
                    </div>
                    {selectedOperation.undoByUserId && (
                      <div className="text-sm mt-1">
                        <strong>撤销人:</strong> 用户 #{selectedOperation.undoByUserId}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
