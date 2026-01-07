import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Copy, Trash2, Eye, Download, Lock, Globe, Calendar, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ShareManagement() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareToDelete, setShareToDelete] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: shares = [], isLoading, refetch } = trpc.share.getUserShares.useQuery();

  const deleteMutation = trpc.share.deleteShare.useMutation({
    onSuccess: () => {
      toast.success("分享已删除");
      refetch();
      setDeleteDialogOpen(false);
      setShareToDelete(null);
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const handleCopyUrl = async (shareCode: string, shareId: number) => {
    try {
      const url = `${window.location.origin}/share/${shareCode}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      toast.success("链接已复制到剪贴板");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("复制失败，请手动复制");
    }
  };

  const handleDeleteClick = (shareId: number) => {
    setShareToDelete(shareId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (shareToDelete) {
      deleteMutation.mutate({ shareId: shareToDelete });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">分享管理</h1>
        <p className="text-muted-foreground">
          管理您创建的所有错题集分享链接
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : shares.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">您还没有创建任何分享</p>
            <p className="text-sm text-muted-foreground">
              在错题列表页面选择错题后，点击"创建分享"按钮即可创建分享链接
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shares.map((share) => (
            <Card key={share.id} className={isExpired(share.expiresAt) ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{share.title}</CardTitle>
                      {isExpired(share.expiresAt) && (
                        <Badge variant="destructive">已过期</Badge>
                      )}
                      {share.accessType === "password" ? (
                        <Badge variant="secondary">
                          <Lock className="mr-1 h-3 w-3" />
                          密码保护
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Globe className="mr-1 h-3 w-3" />
                          公开
                        </Badge>
                      )}
                    </div>
                    {share.description && (
                      <CardDescription className="mt-2">{share.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 统计信息 */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{share.viewCount} 次浏览</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{share.downloadCount} 次下载</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{share.questionCount} 道错题</span>
                  </div>
                </div>

                {/* 时间信息 */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>创建于 {formatDate(share.createdAt)}</span>
                  </div>
                  {share.expiresAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className={isExpired(share.expiresAt) ? "text-destructive" : ""}>
                        {isExpired(share.expiresAt) ? "已过期" : `过期于 ${formatDate(share.expiresAt)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* 分享链接 */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm truncate">
                    {window.location.origin}/share/{share.shareCode}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyUrl(share.shareCode, share.id)}
                  >
                    {copiedId === share.id ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-600" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        复制
                      </>
                    )}
                  </Button>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(share.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个分享吗？删除后，分享链接将失效，此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
