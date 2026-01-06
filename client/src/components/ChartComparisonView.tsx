/**
 * 图表对比学习组件
 * 并排展示多个相似题目的图表，支持对比分析
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitCompare,
  Sparkles,
  Save,
  Plus,
  X,
  StickyNote,
  Download,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface ChartItem {
  id: number;
  title: string;
  imageUrl: string;
  subject: string;
  difficulty: string;
  knowledgePoints?: string[];
}

interface ComparisonNote {
  id: string;
  chartId: number;
  content: string;
  position: { x: number; y: number };
}

interface ChartComparisonViewProps {
  initialCharts?: ChartItem[];
  maxCharts?: number;
  onSave?: (notes: ComparisonNote[]) => void;
}

export function ChartComparisonView({
  initialCharts = [],
  maxCharts = 4,
  onSave,
}: ChartComparisonViewProps) {
  const [selectedCharts, setSelectedCharts] = useState<ChartItem[]>(initialCharts);
  const [comparisonAnalysis, setComparisonAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notes, setNotes] = useState<ComparisonNote[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [selectedChartForNote, setSelectedChartForNote] = useState<number | null>(null);
  const [layout, setLayout] = useState<"grid" | "horizontal" | "vertical">("grid");

  const analysisMutation = trpc.comparisonLearning.analyze.useMutation();
  const similarQuestions = trpc.similarQuestions.findSimilar.useQuery(
    {
      errorQuestionId: selectedCharts[0]?.id || 0,
      limit: 10,
    },
    {
      enabled: selectedCharts.length > 0,
    }
  );

  // 添加图表到对比视图
  const handleAddChart = (chart: ChartItem) => {
    if (selectedCharts.length >= maxCharts) {
      toast.error(`最多只能对比${maxCharts}个图表`);
      return;
    }

    if (selectedCharts.some((c) => c.id === chart.id)) {
      toast.error("该图表已在对比视图中");
      return;
    }

    setSelectedCharts([...selectedCharts, chart]);
    toast.success("图表已添加");
  };

  // 移除图表
  const handleRemoveChart = (chartId: number) => {
    setSelectedCharts(selectedCharts.filter((c) => c.id !== chartId));
    setNotes(notes.filter((n) => n.chartId !== chartId));
    toast.success("图表已移除");
  };

  // 生成对比分析
  const handleGenerateAnalysis = async () => {
    if (selectedCharts.length < 2) {
      toast.error("至少需要2个图表才能进行对比分析");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analysisMutation.mutateAsync({
        chartIds: selectedCharts.map((c) => c.id),
      });

      setComparisonAnalysis(result.analysis);
      toast.success("对比分析已生成");
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("生成对比分析失败，请重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 添加笔记
  const handleAddNote = () => {
    if (!currentNote.trim() || selectedChartForNote === null) {
      toast.error("请选择图表并输入笔记内容");
      return;
    }

    const newNote: ComparisonNote = {
      id: Date.now().toString(),
      chartId: selectedChartForNote,
      content: currentNote,
      position: { x: 0, y: 0 },
    };

    setNotes([...notes, newNote]);
    setCurrentNote("");
    setSelectedChartForNote(null);
    toast.success("笔记已添加");
  };

  // 删除笔记
  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((n) => n.id !== noteId));
    toast.success("笔记已删除");
  };

  // 保存对比学习数据
  const handleSave = () => {
    if (onSave) {
      onSave(notes);
    }
    toast.success("对比学习数据已保存");
  };

  // 导出对比报告
  const handleExport = () => {
    const report = {
      charts: selectedCharts,
      analysis: comparisonAnalysis,
      notes,
      timestamp: new Date().toISOString(),
    };

    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("对比报告已导出");
  };

  // 布局类名
  const getLayoutClass = () => {
    switch (layout) {
      case "horizontal":
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
      case "vertical":
        return "flex flex-col gap-4";
      case "grid":
      default:
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
    }
  };

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              <span>图表对比学习</span>
              <Badge variant="secondary">
                {selectedCharts.length}/{maxCharts}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Select value={layout} onValueChange={(v: any) => setLayout(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">网格</SelectItem>
                  <SelectItem value="horizontal">横向</SelectItem>
                  <SelectItem value="vertical">纵向</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAnalysis}
                disabled={isAnalyzing || selectedCharts.length < 2}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {isAnalyzing ? "分析中..." : "生成对比分析"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                导出报告
              </Button>
              {onSave && (
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* 图表对比视图 */}
      {selectedCharts.length > 0 ? (
        <div className={getLayoutClass()}>
          {selectedCharts.map((chart, index) => (
            <Card key={chart.id} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">图表 {index + 1}</Badge>
                    <span className="truncate">{chart.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveChart(chart.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{chart.subject}</Badge>
                  <Badge variant="secondary">{chart.difficulty}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative group">
                  <img
                    src={chart.imageUrl}
                    alt={chart.title}
                    className="w-full h-auto rounded border"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => window.open(chart.imageUrl, "_blank")}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* 该图表的笔记 */}
                {notes.filter((n) => n.chartId === chart.id).length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs font-semibold">笔记</Label>
                    {notes
                      .filter((n) => n.chartId === chart.id)
                      .map((note) => (
                        <div
                          key={note.id}
                          className="flex items-start gap-2 p-2 bg-muted rounded text-sm"
                        >
                          <StickyNote className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p className="flex-1">{note.content}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无对比图表</p>
              <p className="text-sm mt-2">从下方相似题目中选择图表进行对比学习</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 对比分析结果 */}
      {comparisonAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              对比分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Streamdown>{comparisonAnalysis}</Streamdown>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* 添加笔记 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            添加对比笔记
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="chartSelect">选择图表</Label>
            <Select
              value={selectedChartForNote?.toString() || ""}
              onValueChange={(v) => setSelectedChartForNote(Number(v))}
            >
              <SelectTrigger id="chartSelect">
                <SelectValue placeholder="选择要添加笔记的图表" />
              </SelectTrigger>
              <SelectContent>
                {selectedCharts.map((chart, index) => (
                  <SelectItem key={chart.id} value={chart.id.toString()}>
                    图表 {index + 1}: {chart.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="noteContent">笔记内容</Label>
            <Textarea
              id="noteContent"
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="记录你的对比发现和学习心得..."
              rows={3}
            />
          </div>
          <Button onClick={handleAddNote} disabled={!currentNote.trim() || !selectedChartForNote}>
            <Plus className="h-4 w-4 mr-1" />
            添加笔记
          </Button>
        </CardContent>
      </Card>

      {/* 相似题目推荐 */}
      {similarQuestions.data && similarQuestions.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>相似题目推荐</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {similarQuestions.data.map((question: any) => (
                  <div
                    key={question.id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{question.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {question.subject}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {question.difficulty}
                        </Badge>
                        {question.similarity && (
                          <Badge variant="outline" className="text-xs">
                            相似度: {(question.similarity * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddChart(question)}
                      disabled={selectedCharts.length >= maxCharts}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 添加缺失的Label组件导入
import { Label } from "@/components/ui/label";
