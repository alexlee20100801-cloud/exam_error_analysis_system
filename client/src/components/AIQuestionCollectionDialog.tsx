import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, School, BookOpen, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface AIQuestionCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubject?: string;
  defaultGrade?: string;
  onQuestionsGenerated?: (questions: any[]) => void;
}

const SUBJECTS = {
  math: "数学",
  chinese: "语文",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  politics: "政治",
  history: "历史",
  geography: "地理",
};

const GRADES = {
  grade7: "初一",
  grade8: "初二",
  grade9: "初三",
  grade10: "高一",
  grade11: "高二",
  grade12: "高三",
};

const DIFFICULTIES = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const EXAM_TYPES = {
  midterm: "期中考试",
  final: "期末考试",
  monthly: "月考",
  mock: "模拟考",
};

const GENERATION_METHODS = {
  ai_inspired: "AI启发生成（参考主题）",
  ai_similar: "AI相似生成（参考结构）",
  ai_original: "AI原创生成（仅参考知识点）",
};

export function AIQuestionCollectionDialog({
  open,
  onOpenChange,
  defaultSubject,
  defaultGrade,
  onQuestionsGenerated,
}: AIQuestionCollectionDialogProps) {
  const [step, setStep] = useState<"config" | "searching" | "generating" | "results">("config");
  const [subject, setSubject] = useState(defaultSubject || "math");
  const [grade, setGrade] = useState(defaultGrade || "grade7");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [examType, setExamType] = useState("midterm");
  const [year, setYear] = useState(new Date().getFullYear());
  const [semester, setSemester] = useState<"first" | "second">("first");
  const [count, setCount] = useState(5);
  const [generationMethod, setGenerationMethod] = useState<"ai_inspired" | "ai_similar" | "ai_original">("ai_inspired");
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);

  // 获取学校列表
  const schoolLevel = grade.startsWith("grade7") || grade.startsWith("grade8") || grade.startsWith("grade9") ? "junior" : "senior";
  const { data: schoolsData } = trpc.aiQuestionCollection.getSchools.useQuery({ schoolLevel });

  // 搜索题目信息
  const searchMutation = trpc.aiQuestionCollection.searchExamInfo.useMutation({
    onSuccess: (data) => {
      if (data.success && data.results.length > 0) {
        setSearchResults(data.results);
        setStep("generating");
        setProgress(50);
        // 自动开始生成题目
        generateQuestions(data.results);
      } else {
        toast.error("未找到相关试题信息，请调整搜索条件");
        setStep("config");
        setProgress(0);
      }
    },
    onError: (error) => {
      toast.error(`搜索失败：${error.message}`);
      setStep("config");
      setProgress(0);
    },
  });

  // 批量生成题目
  const generateMutation = trpc.aiQuestionCollection.batchGenerateQuestions.useMutation({
    onSuccess: (data) => {
      if (data.success && data.questions.length > 0) {
        setGeneratedQuestions(data.questions);
        setStep("results");
        setProgress(100);
        toast.success(`成功生成 ${data.generatedCount} 道题目！`);
      } else {
        toast.error("题目生成失败，请重试");
        setStep("config");
        setProgress(0);
      }
    },
    onError: (error) => {
      toast.error(`生成失败：${error.message}`);
      setStep("config");
      setProgress(0);
    },
  });

  const handleSearch = () => {
    if (selectedSchools.length === 0) {
      toast.error("请至少选择一所学校");
      return;
    }

    setStep("searching");
    setProgress(25);
    searchMutation.mutate({
      schools: selectedSchools,
      subject: subject as any,
      grade: grade as any,
      examType: EXAM_TYPES[examType as keyof typeof EXAM_TYPES],
      year,
      semester,
      count,
    });
  };

  const generateQuestions = (sources: any[]) => {
    generateMutation.mutate({
      sources,
      subject: subject as any,
      grade: grade as any,
      difficulty,
      count,
      generationMethod,
    });
  };

  const handleSchoolToggle = (school: string) => {
    setSelectedSchools((prev) =>
      prev.includes(school) ? prev.filter((s) => s !== school) : [...prev, school]
    );
  };

  const handleReset = () => {
    setStep("config");
    setProgress(0);
    setSearchResults([]);
    setGeneratedQuestions([]);
  };

  const handleUseQuestions = () => {
    if (onQuestionsGenerated) {
      onQuestionsGenerated(generatedQuestions);
    }
    onOpenChange(false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI网络收集名校试题
          </DialogTitle>
          <DialogDescription>
            从深圳名校试题中提取知识点，生成原创练习题
          </DialogDescription>
        </DialogHeader>

        {/* 进度条 */}
        {step !== "config" && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {step === "searching" && "正在搜索名校试题信息..."}
              {step === "generating" && "正在生成原创题目..."}
              {step === "results" && "生成完成！"}
            </p>
          </div>
        )}

        {/* 配置步骤 */}
        {step === "config" && (
          <div className="space-y-6">
            {/* 基础配置 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">学科</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBJECTS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">年级</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger id="grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GRADES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">难度</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIFFICULTIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="count">题目数量</Label>
                <Select value={count.toString()} onValueChange={(v) => setCount(parseInt(v))}>
                  <SelectTrigger id="count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 8, 10].map((n: any) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} 道题
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 考试信息 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examType">考试类型</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger id="examType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXAM_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">年份</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger id="year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2023, 2022, 2021].map((y: any) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}年
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">学期</Label>
                <Select value={semester} onValueChange={(v) => setSemester(v as any)}>
                  <SelectTrigger id="semester">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">上学期</SelectItem>
                    <SelectItem value="second">下学期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 生成方式 */}
            <div className="space-y-2">
              <Label htmlFor="generationMethod">生成方式</Label>
              <Select value={generationMethod} onValueChange={(v) => setGenerationMethod(v as any)}>
                <SelectTrigger id="generationMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GENERATION_METHODS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 学校选择 */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <School className="h-4 w-4" />
                选择学校（至少选择1所）
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 border rounded-lg bg-muted/30">
                {schoolsData?.schools.map((school: any) => (
                  <div key={school} className="flex items-center space-x-2">
                    <Checkbox
                      id={school}
                      checked={selectedSchools.includes(school)}
                      onCheckedChange={() => handleSchoolToggle(school)}
                    />
                    <label
                      htmlFor={school}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {school}
                    </label>
                  </div>
                ))}
              </div>
              {selectedSchools.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSchools.map((school: any) => (
                    <Badge key={school} variant="secondary">
                      {school}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 搜索中 */}
        {step === "searching" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            <p className="text-lg font-medium">正在搜索名校试题信息...</p>
            <p className="text-sm text-muted-foreground">
              正在从 {selectedSchools.length} 所学校搜索相关试题
            </p>
          </div>
        )}

        {/* 生成中 */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            <p className="text-lg font-medium">正在生成原创题目...</p>
            <p className="text-sm text-muted-foreground">
              找到 {searchResults.length} 个参考来源，正在生成 {count} 道题目
            </p>
          </div>
        )}

        {/* 结果展示 */}
        {step === "results" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">成功生成 {generatedQuestions.length} 道题目</span>
              </div>
              <Badge variant="secondary">
                参考了 {searchResults.length} 个来源
              </Badge>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {generatedQuestions.map((question, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>题目 {index + 1}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">{DIFFICULTIES[question.difficulty]}</Badge>
                        <Badge variant="outline">原创度: {question.originalityScore}%</Badge>
                      </div>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      知识点：{question.knowledgePoints.join("、")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2">{question.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">版权说明</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    所有题目均为AI基于名校试题知识点原创生成，不包含任何受版权保护的原始试题内容。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "config" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSearch} disabled={selectedSchools.length === 0}>
                <Sparkles className="h-4 w-4 mr-2" />
                开始收集
              </Button>
            </>
          )}
          {step === "results" && (
            <>
              <Button variant="outline" onClick={handleReset}>
                重新配置
              </Button>
              <Button onClick={handleUseQuestions}>
                <BookOpen className="h-4 w-4 mr-2" />
                使用这些题目
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
