import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, FileText, File, Loader2, Settings, Filter, Layout, Printer } from "lucide-react";

const SUBJECTS = [
  { value: "chinese", label: "语文" },
  { value: "math", label: "数学" },
  { value: "english", label: "英语" },
  { value: "physics", label: "物理" },
  { value: "chemistry", label: "化学" },
  { value: "biology", label: "生物" },
  { value: "politics", label: "政治" },
  { value: "history", label: "历史" },
  { value: "geography", label: "地理" },
];

const GRADES = [
  { value: "junior1", label: "初一" },
  { value: "junior2", label: "初二" },
  { value: "junior3", label: "初三" },
  { value: "senior1", label: "高一" },
  { value: "senior2", label: "高二" },
  { value: "senior3", label: "高三" },
];

const DIFFICULTIES = [
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
  { value: "hard", label: "困难" },
];

export default function ExportCenter() {
  const [format, setFormat] = useState<"pdf" | "word">("pdf");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [masteryFilter, setMasteryFilter] = useState<"all" | "mastered" | "notMastered">("all");
  const [isExporting, setIsExporting] = useState(false);

  const [options, setOptions] = useState({
    includeAnswer: true,
    includeExplanation: true,
    includeAnalysis: true,
    includeNotes: true,
    includeImage: true,
    pageSize: "A4" as "A4" | "Letter",
    enableAILayout: true,
  });

  const { data: stats, isLoading: statsLoading } = trpc.export.getExportStats.useQuery();

  const exportMutation = trpc.enhancedExport.exportErrorQuestions.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("导出成功", { description: `已生成 ${data.fileName}` });
      setIsExporting(false);
    },
    onError: (error) => {
      toast.error("导出失败", { description: error.message });
      setIsExporting(false);
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    exportMutation.mutate({
      format,
      subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
      grades: selectedGrades.length > 0 ? selectedGrades : undefined,
      difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
      isMastered: masteryFilter === "all" ? undefined : masteryFilter === "mastered",
      includeAnswer: options.includeAnswer,
      includeExplanation: options.includeExplanation,
      includeAnalysis: options.includeAnalysis,
      includeNotes: options.includeNotes,
      includeImage: options.includeImage,
      pageSize: options.pageSize,
      enableAILayout: options.enableAILayout,
    });
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficulty) ? prev.filter((d) => d !== difficulty) : [...prev, difficulty]
    );
  };

  return (
    <div className="container max-w-4xl py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">导出中心</h1>
          <p className="text-muted-foreground">将错题导出为PDF或Word文档，方便打印复习</p>
        </div>
        <Printer className="h-8 w-8 text-muted-foreground" />
      </div>

      {!statsLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">总错题数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.byMastered.mastered}</div>
              <p className="text-sm text-muted-foreground">已掌握</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-600">{stats.byMastered.notMastered}</div>
              <p className="text-sm text-muted-foreground">未掌握</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.bySubject.length}</div>
              <p className="text-sm text-muted-foreground">涉及学科</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="filter" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="filter" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">筛选条件</span>
          </TabsTrigger>
          <TabsTrigger value="options" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">导出选项</span>
          </TabsTrigger>
          <TabsTrigger value="format" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">格式设置</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filter" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">选择学科</CardTitle>
              <CardDescription>不选择则导出所有学科</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((subject) => (
                  <Button
                    key={subject.value}
                    variant={selectedSubjects.includes(subject.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSubject(subject.value)}
                  >
                    {subject.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">选择年级</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {GRADES.map((grade) => (
                  <Button
                    key={grade.value}
                    variant={selectedGrades.includes(grade.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleGrade(grade.value)}
                  >
                    {grade.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">选择难度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((diff) => (
                  <Button
                    key={diff.value}
                    variant={selectedDifficulties.includes(diff.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDifficulty(diff.value)}
                  >
                    {diff.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">掌握状态</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={masteryFilter} onValueChange={(v) => setMasteryFilter(v as typeof masteryFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="mastered">仅已掌握</SelectItem>
                  <SelectItem value="notMastered">仅未掌握</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">内容选项</CardTitle>
              <CardDescription>选择要包含在导出文档中的内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="includeAnswer">包含正确答案</Label>
                <Switch
                  id="includeAnswer"
                  checked={options.includeAnswer}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, includeAnswer: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeExplanation">包含详细解析</Label>
                <Switch
                  id="includeExplanation"
                  checked={options.includeExplanation}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, includeExplanation: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeAnalysis">包含AI错误分析</Label>
                <Switch
                  id="includeAnalysis"
                  checked={options.includeAnalysis}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, includeAnalysis: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeNotes">包含我的笔记</Label>
                <Switch
                  id="includeNotes"
                  checked={options.includeNotes}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, includeNotes: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeImage">包含题目图片</Label>
                <Switch
                  id="includeImage"
                  checked={options.includeImage}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, includeImage: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI智能排版</CardTitle>
              <CardDescription>使用AI自动优化文档布局和样式</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableAILayout">启用AI智能排版</Label>
                  <p className="text-sm text-muted-foreground">根据内容自动调整字体、间距和配色</p>
                </div>
                <Switch
                  id="enableAILayout"
                  checked={options.enableAILayout}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, enableAILayout: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="format" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">导出格式</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={format === "pdf" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => setFormat("pdf")}
                >
                  <FileText className="h-8 w-8" />
                  <span>PDF 文档</span>
                  <span className="text-xs opacity-70">适合打印</span>
                </Button>
                <Button
                  variant={format === "word" ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => setFormat("word")}
                >
                  <File className="h-8 w-8" />
                  <span>Word 文档</span>
                  <span className="text-xs opacity-70">可编辑</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">页面大小</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={options.pageSize}
                onValueChange={(v) => setOptions((prev) => ({ ...prev, pageSize: v as "A4" | "Letter" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          <Button
            className="w-full h-12 text-lg"
            onClick={handleExport}
            disabled={isExporting || (stats?.total === 0)}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                正在生成文档...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                导出 {format === "pdf" ? "PDF" : "Word"} 文档
              </>
            )}
          </Button>
          {stats?.total === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              暂无错题可导出，请先添加错题
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
