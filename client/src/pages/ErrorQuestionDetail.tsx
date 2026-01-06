import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, 
  Brain, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  Video,
  ClipboardList,
  Clock,
  Volume2
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { LatexText } from "@/components/LatexPreview";
import { VoicePlayer } from "@/components/VoicePlayer";
import { TagSelector } from "@/components/TagSelector";
import { SimilarQuestionsSection } from "@/components/SimilarQuestionsSection";
import { ChartVisualization } from "@/components/ChartVisualization";
import { NoteEditor } from "@/components/NoteEditor";
import { useState } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useIsMobile } from "@/hooks/useMobile";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 定义详细分析的类型
type DetailedAnalysis = {
  errorType?: string;
  errorAnalysis?: string;
  knowledgePoints?: string[];
  knowledgeGraph?: string;
  keyPoints?: string[];
  keyPointsExplanation?: string;
  commonMistakes?: string[];
  mistakesAnalysis?: string;
  solvingSteps?: string[];
  solvingStrategy?: string;
  studyAdvice?: string;
  practiceDirection?: string;
};

export default function ErrorQuestionDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, params] = useRoute("/error-questions/:id");
  const [, setLocation] = useLocation();
  
  const questionId = params?.id ? parseInt(params.id) : 0;
  const [showVoicePlayer, setShowVoicePlayer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isMobile = useIsMobile();
  
  // 获取所有错题ID列表用于切换
  const { data: allQuestions = [] } = trpc.errorQuestions.list.useQuery(
    { limit: 1000 },
    { enabled: isMobile }
  );
  const currentIndex = allQuestions.findIndex((q: any) => q.id === questionId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allQuestions.length - 1;
  
  const goToPrevious = () => {
    if (hasPrevious) {
      const prevQuestion = allQuestions[currentIndex - 1];
      setLocation(`/error-questions/${prevQuestion.id}`);
      toast.info("已切换到上一题");
    }
  };
  
  const goToNext = () => {
    if (hasNext) {
      const nextQuestion = allQuestions[currentIndex + 1];
      setLocation(`/error-questions/${nextQuestion.id}`);
      toast.info("已切换到下一题");
    }
  };
  
  // 手势识别
  const { ref: swipeRef, swipeState } = useSwipeGesture<HTMLDivElement>({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    minSwipeDistance: 80,
    preventDefaultTouchMove: true,
  });
  
  // 获取错题标签
  const { data: questionTags = [] } = trpc.tags.getErrorQuestionTags.useQuery(
    { errorQuestionId: questionId },
    { enabled: !!questionId }
  );

  // 获取错题详情
  const { data: question, isLoading: questionLoading } = trpc.errorQuestions.getById.useQuery(
    { questionId },
    { enabled: !!questionId }
  );

  // 深度分析mutation
  const analyzeDetailedMutation = trpc.aiAnalysis.analyzeQuestionDetailed.useMutation({
    onSuccess: () => {
      toast.success("AI深度分析完成！");
      utils.errorQuestions.getById.invalidate({ questionId });
    },
    onError: (error) => {
      toast.error(`分析失败：${error.message}`);
    },
  });

  // 获取AI语音讲解
  const { data: voiceData, isLoading: voiceLoading, refetch: refetchVoice } = trpc.voiceExplanation.getScript.useQuery(
    { errorQuestionId: questionId },
    { enabled: false } // 默认不加载，点击按钮时才加载
  );

  // 加入复习计划mutation
  const addToReviewMutation = trpc.reviewPlan.addToReviewPlan.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("已加入复习计划！系统将按艾宾浩斯曲线提醒您复习");
      } else {
        toast.info("该错题已在复习计划中");
      }
    },
    onError: (error) => {
      toast.error(`加入复习计划失败：${error.message}`);
    },
  });

  // 生成专项练习mutation
  const generatePracticeMutation = trpc.practicePools.generateFromError.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`已生成${data.generatedCount}道专项练习题！`);
        setLocation("/practice-pool");
      }
    },
    onError: (error) => {
      toast.error(`生成失败：${error.message}`);
    },
  });

  // 删除错题mutation
  const deleteMutation = trpc.errorQuestions.delete.useMutation({
    onSuccess: () => {
      toast.success("错题已删除");
      setLocation("/error-questions");
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ questionId });
    setShowDeleteDialog(false);
  };

  const utils = trpc.useUtils();

  if (authLoading || questionLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!question) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>错题不存在或已被删除</AlertDescription>
          </Alert>
          <Button onClick={() => setLocation("/error-questions")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回错题本
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleDetailedAnalysis = () => {
    analyzeDetailedMutation.mutate({ questionId });
  };

  const difficultyMap = {
    easy: { label: "简单", color: "bg-green-100 text-green-800" },
    medium: { label: "中等", color: "bg-yellow-100 text-yellow-800" },
    hard: { label: "困难", color: "bg-red-100 text-red-800" },
  };

  const subjectMap: Record<string, string> = {
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

  const gradeMap: Record<string, string> = {
    junior1: "初一",
    junior2: "初二",
    junior3: "初三",
    senior1: "高一",
    senior2: "高二",
    senior3: "高三",
  };

  return (
    <DashboardLayout>
      <div ref={swipeRef} className="container py-8 max-w-6xl relative">
        {/* 移动端滑动提示 */}
        {isMobile && swipeState.isSwiping && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
            <div className="bg-black/80 text-white px-6 py-4 rounded-full flex items-center gap-3 backdrop-blur-sm">
              {swipeState.direction === "left" && hasNext && (
                <>
                  <ChevronRight className="h-6 w-6" />
                  <span className="text-sm font-medium">下一题</span>
                </>
              )}
              {swipeState.direction === "right" && hasPrevious && (
                <>
                  <ChevronLeft className="h-6 w-6" />
                  <span className="text-sm font-medium">上一题</span>
                </>
              )}
              {swipeState.direction === "left" && !hasNext && (
                <span className="text-sm font-medium">已是最后一题</span>
              )}
              {swipeState.direction === "right" && !hasPrevious && (
                <span className="text-sm font-medium">已是第一题</span>
              )}
            </div>
          </div>
        )}
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button 
            onClick={() => setLocation("/dashboard")} 
            className="hover:text-foreground transition-colors"
          >
            首页
          </button>
          <span>/</span>
          <button 
            onClick={() => setLocation("/error-questions")} 
            className="hover:text-foreground transition-colors"
          >
            错题本
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">错题详情</span>
        </div>

        {/* 头部 */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-3">{question.title || "错题详情"}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {subjectMap[question.subject]}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {gradeMap[question.grade]}
                </Badge>
                {question.difficulty && (
                  <Badge className={`${difficultyMap[question.difficulty].color} text-sm`}>
                    {difficultyMap[question.difficulty].label}
                  </Badge>
                )}
                {question.isMastered && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    已掌握
                  </Badge>
                )}
                {question.isAnalyzed && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-sm">
                    <Brain className="mr-1 h-3 w-3" />
                    已分析
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!showVoicePlayer) {
                  refetchVoice();
                  setShowVoicePlayer(true);
                  toast.info("正在生成AI语音讲解...");
                } else {
                  setShowVoicePlayer(false);
                }
              }}
              disabled={voiceLoading}
              size="lg"
            >
              <Volume2 className="mr-2 h-4 w-4" />
              {voiceLoading ? "生成中..." : showVoicePlayer ? "隐藏AI讲解" : "AI语音讲解"}
            </Button>
            <Button
              variant="outline"
              onClick={() => addToReviewMutation.mutate({ errorQuestionId: questionId })}
              disabled={addToReviewMutation.isPending}
              size="lg"
            >
              <Clock className="mr-2 h-4 w-4" />
              {addToReviewMutation.isPending ? "添加中..." : "加入复习计划"}
            </Button>
            <Button
              onClick={handleDetailedAnalysis}
              disabled={analyzeDetailedMutation.isPending}
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {analyzeDetailedMutation.isPending ? "分析中..." : "AI深度分析"}
            </Button>
            <Button
              variant="default"
              onClick={() => generatePracticeMutation.mutate({ errorQuestionId: questionId, count: 3 })}
              disabled={generatePracticeMutation.isPending}
              size="lg"
            >
              <Target className="mr-2 h-4 w-4" />
              {generatePracticeMutation.isPending ? "生成中..." : "生成专项练习"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
              size="lg"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除错题
            </Button>
          </div>

          {/* 删除确认对话框 */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>
                  您确定要删除这道错题吗？此操作不可恢复，将同时删除相关的AI分析、练习记录等数据。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* 题目内容 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              题目内容
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {question.imageUrl && (
              <img
                src={question.imageUrl}
                alt="题目图片"
                className="w-full max-w-2xl rounded-lg border"
              />
            )}
            <LatexText text={question.content} className="prose max-w-none dark:prose-invert" />
          </CardContent>
        </Card>

        {/* 图表可视化 */}
        <ChartVisualization 
          content={question.content} 
          imageUrl={question.imageUrl || undefined}
        />

        {/* 答案对比 */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {question.userAnswer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  我的答案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LatexText text={question.userAnswer} className="prose prose-sm max-w-none dark:prose-invert" />
              </CardContent>
            </Card>
          )}
          
          {question.correctAnswer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  正确答案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LatexText text={question.correctAnswer} className="prose prose-sm max-w-none dark:prose-invert" />
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI分析结果 */}
        {question.isAnalyzed && question.detailedAnalysis ? (
          <Tabs defaultValue="overview" className="mb-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">总览</TabsTrigger>
              <TabsTrigger value="keypoints">考点解读</TabsTrigger>
              <TabsTrigger value="mistakes">易错分析</TabsTrigger>
              <TabsTrigger value="solving">解题思路</TabsTrigger>
              <TabsTrigger value="advice">学习建议</TabsTrigger>
            </TabsList>

            {/* 总览 */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    错误类型分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium mb-2">
                    {(JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).errorType || '未分析'}
                  </p>
                  <LatexText text={(JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).errorAnalysis || ''} className="prose prose-sm max-w-none dark:prose-invert" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    知识点关联
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {((JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).knowledgePoints || []).map((kp: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant={kp.importance === "high" ? "default" : "secondary"}
                      >
                        {kp.name}
                        <span className="ml-1 text-xs">
                          ({kp.importance === "high" ? "重点" : kp.importance === "medium" ? "常规" : "辅助"})
                        </span>
                      </Badge>
                    ))}
                  </div>
                  <LatexText text={(JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).knowledgeGraph || ''} className="prose prose-sm max-w-none dark:prose-invert" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* 考点解读 */}
            <TabsContent value="keypoints">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    核心考点深度解读
                  </CardTitle>
                  <CardDescription>
                    本题涉及的核心考点及其在考试中的重要性
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">核心考点列表：</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {((JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).keyPoints || []).map((point: string, idx: number) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">详细解读：</h4>
                    <LatexText text={(JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).keyPointsExplanation || ''} className="prose prose-sm max-w-none dark:prose-invert" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 易错分析 */}
            <TabsContent value="mistakes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    常见易错点深度分析
                  </CardTitle>
                  <CardDescription>
                    帮助你避免类似错误
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>常见易错点：</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {((JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).commonMistakes || []).map((mistake: string, idx: number) => (
                          <li key={idx}>{mistake}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">深度分析：</h4>
                    <LatexText text={(JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).mistakesAnalysis || ''} className="prose prose-sm max-w-none dark:prose-invert" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 解题思路 */}
            <TabsContent value="solving">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    正确解题思路
                  </CardTitle>
                  <CardDescription>
                    详细的解题步骤和策略
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">解题步骤：</h4>
                    <ol className="list-decimal list-inside space-y-2">
                      {((JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).solvingSteps || []).map((step: string, idx: number) => (
                        <li key={idx} className="pl-2">{step}</li>
                      ))}
                    </ol>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">解题策略：</h4>
                    <LatexText text={(JSON.parse(question.detailedAnalysis as string) as DetailedAnalysis).solvingStrategy || ''} className="prose prose-sm max-w-none dark:prose-invert" />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">解题技巧：</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {JSON.parse(question.detailedAnalysis).tips?.map((tip: string, idx: number) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 学习建议 */}
            <TabsContent value="advice">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    针对性学习建议
                  </CardTitle>
                  <CardDescription>
                    帮助你巩固薄弱知识点
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">学习建议：</h4>
                    <LatexText text={JSON.parse(question.detailedAnalysis).studyAdvice} className="prose prose-sm max-w-none dark:prose-invert" />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">练习方向：</h4>
                    <LatexText text={JSON.parse(question.detailedAnalysis).practiceDirection} className="prose prose-sm max-w-none dark:prose-invert" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : question.isAnalyzed ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                基础AI分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {question.errorAnalysis && (
                <div>
                  <h4 className="font-semibold mb-2">错误分析：</h4>
                  <LatexText text={question.errorAnalysis} className="prose prose-sm max-w-none dark:prose-invert" />
                </div>
              )}
              {question.detailedExplanation && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">详细解析：</h4>
                    <LatexText text={question.detailedExplanation} className="prose prose-sm max-w-none dark:prose-invert" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Alert className="mb-6">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              点击右上角的"AI深度分析"按钮，获取详细的考点解读、易错点分析和学习建议
            </AlertDescription>
          </Alert>
        )}

        {/* 我的笔记 */}
        <div className="mb-6">
          <NoteEditor
            questionId={questionId}
            initialNotes={question.userNotes || ""}
            initialImages={(question.noteImages as string[]) || []}
          />
        </div>

        {/* 错题标签 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">错题标签</CardTitle>
          </CardHeader>
          <CardContent>
            <TagSelector 
              errorQuestionId={questionId} 
              selectedTags={questionTags}
              onTagsChange={() => {
                utils.tags.getErrorQuestionTags.invalidate({ errorQuestionId: questionId });
              }}
            />
          </CardContent>
        </Card>

        {/* AI语音讲解 */}
        {showVoicePlayer && voiceData?.script && (
          <div className="mb-6">
            <VoicePlayer 
              script={voiceData.script} 
              title="AI语音讲解" 
            />
          </div>
        )}

        {/* 相似题目推荐 */}
        <SimilarQuestionsSection questionId={questionId} />

        {/* 快捷操作 */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                视频学习
              </CardTitle>
              <CardDescription>观看相关知识点讲解视频</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation(`/videos?questionId=${questionId}`)}
              >
                查找学习视频
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                针对性练习
              </CardTitle>
              <CardDescription>生成相似题目巩固知识</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation(`/practice-questions/${question.id}`)}
              >
                生成练习题
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                标记状态
              </CardTitle>
              <CardDescription>更新题目掌握情况</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={question.isMastered ? "secondary" : "default"}
                className="w-full"
              >
                {question.isMastered ? "已掌握" : "标记为已掌握"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
