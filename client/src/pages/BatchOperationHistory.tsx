import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Undo2, Eye, Trash2, Edit, FileDown, Tag, BookOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BatchOperationHistory() {
  const [selectedOperationType, setSelectedOperationType] = useState<string | undefined>(undefined);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<number | null>(null);

  // 查询批量操作历史
  const { data: history, isLoading, refetch } = trpc.batchOperationHistory.getHistory.useQuery({
    operationType: selectedOperationType,
    limit: 50,
    offset: 0,
  });

  // 查询统计数据
  const { data: statistics } = trpc.batchOperationHistory.getStatistics.useQuery();

  // 查询操作详情
  const { data: operationDetail } = trpc.batchOperationHistory.getDetail.useQuery(
    { operationId: selectedOperationId! },
    { enabled: !!selectedOperationId }
  );

  // 撤销操作
  const undoMutation = trpc.batchOperationHistory.undoOperation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`撤销失败: ${error.message}`);
    },
  });

  const handleUndo = (operationId: number) => {
    if (confirm("确定要撤销此操作吗?")) {
      undoMutation.mutate({ operationId });
    }
  };

  const handleViewDetail = (operationId: number) => {
    setSelectedOperationId(operationId);
    setDetailDialogOpen(true);
  };

  const getOperationTypeLabel = (type: string) => {
    const typeMap: Record<string, { label: string; icon: any }> = {
      batch_delete: { label: "批量删除", icon: Trash2 },
      batch_mark_mastered: { label: "批量标记掌握", icon: BookOpen },
      batch_export: { label: "批量导出", icon: FileDown },
      batch_update_difficulty: { label: "批量修改难度", icon: Edit },
      batch_add_tags: { label: "批量添加标签", icon: Tag },
      batch_update_subject: { label: "批量修改学科", icon: Edit },
      batch_update_grade: { label: "批量修改年级", icon: Edit },
    };
    return typeMap[type] || { label: type, icon: Edit };
  };

  const getOperationTypeIcon = (type: string) => {
    const config = getOperationTypeLabel(type);
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getUndoStatusBadge = (status: string, canUndo: number) => {
    if (!canUndo) {
      return <Badge variant="secondary">不可撤销</Badge>;
    }
    switch (status) {
      case "none":
        return <Badge variant="default">可撤销</Badge>;
      case "undone":
        return <Badge variant="outline">已撤销</Badge>;
      case "redo":
        return <Badge variant="secondary">已重做</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">批量操作历史</h1>
          <p className="text-muted-foreground mt-1">查看和管理所有批量操作记录</p>
        </div>
        <Select value={selectedOperationType || "all"} onValueChange={(v) => setSelectedOperationType(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="筛选操作类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="batch_delete">批量删除</SelectItem>
            <SelectItem value="batch_mark_mastered">批量标记掌握</SelectItem>
            <SelectItem value="batch_export">批量导出</SelectItem>
            <SelectItem value="batch_update_difficulty">批量修改难度</SelectItem>
            <SelectItem value="batch_add_tags">批量添加标签</SelectItem>
            <SelectItem value="batch_update_subject">批量修改学科</SelectItem>
            <SelectItem value="batch_update_grade">批量修改年级</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总操作数</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalOperations || 0}</div>
            <p className="text-xs text-muted-foreground">所有批量操作记录</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">影响记录数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalAffectedRecords || 0}</div>
            <p className="text-xs text-muted-foreground">累计影响的错题数量</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">可撤销操作</CardTitle>
            <Undo2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalOperations || 0}</div>
            <p className="text-xs text-muted-foreground">支持撤销的操作数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已撤销操作</CardTitle>
            <Undo2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.undoneOperations || 0}</div>
            <p className="text-xs text-muted-foreground">已执行撤销的操作数</p>
          </CardContent>
        </Card>
      </div>

      {/* 操作历史列表 */}
      <Card>
        <CardHeader>
          <CardTitle>操作记录</CardTitle>
          <CardDescription>查看详细的批量操作历史和撤销操作</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history && history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>操作类型</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>影响数量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((operation: any) => (
                  <TableRow key={operation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getOperationTypeIcon(operation.operationType)}
                        <span className="font-medium">{getOperationTypeLabel(operation.operationType).label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{operation.operationDescription}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{operation.affectedCount} 条</Badge>
                    </TableCell>
                    <TableCell>{getUndoStatusBadge(operation.undoStatus, operation.canUndo)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(operation.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewDetail(operation.id)}>
                          <Eye className="h-3 w-3 mr-1" />
                          详情
                        </Button>
                        {operation.canUndo === 1 && operation.undoStatus === "none" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUndo(operation.id)}
                            disabled={undoMutation.isPending}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            撤销
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">暂无操作记录</div>
          )}
        </CardContent>
      </Card>

      {/* 操作详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>操作详情</DialogTitle>
            <DialogDescription>查看批量操作的详细信息和变更内容</DialogDescription>
          </DialogHeader>
          {operationDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">操作类型</div>
                  <div className="mt-1 flex items-center gap-2">
                    {getOperationTypeIcon(operationDetail.operationType)}
                    <span>{getOperationTypeLabel(operationDetail.operationType).label}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">影响数量</div>
                  <div className="mt-1">
                    <Badge variant="secondary">{operationDetail.affectedCount} 条记录</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">操作时间</div>
                  <div className="mt-1 text-sm">{new Date(operationDetail.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">状态</div>
                  <div className="mt-1">{getUndoStatusBadge(operationDetail.undoStatus, operationDetail.canUndo)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">操作描述</div>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm">{operationDetail.operationDescription}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">受影响的记录ID</div>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2">
                      {(operationDetail.affectedIds as number[]).slice(0, 50).map((id: any) => (
                        <Badge key={id} variant="outline">
                          {id}
                        </Badge>
                      ))}
                      {(operationDetail.affectedIds as number[]).length > 50 && (
                        <Badge variant="secondary">
                          +{(operationDetail.affectedIds as number[]).length - 50} 更多
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {operationDetail.changeDetails && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">变更详情</div>
                  <Card>
                    <CardContent className="pt-4">
                      <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                        {JSON.stringify(operationDetail.changeDetails, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {operationDetail.undoAt && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">撤销时间</div>
                  <div className="mt-1 text-sm">{new Date(operationDetail.undoAt).toLocaleString()}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
