/**
 * 智能组卷配置页面
 * AI智能生成试卷
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, FileText, TrendingUp } from "lucide-react";

const gradeOptions = [
  { value: "junior1", label: "初一" },
  { value: "junior2", label: "初二" },
  { value: "junior3", label: "初三" },
  { value: "senior1", label: "高一" },
  { value: "senior2", label: "高二" },
  { value: "senior3", label: "高三" },
];

const subjectOptions = [
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

const examTypeOptions = [
  { value: "practice", label: "练习" },
  { value: "monthly", label: "月考" },
  { value: "midterm", label: "期中考试" },
  { value: "final", label: "期末考试" },
];

export default function SmartPaperGenerator() {
  const [, navigate] = useLocation();
  const [generating, setGenerating] = useState(false);
  
  // 基本配置
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [examType, setExamType] = useState<string>("practice");
  
  // 难度分布
  const [easyPercent, setEasyPercent] = useState(30);
  const [mediumPercent, setMediumPercent] = useState(50);
  const [hardPercent, setHardPercent] = useState(20);
  
  // 试卷参数
  const [totalScore, setTotalScore] = useState(100);
  const [timeLimit, setTimeLimit] = useState(90);
  
  // 获取推荐配置
  const { data: recommendedConfig } = trpc.smartPaper.getRecommendedConfig.useQuery(
    { grade, subject, examType: examType as any },
    { enabled: !!grade && !!subject }
  );
  
  // 生成试卷
  const generateMutation = trpc.smartPaper.generate.useMutation({
    onSuccess: (result) => {
      setGenerating(false);
      if (result.success && result.data) {
        alert(`试卷生成成功！\n总题数：${result.data.statistics.totalQuestions}\n总分：${result.data.statistics.totalScore}\n质量分数：${result.data.statistics.qualityScore}/100`);
        // 可以导航到试卷预览页面
      } else {
        alert(`生成失败：${result.error || "未知错误"}`);
      }
    },
    onError: (error) => {
      setGenerating(false);
      alert(`生成失败：${error.message}`);
    },
  });
  
  const handleLoadRecommendedConfig = () => {
    if (recommendedConfig?.success && recommendedConfig.data) {
      const config = recommendedConfig.data;
      setTitle(config.title);
      setEasyPercent(config.difficultyDistribution.easy);
      setMediumPercent(config.difficultyDistribution.medium);
      setHardPercent(config.difficultyDistribution.hard);
      setTotalScore(config.totalScore);
      setTimeLimit(config.timeLimit);
      alert("已加载推荐配置");
    }
  };
  
  const handleGenerate = () => {
    if (!title || !grade || !subject) {
      alert("请填写试卷标题、年级和学科");
      return;
    }
    
    if (easyPercent + mediumPercent + hardPercent !== 100) {
      alert("难度分布总和必须为100%");
      return;
    }
    
    setGenerating(true);
    
    // 使用推荐的题型分布
    const questionTypeDistribution = recommendedConfig?.success && recommendedConfig.data
      ? recommendedConfig.data.questionTypeDistribution
      : [
          { type: "single_choice", count: 10, scorePerQuestion: 3 },
          { type: "fill_blank", count: 5, scorePerQuestion: 4 },
          { type: "short_answer", count: 4, scorePerQuestion: 8 },
        ];
    
    generateMutation.mutate({
      title,
      grade,
      subject,
      difficultyDistribution: {
        easy: easyPercent,
        medium: mediumPercent,
        hard: hardPercent,
      },
      questionTypeDistribution: questionTypeDistribution as any,
      totalScore,
      timeLimit,
      avoidDuplicateKnowledgePoints: true,
      prioritizeRecentQuestions: true,
    });
  };
  
  return (
    <div className="container py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin/question-bank")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回题库管理
      </Button>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          AI智能组卷
        </h1>
        <p className="text-muted-foreground mt-2">
          基于知识点和难度分布的智能试卷生成
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 配置表单 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>设置试卷的基本参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">试卷标题 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：初三数学期中考试试卷"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">年级 *</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择年级" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">学科 *</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择学科" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="examType">考试类型</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {recommendedConfig?.success && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadRecommendedConfig}
                  className="w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  加载推荐配置
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* 难度分布 */}
          <Card>
            <CardHeader>
              <CardTitle>难度分布</CardTitle>
              <CardDescription>调整试卷的难度比例（总和必须为100%）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>简单题</Label>
                  <span className="text-sm font-medium">{easyPercent}%</span>
                </div>
                <Slider
                  value={[easyPercent]}
                  onValueChange={([value]) => setEasyPercent(value)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>中等题</Label>
                  <span className="text-sm font-medium">{mediumPercent}%</span>
                </div>
                <Slider
                  value={[mediumPercent]}
                  onValueChange={([value]) => setMediumPercent(value)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>困难题</Label>
                  <span className="text-sm font-medium">{hardPercent}%</span>
                </div>
                <Slider
                  value={[hardPercent]}
                  onValueChange={([value]) => setHardPercent(value)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">总计</span>
                <span className={`text-sm font-bold ${easyPercent + mediumPercent + hardPercent === 100 ? "text-green-600" : "text-red-600"}`}>
                  {easyPercent + mediumPercent + hardPercent}%
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* 试卷参数 */}
          <Card>
            <CardHeader>
              <CardTitle>试卷参数</CardTitle>
              <CardDescription>设置总分和时长</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalScore">总分</Label>
                  <Input
                    id="totalScore"
                    type="number"
                    value={totalScore}
                    onChange={(e) => setTotalScore(parseInt(e.target.value) || 100)}
                    min={1}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">时长（分钟）</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || 90)}
                    min={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 侧边栏 - 生成按钮和说明 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>生成试卷</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full"
                size="lg"
              >
                <FileText className="h-5 w-5 mr-2" />
                {generating ? "生成中..." : "开始生成"}
              </Button>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p>✓ 自动筛选符合条件的题目</p>
                <p>✓ 智能匹配难度分布</p>
                <p>✓ 避免知识点重复</p>
                <p>✓ 优先使用最新题目</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>算法说明</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>1. 题目筛选：</strong>
                根据年级、学科筛选题库
              </p>
              <p>
                <strong>2. 难度分配：</strong>
                按设定比例分配各难度题目
              </p>
              <p>
                <strong>3. 题型搭配：</strong>
                根据学科特点自动配置题型
              </p>
              <p>
                <strong>4. 质量评估：</strong>
                生成后自动评估试卷质量
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
