import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Database, TrendingUp, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { BulkGenerationWelcome } from "@/components/BulkGenerationWelcome";
import { GenerationTemplates, type GenerationTemplate } from "@/components/GenerationTemplates";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";
import DashboardLayout from "@/components/DashboardLayout";

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
  
  // 引导状态
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  
  // 检查是否首次访问
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("bulk-generation-welcome-seen");
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

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
  
  // 引导流程处理
  const handleStartTour = () => {
    setShowWelcome(false);
    setIsTourActive(true);
  };
  
  const handleCompleteTour = () => {
    setIsTourActive(false);
    toast.success("教程完成！现在可以开始生成题目了");
  };
  
  const handleSkipTour = () => {
    setIsTourActive(false);
  };
  
  const handleSelectTemplate = (template: GenerationTemplate) => {
    // 应用模板配置
    if (template.config.subjects.length > 0) {
      setSubject(template.config.subjects[0]);
    }
    if (template.config.grades.length > 0) {
      setGrade(template.config.grades[0]);
      setSchoolLevel(template.config.grades[0].startsWith("junior") ? "junior" : "senior");
    }
    // 计算每个知识点生成题目数
    const estimatedKps = template.config.subjects.length * template.config.grades.length * 10;
    const questionsPerKp = Math.ceil(template.config.totalQuestions / estimatedKps);
    setQuestionsPerKp(Math.max(1, questionsPerKp));
    
    setShowTemplates(false);
    toast.success(`已应用模板：${template.name}`);
  };
  
  // 引导步骤
  const tourSteps: TourStep[] = [
    {
      target: "[data-tour='stats']",
      title: "题库统计",
      content: "这里显示当前题库的总体情况，包括题目数量、学科分布和知识点覆盖。",
      placement: "bottom",
    },
    {
      target: "[data-tour='config']",
      title: "生成配置",
      content: "选择年级、学科和每个知识点生成的题目数量。建议首次使用从小批量开始。",
      placement: "right",
    },
    {
      target: "[data-tour='difficulty']",
      title: "难度分布",
      content: "设置简单、中等、困难题目的比例，确保题库难度均衡。",
      placement: "right",
    },
    {
      target: "[data-tour='generate-btn']",
      title: "开始生成",
      content: "配置完成后，点击此按钮开始生成。生成过程中会实时显示进度。",
      placement: "top",
    },
  ];

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-7xl">
        {/* 欢迎引导 */}
        <BulkGenerationWelcome
          open={showWelcome}
          onClose={() => setShowWelcome(false)}
          onStartTour={handleStartTour}
        />
        
        {/* 分步引导 */}
        <GuidedTour
          steps={tourSteps}
          isActive={isTourActive}
          onComplete={handleCompleteTour}
          onSkip={handleSkipTour}
        />
        
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI题库批量生成</h1>
            <p className="text-muted-foreground">
              使用AI自动生成高质量题目，快速扩充题库资源
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              使用模板
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsTourActive(true)}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              查看引导
            </Button>
          </div>
        </div>
        
        {/* 模板选择器 */}
        {showTemplates && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>选择预设模板</CardTitle>
              <CardDescription>
                快速开始，无需复杂配置
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerationTemplates onSelectTemplate={handleSelectTemplate} />
            </CardContent>
          </Card>
        )}

      <div className="grid gap-6 md:grid-cols-3 mb-8" data-tour="stats">
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
        <Card data-tour="config">
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
              data-tour="generate-btn"
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
      <Card className="mb-6">
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
    </DashboardLayout>
  );
}
