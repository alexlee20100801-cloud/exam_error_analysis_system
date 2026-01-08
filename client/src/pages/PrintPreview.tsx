import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Printer, FileDown, Save, Settings2 } from "lucide-react";

/**
 * 打印预览页面
 * 支持实时预览、排版调整和内容选择
 */
export default function PrintPreview() {
  const [, params] = useRoute("/print-preview/:questionIds");
  const [, navigate] = useLocation();
  
  // 解析错题ID列表
  const questionIds = params?.questionIds 
    ? params.questionIds.split(',').map(Number).filter(Boolean)
    : [];

  // 打印配置状态
  const [config, setConfig] = useState({
    layout: 'single' as 'single' | 'double',
    fontSize: 14,
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    includeAiAnalysis: true,
    includeAnswer: true,
    includeExplanation: true,
    includeKnowledgePoints: true,
    includeImage: true,
    headerText: '',
    footerText: '',
    showPageNumber: true,
    paperSize: 'A4' as 'A4' | 'A5' | 'Letter',
    orientation: 'portrait' as 'portrait' | 'landscape',
  });

  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();

  // 获取打印预览数据
  const { data: previewData, isLoading } = trpc.printPreview.getPreviewData.useQuery(
    { questionIds, templateId: selectedTemplateId },
    { enabled: questionIds.length > 0 }
  );

  // 获取用户模板列表
  const { data: templates } = trpc.printPreview.getTemplates.useQuery();

  // 保存模板
  const saveTemplateMutation = trpc.printPreview.createTemplate.useMutation({
    onSuccess: () => {
      toast.success('模板保存成功');
      setTemplateName('');
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  // 记录打印历史
  const recordHistoryMutation = trpc.printPreview.recordHistory.useMutation();

  // 当加载模板时更新配置
  useEffect(() => {
    if (previewData?.template) {
      setConfig({
        layout: previewData.template.layout as 'single' | 'double',
        fontSize: previewData.template.fontSize,
        marginTop: previewData.template.marginTop,
        marginBottom: previewData.template.marginBottom,
        marginLeft: previewData.template.marginLeft,
        marginRight: previewData.template.marginRight,
        includeAiAnalysis: previewData.template.includeAiAnalysis,
        includeAnswer: previewData.template.includeAnswer,
        includeExplanation: previewData.template.includeExplanation,
        includeKnowledgePoints: previewData.template.includeKnowledgePoints,
        includeImage: previewData.template.includeImage,
        headerText: previewData.template.headerText || '',
        footerText: previewData.template.footerText || '',
        showPageNumber: previewData.template.showPageNumber,
        paperSize: previewData.template.paperSize as 'A4' | 'A5' | 'Letter',
        orientation: previewData.template.orientation as 'portrait' | 'landscape',
      });
    }
  }, [previewData]);

  // 处理打印
  const handlePrint = () => {
    recordHistoryMutation.mutate({
      questionIds,
      exportType: 'print',
      configSnapshot: config,
      templateId: selectedTemplateId,
    });
    window.print();
  };

  // 处理导出PDF
  const handleExportPDF = () => {
    recordHistoryMutation.mutate({
      questionIds,
      exportType: 'pdf',
      configSnapshot: config,
      templateId: selectedTemplateId,
    });
    window.print();
    toast.success('请在打印对话框中选择"另存为PDF"');
  };

  // 保存模板
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('请输入模板名称');
      return;
    }

    saveTemplateMutation.mutate({
      name: templateName,
      ...config,
    });
  };

  // 加载模板
  const handleLoadTemplate = (templateId: string) => {
    const id = parseInt(templateId);
    setSelectedTemplateId(id);
  };

  if (questionIds.length === 0) {
    return (
      <div className="container py-8">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            请从错题列表选择要打印的错题
          </p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate('/error-questions')}>
              返回错题列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 工具栏 - 不打印 */}
      <div className="print:hidden border-b bg-card sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">打印预览</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/error-questions')}>
                返回
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                导出PDF
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                打印
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 print:p-0">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 配置面板 - 不打印 */}
          <div className="lg:col-span-1 print:hidden">
            <Card className="p-4 sticky top-24">
              <Tabs defaultValue="layout">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="layout">
                    <Settings2 className="h-4 w-4 mr-2" />
                    排版
                  </TabsTrigger>
                  <TabsTrigger value="content">内容</TabsTrigger>
                </TabsList>

                <TabsContent value="layout" className="space-y-4 mt-4">
                  {/* 模板选择 */}
                  <div className="space-y-2">
                    <Label>选择模板</Label>
                    <Select value={selectedTemplateId?.toString()} onValueChange={handleLoadTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择已保存的模板" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                            {template.isDefault && ' (默认)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 布局 */}
                  <div className="space-y-2">
                    <Label>布局</Label>
                    <Select value={config.layout} onValueChange={(value) => setConfig({ ...config, layout: value as 'single' | 'double' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">单列</SelectItem>
                        <SelectItem value="double">双列</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 字体大小 */}
                  <div className="space-y-2">
                    <Label>字体大小: {config.fontSize}px</Label>
                    <Input
                      type="range"
                      min="8"
                      max="24"
                      value={config.fontSize}
                      onChange={(e) => setConfig({ ...config, fontSize: parseInt(e.target.value) })}
                    />
                  </div>

                  {/* 纸张大小 */}
                  <div className="space-y-2">
                    <Label>纸张大小</Label>
                    <Select value={config.paperSize} onValueChange={(value) => setConfig({ ...config, paperSize: value as 'A4' | 'A5' | 'Letter' })}>
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

                  {/* 方向 */}
                  <div className="space-y-2">
                    <Label>方向</Label>
                    <Select value={config.orientation} onValueChange={(value) => setConfig({ ...config, orientation: value as 'portrait' | 'landscape' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">纵向</SelectItem>
                        <SelectItem value="landscape">横向</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 边距 */}
                  <div className="space-y-2">
                    <Label>边距 (mm)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">上</Label>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={config.marginTop}
                          onChange={(e) => setConfig({ ...config, marginTop: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">下</Label>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={config.marginBottom}
                          onChange={(e) => setConfig({ ...config, marginBottom: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">左</Label>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={config.marginLeft}
                          onChange={(e) => setConfig({ ...config, marginLeft: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">右</Label>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={config.marginRight}
                          onChange={(e) => setConfig({ ...config, marginRight: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 页眉页脚 */}
                  <div className="space-y-2">
                    <Label>页眉</Label>
                    <Input
                      placeholder="页眉文字"
                      value={config.headerText}
                      onChange={(e) => setConfig({ ...config, headerText: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>页脚</Label>
                    <Input
                      placeholder="页脚文字"
                      value={config.footerText}
                      onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.showPageNumber}
                      onCheckedChange={(checked) => setConfig({ ...config, showPageNumber: checked })}
                    />
                    <Label>显示页码</Label>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.includeImage}
                        onCheckedChange={(checked) => setConfig({ ...config, includeImage: checked })}
                      />
                      <Label>包含原题图片</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.includeAnswer}
                        onCheckedChange={(checked) => setConfig({ ...config, includeAnswer: checked })}
                      />
                      <Label>包含答案</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.includeExplanation}
                        onCheckedChange={(checked) => setConfig({ ...config, includeExplanation: checked })}
                      />
                      <Label>包含解析</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.includeKnowledgePoints}
                        onCheckedChange={(checked) => setConfig({ ...config, includeKnowledgePoints: checked })}
                      />
                      <Label>包含知识点</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.includeAiAnalysis}
                        onCheckedChange={(checked) => setConfig({ ...config, includeAiAnalysis: checked })}
                      />
                      <Label>包含AI分析</Label>
                    </div>
                  </div>

                  {/* 保存模板 */}
                  <div className="pt-4 border-t space-y-2">
                    <Label>保存为模板</Label>
                    <Input
                      placeholder="模板名称"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleSaveTemplate}
                      disabled={saveTemplateMutation.isPending}
                    >
                      {saveTemplateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      保存模板
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* 预览区域 */}
          <div className="lg:col-span-3">
            <div
              className="bg-white shadow-lg mx-auto print:shadow-none"
              style={{
                width: config.paperSize === 'A4' ? '210mm' : config.paperSize === 'A5' ? '148mm' : '8.5in',
                minHeight: config.paperSize === 'A4' ? '297mm' : config.paperSize === 'A5' ? '210mm' : '11in',
                padding: `${config.marginTop}mm ${config.marginRight}mm ${config.marginBottom}mm ${config.marginLeft}mm`,
                fontSize: `${config.fontSize}px`,
              }}
            >
              {/* 页眉 */}
              {config.headerText && (
                <div className="text-center mb-4 pb-2 border-b">
                  {config.headerText}
                </div>
              )}

              {/* 错题内容 */}
              <div className={config.layout === 'double' ? 'columns-2 gap-4' : ''}>
                {previewData?.questions.map((question, index) => (
                  <div key={question.id} className="mb-6 break-inside-avoid">
                    <div className="font-bold mb-2">
                      {index + 1}. {question.subject} - {question.difficulty}
                    </div>

                    {/* 原题图片 */}
                    {config.includeImage && question.imageUrl && (
                      <div className="mb-3">
                        <img
                          src={question.imageUrl}
                          alt="错题"
                          className="max-w-full h-auto"
                        />
                      </div>
                    )}

                    {/* 题目内容 */}
                    {question.content && (
                      <div className="mb-2">
                        <div className="font-semibold">题目:</div>
                        <div className="whitespace-pre-wrap">{question.content}</div>
                      </div>
                    )}

                    {/* 答案 */}
                    {config.includeAnswer && question.correctAnswer && (
                      <div className="mb-2">
                        <div className="font-semibold">答案:</div>
                        <div>{question.correctAnswer}</div>
                      </div>
                    )}

                    {/* 解析 */}
                    {config.includeExplanation && question.explanation && (
                      <div className="mb-2">
                        <div className="font-semibold">解析:</div>
                        <div className="whitespace-pre-wrap">{question.explanation}</div>
                      </div>
                    )}

                    {/* 知识点 */}
                    {config.includeKnowledgePoints && question.knowledgePoints && (
                      <div className="mb-2">
                        <div className="font-semibold">知识点:</div>
                        <div className="flex flex-wrap gap-1">
                          {question.knowledgePoints.split(',').map((kp, i) => (
                            <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {kp.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI分析 */}
                    {config.includeAiAnalysis && question.aiAnalysis && (
                      <div className="mb-2">
                        <div className="font-semibold">AI分析:</div>
                        <div className="text-sm whitespace-pre-wrap">{question.aiAnalysis}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 页脚 */}
              {(config.footerText || config.showPageNumber) && (
                <div className="text-center mt-4 pt-2 border-t text-sm">
                  {config.footerText}
                  {config.showPageNumber && config.footerText && ' - '}
                  {config.showPageNumber && '第 1 页'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
