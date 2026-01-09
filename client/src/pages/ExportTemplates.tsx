import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileText, Loader2, CheckCircle2, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExportTemplatesProps {
  selectedQuestionIds: number[];
  onClose?: () => void;
}

export default function ExportTemplates({ selectedQuestionIds, onClose }: ExportTemplatesProps) {
  const [, setLocation] = useLocation();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [previewTemplate, setPreviewTemplate] = useState<string>('error_book');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // 快捷模板
  const quickTemplates = [
    {
      id: 'error_book',
      name: '错题本格式',
      description: '传统错题本样式，包含题目、答案、解析，适合打印装订',
      icon: '📖',
      features: ['完整题目信息', '清晰的答案对比', '详细解析', '适合打印']
    },
    {
      id: 'review_card',
      name: '复习卡片格式',
      description: '简洁的卡片式布局，便于快速复习和记忆',
      icon: '🎴',
      features: ['简洁布局', '答案折叠', '快速浏览', '便于复习']
    },
    {
      id: 'detailed_analysis',
      name: '详细分析格式',
      description: '包含知识点、难度、统计信息的完整报告',
      icon: '📊',
      features: ['统计分析', '学科分布', '知识点分析', '完整报告']
    }
  ];

  const exportMutation = trpc.exportTemplates.exportWithTemplate.useMutation();

  // 生成示例预览内容
  const generateSamplePreview = (templateId: string): string => {
    const sampleQuestion = {
      title: '二次函数的应用',
      content: '已知二次函数 $f(x) = ax^2 + bx + c$ 的图像经过点 $(1, 2)$，且对称轴为 $x = 2$，求该二次函数的解析式。',
      userAnswer: '$f(x) = x^2 + 2x + 1$',
      correctAnswer: '$f(x) = -\\frac{1}{2}x^2 + 2x + \\frac{1}{2}$',
      explanation: '根据对称轴为 $x = 2$，可设 $f(x) = a(x-2)^2 + k$，将点 $(1, 2)$ 代入求解。',
      subject: '数学',
      grade: '高一',
      difficulty: '中等'
    };

    switch (templateId) {
      case 'error_book':
        return `# 错题本\n\n## 题目 1: ${sampleQuestion.title}\n\n**学科：** ${sampleQuestion.subject} | **年级：** ${sampleQuestion.grade} | **难度：** ${sampleQuestion.difficulty}\n\n### 题目内容\n\n${sampleQuestion.content}\n\n### 我的答案\n\n${sampleQuestion.userAnswer}\n\n### 正确答案\n\n${sampleQuestion.correctAnswer}\n\n### 详细解析\n\n${sampleQuestion.explanation}\n\n---\n`;
      
      case 'review_card':
        return `# 复习卡片\n\n## 📝 ${sampleQuestion.title}\n\n> **${sampleQuestion.subject}** · ${sampleQuestion.grade} · ${sampleQuestion.difficulty}\n\n### 题目\n\n${sampleQuestion.content}\n\n<details>\n<summary>点击查看答案</summary>\n\n**正确答案：** ${sampleQuestion.correctAnswer}\n\n**解析：** ${sampleQuestion.explanation}\n\n</details>\n\n---\n`;
      
      case 'detailed_analysis':
        return `# 详细分析报告\n\n## 统计信息\n\n- **总题数：** 1 道\n- **学科分布：** ${sampleQuestion.subject} (100%)\n- **难度分布：** ${sampleQuestion.difficulty} (100%)\n\n## 题目详情\n\n### 1. ${sampleQuestion.title}\n\n**基本信息**\n- 学科：${sampleQuestion.subject}\n- 年级：${sampleQuestion.grade}\n- 难度：${sampleQuestion.difficulty}\n\n**题目内容**\n\n${sampleQuestion.content}\n\n**答案对比**\n\n| 项目 | 内容 |\n|------|------|\n| 我的答案 | ${sampleQuestion.userAnswer} |\n| 正确答案 | ${sampleQuestion.correctAnswer} |\n\n**详细解析**\n\n${sampleQuestion.explanation}\n\n---\n`;
      
      default:
        return '请选择一个模板查看预览';
    }
  };

  const handleExport = async (templateId: string) => {
    if (selectedQuestionIds.length === 0) {
      toast.error('请先选择要导出的题目');
      return;
    }

    setIsExporting(true);
    setSelectedTemplate(templateId);

    try {
      const result = await exportMutation.mutateAsync({
        questionIds: selectedQuestionIds,
        template: templateId as any
      });

      if (result.success && result.content) {
        // 创建下载链接
        const blob = new Blob([result.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || 'export.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('导出成功', {
          description: `已下载 ${result.filename}`
        });

        if (onClose) {
          onClose();
        }
      } else {
        toast.error('导出失败', {
          description: result.error || '请重试'
        });
      }
    } catch (error: any) {
      toast.error('导出失败', {
        description: error.message || '请重试'
      });
    } finally {
      setIsExporting(false);
      setSelectedTemplate('');
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">选择导出模板</h1>
        <p className="text-muted-foreground mt-2">
          已选择 {selectedQuestionIds.length} 道题目
        </p>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          💡 提示：选择合适的模板格式导出错题。导出后可以使用Markdown编辑器查看，或转换为PDF、Word等格式。
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="templates" className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates">模板选择</TabsTrigger>
          <TabsTrigger value="preview">实时预览</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quickTemplates.map((template: any) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{template.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                </div>
                {selectedTemplate === template.id && isExporting && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
              </div>
              <CardDescription className="mt-2">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {template.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>

                <Button
                  onClick={() => handleExport(template.id)}
                  disabled={isExporting || selectedQuestionIds.length === 0}
                  className="w-full"
                >
                  {isExporting && selectedTemplate === template.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      使用此模板
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 左侧：模板选择 */}
            <Card>
              <CardHeader>
                <CardTitle>选择预览模板</CardTitle>
                <CardDescription>点击模板查看预览效果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickTemplates.map((template: any) => (
                  <Button
                    key={template.id}
                    variant={previewTemplate === template.id ? 'default' : 'outline'}
                    className="w-full justify-start h-auto py-4"
                    onClick={async () => {
                      setPreviewTemplate(template.id);
                      setIsLoadingPreview(true);
                      try {
                        // 使用示例数据生成预览
                        const sampleQuestionIds = selectedQuestionIds.length > 0 
                          ? selectedQuestionIds.slice(0, 2) // 只预览前2道题
                          : []; // 如果没有选中题目，显示示例
                        
                        if (sampleQuestionIds.length > 0) {
                          const result = await exportMutation.mutateAsync({
                            questionIds: sampleQuestionIds,
                            template: template.id as any
                          });
                          
                          if (result.success && result.content) {
                            setPreviewContent(result.content);
                          } else {
                            setPreviewContent('预览加载失败');
                          }
                        } else {
                          setPreviewContent(generateSamplePreview(template.id));
                        }
                      } catch (error) {
                        setPreviewContent('预览加载失败');
                      } finally {
                        setIsLoadingPreview(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3 text-left">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
            
            {/* 右侧：预览区域 */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  模板预览
                </CardTitle>
                <CardDescription>
                  {selectedQuestionIds.length > 0 
                    ? `预览前 ${Math.min(2, selectedQuestionIds.length)} 道题目的导出效果`
                    : '示例预览'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPreview ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : previewContent ? (
                  <div className="prose dark:prose-invert max-w-none border rounded-lg p-6 bg-muted/30 max-h-[600px] overflow-y-auto">
                    <ReactMarkdown>{previewContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>选择一个模板查看预览效果</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>导出说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Markdown格式</p>
                <p className="text-sm text-muted-foreground">
                  导出的文件为Markdown格式，可以使用Typora、VS Code等编辑器打开查看
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">格式转换</p>
                <p className="text-sm text-muted-foreground">
                  可以使用Pandoc等工具将Markdown转换为PDF、Word、HTML等格式
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
