import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Smartphone, User, MessageSquare, Check, X, ArrowLeft, Shield, History } from "lucide-react";
import { toast } from "sonner";

export default function AccountBinding() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  // 绑定对话框状态
  const [bindPhoneOpen, setBindPhoneOpen] = useState(false);
  const [bindUsernameOpen, setBindUsernameOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // 获取绑定状态
  const { data: bindingStatus, isLoading: statusLoading, refetch: refetchStatus } = 
    trpc.accountBinding.getStatus.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取绑定历史
  const { data: bindingHistory } = trpc.accountBinding.getHistory.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const sendCodeMutation = trpc.smsAuth.sendCode.useMutation({
    onSuccess: () => {
      setCountdown(60);
      toast.success("验证码已发送");
    },
    onError: (err) => {
      toast.error(err.message || "发送验证码失败");
    },
  });

  // 绑定手机号
  const bindPhoneMutation = trpc.smsAuth.bind.useMutation({
    onSuccess: () => {
      toast.success("手机号绑定成功");
      setBindPhoneOpen(false);
      setPhone("");
      setCode("");
      refetchStatus();
    },
    onError: (err) => {
      toast.error(err.message || "绑定失败");
    },
  });

  // 解绑手机号
  const unbindPhoneMutation = trpc.smsAuth.unbind.useMutation({
    onSuccess: () => {
      toast.success("手机号解绑成功");
      refetchStatus();
    },
    onError: (err) => {
      toast.error(err.message || "解绑失败");
    },
  });

  // 绑定用户名
  const bindUsernameMutation = trpc.accountBinding.bindUsername.useMutation({
    onSuccess: () => {
      toast.success("用户名绑定成功");
      setBindUsernameOpen(false);
      setUsername("");
      setPassword("");
      refetchStatus();
    },
    onError: (err) => {
      toast.error(err.message || "绑定失败");
    },
  });

  // 解绑用户名
  const unbindUsernameMutation = trpc.accountBinding.unbindUsername.useMutation({
    onSuccess: () => {
      toast.success("用户名解绑成功");
      refetchStatus();
    },
    onError: (err) => {
      toast.error(err.message || "解绑失败");
    },
  });

  // 检查是否可以解绑
  const { data: canUnbindPhone } = trpc.accountBinding.canUnbind.useQuery(
    { type: "phone" },
    { enabled: !!user && !!bindingStatus?.phone }
  );

  const { data: canUnbindUsername } = trpc.accountBinding.canUnbind.useQuery(
    { type: "username" },
    { enabled: !!user && !!bindingStatus?.username }
  );

  const handleSendCode = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error("请输入正确的手机号");
      return;
    }
    sendCodeMutation.mutate({ phone, type: "bind" });
  };

  const handleBindPhone = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error("请输入正确的手机号");
      return;
    }
    if (code.length !== 6) {
      toast.error("请输入6位验证码");
      return;
    }
    bindPhoneMutation.mutate({ phone, code });
  };

  const handleBindUsername = () => {
    if (username.length < 3) {
      toast.error("用户名至少3个字符");
      return;
    }
    if (password.length < 6) {
      toast.error("密码至少6个字符");
      return;
    }
    bindUsernameMutation.mutate({ username, password });
  };

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const bindingCount = [
    bindingStatus?.phone,
    bindingStatus?.wechatId,
    bindingStatus?.username,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/settings")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回设置
        </Button>

        {/* 账号绑定卡片 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>账号绑定管理</CardTitle>
            </div>
            <CardDescription>
              绑定多种登录方式，提高账号安全性。至少保留一种登录方式。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 手机号绑定 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                  <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">手机号</p>
                  {bindingStatus?.phone ? (
                    <p className="text-sm text-muted-foreground">
                      {bindingStatus.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">未绑定</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bindingStatus?.phone ? (
                  <>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <Check className="h-3 w-3 mr-1" />
                      已绑定
                    </Badge>
                    {canUnbindPhone?.canUnbind && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unbindPhoneMutation.mutate()}
                        disabled={unbindPhoneMutation.isPending}
                      >
                        {unbindPhoneMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "解绑"
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button size="sm" onClick={() => setBindPhoneOpen(true)}>
                    绑定
                  </Button>
                )}
              </div>
            </div>

            {/* 微信号绑定 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                  <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">微信号</p>
                  {bindingStatus?.wechatId ? (
                    <p className="text-sm text-muted-foreground">
                      {bindingStatus.wechatId}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">未绑定</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bindingStatus?.wechatId ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    已绑定
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <X className="h-3 w-3 mr-1" />
                    未绑定
                  </Badge>
                )}
              </div>
            </div>

            {/* 用户名密码绑定 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">用户名密码</p>
                  {bindingStatus?.username ? (
                    <p className="text-sm text-muted-foreground">
                      {bindingStatus.username}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">未绑定</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bindingStatus?.username ? (
                  <>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <Check className="h-3 w-3 mr-1" />
                      已绑定
                    </Badge>
                    {canUnbindUsername?.canUnbind && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unbindUsernameMutation.mutate()}
                        disabled={unbindUsernameMutation.isPending}
                      >
                        {unbindUsernameMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "解绑"
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button size="sm" onClick={() => setBindUsernameOpen(true)}>
                    绑定
                  </Button>
                )}
              </div>
            </div>

            {bindingCount < 2 && (
              <Alert>
                <AlertDescription>
                  建议绑定至少两种登录方式，以防止账号丢失。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 绑定历史 */}
        {bindingHistory && bindingHistory.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">绑定历史</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bindingHistory.map((record, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={record.action === "bind" ? "default" : "secondary"}>
                        {record.action === "bind" ? "绑定" : "解绑"}
                      </Badge>
                      <span>{record.type === "phone" ? "手机号" : record.type === "wechat" ? "微信号" : "用户名"}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(record.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 绑定手机号对话框 */}
      <Dialog open={bindPhoneOpen} onOpenChange={setBindPhoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>绑定手机号</DialogTitle>
            <DialogDescription>
              绑定手机号后可以使用手机验证码登录
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>手机号</Label>
              <Input
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>验证码</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="请输入验证码"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sendCodeMutation.isPending}
                  className="w-28 shrink-0"
                >
                  {sendCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}秒`
                  ) : (
                    "获取验证码"
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindPhoneOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBindPhone} disabled={bindPhoneMutation.isPending}>
              {bindPhoneMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              确认绑定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 绑定用户名对话框 */}
      <Dialog open={bindUsernameOpen} onOpenChange={setBindUsernameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>绑定用户名密码</DialogTitle>
            <DialogDescription>
              绑定用户名和密码后可以使用账号密码登录
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input
                type="text"
                placeholder="请输入用户名（至少3个字符）"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>密码</Label>
              <Input
                type="password"
                placeholder="请输入密码（至少6个字符）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindUsernameOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBindUsername} disabled={bindUsernameMutation.isPending}>
              {bindUsernameMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              确认绑定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
