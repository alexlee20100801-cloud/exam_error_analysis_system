import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Printer, FileDown, Save, Settings2, BookOpen, FileText, List } from "lucide-react";
import { SEO } from "@/components/SEO";

// 打印模板类型
type PrintTemplate = "standard" | "notebook" | "exam" | "minimal";

// 打印模板配置
const PRINT_TEMPLATES = {
  standard: {
    name: "标准模板",
    description: "简洁清晰的标准打印格式",
    icon: FileText,
    preview: "/templates/standard-preview.png",
  },
  notebook: {
    name: "错题本风格",
    description: "手写风格，活页纸背景",
    icon: BookOpen,
    preview: "/templates/notebook-preview.png",
  },
  exam: {
    name: "试卷风格",
    description: "标准试卷格式，答题卡样式",
    icon: FileText,
    preview: "/templates/exam-preview.png",
  },
  minimal: {
    name: "极简模板",
    description: "最小化排版，节省纸张",
    icon: List,
    preview: "/templates/minimal-preview.png",
  },
};

export default function EnhancedPrintPreview() {
  const seoData = {
    title: '错题打印预览',
    description: '错题打印预览和导出功能,支持多种打印模板,自定义排版设置,生成专业的错题本打印文档。',
    keywords: '错题打印,打印预览,PDF导出,错题本,打印模板,深圳初中,深圳高中',
    ogImage: 'https://example.com/og-print-preview.jpg',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '错题打印预览 - 深圳初高中错题分析学习系统',
      description: '专业的错题打印和导出功能,支持多种模板和自定义排版',
      provider: {
        '@type': 'Organization',
        name: '深圳初高中错题分析学习系统'
      }
    }
  };
  const [, params] = useRoute("/enhanced-print-preview/:questionIds");
  const [, navigate] = useLocation();

  // 解析错题ID列表
  const questionIds = params?.questionIds
    ? params.questionIds.split(",").map(Number).filter(Boolean)
    : [];

  // 打印配置状态
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate>("standard");
  const [config, setConfig] = useState({
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
    headerText: "",
    footerText: "",
    showPageNumber: true,
    paperSize: "A4" as "A4" | "A5" | "Letter",
    orientation: "portrait" as "portrait" | "landscape",
    // 新增：目录生成选项
    generateToc: true,
    tocGroupBy: "subject" as "subject" | "knowledge" | "date",
    // 新增：智能分页选项
    smartPageBreak: true,
    avoidQuestionSplit: true,
  });

  // 获取打印预览数据
  const { data: previewData, isLoading } = trpc.printPreview.getPreviewData.useQuery(
    { questionIds },
    { enabled: questionIds.length > 0 }
  );

  // 记录打印历史
  const recordHistoryMutation = trpc.printPreview.recordHistory.useMutation();

  // 处理打印
  const handlePrint = () => {
    recordHistoryMutation.mutate({
      questionIds,
      exportType: "print",
      configSnapshot: config as any,
    });
    window.print();
  };

  // 处理导出PDF
  const handleExportPDF = () => {
    recordHistoryMutation.mutate({
      questionIds,
      exportType: "pdf",
      configSnapshot: config as any,
    });
    window.print();
    toast.success('请在打印对话框中选择"另存为PDF"');
  };

  // 生成目录数据
  const generateToc = () => {
    if (!previewData?.questions) return null;

    const grouped: Record<string, any[]> = {};

    previewData.questions.forEach((q: any) => {
      let key = "";
      if (config.tocGroupBy === "subject") {
        key = q.subject || "未分类";
      } else if (config.tocGroupBy === "knowledge") {
        key = q.knowledgePoints?.[0] || "未分类";
      } else {
        key = new Date(q.createdAt).toLocaleDateString();
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(q);
    });

    return grouped;
  };

  const tocData = generateToc();

  if (questionIds.length === 0) {
    return (
      <>
        <SEO {...seoData} />
        <div className="container py-8">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            请从错题列表选择要打印的错题
          </p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate("/error-questions")}>
              返回错题列表
            </Button>
          </div>
        </Card>
      </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <SEO {...seoData} />
        <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      </>
    );
  }

  return (
    <>
      <SEO {...seoData} />
      <div className="min-h-screen bg-background">
      {/* 工具栏 - 不打印 */}
      <div className="print:hidden border-b bg-card sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">增强打印预览</h1>
              <p className="text-sm text-muted-foreground mt-1">
                已选择 {questionIds.length} 道错题
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/error-questions")}>
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
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">打印设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="template">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="template">模板</TabsTrigger>
                    <TabsTrigger value="layout">排版</TabsTrigger>
                    <TabsTrigger value="content">内容</TabsTrigger>
                  </TabsList>

                  {/* 模板选择 */}
                  <TabsContent value="template" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      {Object.entries(PRINT_TEMPLATES).map(([key, template]) => {
                        const Icon = template.icon;
                        return (
                          <Card
                            key={key}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedTemplate === key
                                ? "ring-2 ring-primary"
                                : ""
                            }`}
                            onClick={() => setSelectedTemplate(key as PrintTemplate)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Icon className="h-5 w-5 text-primary mt-0.5" />
                                <div className="flex-1">
                                  <div className="font-medium">{template.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {template.description}
                                  </div>
                                </div>
                                {selectedTemplate === key && (
                                  <Badge variant="default">已选</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* 排版设置 */}
                  <TabsContent value="layout" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div>
                        <Label>纸张大小</Label>
                        <Select
                          value={config.paperSize}
                          onValueChange={(value: "A4" | "A5" | "Letter") =>
                            setConfig({ ...config, paperSize: value })
                          }
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

                      <div>
                        <Label>方向</Label>
                        <Select
                          value={config.orientation}
                          onValueChange={(value: "portrait" | "landscape") =>
                            setConfig({ ...config, orientation: value })
                          }
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

                      <div>
                        <Label>字体大小: {config.fontSize}px</Label>
                        <Input
                          type="range"
                          min="10"
                          max="20"
                          value={config.fontSize}
                          onChange={(e) =>
                            setConfig({ ...config, fontSize: parseInt(e.target.value) })
                          }
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <Label>智能分页</Label>
                        <Switch
                          checked={config.smartPageBreak}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, smartPageBreak: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>避免题目断裂</Label>
                        <Switch
                          checked={config.avoidQuestionSplit}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, avoidQuestionSplit: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>显示页码</Label>
                        <Switch
                          checked={config.showPageNumber}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, showPageNumber: checked })
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* 内容设置 */}
                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>生成目录</Label>
                        <Switch
                          checked={config.generateToc}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, generateToc: checked })
                          }
                        />
                      </div>

                      {config.generateToc && (
                        <div>
                          <Label>目录分类方式</Label>
                          <Select
                            value={config.tocGroupBy}
                            onValueChange={(value: "subject" | "knowledge" | "date") =>
                              setConfig({ ...config, tocGroupBy: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="subject">按学科分类</SelectItem>
                              <SelectItem value="knowledge">按知识点分类</SelectItem>
                              <SelectItem value="date">按日期分类</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between">
                        <Label>包含图片</Label>
                        <Switch
                          checked={config.includeImage}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, includeImage: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>包含AI分析</Label>
                        <Switch
                          checked={config.includeAiAnalysis}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, includeAiAnalysis: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>包含答案</Label>
                        <Switch
                          checked={config.includeAnswer}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, includeAnswer: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>包含解析</Label>
                        <Switch
                          checked={config.includeExplanation}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, includeExplanation: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>包含知识点</Label>
                        <Switch
                          checked={config.includeKnowledgePoints}
                          onCheckedChange={(checked) =>
                            setConfig({ ...config, includeKnowledgePoints: checked })
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* 预览区域 */}
          <div className="lg:col-span-3">
            <div
              className={`bg-white shadow-lg mx-auto print:shadow-none print:m-0 ${
                selectedTemplate === "notebook"
                  ? "notebook-template"
                  : selectedTemplate === "exam"
                  ? "exam-template"
                  : selectedTemplate === "minimal"
                  ? "minimal-template"
                  : "standard-template"
              }`}
              style={{
                width: config.paperSize === "A4" ? "210mm" : "148mm",
                minHeight: config.paperSize === "A4" ? "297mm" : "210mm",
                padding: `${config.marginTop}mm ${config.marginRight}mm ${config.marginBottom}mm ${config.marginLeft}mm`,
                fontSize: `${config.fontSize}px`,
              }}
            >
              {/* 目录 */}
              {config.generateToc && tocData && (
                <div className="toc-section mb-8 print:page-break-after">
                  <h2 className="text-2xl font-bold mb-4 text-center">目录</h2>
                  {Object.entries(tocData).map(([category, questions]) => (
                    <div key={category} className="mb-4">
                      <h3 className="font-semibold text-lg mb-2">{category}</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {questions.map((q: any, index: number) => (
                          <li key={q.id} className="text-sm">
                            错题 {index + 1}: {q.title || q.content?.substring(0, 30) + "..."}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* 错题内容 */}
              {previewData?.questions.map((question: any, index: number) => (
                <div
                  key={question.id}
                  className={`question-item mb-6 ${
                    config.avoidQuestionSplit ? "print:page-break-inside-avoid" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">错题 {index + 1}</Badge>
                    {question.subject && (
                      <Badge variant="secondary">{question.subject}</Badge>
                    )}
                    {question.difficulty && (
                      <Badge>{question.difficulty}</Badge>
                    )}
                  </div>

                  {config.includeImage && question.imageUrl && (
                    <img
                      src={question.imageUrl}
                      alt={`错题 ${index + 1}`}
                      className="w-full max-w-md mb-3 rounded border"
                    />
                  )}

                  <div className="content-section">
                    <h4 className="font-semibold mb-2">题目内容：</h4>
                    <p className="whitespace-pre-wrap">{question.content}</p>
                  </div>

                  {config.includeKnowledgePoints && question.knowledgePoints && (
                    <div className="mt-3">
                      <h4 className="font-semibold mb-2">知识点：</h4>
                      <div className="flex flex-wrap gap-2">
                        {question.knowledgePoints.map((kp: string, i: number) => (
                          <Badge key={i} variant="outline">
                            {kp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.includeAnswer && question.correctAnswer && (
                    <div className="mt-3">
                      <h4 className="font-semibold mb-2">正确答案：</h4>
                      <p className="whitespace-pre-wrap">{question.correctAnswer}</p>
                    </div>
                  )}

                  {config.includeExplanation && question.explanation && (
                    <div className="mt-3">
                      <h4 className="font-semibold mb-2">解析：</h4>
                      <p className="whitespace-pre-wrap">{question.explanation}</p>
                    </div>
                  )}

                  {config.includeAiAnalysis && question.aiAnalysis && (
                    <div className="mt-3 p-3 bg-blue-50 rounded">
                      <h4 className="font-semibold mb-2">AI分析：</h4>
                      <p className="whitespace-pre-wrap text-sm">{question.aiAnalysis}</p>
                    </div>
                  )}

                  {index < previewData.questions.length - 1 && (
                    <hr className="mt-6 border-dashed" />
                  )}
                </div>
              ))}

              {/* 页脚 */}
              {config.showPageNumber && (
                <div className="text-center text-sm text-muted-foreground mt-8">
                  第 1 页
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 打印样式 */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .notebook-template {
            background: linear-gradient(to bottom, #f9f9f9 0%, #fff 100%);
            background-image: repeating-linear-gradient(
              transparent,
              transparent 24px,
              #e0e0e0 24px,
              #e0e0e0 25px
            );
            font-family: "Comic Sans MS", cursive, sans-serif;
          }
          
          .exam-template {
            border: 2px solid #000;
            padding: 20mm !important;
          }
          
          .exam-template .question-item {
            border: 1px solid #ccc;
            padding: 10px;
            margin-bottom: 15px;
          }
          
          .minimal-template {
            font-size: 12px;
            line-height: 1.3;
          }
          
          .minimal-template .question-item {
            margin-bottom: 10px;
          }
          
          @page {
            margin: 0;
          }
        }
      `}</style>
    </div>
    </>
  );
}
