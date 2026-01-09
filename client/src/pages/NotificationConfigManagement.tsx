import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Bell, Plus, Edit, Trash2, Send, CheckCircle, XCircle, Clock, Mail, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface NotificationConfig {
  id: number;
  notificationType: string;
  title: string;
  description?: string | null;
  enablePlatformNotification: number;
  enableEmailNotification: number;
  enableSmsNotification: number;
  recipients: {
    emails?: string[];
    phones?: string[];
    userIds?: number[];
  };
  emailTemplate?: string | null;
  smsTemplate?: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTypes = [
  { value: "ab_test_decision", label: "A/B测试决策" },
  { value: "warmup_task_completed", label: "预热任务完成" },
  { value: "batch_operation_completed", label: "批量操作完成" },
  { value: "system_alert", label: "系统告警" },
  { value: "custom", label: "自定义通知" },
];

export default function NotificationConfigManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<NotificationConfig | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");

  // 表单状态
  const [formData, setFormData] = useState({
    notificationType: "system_alert" as any,
    title: "",
    description: "",
    enablePlatformNotification: true,
    enableEmailNotification: false,
    enableSmsNotification: false,
    emails: "",
    phones: "",
    emailTemplate: "",
    smsTemplate: "",
    isActive: true,
  });

  // 查询数据
  const { data: configs, refetch } = trpc.notificationConfig.list.useQuery();
  const { data: stats } = trpc.notificationConfig.getStats.useQuery({ days: 30 });
  const { data: history } = trpc.notificationConfig.getHistory.useQuery({ limit: 50 });

  // Mutations
  const createMutation = trpc.notificationConfig.create.useMutation({
    onSuccess: () => {
      toast.success("通知配置创建成功");
      setIsCreateDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = trpc.notificationConfig.update.useMutation({
    onSuccess: () => {
      toast.success("通知配置更新成功");
      setIsEditDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteMutation = trpc.notificationConfig.delete.useMutation({
    onSuccess: () => {
      toast.success("通知配置删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const testMutation = trpc.notificationConfig.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("测试通知发送成功");
      } else {
        toast.error("部分通知发送失败,请检查配置");
      }
      setIsTestDialogOpen(false);
      setTestEmail("");
      setTestPhone("");
    },
    onError: (error) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      notificationType: "system_alert",
      title: "",
      description: "",
      enablePlatformNotification: true,
      enableEmailNotification: false,
      enableSmsNotification: false,
      emails: "",
      phones: "",
      emailTemplate: "",
      smsTemplate: "",
      isActive: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      notificationType: formData.notificationType,
      title: formData.title,
      description: formData.description || undefined,
      enablePlatformNotification: formData.enablePlatformNotification,
      enableEmailNotification: formData.enableEmailNotification,
      enableSmsNotification: formData.enableSmsNotification,
      recipients: {
        emails: formData.emails ? formData.emails.split(",").map((e: any) => e.trim()) : [],
        phones: formData.phones ? formData.phones.split(",").map((p: any) => p.trim()) : [],
      },
      emailTemplate: formData.emailTemplate || undefined,
      smsTemplate: formData.smsTemplate || undefined,
      isActive: formData.isActive,
    });
  };

  const handleEdit = (config: NotificationConfig) => {
    setSelectedConfig(config);
    setFormData({
      notificationType: config.notificationType as any,
      title: config.title,
      description: config.description || "",
      enablePlatformNotification: config.enablePlatformNotification === 1,
      enableEmailNotification: config.enableEmailNotification === 1,
      enableSmsNotification: config.enableSmsNotification === 1,
      emails: config.recipients.emails?.join(", ") || "",
      phones: config.recipients.phones?.join(", ") || "",
      emailTemplate: config.emailTemplate || "",
      smsTemplate: config.smsTemplate || "",
      isActive: config.isActive === 1,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedConfig) return;

    updateMutation.mutate({
      id: selectedConfig.id,
      notificationType: formData.notificationType,
      title: formData.title,
      description: formData.description || undefined,
      enablePlatformNotification: formData.enablePlatformNotification,
      enableEmailNotification: formData.enableEmailNotification,
      enableSmsNotification: formData.enableSmsNotification,
      recipients: {
        emails: formData.emails ? formData.emails.split(",").map((e: any) => e.trim()) : [],
        phones: formData.phones ? formData.phones.split(",").map((p: any) => p.trim()) : [],
      },
      emailTemplate: formData.emailTemplate || undefined,
      smsTemplate: formData.smsTemplate || undefined,
      isActive: formData.isActive,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个通知配置吗?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleTest = (config: NotificationConfig) => {
    setSelectedConfig(config);
    setIsTestDialogOpen(true);
  };

  const handleSendTest = () => {
    if (!selectedConfig) return;

    testMutation.mutate({
      id: selectedConfig.id,
      testRecipient: {
        email: testEmail || undefined,
        phone: testPhone || undefined,
      },
    });
  };

  const getTypeLabel = (type: string) => {
    return notificationTypes.find((t) => t.value === type)?.label || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">通知配置管理</h1>
            <p className="text-muted-foreground mt-2">管理系统通知规则和发送渠道</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建配置
          </Button>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">总发送量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">成功发送</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.byStatus.find((s: any) => s.status === "sent")?.count || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">发送失败</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.byStatus.find((s: any) => s.status === "failed")?.count || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">待发送</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.byStatus.find((s: any) => s.status === "pending")?.count || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 主内容区 */}
        <Tabs defaultValue="configs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="configs">通知配置</TabsTrigger>
            <TabsTrigger value="history">发送历史</TabsTrigger>
          </TabsList>

          {/* 通知配置列表 */}
          <TabsContent value="configs" className="space-y-4">
            {configs?.map((config: any) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{config.title}</CardTitle>
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "启用" : "禁用"}
                        </Badge>
                        <Badge variant="outline">{getTypeLabel(config.notificationType)}</Badge>
                      </div>
                      {config.description && (
                        <CardDescription>{config.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleTest(config)}>
                        <Send className="mr-2 h-4 w-4" />
                        测试
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span>平台通知:</span>
                        {config.enablePlatformNotification ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>邮件通知:</span>
                        {config.enableEmailNotification ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>短信通知:</span>
                        {config.enableSmsNotification ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>
                        接收人: {config.recipients.emails?.length || 0} 个邮箱,{" "}
                        {config.recipients.phones?.length || 0} 个手机号
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* 发送历史 */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>发送历史</CardTitle>
                <CardDescription>最近50条通知发送记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history?.map((record: any) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {record.channel === "email" && <Mail className="h-4 w-4" />}
                        {record.channel === "sms" && <Smartphone className="h-4 w-4" />}
                        {record.channel === "platform" && <Bell className="h-4 w-4" />}
                        <div>
                          <div className="font-medium">{record.title}</div>
                          <div className="text-sm text-muted-foreground">
                            发送至: {record.recipient}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            record.status === "sent"
                              ? "default"
                              : record.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {record.status === "sent" && "已发送"}
                          {record.status === "failed" && "失败"}
                          {record.status === "pending" && "待发送"}
                          {record.status === "delivered" && "已送达"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(record.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 创建/编辑对话框 */}
        <Dialog
          open={isCreateDialogOpen || isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditDialogOpen ? "编辑通知配置" : "新建通知配置"}</DialogTitle>
              <DialogDescription>
                配置通知类型、发送渠道和接收人信息
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notificationType">通知类型</Label>
                <Select
                  value={formData.notificationType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, notificationType: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((type: any) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">通知标题</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入通知标题"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入通知描述(可选)"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>通知渠道</Label>
                <div className="flex items-center justify-between">
                  <Label htmlFor="enablePlatformNotification" className="cursor-pointer">
                    启用平台通知
                  </Label>
                  <Switch
                    id="enablePlatformNotification"
                    checked={formData.enablePlatformNotification}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enablePlatformNotification: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableEmailNotification" className="cursor-pointer">
                    启用邮件通知
                  </Label>
                  <Switch
                    id="enableEmailNotification"
                    checked={formData.enableEmailNotification}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enableEmailNotification: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableSmsNotification" className="cursor-pointer">
                    启用短信通知
                  </Label>
                  <Switch
                    id="enableSmsNotification"
                    checked={formData.enableSmsNotification}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enableSmsNotification: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emails">接收邮箱</Label>
                <Input
                  id="emails"
                  value={formData.emails}
                  onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
                  placeholder="多个邮箱用逗号分隔"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phones">接收手机号</Label>
                <Input
                  id="phones"
                  value={formData.phones}
                  onChange={(e) => setFormData({ ...formData, phones: e.target.value })}
                  placeholder="多个手机号用逗号分隔"
                />
              </div>

              {formData.enableEmailNotification && (
                <div className="space-y-2">
                  <Label htmlFor="emailTemplate">邮件模板</Label>
                  <Textarea
                    id="emailTemplate"
                    value={formData.emailTemplate}
                    onChange={(e) =>
                      setFormData({ ...formData, emailTemplate: e.target.value })
                    }
                    placeholder="输入邮件内容模板(可选)"
                    rows={4}
                  />
                </div>
              )}

              {formData.enableSmsNotification && (
                <div className="space-y-2">
                  <Label htmlFor="smsTemplate">短信模板</Label>
                  <Textarea
                    id="smsTemplate"
                    value={formData.smsTemplate}
                    onChange={(e) => setFormData({ ...formData, smsTemplate: e.target.value })}
                    placeholder="输入短信内容模板(可选,最多160字)"
                    rows={3}
                    maxLength={160}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive" className="cursor-pointer">
                  启用此配置
                </Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={isEditDialogOpen ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditDialogOpen ? "更新" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 测试对话框 */}
        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>测试通知</DialogTitle>
              <DialogDescription>
                发送测试通知以验证配置是否正确
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedConfig?.enableEmailNotification === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="testEmail">测试邮箱</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="输入接收测试邮件的邮箱"
                  />
                </div>
              )}

              {selectedConfig?.enableSmsNotification === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="testPhone">测试手机号</Label>
                  <Input
                    id="testPhone"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="输入接收测试短信的手机号"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSendTest} disabled={testMutation.isPending}>
                发送测试
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
