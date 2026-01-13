import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Activity,
  Settings,
  Eye,
  FileText,
  Zap,
  Database,
  FlaskConical,
} from "lucide-react";

const TASK_TYPES = [
  { value: "performance_evaluation", label: "性能评估" },
  { value: "weekly_report_generation", label: "周报生成" },
  { value: "alert_check", label: "告警检查" },
  { value: "cache_warmup", label: "缓存预热" },
  { value: "ab_test_decision", label: "A/B测试决策" },
  { value: "data_backup", label: "数据备份" },
  { value: "cleanup", label: "清理任务" },
  { value: "custom", label: "自定义" },
];

const SEVERITY_LEVELS = [
  { value: "low", label: "低", color: "bg-blue-500" },
  { value: "medium", label: "中", color: "bg-yellow-500" },
  { value: "high", label: "高", color: "bg-orange-500" },
  { value: "critical", label: "严重", color: "bg-red-500" },
];

const ALERT_STATUS = [
  { value: "pending", label: "待处理", icon: Clock, color: "text-yellow-500" },
  { value: "acknowledged", label: "已确认", icon: Eye, color: "text-blue-500" },
  { value: "resolved", label: "已解决", icon: CheckCircle, color: "text-green-500" },
  { value: "ignored", label: "已忽略", icon: XCircle, color: "text-gray-500" },
];

const HEALTH_STATUS = [
  { value: "healthy", label: "健康", color: "bg-green-500" },
  { value: "warning", label: "警告", color: "bg-yellow-500" },
  { value: "critical", label: "严重", color: "bg-red-500" },
  { value: "unknown", label: "未知", color: "bg-gray-500" },
];

// 预设告警规则模板
const PRESET_ALERT_TEMPLATES = [
  {
    id: "performance",
    label: "性能评估任务",
    icon: Activity,
    taskName: "performance-evaluation",
    taskType: "performance_evaluation",
    consecutiveFailureThreshold: 3,
    timeoutThreshold: 600,
    alertSeverity: "high",
    enableEmailNotification: true,
    enableMessageNotification: true,
    notificationCooldown: 3600,
    maxNotificationsPerDay: 5,
    description: "监控性能评估任务，连续失败3次或超时10分钟时告警",
  },
  {
    id: "weekly_report",
    label: "周报生成任务",
    icon: FileText,
    taskName: "weekly-report-generation",
    taskType: "weekly_report_generation",
    consecutiveFailureThreshold: 2,
    timeoutThreshold: 900,
    alertSeverity: "medium",
    enableEmailNotification: true,
    enableMessageNotification: true,
    notificationCooldown: 7200,
    maxNotificationsPerDay: 3,
    description: "监控周报生成任务，连续失败2次或超时15分钟时告警",
  },
  {
    id: "cache_warmup",
    label: "缓存预热任务",
    icon: Zap,
    taskName: "cache-warmup",
    taskType: "cache_warmup",
    consecutiveFailureThreshold: 5,
    timeoutThreshold: 300,
    alertSeverity: "low",
    enableEmailNotification: false,
    enableMessageNotification: true,
    notificationCooldown: 1800,
    maxNotificationsPerDay: 10,
    description: "监控缓存预热任务，连续失败5次或超时5分钟时告警",
  },
  {
    id: "data_backup",
    label: "数据备份任务",
    icon: Database,
    taskName: "data-backup",
    taskType: "data_backup",
    consecutiveFailureThreshold: 1,
    timeoutThreshold: 1800,
    alertSeverity: "critical",
    enableEmailNotification: true,
    enableMessageNotification: true,
    notificationCooldown: 3600,
    maxNotificationsPerDay: 5,
    description: "监控数据备份任务，任何失败立即告警，超时30分钟告警",
  },
  {
    id: "ab_test",
    label: "A/B测试决策",
    icon: FlaskConical,
    taskName: "ab-test-decision",
    taskType: "ab_test_decision",
    consecutiveFailureThreshold: 3,
    timeoutThreshold: 300,
    alertSeverity: "medium",
    enableEmailNotification: true,
    enableMessageNotification: true,
    notificationCooldown: 3600,
    maxNotificationsPerDay: 5,
    description: "监控A/B测试决策任务，连续失败3次或超时5分钟时告警",
  },
  {
    id: "cleanup",
    label: "清理任务",
    icon: Trash2,
    taskName: "cleanup-task",
    taskType: "cleanup",
    consecutiveFailureThreshold: 5,
    timeoutThreshold: 600,
    alertSeverity: "low",
    enableEmailNotification: false,
    enableMessageNotification: true,
    notificationCooldown: 7200,
    maxNotificationsPerDay: 3,
    description: "监控清理任务，连续失败5次或超时10分钟时告警",
  },
];

