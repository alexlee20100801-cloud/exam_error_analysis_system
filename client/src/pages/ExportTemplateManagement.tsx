import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Copy, Star, StarOff, Eye, Download, Settings2,
  FileText, BookOpen, ClipboardList, BarChart3, Loader2, Search,
  Globe, Lock, Zap, History, ChevronRight, Check, X
} from 'lucide-react';

// 模板类型图标映射
const templateTypeIcons: Record<string, any> = {
  error_book: BookOpen,
  review_card: ClipboardList,
  exam_paper: FileText,
  analysis_report: BarChart3,
  custom: Settings2,
};

// 模板类型名称映射
const templateTypeNames: Record<string, string> = {
  error_book: '错题本格式',
  review_card: '复习卡片',
  exam_paper: '试卷格式',
  analysis_report: '分析报告',
  custom: '自定义模板',
};

// 导出格式名称映射
const exportFormatNames: Record<string, string> = {
  pdf: 'PDF文档',
  word: 'Word文档',
  markdown: 'Markdown',
  html: 'HTML网页',
};

export default function ExportTemplateManagement() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('my-templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    templateType: 'error_book' as const,
    isPublic: false,
    exportFormat: 'pdf' as const,
    // 内容配置
    showQuestionNumber: true,
    showDifficulty: true,
    showKnowledgePoints: true,
    showAnswer: true,
    showExplanation: true,
    showErrorAnalysis: true,
    showSimilarQuestions: false,
    showStudyNotes: false,
    showReviewHistory: false,
    groupBySubject: false,
    groupByKnowledgePoint: false,
    // 样式配置
    paperSize: 'A4' as const,
    orientation: 'portrait' as 'portrait' | 'landscape',
    fontSize: 12,
    lineSpacing: 1.5,
    headerText: '',
    footerText: '',
    showPageNumber: true,
  });

  // 获取用户模板列表
  const { data: myTemplates, isLoading: loadingMyTemplates, refetch: refetchMyTemplates } = 
    trpc.exportTemplatesEnhanced.list.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取公开模板列表
  const { data: publicTemplates, isLoading: loadingPublicTemplates } = 
    trpc.exportTemplatesEnhanced.publicList.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取系统预设模板
  const { data: systemPresets, isLoading: loadingPresets } = 
    trpc.exportTemplatesEnhanced.systemPresets.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取快捷导出配置
  const { data: quickConfigs, refetch: refetchQuickConfigs } = 
    trpc.exportTemplatesEnhanced.listQuickConfigs.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取导出历史
  const { data: exportHistory } = 
    trpc.exportTemplatesEnhanced.history.useQuery({ limit: 10 }, {
      enabled: !!user,
    });

  // 获取导出统计
  const { data: exportStats } = 
    trpc.exportTemplatesEnhanced.statistics.useQuery(undefined, {
      enabled: !!user,
    });

  // 创建模板
  const createMutation = trpc.exportTemplatesEnhanced.create.useMutation({
    onSuccess: () => {
      toast.success('模板创建成功');
      setEditDialogOpen(false);
      resetForm();
      refetchMyTemplates();
    },
    onError: (err) => {
      toast.error(err.message || '创建失败');
    },
  });

  // 更新模板
  const updateMutation = trpc.exportTemplatesEnhanced.update.useMutation({
    onSuccess: () => {
      toast.success('模板更新成功');
      setEditDialogOpen(false);
      resetForm();
      refetchMyTemplates();
    },
    onError: (err) => {
      toast.error(err.message || '更新失败');
    },
  });

  // 删除模板
  const deleteMutation = trpc.exportTemplatesEnhanced.delete.useMutation({
    onSuccess: () => {
      toast.success('模板已删除');
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      refetchMyTemplates();
    },
    onError: (err) => {
      toast.error(err.message || '删除失败');
    },
  });

  // 复制模板
  const copyMutation = trpc.exportTemplatesEnhanced.copy.useMutation({
    onSuccess: () => {
      toast.success('模板复制成功');
      refetchMyTemplates();
    },
    onError: (err) => {
      toast.error(err.message || '复制失败');
    },
  });

  // 设置默认模板
  const setDefaultMutation = trpc.exportTemplatesEnhanced.setDefault.useMutation({
    onSuccess: () => {
      toast.success('已设为默认模板');
      refetchMyTemplates();
    },
    onError: (err) => {
      toast.error(err.message || '设置失败');
    },
  });

  // 创建快捷配置
  const createQuickConfigMutation = trpc.exportTemplatesEnhanced.createQuickConfig.useMutation({
    onSuccess: () => {
      toast.success('快捷导出配置已创建');
      refetchQuickConfigs();
    },
    onError: (err) => {
      toast.error(err.message || '创建失败');
    },
  });

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      templateType: 'error_book',
      isPublic: false,
      exportFormat: 'pdf',
      showQuestionNumber: true,
      showDifficulty: true,
      showKnowledgePoints: true,
      showAnswer: true,
      showExplanation: true,
      showErrorAnalysis: true,
      showSimilarQuestions: false,
      showStudyNotes: false,
      showReviewHistory: false,
      groupBySubject: false,
      groupByKnowledgePoint: false,
      paperSize: 'A4',
      orientation: 'portrait',
      fontSize: 12,
      lineSpacing: 1.5,
      headerText: '',
      footerText: '',
      showPageNumber: true,
    });
    setSelectedTemplate(null);
    setIsCreating(false);
  };

  // 打开编辑对话框
  const openEditDialog = (template?: any) => {
    if (template) {
      setSelectedTemplate(template);
      setIsCreating(false);
      setFormData({
        name: template.name || '',
        description: template.description || '',
        templateType: template.templateType || 'error_book',
        isPublic: template.isPublic || false,
        exportFormat: template.exportFormat || 'pdf',
        showQuestionNumber: template.contentConfig?.showQuestionNumber ?? true,
        showDifficulty: template.contentConfig?.showDifficulty ?? true,
        showKnowledgePoints: template.contentConfig?.showKnowledgePoints ?? true,
        showAnswer: template.contentConfig?.showAnswer ?? true,
        showExplanation: template.contentConfig?.showExplanation ?? true,
        showErrorAnalysis: template.contentConfig?.showErrorAnalysis ?? true,
        showSimilarQuestions: template.contentConfig?.showSimilarQuestions ?? false,
        showStudyNotes: template.contentConfig?.showStudyNotes ?? false,
        showReviewHistory: template.contentConfig?.showReviewHistory ?? false,
        groupBySubject: template.contentConfig?.groupBySubject ?? false,
        groupByKnowledgePoint: template.contentConfig?.groupByKnowledgePoint ?? false,
        paperSize: template.styleConfig?.paperSize || 'A4',
        orientation: template.styleConfig?.orientation || 'portrait',
        fontSize: template.styleConfig?.fontSize || 12,
        lineSpacing: template.styleConfig?.lineSpacing || 1.5,
        headerText: template.styleConfig?.headerText || '',
        footerText: template.styleConfig?.footerText || '',
        showPageNumber: template.styleConfig?.showPageNumber ?? true,
      });
    } else {
      resetForm();
      setIsCreating(true);
    }
    setEditDialogOpen(true);
  };

  // 保存模板
  const handleSave = () => {
    const templateData = {
      name: formData.name,
      description: formData.description,
      templateType: formData.templateType,
      isPublic: formData.isPublic,
      exportFormat: formData.exportFormat,
      contentConfig: {
        showQuestionNumber: formData.showQuestionNumber,
        showDifficulty: formData.showDifficulty,
        showKnowledgePoints: formData.showKnowledgePoints,
        showAnswer: formData.showAnswer,
        showExplanation: formData.showExplanation,
        showErrorAnalysis: formData.showErrorAnalysis,
        showSimilarQuestions: formData.showSimilarQuestions,
        showStudyNotes: formData.showStudyNotes,
        showReviewHistory: formData.showReviewHistory,
        groupBySubject: formData.groupBySubject,
        groupByKnowledgePoint: formData.groupByKnowledgePoint,
      },
      styleConfig: {
        paperSize: formData.paperSize,
        orientation: formData.orientation,
        fontSize: formData.fontSize,
        lineSpacing: formData.lineSpacing,
        headerText: formData.headerText,
        footerText: formData.footerText,
        showPageNumber: formData.showPageNumber,
      },
    };

    if (isCreating) {
      createMutation.mutate(templateData as any);
    } else if (selectedTemplate) {
      updateMutation.mutate({
        templateId: selectedTemplate.id,
        data: templateData as any,
      });
    }
  };

  // 过滤模板
  const filterTemplates = (templates: any[] | undefined) => {
    if (!templates) return [];
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.name?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  };

  // 渲染模板卡片
  const renderTemplateCard = (template: any, showActions = true) => {
    const TypeIcon = templateTypeIcons[template.templateType] || FileText;
    
    return (
      <Card key={template.id} className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TypeIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {template.name}
                  {template.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      默认
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {templateTypeNames[template.templateType] || '自定义'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {template.isPublic ? (
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  公开
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <Lock className="h-3 w-3 mr-1" />
                  私有
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description || '暂无描述'}
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {exportFormatNames[template.exportFormat] || 'PDF'}
            </Badge>
            {template.usageCount > 0 && (
              <span>使用 {template.usageCount} 次</span>
            )}
          </div>
        </CardContent>
        {showActions && (
          <CardFooter className="pt-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTemplate(template);
                setPreviewDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              预览
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(template)}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyMutation.mutate({ templateId: template.id })}
              disabled={copyMutation.isPending}
            >
              <Copy className="h-4 w-4 mr-1" />
              复制
            </Button>
            {!template.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDefaultMutation.mutate({ templateId: template.id })}
                disabled={setDefaultMutation.isPending}
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setSelectedTemplate(template);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  // 渲染公开模板卡片（只有复制按钮）
  const renderPublicTemplateCard = (template: any) => {
    const TypeIcon = templateTypeIcons[template.templateType] || FileText;
    
    return (
      <Card key={template.id} className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TypeIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {templateTypeNames[template.templateType] || '自定义'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description || '暂无描述'}
          </p>
        </CardContent>
        <CardFooter className="pt-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedTemplate(template);
              setPreviewDialogOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            预览
          </Button>
          <Button
            size="sm"
            onClick={() => copyMutation.mutate({ templateId: template.id })}
            disabled={copyMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-1" />
            复制到我的模板
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">导出模板管理</h1>
            <p className="text-muted-foreground mt-1">
              创建和管理错题导出模板，自定义导出格式和样式
            </p>
          </div>
          <Button onClick={() => openEditDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            创建模板
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>我的模板</CardDescription>
              <CardTitle className="text-2xl">{myTemplates?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>快捷配置</CardDescription>
              <CardTitle className="text-2xl">{quickConfigs?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>导出题数</CardDescription>
              <CardTitle className="text-2xl">{exportStats?.totalQuestions || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>总导出次数</CardDescription>
              <CardTitle className="text-2xl">{exportStats?.totalExports || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-templates">我的模板</TabsTrigger>
            <TabsTrigger value="quick-export">快捷导出</TabsTrigger>
            <TabsTrigger value="public-templates">公开模板</TabsTrigger>
            <TabsTrigger value="system-presets">系统预设</TabsTrigger>
            <TabsTrigger value="export-history">导出历史</TabsTrigger>
          </TabsList>

          {/* 我的模板 */}
          <TabsContent value="my-templates" className="mt-6">
            {loadingMyTemplates ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-24 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filterTemplates(myTemplates).length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无模板</h3>
                <p className="text-muted-foreground mb-4">
                  创建您的第一个导出模板，自定义错题导出格式
                </p>
                <Button onClick={() => openEditDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建模板
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterTemplates(myTemplates).map((template: any) => renderTemplateCard(template))}
              </div>
            )}
          </TabsContent>

          {/* 快捷导出 */}
          <TabsContent value="quick-export" className="mt-6">
            <div className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  快捷导出配置可以让您一键使用指定模板导出错题，支持设置快捷键和工具栏显示。
                </AlertDescription>
              </Alert>
              
              {quickConfigs && quickConfigs.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {quickConfigs.map((config: any) => (
                    <Card key={config.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{config.name}</CardTitle>
                          {config.showInToolbar && (
                            <Badge variant="secondary" className="text-xs">工具栏</Badge>
                          )}
                        </div>
                        {config.shortcutKey && (
                          <CardDescription className="text-xs">
                            快捷键: {config.shortcutKey}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardFooter className="pt-0">
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          快速导出
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Zap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-2">暂无快捷配置</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    从我的模板中选择一个模板创建快捷导出配置
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 公开模板 */}
          <TabsContent value="public-templates" className="mt-6">
            {loadingPublicTemplates ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filterTemplates(publicTemplates).length === 0 ? (
              <Card className="p-12 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无公开模板</h3>
                <p className="text-muted-foreground">
                  其他用户分享的模板将显示在这里
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterTemplates(publicTemplates).map((template: any) => renderPublicTemplateCard(template))}
              </div>
            )}
          </TabsContent>

          {/* 系统预设 */}
          <TabsContent value="system-presets" className="mt-6">
            {loadingPresets ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : systemPresets && systemPresets.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {systemPresets.map((template: any) => renderPublicTemplateCard(template))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Settings2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无系统预设</h3>
                <p className="text-muted-foreground">
                  系统预设模板将在后续更新中添加
                </p>
              </Card>
            )}
          </TabsContent>

          {/* 导出历史 */}
          <TabsContent value="export-history" className="mt-6">
            {exportHistory && exportHistory.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">最近导出记录</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {exportHistory.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{record.templateName || '未命名模板'}</p>
                            <p className="text-xs text-muted-foreground">
                              {record.questionCount} 道题目 · {exportFormatNames[record.exportFormat] || 'PDF'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={record.status === 'success' ? 'secondary' : 'destructive'}>
                            {record.status === 'success' ? '成功' : '失败'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(record.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无导出记录</h3>
                <p className="text-muted-foreground">
                  您的导出历史将显示在这里
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 编辑/创建对话框 - 带实时预览 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{isCreating ? '创建模板' : '编辑模板'}</DialogTitle>
              <DialogDescription>
                {isCreating ? '创建一个新的导出模板' : '修改模板配置'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-6 py-4 h-[calc(90vh-180px)]">
              {/* 左侧配置面板 */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="font-medium">基本信息</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">模板名称</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="输入模板名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="templateType">模板类型</Label>
                    <Select
                      value={formData.templateType}
                      onValueChange={(value: any) => setFormData({ ...formData, templateType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error_book">错题本格式</SelectItem>
                        <SelectItem value="review_card">复习卡片</SelectItem>
                        <SelectItem value="exam_paper">试卷格式</SelectItem>
                        <SelectItem value="analysis_report">分析报告</SelectItem>
                        <SelectItem value="custom">自定义模板</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">模板描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述模板用途和特点"
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="exportFormat">导出格式</Label>
                    <Select
                      value={formData.exportFormat}
                      onValueChange={(value: any) => setFormData({ ...formData, exportFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF文档</SelectItem>
                        <SelectItem value="word">Word文档</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="html">HTML网页</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>公开模板</Label>
                      <p className="text-xs text-muted-foreground">允许其他用户查看和复制</p>
                    </div>
                    <Switch
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 内容配置 */}
              <div className="space-y-4">
                <h4 className="font-medium">内容配置</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { key: 'showQuestionNumber', label: '显示题号' },
                    { key: 'showDifficulty', label: '显示难度' },
                    { key: 'showKnowledgePoints', label: '显示知识点' },
                    { key: 'showAnswer', label: '显示答案' },
                    { key: 'showExplanation', label: '显示解析' },
                    { key: 'showErrorAnalysis', label: '显示错因分析' },
                    { key: 'showSimilarQuestions', label: '显示相似题' },
                    { key: 'showStudyNotes', label: '显示学习笔记' },
                    { key: 'showReviewHistory', label: '显示复习历史' },
                    { key: 'groupBySubject', label: '按学科分组' },
                    { key: 'groupByKnowledgePoint', label: '按知识点分组' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded">
                      <Label className="text-sm">{label}</Label>
                      <Switch
                        checked={(formData as any)[key]}
                        onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 样式配置 */}
              <div className="space-y-4">
                <h4 className="font-medium">样式配置</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>纸张大小</Label>
                    <Select
                      value={formData.paperSize}
                      onValueChange={(value: any) => setFormData({ ...formData, paperSize: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="A5">A5</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>页面方向</Label>
                    <Select
                      value={formData.orientation}
                      onValueChange={(value: any) => setFormData({ ...formData, orientation: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">纵向</SelectItem>
                        <SelectItem value="landscape">横向</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>字体大小</Label>
                    <Input
                      type="number"
                      value={formData.fontSize}
                      onChange={(e) => setFormData({ ...formData, fontSize: parseInt(e.target.value) || 12 })}
                      min={8}
                      max={24}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>页眉文字</Label>
                    <Input
                      value={formData.headerText}
                      onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                      placeholder="可选，如：我的错题本"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>页脚文字</Label>
                    <Input
                      value={formData.footerText}
                      onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                      placeholder="可选，如：第 {page} 页"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>显示页码</Label>
                    <p className="text-xs text-muted-foreground">在页脚显示页码</p>
                  </div>
                  <Switch
                    checked={formData.showPageNumber}
                    onCheckedChange={(checked) => setFormData({ ...formData, showPageNumber: checked })}
                  />
                </div>
              </div>
                </div>
              </ScrollArea>
              
              {/* 右侧实时预览面板 */}
              <div className="w-80 flex-shrink-0 border-l pl-4">
                <div className="sticky top-0">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    实时预览
                  </h4>
                  <div className="text-xs text-muted-foreground mb-3">
                    配置更改将实时反映在预览中
                  </div>
                  <Card className={`p-4 bg-white dark:bg-gray-900 shadow-md ${
                    formData.orientation === 'landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'
                  } overflow-hidden`}>
                    <div className="h-full flex flex-col" style={{ fontSize: `${Math.max(8, formData.fontSize * 0.6)}px` }}>
                      {/* 页眉 */}
                      {formData.headerText && (
                        <div className="text-center border-b pb-2 mb-2 font-bold" style={{ fontSize: `${Math.max(10, formData.fontSize * 0.8)}px` }}>
                          {formData.headerText}
                        </div>
                      )}
                      
                      {/* 内容区域 */}
                      <div className="flex-1 overflow-hidden space-y-2">
                        {/* 示例题目1 */}
                        <div className="p-2 border rounded bg-muted/30">
                          <div className="flex items-center gap-1 mb-1">
                            {formData.showQuestionNumber && (
                              <span className="bg-primary text-primary-foreground px-1 rounded text-xs">1</span>
                            )}
                            <span className="font-medium truncate">示例题目</span>
                            {formData.showDifficulty && (
                              <span className="text-xs text-orange-500">中等</span>
                            )}
                          </div>
                          <p className="text-muted-foreground truncate mb-1">
                            已知函数 f(x) = x² + 2x + 1，求 f(2) 的值。
                          </p>
                          {formData.showKnowledgePoints && (
                            <div className="flex gap-1 mb-1">
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">二次函数</span>
                            </div>
                          )}
                          {formData.showAnswer && (
                            <div className="bg-green-50 dark:bg-green-950 p-1 rounded text-xs">
                              <span className="font-medium">答案：</span>9
                            </div>
                          )}
                          {formData.showExplanation && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">解析：</span>f(2) = 4+4+1 = 9
                            </div>
                          )}
                          {formData.showErrorAnalysis && (
                            <div className="text-xs text-red-500 mt-1">
                              <span className="font-medium">错因：</span>计算粗心
                            </div>
                          )}
                        </div>
                        
                        {/* 示例题目2 */}
                        <div className="p-2 border rounded bg-muted/30">
                          <div className="flex items-center gap-1 mb-1">
                            {formData.showQuestionNumber && (
                              <span className="bg-primary text-primary-foreground px-1 rounded text-xs">2</span>
                            )}
                            <span className="font-medium truncate">示例题目</span>
                            {formData.showDifficulty && (
                              <span className="text-xs text-red-500">困难</span>
                            )}
                          </div>
                          <p className="text-muted-foreground truncate">
                            求不等式 x² - 3x + 2 &lt; 0 的解集...
                          </p>
                        </div>
                        
                        {formData.showSimilarQuestions && (
                          <div className="text-xs p-1 bg-purple-50 dark:bg-purple-950 rounded">
                            📚 相似题: 3道
                          </div>
                        )}
                        {formData.showStudyNotes && (
                          <div className="text-xs p-1 bg-yellow-50 dark:bg-yellow-950 rounded">
                            📝 学习笔记: 注意公式变形
                          </div>
                        )}
                        {formData.showReviewHistory && (
                          <div className="text-xs p-1 bg-gray-50 dark:bg-gray-800 rounded">
                            📅 复习: 3次 | 上次: 1天前
                          </div>
                        )}
                      </div>
                      
                      {/* 页脚 */}
                      {(formData.showPageNumber || formData.footerText) && (
                        <div className="text-center border-t pt-2 mt-2 text-muted-foreground">
                          {formData.footerText || '第 1 页'}
                        </div>
                      )}
                    </div>
                  </Card>
                  
                  {/* 预览信息 */}
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>纸张大小:</span>
                      <span>{formData.paperSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>页面方向:</span>
                      <span>{formData.orientation === 'portrait' ? '纵向' : '横向'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>字体大小:</span>
                      <span>{formData.fontSize}px</span>
                    </div>
                    <div className="flex justify-between">
                      <span>导出格式:</span>
                      <span>{exportFormatNames[formData.exportFormat]}</span>
                    </div>
                    {formData.groupBySubject && (
                      <div className="text-blue-500">✓ 按学科分组</div>
                    )}
                    {formData.groupByKnowledgePoint && (
                      <div className="text-blue-500">✓ 按知识点分组</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isCreating ? '创建' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除模板 "{selectedTemplate?.name}" 吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedTemplate && deleteMutation.mutate({ templateId: selectedTemplate.id })}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 预览对话框 */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>模板预览</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Card className="p-6 bg-muted/30">
                <div className="space-y-4">
                  <div className="text-center border-b pb-4">
                    <h3 className="text-lg font-bold">
                      {selectedTemplate?.styleConfig?.headerText || '错题本'}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg bg-background">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>1</Badge>
                        <span className="font-medium">示例题目</span>
                        {selectedTemplate?.contentConfig?.showDifficulty && (
                          <Badge variant="outline">中等</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        已知函数 f(x) = x² + 2x + 1，求 f(2) 的值。
                      </p>
                      {selectedTemplate?.contentConfig?.showKnowledgePoints && (
                        <div className="flex gap-1 mb-2">
                          <Badge variant="secondary" className="text-xs">二次函数</Badge>
                          <Badge variant="secondary" className="text-xs">函数求值</Badge>
                        </div>
                      )}
                      {selectedTemplate?.contentConfig?.showAnswer && (
                        <div className="mt-3 p-3 bg-muted rounded">
                          <p className="text-sm font-medium">答案：9</p>
                        </div>
                      )}
                      {selectedTemplate?.contentConfig?.showExplanation && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <p className="font-medium">解析：</p>
                          <p>f(2) = 2² + 2×2 + 1 = 4 + 4 + 1 = 9</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTemplate?.styleConfig?.showPageNumber && (
                    <div className="text-center text-sm text-muted-foreground border-t pt-4">
                      第 1 页
                    </div>
                  )}
                </div>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                关闭
              </Button>
              <Button onClick={() => copyMutation.mutate({ templateId: selectedTemplate?.id })}>
                <Copy className="h-4 w-4 mr-2" />
                复制模板
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
