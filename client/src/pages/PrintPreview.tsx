import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

const useToast = () => ({ toast });

interface PrintConfig {
  layout: 'single' | 'double';
  fontSize: number;
  margin: number;
  includeAnswer: boolean;
  includeExplanation: boolean;
  includeAiAnalysis: boolean;
  includeErrorSources: boolean;
  includeKnowledgePoints: boolean;
  headerText: string;
  footerText: string;
  showPageNumber: boolean;
  templateStyle: 'notebook' | 'exam' | 'custom';
}

const DEFAULT_CONFIG: PrintConfig = {
  layout: 'single',
  fontSize: 14,
  margin: 20,
  includeAnswer: true,
  includeExplanation: true,
  includeAiAnalysis: false,
  includeErrorSources: false,
  includeKnowledgePoints: true,
  headerText: '错题本',
  footerText: '',
  showPageNumber: true,
  templateStyle: 'notebook',
};

export default function PrintPreview() {
  const { user } = useAuth();
  const [config, setConfig] = useState<PrintConfig>(DEFAULT_CONFIG);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [previewMode, setPreviewMode] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // 获取用户的错题
  const { data: questions = [], isLoading } = trpc.errorQuestions.list.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExportPDF = async () => {
    try {
      // 此功能待实现
      toast.info('功能开发中: PDF 导出功能正在开发中');
    } catch (error) {
      toast.error('导出失败: 请稍后重试');
    }
  };

  const handleExportWord = async () => {
    try {
      // 此功能待实现
      toast.info('功能开发中: Word 导出功能正在开发中');
    } catch (error) {
      toast.error('导出失败: 请稍后重试');
    }
  };

  const questionsToPreview = selectedQuestions.length > 0
    ? questions.filter(q => selectedQuestions.includes(q.id))
    : questions;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">打印预览</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 配置面板 */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">打印配置</h2>

            <Tabs defaultValue="layout" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="layout">布局</TabsTrigger>
                <TabsTrigger value="content">内容</TabsTrigger>
              </TabsList>

              <TabsContent value="layout" className="space-y-4">
                <div>
                  <Label>模板风格</Label>
                  <Select value={config.templateStyle} onValueChange={(value) =>
                    setConfig({ ...config, templateStyle: value as any })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notebook">错题本风格</SelectItem>
                      <SelectItem value="exam">试卷风格</SelectItem>
                      <SelectItem value="custom">自定义</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>页面布局</Label>
                  <Select value={config.layout} onValueChange={(value) =>
                    setConfig({ ...config, layout: value as any })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">单列</SelectItem>
                      <SelectItem value="double">双列</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>字体大小: {config.fontSize}px</Label>
                  <Slider
                    value={[config.fontSize]}
                    onValueChange={([value]) => setConfig({ ...config, fontSize: value })}
                    min={10}
                    max={20}
                    step={1}
                  />
                </div>

                <div>
                  <Label>边距: {config.margin}px</Label>
                  <Slider
                    value={[config.margin]}
                    onValueChange={([value]) => setConfig({ ...config, margin: value })}
                    min={10}
                    max={50}
                    step={5}
                  />
                </div>

                <div>
                  <Label>页眉</Label>
                  <Input
                    value={config.headerText}
                    onChange={(e) => setConfig({ ...config, headerText: e.target.value })}
                    placeholder="输入页眉文字"
                  />
                </div>

                <div>
                  <Label>页脚</Label>
                  <Input
                    value={config.footerText}
                    onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                    placeholder="输入页脚文字"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPageNumber"
                    checked={config.showPageNumber}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, showPageNumber: !!checked })
                    }
                  />
                  <Label htmlFor="showPageNumber">显示页码</Label>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAnswer"
                    checked={config.includeAnswer}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, includeAnswer: !!checked })
                    }
                  />
                  <Label htmlFor="includeAnswer">包含答案</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeExplanation"
                    checked={config.includeExplanation}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, includeExplanation: !!checked })
                    }
                  />
                  <Label htmlFor="includeExplanation">包含解析</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAiAnalysis"
                    checked={config.includeAiAnalysis}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, includeAiAnalysis: !!checked })
                    }
                  />
                  <Label htmlFor="includeAiAnalysis">包含 AI 分析</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeErrorSources"
                    checked={config.includeErrorSources}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, includeErrorSources: !!checked })
                    }
                  />
                  <Label htmlFor="includeErrorSources">包含错误来源</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeKnowledgePoints"
                    checked={config.includeKnowledgePoints}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, includeKnowledgePoints: !!checked })
                    }
                  />
                  <Label htmlFor="includeKnowledgePoints">包含知识点</Label>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 space-y-2">
              <Button onClick={handlePrint} className="w-full" variant="outline">
                打印
              </Button>
              <Button onClick={handleExportPDF} className="w-full" variant="outline">
                导出 PDF
              </Button>
              <Button onClick={handleExportWord} className="w-full" variant="outline">
                导出 Word
              </Button>
            </div>
          </Card>
        </div>

        {/* 预览面板 */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">预览</h2>
              <div className="space-x-2">
                <Button
                  variant={previewMode ? 'default' : 'outline'}
                  onClick={() => setPreviewMode(true)}
                >
                  预览模式
                </Button>
                <Button
                  variant={!previewMode ? 'default' : 'outline'}
                  onClick={() => setPreviewMode(false)}
                >
                  选择模式
                </Button>
              </div>
            </div>

            {previewMode ? (
              <div
                ref={printRef}
                className="bg-white p-8 rounded border"
                style={{
                  fontSize: `${config.fontSize}px`,
                  padding: `${config.margin}px`,
                  columnCount: config.layout === 'double' ? 2 : 1,
                }}
              >
                {/* 页眉 */}
                {config.headerText && (
                  <div className="text-center mb-4 pb-2 border-b">
                    <h1 className="text-2xl font-bold">{config.headerText}</h1>
                  </div>
                )}

                {/* 题目列表 */}
                <div>
                  {questionsToPreview.map((question, index) => (
                    <div key={question.id} className="mb-6 pb-4 border-b">
                      <div className="font-semibold mb-2">
                        {index + 1}. {question.title}
                      </div>

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
                      {config.includeExplanation && (question as any).explanation && (
                        <div className="mb-2">
                          <div className="font-semibold">解析:</div>
                          <div className="whitespace-pre-wrap">{(question as any).explanation}</div>
                        </div>
                      )}

                      {/* 知识点 */}
                      {config.includeKnowledgePoints && (question as any).knowledgePoints && (
                        <div className="mb-2">
                          <div className="font-semibold">知识点:</div>
                          <div className="flex flex-wrap gap-1">
                            {((question as any).knowledgePoints || '').split(',').map((kp: string, i: number) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {kp.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI 分析 */}
                      {config.includeAiAnalysis && (question as any).aiAnalysis && (
                        <div className="mb-2">
                          <div className="font-semibold">AI 分析:</div>
                          <div className="text-sm whitespace-pre-wrap">{(question as any).aiAnalysis}</div>
                        </div>
                      )}

                      {/* 错误来源 */}
                      {config.includeErrorSources && (question as any).errorSources && (
                        <div className="mb-2">
                          <div className="font-semibold">错误来源:</div>
                          <div className="text-sm">{(question as any).errorSources}</div>
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
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>全选</span>
                  <Checkbox
                    checked={selectedQuestions.length === questions.length && questions.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedQuestions(questions.map(q => q.id));
                      } else {
                        setSelectedQuestions([]);
                      }
                    }}
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {questions.map((question) => (
                    <div key={question.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="truncate">{question.title}</span>
                      <Checkbox
                        checked={selectedQuestions.includes(question.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedQuestions([...selectedQuestions, question.id]);
                          } else {
                            setSelectedQuestions(
                              selectedQuestions.filter(id => id !== question.id)
                            );
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
