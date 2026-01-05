import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Sparkles, BookOpen, Target, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

// 学科映射
const SUBJECTS = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  politics: "政治",
  history: "历史",
  geography: "地理",
};

// 难度映射
const DIFFICULTIES = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

// 题型映射
const QUESTION_TYPES = {
  choice: { name: "选择题", score: 5, icon: "📝" },
  blank: { name: "填空题", score: 5, icon: "✍️" },
  short_answer: { name: "简答题", score: 10, icon: "📋" },
  calculation: { name: "计算题", score: 12, icon: "🔢" },
  essay: { name: "论述题", score: 15, icon: "📄" },
};

// 智能题型建议（根据学科）
const SUBJECT_RECOMMENDATIONS: Record<string, Record<string, number>> = {
  math: { choice: 40, blank: 20, calculation: 30, short_answer: 10 },
  physics: { choice: 35, blank: 15, calculation: 35, short_answer: 15 },
  chemistry: { choice: 40, blank: 20, calculation: 20, short_answer: 20 },
  chinese: { choice: 30, blank: 10, short_answer: 30, essay: 30 },
  english: { choice: 40, blank: 20, short_answer: 20, essay: 20 },
  biology: { choice: 50, blank: 20, short_answer: 30 },
  politics: { choice: 40, short_answer: 30, essay: 30 },
  history: { choice: 40, short_answer: 30, essay: 30 },
  geography: { choice: 45, blank: 15, short_answer: 40 },
};

export default function ExamPaperGenerator() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [totalQuestions, setTotalQuestions] = useState(20);
  
  // 题型分布（百分比）
  const [typeDistribution, setTypeDistribution] = useState<Record<string, number>>({
    choice: 50,
    blank: 20,
    short_answer: 20,
    calculation: 10,
    essay: 0,
  });

  const generateMutation = trpc.realExam.generateExamPaper.useMutation({
    onSuccess: (data) => {
      toast.success("试卷生成成功！");
      setLocation(`/exam-paper/${data.paperId}`);
    },
    onError: (error) => {
      toast.error(`生成失败：${error.message}`);
    },
  });

  // 应用智能建议
  const applyRecommendation = () => {
    if (!subject) {
      toast.error("请先选择学科");
      return;
    }
    const recommendation = SUBJECT_RECOMMENDATIONS[subject];
    if (recommendation) {
      setTypeDistribution(recommendation);
      toast.success("已应用智能题型建议");
    }
  };

  // 计算实际题数分布
  const getQuestionCounts = () => {
    const counts: Record<string, number> = {};
    let remaining = totalQuestions;
    
    // 按百分比分配题目
    Object.entries(typeDistribution).forEach(([type, percentage], index, arr) => {
      if (percentage > 0) {
        if (index === arr.length - 1) {
          // 最后一个类型分配剩余的所有题目
          counts[type] = remaining;
        } else {
          const count = Math.round((totalQuestions * percentage) / 100);
          counts[type] = count;
          remaining -= count;
        }
      }
    });
    
    return counts;
  };

  // 计算总分
  const calculateTotalScore = () => {
    const counts = getQuestionCounts();
    let total = 0;
    Object.entries(counts).forEach(([type, count]) => {
      const typeInfo = QUESTION_TYPES[type as keyof typeof QUESTION_TYPES];
      if (typeInfo) {
        total += count * typeInfo.score;
      }
    });
    return total;
  };

  // 处理题型百分比变化
  const handleTypeChange = (type: string, value: number[]) => {
    setTypeDistribution(prev => ({ ...prev, [type]: value[0] }));
  };

  // 生成试卷
  const handleGenerate = () => {
    if (!subject) {
      toast.error("请选择学科");
      return;
    }
    if (!user?.grade) {
      toast.error("请先在个人资料中设置年级");
      return;
    }
    if (!title.trim()) {
      toast.error("请输入试卷标题");
      return;
    }

    const counts = getQuestionCounts();
    const questionTypes = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));

    const schoolLevel = user.grade.startsWith("junior") ? "junior" : "senior";

    generateMutation.mutate({
      title: title.trim(),
      subject,
      grade: user.grade,
      schoolLevel,
      difficulty,
      totalQuestions,
      questionTypes,
    });
  };

  const questionCounts = getQuestionCounts();
  const totalScore = calculateTotalScore();
  const totalPercentage = Object.values(typeDistribution).reduce((sum, val) => sum + val, 0);

  return (
    <div className="container py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-purple-500" />
          AI试卷生成器
        </h1>
        <p className="text-muted-foreground mt-2">
          智能生成个性化试卷，支持自定义题型分布和难度
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：配置区 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                基本信息
              </CardTitle>
              <CardDescription>设置试卷的基本参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>试卷标题</Label>
                <Input
                  placeholder="例如：数学第一单元测试"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>学科</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择学科" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUBJECTS).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>难度</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIFFICULTIES).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>总题数：{totalQuestions} 题</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyRecommendation}
                    disabled={!subject}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    智能建议
                  </Button>
                </div>
                <Slider
                  value={[totalQuestions]}
                  onValueChange={(val) => setTotalQuestions(val[0])}
                  min={10}
                  max={50}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  建议题数：10-50题
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 题型分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                题型分布
              </CardTitle>
              <CardDescription>
                调整各题型的比例（总和应为100%，当前：{totalPercentage}%）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(QUESTION_TYPES).map(([key, info]) => {
                const count = questionCounts[key] || 0;
                const percentage = typeDistribution[key] || 0;
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <span className="text-lg">{info.icon}</span>
                        {info.name}
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {count}题 × {info.score}分 = {count * info.score}分
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[percentage]}
                        onValueChange={(val) => handleTypeChange(key, val)}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}

              {totalPercentage !== 100 && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ 题型比例总和应为100%，当前为{totalPercentage}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：预览区 */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                试卷预览
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">学科</span>
                  <span className="font-medium">
                    {subject ? SUBJECTS[subject as keyof typeof SUBJECTS] : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">难度</span>
                  <span className="font-medium">
                    {DIFFICULTIES[difficulty as keyof typeof DIFFICULTIES]}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">年级</span>
                  <span className="font-medium">
                    {user?.grade ? (
                      user.grade === "junior1" ? "初一" :
                      user.grade === "junior2" ? "初二" :
                      user.grade === "junior3" ? "初三" :
                      user.grade === "senior1" ? "高一" :
                      user.grade === "senior2" ? "高二" :
                      user.grade === "senior3" ? "高三" : user.grade
                    ) : "未设置"}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">题型结构</h4>
                <div className="space-y-2">
                  {Object.entries(questionCounts)
                    .filter(([_, count]) => count > 0)
                    .map(([type, count]) => {
                      const info = QUESTION_TYPES[type as keyof typeof QUESTION_TYPES];
                      return (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {info.icon} {info.name}
                          </span>
                          <span className="font-medium">{count}题</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">总题数</span>
                  <span className="text-2xl font-bold">{totalQuestions}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium">总分</span>
                  <span className="text-2xl font-bold text-primary">{totalScore}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={
                  !subject ||
                  !title.trim() ||
                  totalPercentage !== 100 ||
                  generateMutation.isPending
                }
              >
                {generateMutation.isPending ? (
                  <>生成中...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    生成试卷
                  </>
                )}
              </Button>

              {!user?.grade && (
                <p className="text-xs text-destructive text-center">
                  请先在个人资料中设置年级
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
