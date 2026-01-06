import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, Server, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

export default function AdminSMTPSettings() {
  const [formData, setFormData] = useState({
    host: "",
    port: 465,
    secure: true,
    user: "",
    password: "",
    fromEmail: "",
    fromName: "深圳初高中错题分析学习系统",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // 获取SMTP配置状态
  const { data: statusData, isLoading: statusLoading } = trpc.smtpConfig.getStatus.useQuery();

  // 获取完整配置（如果已配置）
  const { data: configData } = trpc.smtpConfig.getConfig.useQuery(undefined, {
    enabled: statusData?.configured === true,
  });

  // 保存配置
  const saveConfigMutation = trpc.smtpConfig.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("SMTP配置保存成功");
    },
    onError: (error) => {
      toast.error(error.message || "保存失败");
    },
  });

  // 测试配置
  const testConfigMutation = trpc.smtpConfig.testConfig.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("SMTP配置测试成功！");
      } else {
        toast.error(data.message);
      }
      setIsTesting(false);
    },
    onError: (error) => {
      toast.error(error.message || "测试失败");
      setIsTesting(false);
    },
  });

  // 删除配置
  const deleteConfigMutation = trpc.smtpConfig.deleteConfig.useMutation({
    onSuccess: () => {
      toast.success("SMTP配置已删除");
      setFormData({
        host: "",
        port: 465,
        secure: true,
        user: "",
        password: "",
        fromEmail: "",
        fromName: "深圳初高中错题分析学习系统",
      });
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  // 加载现有配置
  useEffect(() => {
    if (configData) {
      setFormData(configData);
    }
  }, [configData]);

  const handleSave = () => {
    // 验证必填字段
    if (!formData.host || !formData.user || !formData.password || !formData.fromEmail) {
      toast.error("请填写所有必填字段");
      return;
    }

    saveConfigMutation.mutate(formData);
  };

  const handleTest = () => {
    // 验证必填字段
    if (!formData.host || !formData.user || !formData.password || !formData.fromEmail) {
      toast.error("请填写所有必填字段后再测试");
      return;
    }

    setIsTesting(true);
    testConfigMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm("确定要删除SMTP配置吗？删除后将无法发送邮件通知。")) {
      deleteConfigMutation.mutate();
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">SMTP邮件服务器配置</h1>
        <p className="text-muted-foreground mt-2">
          配置SMTP服务器以启用邮件通知功能（复习提醒、邮箱验证等）
        </p>
      </div>

      {/* 配置状态卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            配置状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {statusData?.configured ? "已配置" : "未配置"}
              </p>
              {statusData?.configured && (
                <p className="text-sm text-muted-foreground mt-1">
                  {statusData.host}:{statusData.port} ({statusData.fromEmail})
                </p>
              )}
            </div>
            <div>
              {statusData?.configured ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-gray-400" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 配置表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP服务器设置
          </CardTitle>
          <CardDescription>
            填写您的SMTP服务器信息。常见服务商：QQ邮箱(smtp.qq.com:465)、163邮箱(smtp.163.com:465)、Gmail(smtp.gmail.com:587)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SMTP主机 */}
          <div className="space-y-2">
            <Label htmlFor="host">SMTP主机 *</Label>
            <Input
              id="host"
              placeholder="例如: smtp.gmail.com"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            />
          </div>

          {/* 端口和安全连接 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="port">端口 *</Label>
              <Input
                id="port"
                type="number"
                placeholder="465 或 587"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 465 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secure">SSL/TLS安全连接</Label>
              <div className="flex items-center h-10 px-3 border rounded-md">
                <Switch
                  id="secure"
                  checked={formData.secure}
                  onCheckedChange={(checked) => setFormData({ ...formData, secure: checked })}
                />
                <span className="ml-2 text-sm">{formData.secure ? "启用" : "禁用"}</span>
              </div>
            </div>
          </div>

          {/* 用户名 */}
          <div className="space-y-2">
            <Label htmlFor="user">用户名/邮箱 *</Label>
            <Input
              id="user"
              type="email"
              placeholder="your-email@example.com"
              value={formData.user}
              onChange={(e) => setFormData({ ...formData, user: e.target.value })}
            />
          </div>

          {/* 密码 */}
          <div className="space-y-2">
            <Label htmlFor="password">密码/授权码 *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入SMTP密码或授权码"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              注意：QQ邮箱、163邮箱等需要使用授权码，而不是登录密码
            </p>
          </div>

          {/* 发件人邮箱 */}
          <div className="space-y-2">
            <Label htmlFor="fromEmail">发件人邮箱 *</Label>
            <Input
              id="fromEmail"
              type="email"
              placeholder="noreply@example.com"
              value={formData.fromEmail}
              onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
            />
          </div>

          {/* 发件人名称 */}
          <div className="space-y-2">
            <Label htmlFor="fromName">发件人名称 *</Label>
            <Input
              id="fromName"
              placeholder="深圳初高中错题分析学习系统"
              value={formData.fromName}
              onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleTest}
              variant="outline"
              disabled={isTesting || testConfigMutation.isPending}
            >
              {isTesting || testConfigMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                "测试连接"
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveConfigMutation.isPending}
            >
              {saveConfigMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存配置"
              )}
            </Button>
            {statusData?.configured && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={deleteConfigMutation.isPending}
              >
                {deleteConfigMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    删除中...
                  </>
                ) : (
                  "删除配置"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 帮助信息 */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">💡 配置提示</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>• <strong>QQ邮箱：</strong>smtp.qq.com, 端口465, 需要开启SMTP服务并使用授权码</p>
          <p>• <strong>163邮箱：</strong>smtp.163.com, 端口465, 需要开启SMTP服务并使用授权码</p>
          <p>• <strong>Gmail：</strong>smtp.gmail.com, 端口587, 需要开启"允许不够安全的应用"或使用应用专用密码</p>
          <p>• <strong>企业邮箱：</strong>请咨询您的IT管理员获取SMTP配置信息</p>
        </CardContent>
      </Card>
    </div>
  );
}