interface AlertConfigFormData {
  taskName: string;
  taskType: string;
  consecutiveFailureThreshold: number;
  timeoutThreshold: number;
  alertSeverity: string;
  enableEmailNotification: boolean;
  enableMessageNotification: boolean;
  emailRecipients: string[];
  notificationCooldown: number;
  maxNotificationsPerDay: number;
  description: string;
}

export default function AlertConfigManagement() {
  const [activeTab, setActiveTab] = useState("configs");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [alertFilter, setAlertFilter] = useState({
    status: "all",
    severity: "all",
  });
  const [formData, setFormData] = useState<AlertConfigFormData>({
    taskName: "",
    taskType: "custom",
    consecutiveFailureThreshold: 3,
    timeoutThreshold: 300,
    alertSeverity: "medium",
    enableEmailNotification: true,
    enableMessageNotification: true,
    emailRecipients: [],
    notificationCooldown: 3600,
    maxNotificationsPerDay: 10,
    description: "",
  });
  const [emailInput, setEmailInput] = useState("");

  const utils = trpc.useUtils();

  // 查询告警配置列表
  const { data: alertConfigs, isLoading: configsLoading } = trpc.taskAlert.getAlertConfigs.useQuery({});

  // 查询告警列表
  const { data: alerts, isLoading: alertsLoading } = trpc.taskAlert.getAlerts.useQuery({
    status: alertFilter.status === "all" ? undefined : alertFilter.status,
    severity: alertFilter.severity === "all" ? undefined : alertFilter.severity,
    limit: 50,
  });

  // 查询待处理告警数量
  const { data: pendingCount } = trpc.taskAlert.getPendingAlertsCount.useQuery();

  // 查询任务状态
  const { data: taskStatuses } = trpc.taskAlert.getAllTaskStatus.useQuery();

  // 查询任务状态统计
  const { data: statusStats } = trpc.taskAlert.getTaskStatusStats.useQuery();

  // 查询告警统计
  const { data: alertStats } = trpc.taskAlert.getAlertStats.useQuery({ days: 7 });

  // 创建告警配置
  const createMutation = trpc.taskAlert.createAlertConfig.useMutation({
    onSuccess: () => {
      toast.success("告警配置创建成功");
      setIsCreateDialogOpen(false);
      resetForm();
      utils.taskAlert.getAlertConfigs.invalidate();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新告警配置
  const updateMutation = trpc.taskAlert.updateAlertConfig.useMutation({
    onSuccess: () => {
      toast.success("告警配置更新成功");
      setIsEditDialogOpen(false);
      resetForm();
      utils.taskAlert.getAlertConfigs.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除告警配置
  const deleteMutation = trpc.taskAlert.deleteAlertConfig.useMutation({
    onSuccess: () => {
      toast.success("告警配置删除成功");
      utils.taskAlert.getAlertConfigs.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 确认告警
  const acknowledgeMutation = trpc.taskAlert.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("告警已确认");
      utils.taskAlert.getAlerts.invalidate();
      utils.taskAlert.getPendingAlertsCount.invalidate();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 解决告警
  const resolveMutation = trpc.taskAlert.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("告警已解决");
      utils.taskAlert.getAlerts.invalidate();
      utils.taskAlert.getPendingAlertsCount.invalidate();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 忽略告警
  const ignoreMutation = trpc.taskAlert.ignoreAlert.useMutation({
    onSuccess: () => {
      toast.success("告警已忽略");
      utils.taskAlert.getAlerts.invalidate();
      utils.taskAlert.getPendingAlertsCount.invalidate();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      taskName: "",
      taskType: "custom",
      consecutiveFailureThreshold: 3,
      timeoutThreshold: 300,
      alertSeverity: "medium",
      enableEmailNotification: true,
      enableMessageNotification: true,
      emailRecipients: [],
      notificationCooldown: 3600,
      maxNotificationsPerDay: 10,
      description: "",
    });
    setEmailInput("");
    setSelectedConfigId(null);
  };

  const handleCreate = () => {
    if (!formData.taskName.trim()) {
      toast.error("请输入任务名称");
      return;
    }
    createMutation.mutate({
      ...formData,
      taskType: formData.taskType as any,
      alertSeverity: formData.alertSeverity as any,
    });
  };

  const handleUpdate = () => {
    if (!selectedConfigId) return;
    updateMutation.mutate({
      id: selectedConfigId,
      data: {
        taskName: formData.taskName,
        consecutiveFailureThreshold: formData.consecutiveFailureThreshold,
        timeoutThreshold: formData.timeoutThreshold,
        alertSeverity: formData.alertSeverity as any,
        enableEmailNotification: formData.enableEmailNotification,
        enableMessageNotification: formData.enableMessageNotification,
        emailRecipients: formData.emailRecipients,
        notificationCooldown: formData.notificationCooldown,
        maxNotificationsPerDay: formData.maxNotificationsPerDay,
        description: formData.description,
      },
    });
  };

  const handleEdit = (config: any) => {
    setSelectedConfigId(config.id);
    setFormData({
      taskName: config.taskName,
      taskType: config.taskType,
      consecutiveFailureThreshold: config.consecutiveFailureThreshold,
      timeoutThreshold: config.timeoutThreshold,
      alertSeverity: config.alertSeverity,
      enableEmailNotification: config.enableEmailNotification === 1,
      enableMessageNotification: config.enableMessageNotification === 1,
      emailRecipients: config.emailRecipients ? JSON.parse(config.emailRecipients) : [],
      notificationCooldown: config.notificationCooldown,
      maxNotificationsPerDay: config.maxNotificationsPerDay,
      description: config.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个告警配置吗？")) {
      deleteMutation.mutate({ id });
    }
  };

  const addEmail = () => {
    if (emailInput.trim() && !formData.emailRecipients.includes(emailInput.trim())) {
      setFormData({
        ...formData,
        emailRecipients: [...formData.emailRecipients, emailInput.trim()],
      });
      setEmailInput("");
    }
  };

  const removeEmail = (email: string) => {
    setFormData({
      ...formData,
      emailRecipients: formData.emailRecipients.filter((e) => e !== email),
    });
  };

  const getSeverityBadge = (severity: string) => {
    const config = SEVERITY_LEVELS.find((s) => s.value === severity);
    if (!config) return null;
    return (
      <Badge variant="outline" className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const getHealthBadge = (health: string) => {
    const config = HEALTH_STATUS.find((h) => h.value === health);
    if (!config) return null;
    return (
      <Badge variant="outline" className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    const config = ALERT_STATUS.find((s) => s.value === status);
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  // SMTP状态查询
  const { data: smtpStatus } = trpc.taskAlert.getSmtpStatus.useQuery();

  // 测试SMTP配置
  const testSmtpMutation = trpc.taskAlert.testSmtpConfig.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  // 发送测试邮件
  const sendTestEmailMutation = trpc.taskAlert.sendTestAlertEmail.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`测试邮件发送成功，已发送 ${result.sentCount} 封`);
      } else {
        toast.error(`发送失败: ${result.errors.join(", ")}`);
      }
    },
    onError: (error) => {
      toast.error(`发送失败: ${error.message}`);
    },
  });

  const [testEmail, setTestEmail] = useState("");

  const SmtpSettingsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP邮件配置状态
          </CardTitle>
          <CardDescription>
            配置SMTP服务以启用邮件告警通知功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">配置状态</div>
              <div className="mt-1 flex items-center gap-2">
                {smtpStatus?.configured ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-500">已配置</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-500">未配置</span>
                  </>
                )}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">SMTP服务器</div>
              <div className="mt-1 font-medium">
                {smtpStatus?.host || "-"}
                {smtpStatus?.port && `:${smtpStatus.port}`}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">发件人名称</div>
              <div className="mt-1 font-medium">{smtpStatus?.fromName || "-"}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">发件人邮箱</div>
              <div className="mt-1 font-medium">{smtpStatus?.fromEmail || "-"}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => testSmtpMutation.mutate()}
              disabled={testSmtpMutation.isPending || !smtpStatus?.configured}
            >
              {testSmtpMutation.isPending ? "测试中..." : "测试连接"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>发送测试邮件</CardTitle>
          <CardDescription>
            发送一封测试告警邮件以验证配置是否正确
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="输入测试邮箱地址"
              className="max-w-sm"
            />
            <Button
              onClick={() => {
                if (!testEmail.trim()) {
                  toast.error("请输入邮箱地址");
                  return;
                }
                sendTestEmailMutation.mutate({ recipients: [testEmail] });
              }}
              disabled={sendTestEmailMutation.isPending || !smtpStatus?.configured}
            >
              {sendTestEmailMutation.isPending ? "发送中..." : "发送测试邮件"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>要启用邮件告警通知，请在系统环境变量中配置以下参数：</p>
            <div className="bg-muted p-4 rounded-lg font-mono text-xs space-y-1">
              <div>SMTP_HOST=smtp.example.com</div>
              <div>SMTP_PORT=587</div>
              <div>SMTP_SECURE=false</div>
              <div>SMTP_USER=your-email@example.com</div>
              <div>SMTP_PASS=your-password</div>
              <div>SMTP_FROM=noreply@example.com</div>
              <div>SMTP_FROM_NAME=错题分析学习系统</div>
            </div>
            <p className="mt-4">常用SMTP服务配置：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Gmail: smtp.gmail.com, 端口 587, 需要应用专用密码</li>
              <li>QQ邮箱: smtp.qq.com, 端口 587, 需要授权码</li>
              <li>网易邮箱: smtp.163.com, 端口 465 (SSL), 需要授权码</li>
              <li>阿里云邮件: smtp.aliyun.com, 端口 465 (SSL)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ConfigForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>任务名称 *</Label>
          <Input
            value={formData.taskName}
            onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
            placeholder="输入任务名称"
          />
        </div>
        <div className="space-y-2">
          <Label>任务类型</Label>
          <Select
            value={formData.taskType}
            onValueChange={(value) => setFormData({ ...formData, taskType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>连续失败阈值</Label>
          <Input
            type="number"
            min={1}
            value={formData.consecutiveFailureThreshold}
            onChange={(e) =>
              setFormData({ ...formData, consecutiveFailureThreshold: parseInt(e.target.value) || 3 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>超时阈值（秒）</Label>
          <Input
            type="number"
            min={1}
            value={formData.timeoutThreshold}
            onChange={(e) =>
              setFormData({ ...formData, timeoutThreshold: parseInt(e.target.value) || 300 })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>告警级别</Label>
          <Select
            value={formData.alertSeverity}
            onValueChange={(value) => setFormData({ ...formData, alertSeverity: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>通知冷却时间（秒）</Label>
          <Input
            type="number"
            min={60}
            value={formData.notificationCooldown}
            onChange={(e) =>
              setFormData({ ...formData, notificationCooldown: parseInt(e.target.value) || 3600 })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.enableEmailNotification}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enableEmailNotification: checked })
            }
          />
          <Label>启用邮件通知</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.enableMessageNotification}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enableMessageNotification: checked })
            }
          />
          <Label>启用消息通知</Label>
        </div>
      </div>
      {formData.enableEmailNotification && (
        <div className="space-y-2">
          <Label>邮件接收人</Label>
          <div className="flex gap-2">
            <Input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="输入邮箱地址"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
            />
            <Button type="button" onClick={addEmail} variant="outline">
              添加
            </Button>
          </div>
          {formData.emailRecipients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.emailRecipients.map((email) => (
                <Badge key={email} variant="secondary" className="flex items-center gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label>描述</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="告警配置描述..."
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              告警配置管理
            </h1>
            <p className="text-muted-foreground mt-1">
              配置和管理定时任务的告警规则
            </p>
          </div>
          {pendingCount !== undefined && pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {pendingCount} 个待处理告警
            </Badge>
          )}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                任务健康状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <span className="text-green-500">{statusStats?.healthy || 0} 健康</span>
                <span className="text-yellow-500">{statusStats?.warning || 0} 警告</span>
                <span className="text-red-500">{statusStats?.critical || 0} 严重</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                7天告警数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alertStats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                已解决
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {alertStats?.byStatus?.resolved || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                配置数量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alertConfigs?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="configs">告警配置</TabsTrigger>
            <TabsTrigger value="alerts">告警列表</TabsTrigger>
            <TabsTrigger value="status">任务状态</TabsTrigger>
            <TabsTrigger value="smtp">邮件设置</TabsTrigger>
          </TabsList>

          {/* 告警配置 */}
          <TabsContent value="configs" className="space-y-4">
            {/* 预设告警规则模板 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">快速创建告警规则</CardTitle>
                <CardDescription>选择预设模板快速创建常用告警规则</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PRESET_ALERT_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                      onClick={() => {
                        setFormData({
                          taskName: template.taskName,
                          taskType: template.taskType,
                          consecutiveFailureThreshold: template.consecutiveFailureThreshold,
                          timeoutThreshold: template.timeoutThreshold,
                          alertSeverity: template.alertSeverity,
                          enableEmailNotification: template.enableEmailNotification,
                          enableMessageNotification: template.enableMessageNotification,
                          emailRecipients: [],
                          notificationCooldown: template.notificationCooldown,
                          maxNotificationsPerDay: template.maxNotificationsPerDay,
                          description: template.description,
                        });
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <template.icon className="h-5 w-5 text-primary" />
                        <span className="font-medium">{template.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="mt-2 flex gap-2">
                        {getSeverityBadge(template.alertSeverity)}
                        <Badge variant="outline">失败{template.consecutiveFailureThreshold}次</Badge>
                        <Badge variant="outline">超时{template.timeoutThreshold}s</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    添加配置
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>添加告警配置</DialogTitle>
                    <DialogDescription>为定时任务配置告警规则</DialogDescription>
                  </DialogHeader>
                  <ConfigForm />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "创建中..." : "创建"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                {configsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : alertConfigs && alertConfigs.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>任务名称</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>失败阈值</TableHead>
                          <TableHead>超时阈值</TableHead>
                          <TableHead>告警级别</TableHead>
                          <TableHead>通知方式</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alertConfigs.map((config) => (
                          <TableRow key={config.id}>
                            <TableCell className="font-medium">{config.taskName}</TableCell>
                            <TableCell>
                              {TASK_TYPES.find((t) => t.value === config.taskType)?.label || config.taskType}
                            </TableCell>
                            <TableCell>{config.consecutiveFailureThreshold} 次</TableCell>
                            <TableCell>{config.timeoutThreshold} 秒</TableCell>
                            <TableCell>{getSeverityBadge(config.alertSeverity)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {config.enableEmailNotification === 1 && (
                                  <Mail className="h-4 w-4 text-blue-500" />
                                )}
                                {config.enableMessageNotification === 1 && (
                                  <MessageSquare className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {config.isActive === 1 ? (
                                <Badge variant="outline" className="bg-green-500 text-white">
                                  启用
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-500 text-white">
                                  禁用
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(config)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(config.id)}
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
                  <div className="text-center py-8 text-muted-foreground">暂无告警配置</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 告警列表 */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 mb-4">
                  <Select value={alertFilter.status} onValueChange={(v) => setAlertFilter({ ...alertFilter, status: v })}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      {ALERT_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={alertFilter.severity} onValueChange={(v) => setAlertFilter({ ...alertFilter, severity: v })}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="级别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部级别</SelectItem>
                      {SEVERITY_LEVELS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {alertsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : alerts && alerts.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>状态</TableHead>
                          <TableHead>任务名称</TableHead>
                          <TableHead>告警类型</TableHead>
                          <TableHead>级别</TableHead>
                          <TableHead>告警信息</TableHead>
                          <TableHead>时间</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alerts.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>{getStatusIcon(alert.status)}</TableCell>
                            <TableCell className="font-medium">{alert.taskName}</TableCell>
                            <TableCell>{alert.alertType}</TableCell>
                            <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {alert.alertMessage}
                            </TableCell>
                            <TableCell>
                              {new Date(alert.alertTime).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {alert.status === "pending" && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => acknowledgeMutation.mutate({ alertId: alert.id })}
                                  >
                                    确认
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resolveMutation.mutate({ alertId: alert.id })}
                                  >
                                    解决
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => ignoreMutation.mutate({ alertId: alert.id })}
                                  >
                                    忽略
                                  </Button>
                                </div>
                              )}
                              {alert.status === "acknowledged" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resolveMutation.mutate({ alertId: alert.id })}
                                >
                                  解决
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">暂无告警记录</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 任务状态 */}
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>任务执行状态</CardTitle>
                <CardDescription>监控所有定时任务的执行状态</CardDescription>
              </CardHeader>
              <CardContent>
                {taskStatuses && taskStatuses.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>任务名称</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>健康状态</TableHead>
                          <TableHead>最后执行</TableHead>
                          <TableHead>执行状态</TableHead>
                          <TableHead>成功/失败</TableHead>
                          <TableHead>连续失败</TableHead>
                          <TableHead>平均耗时</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taskStatuses.map((status) => (
                          <TableRow key={status.id}>
                            <TableCell className="font-medium">{status.taskName}</TableCell>
                            <TableCell>
                              {TASK_TYPES.find((t) => t.value === status.taskType)?.label || status.taskType}
                            </TableCell>
                            <TableCell>{getHealthBadge(status.healthStatus)}</TableCell>
                            <TableCell>
                              {status.lastExecutionTime
                                ? new Date(status.lastExecutionTime).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {status.lastExecutionStatus === "success" && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {status.lastExecutionStatus === "failed" && (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              {status.lastExecutionStatus === "running" && (
                                <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-green-500">{status.successfulExecutions}</span>
                              {" / "}
                              <span className="text-red-500">{status.failedExecutions}</span>
                            </TableCell>
                            <TableCell>
                              {status.consecutiveFailures > 0 ? (
                                <span className="text-red-500">{status.consecutiveFailures}</span>
                              ) : (
                                <span className="text-green-500">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {status.avgExecutionDuration
                                ? `${Math.round(status.avgExecutionDuration)}ms`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">暂无任务状态数据</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMTP邮件设置 */}
          <TabsContent value="smtp" className="space-y-4">
            <SmtpSettingsTab />
          </TabsContent>
        </Tabs>

        {/* 编辑对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑告警配置</DialogTitle>
              <DialogDescription>修改告警配置信息</DialogDescription>
            </DialogHeader>
            <ConfigForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
