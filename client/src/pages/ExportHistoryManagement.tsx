import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  Timer,
  Archive,
} from "lucide-react";

const EXPORT_TYPES = [
  { value: "error_questions", label: "错题导出" },
  { value: "learning_report", label: "学习报告" },
  { value: "exam_paper", label: "试卷导出" },
  { value: "statistics", label: "统计数据" },
  { value: "batch_export", label: "批量导出" },
  { value: "custom", label: "自定义" },
];

const EXPORT_FORMATS = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "excel", label: "Excel", icon: FileSpreadsheet },
  { value: "word", label: "Word", icon: FileText },
  { value: "image", label: "图片", icon: FileImage },
  { value: "zip", label: "压缩包", icon: Archive },
  { value: "markdown", label: "Markdown", icon: FileText },
  { value: "html", label: "HTML", icon: FileText },
];

const EXPORT_STATUS = [
  { value: "pending", label: "处理中", color: "bg-yellow-500" },
  { value: "processing", label: "处理中", color: "bg-blue-500" },
  { value: "completed", label: "已完成", color: "bg-green-500" },
  { value: "failed", label: "失败", color: "bg-red-500" },
];

export default function ExportHistoryManagement() {
  const [filters, setFilters] = useState({
    exportType: "all",
    exportFormat: "all",
    status: "all",
    includeExpired: false,
  });
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState(30);

  const utils = trpc.useUtils();

  // 查询导出历史
  const { data: exportHistory, isLoading } = trpc.exportHistory.getUserExportHistory.useQuery({
    exportType: filters.exportType === "all" ? undefined : filters.exportType,
    exportFormat: filters.exportFormat === "all" ? undefined : filters.exportFormat,
    status: filters.status === "all" ? undefined : filters.status,
    includeExpired: filters.includeExpired,
    limit: 50,
  });

  // 查询用户导出统计
  const { data: userStats } = trpc.exportHistory.getUserExportStats.useQuery();

  // 查询系统导出统计
  const { data: systemStats } = trpc.exportHistory.getSystemExportStats.useQuery({ days: 30 });

  // 查询清理统计
  const { data: cleanupStats } = trpc.exportHistory.getCleanupStats.useQuery();

  // 记录下载
  const recordDownloadMutation = trpc.exportHistory.recordDownload.useMutation({
    onSuccess: () => {
      utils.exportHistory.getUserExportHistory.invalidate();
    },
  });

  // 延长过期时间
  const extendExpiryMutation = trpc.exportHistory.extendExpiry.useMutation({
    onSuccess: () => {
      toast.success("过期时间已延长");
      setIsExtendDialogOpen(false);
      utils.exportHistory.getUserExportHistory.invalidate();
      utils.exportHistory.getUserExportStats.invalidate();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 删除导出历史
  const deleteMutation = trpc.exportHistory.deleteExportHistory.useMutation({
    onSuccess: () => {
      toast.success("记录已删除");
      utils.exportHistory.getUserExportHistory.invalidate();
      utils.exportHistory.getUserExportStats.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 触发清理
  const triggerCleanupMutation = trpc.exportHistory.triggerCleanup.useMutation({
    onSuccess: (result) => {
      toast.success(`清理完成，已清理 ${result.success} 个文件`);
      utils.exportHistory.getUserExportHistory.invalidate();
      utils.exportHistory.getCleanupStats.invalidate();
    },
    onError: (error) => {
      toast.error(`清理失败: ${error.message}`);
    },
  });

  const handleDownload = async (record: any) => {
    if (!record.fileUrl) {
      toast.error("文件不可用");
      return;
    }

    // 记录下载
    recordDownloadMutation.mutate({ id: record.id });

    // 打开下载链接
    window.open(record.fileUrl, "_blank");
  };

  const handleExtend = (id: number) => {
    setSelectedRecordId(id);
    setExtendDays(30);
    setIsExtendDialogOpen(true);
  };

  const handleConfirmExtend = () => {
    if (!selectedRecordId) return;
    extendExpiryMutation.mutate({
      id: selectedRecordId,
      additionalDays: extendDays,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这条导出记录吗？")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = EXPORT_STATUS.find((s) => s.value === status);
    if (!config) return null;
    return (
      <Badge variant="outline" className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const getFormatIcon = (format: string) => {
    const config = EXPORT_FORMATS.find((f) => f.value === format);
    const Icon = config?.icon || File;
    return <Icon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDaysRemaining = (expiresAt: string | Date | null) => {
    if (!expiresAt) return "-";
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "已过期";
    if (diffDays === 0) return "今天过期";
    if (diffDays === 1) return "明天过期";
    return `${diffDays} 天后过期`;
  };

  const isExpired = (expiresAt: string | Date | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Archive className="h-6 w-6" />
              导出历史管理
            </h1>
            <p className="text-muted-foreground mt-1">
              管理和下载您的导出文件
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => triggerCleanupMutation.mutate({ limit: 50 })}
            disabled={triggerCleanupMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerCleanupMutation.isPending ? "animate-spin" : ""}`} />
            清理过期文件
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                总导出次数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.totalExports || 0}</div>
              <p className="text-xs text-muted-foreground">
                已完成 {userStats?.byStatus?.completed || 0} 次
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                存储使用
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(userStats?.totalFileSize || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                已过期 {userStats?.expiredCount || 0} 个
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                待清理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {cleanupStats?.pendingCleanup || 0}
              </div>
              <p className="text-xs text-muted-foreground">已过期待清理</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                总下载次数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.totalDownloads || 0}</div>
              <p className="text-xs text-muted-foreground">
                累计下载
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 系统统计 */}
        {systemStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">系统导出统计（近30天）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">总导出数</span>
                  <p className="font-bold">{systemStats.totalExports || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">成功率</span>
                  <p className="font-bold text-green-500">
                    {systemStats.successRate || 0}%
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">总存储</span>
                  <p className="font-bold">{formatFileSize(systemStats.totalFileSize || 0)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">总下载</span>
                  <p className="font-bold">{systemStats.totalDownloads || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Select
                value={filters.exportType}
                onValueChange={(v) => setFilters({ ...filters, exportType: v })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="导出类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {EXPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.exportFormat}
                onValueChange={(v) => setFilters({ ...filters, exportFormat: v })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="文件格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部格式</SelectItem>
                  {EXPORT_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters({ ...filters, status: v })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {EXPORT_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeExpired"
                  checked={filters.includeExpired}
                  onChange={(e) => setFilters({ ...filters, includeExpired: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="includeExpired" className="text-sm">
                  显示已过期
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 导出历史列表 */}
        <Card>
          <CardHeader>
            <CardTitle>导出历史</CardTitle>
            <CardDescription>查看和管理您的导出文件</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : exportHistory && exportHistory.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>格式</TableHead>
                      <TableHead>文件名</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>大小</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>过期时间</TableHead>
                      <TableHead>下载次数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportHistory.map((record) => (
                      <TableRow
                        key={record.id}
                        className={record.isExpired ? "opacity-50" : ""}
                      >
                        <TableCell>{getFormatIcon(record.exportFormat)}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {record.fileName || "-"}
                        </TableCell>
                        <TableCell>
                          {EXPORT_TYPES.find((t) => t.value === record.exportType)?.label ||
                            record.exportType}
                        </TableCell>
                        <TableCell>{formatFileSize(record.fileSize)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {new Date(record.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              record.isExpired
                                ? "text-red-500"
                                : record.expiresAt &&
                                  new Date(record.expiresAt).getTime() - Date.now() <
                                    7 * 24 * 60 * 60 * 1000
                                ? "text-yellow-500"
                                : ""
                            }
                          >
                            {formatDaysRemaining(record.expiresAt)}
                          </span>
                        </TableCell>
                        <TableCell>{record.downloadCount || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {record.status === "completed" && !record.isExpired && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDownload(record)}
                                title="下载"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {record.status === "completed" && !record.isExpired && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleExtend(record.id)}
                                title="延长有效期"
                              >
                                <Timer className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(record.id)}
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">暂无导出历史</div>
            )}
          </CardContent>
        </Card>

        {/* 清理统计 */}
        {cleanupStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">清理统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">总记录数</span>
                  <p className="font-bold">{cleanupStats.totalRecords}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">已过期</span>
                  <p className="font-bold text-red-500">{cleanupStats.expiredRecords}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">待清理</span>
                  <p className="font-bold text-yellow-500">{cleanupStats.pendingCleanup}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">已节省空间</span>
                  <p className="font-bold">{cleanupStats.savedStorageMB} MB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 延长有效期对话框 */}
        <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>延长有效期</DialogTitle>
              <DialogDescription>选择要延长的天数</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">延长天数:</span>
                  <Select
                    value={extendDays.toString()}
                    onValueChange={(v) => setExtendDays(parseInt(v))}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 天</SelectItem>
                      <SelectItem value="14">14 天</SelectItem>
                      <SelectItem value="30">30 天</SelectItem>
                      <SelectItem value="60">60 天</SelectItem>
                      <SelectItem value="90">90 天</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleConfirmExtend} disabled={extendExpiryMutation.isPending}>
                {extendExpiryMutation.isPending ? "处理中..." : "确认延长"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
