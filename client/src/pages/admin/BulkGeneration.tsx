import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Database, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

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

export default function BulkGeneration() {
  const [schoolLevel, setSchoolLevel] = useState<"junior" | "senior">("junior");
  const [grade, setGrade] = useState<string>("junior1");
  const [subject, setSubject] = useState<string>("math");
  const [questionsPerKp, setQuestionsPerKp] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);

  const { data: stats, refetch: refetchStats } = trpc.bulkGeneration.getStats.useQuery();
  const bulkGenerateMutation = trpc.bulkGeneration.bulkGenerate.useMutation();
  const smartSupplementMutation = trpc.bulkGeneration.smartSupplement.useMutation();

  const handleBulkGenerate = async () => {
    if (!grade || !subject || questionsPerKp < 1) {
      toast.error("请填写完整的生成配置");
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const result = await bulkGenerateMutation.mutateAsync({
        schoolLevel,
        grade,
        subject,
        questionsPerKnowledgePoint: questionsPerKp,
      });

      setGenerationResult(result);
      
      if (result.successCount > 0) {
        toast.success(`成功生成 ${result.successCount} 道题目！`);
        refetchStats();
      } else {
        toast.error("生成失败，请查看错误信息");
      }
    } catch (error) {
      toast.error("生成失败: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSmartSupplement = async () => {
    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const result = await smartSupplementMutation.mutateAsync({
        targetPerKnowledgePoint: 10,
      });

      setGenerationResult(result);
      
      if (result.successCount > 0) {
        toast.success(`智能补充完成！成功生成 ${result.successCount} 道题目`);
        refetchStats();
      } else {
        toast.info("题库已充足，无需补充");
      }
    } catch (error) {
      toast.error("智能补充失败: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGradeChange = (value: string) => {
    setGrade(value);
    setSchoolLevel(value.startsWith("junior") ? "junior" : "senior");
  };

  return (
    <div className="container py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI题库批量生成</h1>
        <p className="text-muted-foreground">
          使用AI自动生成高质量题目，快速扩充题库资源
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">题库总量</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              全部题目数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学科覆盖</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.bySubject?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              已覆盖学科数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年级覆盖</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byGrade?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              已覆盖年级数量
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              批量生成题目
            </CardTitle>
            <CardDescription>
              根据指定条件批量生成题目
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grade">年级</Label>
              <Select value={grade} onValueChange={handleGradeChange}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">学科</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="选择学科" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">每个知识点生成题目数</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="50"
                value={questionsPerKp}
                onChange={(e) => setQuestionsPerKp(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                建议每个知识点生成5-10道题目
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleBulkGenerate}
              disabled={isGenerating}
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              开始生成
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              智能补充题库
            </CardTitle>
            <CardDescription>
              自动检测题库缺口并智能补充
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">功能说明</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>自动扫描所有知识点</li>
                <li>检测题目数量不足的知识点</li>
                <li>智能生成题目补充缺口</li>
                <li>确保每个知识点至少10道题</li>
              </ul>
            </div>

            <Button
              className="w-full"
              variant="secondary"
              onClick={handleSmartSupplement}
              disabled={isGenerating}
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              一键智能补充
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              此操作可能需要较长时间，请耐心等待
            </p>
          </CardContent>
        </Card>
      </div>

      {generationResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>生成结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">总生成数</p>
                <p className="text-2xl font-bold">{generationResult.totalGenerated}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">成功数</p>
                <p className="text-2xl font-bold text-green-600">{generationResult.successCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">失败数</p>
                <p className="text-2xl font-bold text-red-600">{generationResult.failedCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">去重数</p>
                <p className="text-2xl font-bold text-orange-600">{generationResult.duplicateCount}</p>
              </div>
            </div>

            {generationResult.totalGenerated > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>成功率</span>
                  <span>{Math.round((generationResult.successCount / generationResult.totalGenerated) * 100)}%</span>
                </div>
                <Progress 
                  value={(generationResult.successCount / generationResult.totalGenerated) * 100} 
                />
              </div>
            )}

            {generationResult.errors && generationResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600">错误信息：</p>
                <div className="rounded-lg bg-red-50 p-3 max-h-40 overflow-y-auto">
                  {generationResult.errors.slice(0, 5).map((error: string, index: number) => (
                    <p key={index} className="text-xs text-red-700 mb-1">
                      • {error}
                    </p>
                  ))}
                  {generationResult.errors.length > 5 && (
                    <p className="text-xs text-red-600 mt-2">
                      还有 {generationResult.errors.length - 5} 条错误信息...
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {stats && stats.bySubject && stats.bySubject.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>题库统计</CardTitle>
            <CardDescription>各学科题目数量分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.bySubject.map((item: any) => {
                const subjectLabel = SUBJECTS.find(s => s.value === item.subject)?.label || item.subject;
                const percentage = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                
                return (
                  <div key={item.subject} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{subjectLabel}</span>
                      <span className="text-muted-foreground">{item.count} 道题</span>
                    </div>
                    <Progress value={percentage} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
