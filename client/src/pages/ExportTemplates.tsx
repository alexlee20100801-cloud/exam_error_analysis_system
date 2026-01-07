import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExportTemplatesProps {
  selectedQuestionIds: number[];
  onClose?: () => void;
}

export default function ExportTemplates({ selectedQuestionIds, onClose }: ExportTemplatesProps) {
  const [, setLocation] = useLocation();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quickTemplates.map((template) => (
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
