import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedQuestionIds: number[];
}

export function ShareDialog({
  open,
  onOpenChange,
  selectedQuestionIds,
}: ShareDialogProps) {
  const [title, setTitle] = useState("我的错题集分享");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState<"public" | "password">("public");
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("7");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const createShareMutation = trpc.share.createShare.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      toast.success("分享链接创建成功！");
    },
    onError: (error) => {
      toast.error(`创建分享失败：${error.message}`);
    },
  });

  const handleCreateShare = () => {
    if (!title.trim()) {
      toast.error("请输入分享标题");
      return;
    }

    if (accessType === "password" && !password.trim()) {
      toast.error("请输入访问密码");
      return;
    }

    createShareMutation.mutate({
      questionIds: selectedQuestionIds,
      title: title.trim(),
      description: description.trim() || undefined,
      accessType,
      password: accessType === "password" ? password : undefined,
      expiresInDays: expiresInDays === "never" ? undefined : parseInt(expiresInDays),
    });
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("链接已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("复制失败，请手动复制");
    }
  };

  const handleClose = () => {
    setShareUrl("");
    setTitle("我的错题集分享");
    setDescription("");
    setAccessType("public");
    setPassword("");
    setExpiresInDays("7");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>创建分享链接</DialogTitle>
          <DialogDescription>
            将选中的 {selectedQuestionIds.length} 道错题分享给他人
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">分享标题 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：数学错题集"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">分享描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="添加一些描述信息（可选）"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-type">访问权限</Label>
              <Select value={accessType} onValueChange={(v) => setAccessType(v as "public" | "password")}>
                <SelectTrigger id="access-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">公开访问</SelectItem>
                  <SelectItem value="password">密码保护</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {accessType === "password" && (
              <div className="space-y-2">
                <Label htmlFor="password">访问密码 *</Label>
                <Input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="设置访问密码"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="expires">有效期</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1天</SelectItem>
                  <SelectItem value="3">3天</SelectItem>
                  <SelectItem value="7">7天</SelectItem>
                  <SelectItem value="30">30天</SelectItem>
                  <SelectItem value="never">永久有效</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleCreateShare} disabled={createShareMutation.isPending}>
                {createShareMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    创建分享
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">分享链接已创建</p>
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {accessType === "password" && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  访问密码
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-mono">
                  {password}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  请将密码一并发送给访问者
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 分享标题：{title}</p>
              {description && <p>• 分享描述：{description}</p>}
              <p>• 访问权限：{accessType === "public" ? "公开访问" : "密码保护"}</p>
              <p>• 有效期：{expiresInDays === "never" ? "永久有效" : `${expiresInDays}天`}</p>
              <p>• 错题数量：{selectedQuestionIds.length}道</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={handleClose}>
                完成
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
