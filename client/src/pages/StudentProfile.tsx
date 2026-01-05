import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, RefreshCw, UserPlus, User, Mail, GraduationCap } from "lucide-react";

export default function StudentProfile() {
  const { data: user } = trpc.auth.me.useQuery();
  const [inviteCode, setInviteCode] = useState<string>("");

  const generateInviteMutation = trpc.parentSupervision.generateInviteCode.useMutation({
    onSuccess: (data) => {
      setInviteCode(data.inviteCode);
      toast.success("邀请码生成成功", {
        description: "您可以将邀请码分享给家长",
      });
    },
    onError: (error) => {
      toast.error("生成失败", {
        description: error.message,
      });
    },
  });

  const handleGenerateCode = () => {
    generateInviteMutation.mutate();
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast.success("复制成功", {
        description: "邀请码已复制到剪贴板",
      });
    }
  };

  if (!user) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">个人资料</h1>
        <p className="text-muted-foreground">管理您的个人信息和家长邀请</p>
      </div>

      {/* 基本信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本信息
          </CardTitle>
          <CardDescription>您的账号基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input value={user.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>用户ID</Label>
              <Input value={user.id.toString()} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              年级
            </Label>
            <Input 
              value={
                user.grade === "junior1" ? "初一" :
                user.grade === "junior2" ? "初二" :
                user.grade === "junior3" ? "初三" :
                user.grade === "senior1" ? "高一" :
                user.grade === "senior2" ? "高二" :
                user.grade === "senior3" ? "高三" :
                user.grade || "未设置"
              } 
              disabled 
            />
          </div>
          {user.school && (
            <div className="space-y-2">
              <Label>学校</Label>
              <Input value={user.school} disabled />
            </div>
          )}
          {user.region && (
            <div className="space-y-2">
              <Label>所在地区</Label>
              <Input value={user.region} disabled />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 家长邀请卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            家长邀请码
          </CardTitle>
          <CardDescription>
            生成邀请码，让家长可以绑定您的账号并查看学习进度
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!inviteCode ? (
            <div className="text-center py-8">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                点击下方按钮生成邀请码，家长可通过邀请码绑定您的账号
              </p>
              <Button 
                onClick={handleGenerateCode} 
                disabled={generateInviteMutation.isPending}
                size="lg"
              >
                {generateInviteMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    生成邀请码
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-6 text-center">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  您的邀请码
                </Label>
                <div className="text-4xl font-bold tracking-wider text-primary mb-4">
                  {inviteCode}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={handleCopyCode}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    复制邀请码
                  </Button>
                  <Button 
                    onClick={handleGenerateCode}
                    variant="outline"
                    size="sm"
                    disabled={generateInviteMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新生成
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium text-sm">使用说明：</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>将邀请码分享给您的家长</li>
                  <li>家长在家长端页面输入邀请码完成绑定</li>
                  <li>绑定后家长可以查看您的学习进度和设置学习目标</li>
                  <li>如需更换家长，可以重新生成邀请码</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
