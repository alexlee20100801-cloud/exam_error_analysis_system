import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Mail, MessageSquare, Bell, Check, X } from "lucide-react";

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: {
    enabled: boolean;
    reminderMinutes: number[];
    notificationChannels: string[];
  };
  userEmail?: string | null;
  emailVerified?: boolean;
  wechatBound?: boolean;
}

export function NotificationSettingsDialog({
  open,
  onOpenChange,
  currentSettings,
  userEmail,
  emailVerified,
  wechatBound,
}: NotificationSettingsDialogProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    currentSettings.notificationChannels || ["system"]
  );
  const [email, setEmail] = useState(userEmail || "");
  const [showEmailInput, setShowEmailInput] = useState(false);

  const utils = trpc.useUtils();
  const updateSettingsMutation = trpc.reminderSettings.updateSettings.useMutation({
    onSuccess: () => {
      utils.reminderSettings.getSettings.invalidate();
      alert("设置已保存！");
      onOpenChange(false);
    },
  });

  const bindEmailMutation = trpc.reminderSettings.bindEmail.useMutation({
    onSuccess: () => {
      alert("验证邮件已发送，请检查你的邮箱！");
      setShowEmailInput(false);
    },
  });

  const unbindEmailMutation = trpc.reminderSettings.unbindEmail.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      alert("邮箱已解绑！");
    },
  });

  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      // 至少保留一个渠道
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter((c) => c !== channel));
      } else {
        alert("至少需要选择一个通知渠道");
      }
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        enabled: currentSettings.enabled,
        reminderMinutes: currentSettings.reminderMinutes,
        notificationChannels: selectedChannels as any,
      });
    } catch (error) {
      console.error("保存设置失败:", error);
      alert("保存失败，请稍后重试");
    }
  };

  const handleBindEmail = async () => {
    if (!email || !email.includes("@")) {
      alert("请输入有效的邮箱地址");
      return;
    }

    try {
      await bindEmailMutation.mutateAsync({ email });
    } catch (error) {
      console.error("绑定邮箱失败:", error);
      alert("绑定失败，请稍后重试");
    }
  };

  const handleUnbindEmail = async () => {
    if (!confirm("确定要解绑邮箱吗？解绑后将无法接收邮件提醒。")) {
      return;
    }

    try {
      await unbindEmailMutation.mutateAsync();
    } catch (error) {
      console.error("解绑邮箱失败:", error);
      alert("解绑失败，请稍后重试");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知设置
          </DialogTitle>
          <DialogDescription>
            选择你希望接收提醒的方式，可以同时选择多个渠道
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 系统通知 */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <input
              type="checkbox"
              id="channel-system"
              checked={selectedChannels.includes("system")}
              onChange={() => toggleChannel("system")}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <Label htmlFor="channel-system" className="text-base font-semibold cursor-pointer">
                  系统通知
                </Label>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">推荐</span>
              </div>
              <p className="text-sm text-muted-foreground">
                在Manus系统内接收通知消息，实时提醒你的复习任务
              </p>
            </div>
          </div>

          {/* 邮件通知 */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <input
              type="checkbox"
              id="channel-email"
              checked={selectedChannels.includes("email")}
              onChange={() => toggleChannel("email")}
              disabled={!userEmail || !emailVerified}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-purple-500" />
                <Label htmlFor="channel-email" className="text-base font-semibold cursor-pointer">
                  邮件通知
                </Label>
                {userEmail && emailVerified && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    已验证
                  </span>
                )}
                {userEmail && !emailVerified && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">待验证</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                通过邮件接收复习任务提醒，即使不在线也能及时收到通知
              </p>

              {userEmail ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{userEmail}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnbindEmail}
                    disabled={unbindEmailMutation.isPending}
                  >
                    <X className="h-3 w-3 mr-1" />
                    解绑
                  </Button>
                </div>
              ) : showEmailInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="输入你的邮箱地址"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleBindEmail}
                    disabled={bindEmailMutation.isPending}
                  >
                    {bindEmailMutation.isPending ? "发送中..." : "绑定"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmailInput(false)}
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailInput(true)}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  绑定邮箱
                </Button>
              )}
            </div>
          </div>

          {/* 微信通知 */}
          <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
            <input
              type="checkbox"
              id="channel-wechat"
              checked={selectedChannels.includes("wechat")}
              onChange={() => toggleChannel("wechat")}
              disabled={true}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <Label htmlFor="channel-wechat" className="text-base font-semibold cursor-pointer">
                  微信通知
                </Label>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">即将推出</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                通过微信接收复习任务提醒，需要管理员配置微信公众号
              </p>
              <p className="text-xs text-muted-foreground">
                💡 提示：微信通知功能需要配置企业微信或微信公众号，请联系系统管理员开通
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
