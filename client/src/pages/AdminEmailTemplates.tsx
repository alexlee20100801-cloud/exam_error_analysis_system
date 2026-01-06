import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Mail, Edit, Eye, RefreshCw, Plus, Code, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminEmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");

  const [formData, setFormData] = useState({
    id: undefined as number | undefined,
    templateType: "",
    name: "",
    description: "",
    subject: "",
    htmlContent: "",
    isActive: true,
  });

  const utils = trpc.useUtils();

  // 获取所有模板
  const templatesQuery = trpc.emailTemplate.getAll.useQuery();

  // 初始化默认模板
  const initDefaultsMutation = trpc.emailTemplate.initializeDefaults.useMutation({
    onSuccess: () => {
      alert("默认模板初始化成功！");
      utils.emailTemplate.getAll.invalidate();
    },
  });

  // 保存模板
  const saveMutation = trpc.emailTemplate.save.useMutation({
    onSuccess: () => {
      alert("模板保存成功！");
      utils.emailTemplate.getAll.invalidate();
      setIsEditing(false);
      resetForm();
    },
  });

  // 删除模板
  const deleteMutation = trpc.emailTemplate.delete.useMutation({
    onSuccess: () => {
      alert("模板删除成功！");
      utils.emailTemplate.getAll.invalidate();
    },
  });

  // 预览模板
  const previewMutation = trpc.emailTemplate.preview.useMutation({
    onSuccess: (data) => {
      setPreviewSubject(data.subject);
      setPreviewHtml(data.htmlContent);
      setIsPreview(true);
    },
  });

  const resetForm = () => {
    setFormData({
      id: undefined,
      templateType: "",
      name: "",
      description: "",
      subject: "",
      htmlContent: "",
      isActive: true,
    });
    setSelectedTemplate(null);
  };

  const handleEdit = (template: any) => {
    setFormData({
      id: template.id,
      templateType: template.templateType,
      name: template.name,
      description: template.description || "",
      subject: template.subject,
      htmlContent: template.htmlContent,
      isActive: template.isActive,
    });
    setSelectedTemplate(template);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.templateType || !formData.name || !formData.subject || !formData.htmlContent) {
      alert("请填写所有必填字段");
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleDelete = (template: any) => {
    if (template.isDefault) {
      alert("不能删除系统默认模板");
      return;
    }

    if (!confirm(`确定要删除模板"${template.name}"吗？`)) {
      return;
    }

    deleteMutation.mutate({ id: template.id });
  };

  const handlePreview = () => {
    if (!formData.subject || !formData.htmlContent || !formData.templateType) {
      alert("请先填写主题、内容和模板类型");
      return;
    }

    previewMutation.mutate({
      subject: formData.subject,
      htmlContent: formData.htmlContent,
      templateType: formData.templateType,
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("htmlContent") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.htmlContent;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + `{{${variable}}}` + after;

    setFormData({ ...formData, htmlContent: newText });

    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
    }, 0);
  };

  // 获取模板类型的可用变量
  const getAvailableVariables = (templateType: string): string[] => {
    const variablesMap: Record<string, string[]> = {
      email_verification: ["userName", "userEmail", "verificationUrl", "expiryHours", "systemName"],
      review_reminder: ["userName", "taskTitle", "taskDescription", "scheduledDate", "taskUrl", "systemName"],
      system_notification: ["userName", "notificationTitle", "notificationContent", "actionUrl", "systemName"],
      welcome: ["userName", "userEmail", "loginUrl", "systemName"],
    };
    return variablesMap[templateType] || [];
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Mail className="h-8 w-8 text-purple-500" />
              邮件模板管理
            </h1>
            <p className="text-muted-foreground mt-2">
              自定义系统邮件模板，支持HTML和变量替换
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => initDefaultsMutation.mutate()}
              disabled={initDefaultsMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              初始化默认模板
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建模板
            </Button>
          </div>
        </div>

        {/* 模板列表 */}
        <div className="grid gap-4">
          {templatesQuery.data?.map((template) => (
            <Card key={template.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">{template.name}</h3>
                    {template.isDefault && (
                      <Badge variant="secondary">系统默认</Badge>
                    )}
                    {!template.isActive && (
                      <Badge variant="outline">已禁用</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>类型: {template.templateType}</span>
                    <span>主题: {template.subject}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    更新时间: {new Date(template.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                  {!template.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      disabled={deleteMutation.isPending}
                    >
                      删除
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {templatesQuery.data?.length === 0 && (
            <Card className="p-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无邮件模板</h3>
              <p className="text-muted-foreground mb-4">
                点击"初始化默认模板"创建系统默认模板
              </p>
              <Button onClick={() => initDefaultsMutation.mutate()}>
                初始化默认模板
              </Button>
            </Card>
          )}
        </div>

        {/* 编辑对话框 */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {formData.id ? "编辑模板" : "新建模板"}
              </DialogTitle>
              <DialogDescription>
                自定义邮件模板，使用 {`{{variable}}`} 语法插入变量
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="templateType">模板类型 *</Label>
                  <Select
                    value={formData.templateType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, templateType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模板类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email_verification">邮箱验证</SelectItem>
                      <SelectItem value="review_reminder">复习提醒</SelectItem>
                      <SelectItem value="system_notification">系统通知</SelectItem>
                      <SelectItem value="welcome">欢迎邮件</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="name">模板名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="例如：邮箱验证邮件"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">模板描述</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="简要描述模板用途"
                />
              </div>

              <div>
                <Label htmlFor="subject">邮件主题 *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="例如：验证您的邮箱地址 - {{systemName}}"
                />
              </div>

              {/* 可用变量 */}
              {formData.templateType && (
                <div>
                  <Label className="mb-2 block">可用变量</Label>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableVariables(formData.templateType).map((variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable)}
                        type="button"
                      >
                        <Code className="h-3 w-3 mr-1" />
                        {`{{${variable}}}`}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="htmlContent">邮件内容 (HTML) *</Label>
                <Textarea
                  id="htmlContent"
                  value={formData.htmlContent}
                  onChange={(e) =>
                    setFormData({ ...formData, htmlContent: e.target.value })
                  }
                  placeholder="输入HTML格式的邮件内容..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  启用此模板
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={previewMutation.isPending}
              >
                <Eye className="h-4 w-4 mr-2" />
                预览
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 预览对话框 */}
        <Dialog open={isPreview} onOpenChange={setIsPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>邮件预览</DialogTitle>
              <DialogDescription>
                使用示例数据预览邮件效果
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>邮件主题</Label>
                <div className="p-3 bg-muted rounded-md mt-2">
                  <Type className="h-4 w-4 inline mr-2" />
                  {previewSubject}
                </div>
              </div>

              <div>
                <Label>邮件内容</Label>
                <div
                  className="mt-2 border rounded-md p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setIsPreview(false)}>关闭</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
