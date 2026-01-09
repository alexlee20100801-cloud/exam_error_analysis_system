import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  BookOpen,
  Send,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { LatexText } from "@/components/LatexPreview";
import { ChartVisualization } from "@/components/ChartVisualization";

export default function PracticeQuestions() {
  const { user, loading: authLoading } = useAuth();
  const [, params] = useRoute("/practice-questions/:errorQuestionId");
  const [, setLocation] = useLocation();

  // @ts-ignore
  const errorQuestionId = params?.errorQuestionId ? parseInt(params.errorQuestionId) : 0;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [gradingResults, setGradingResults] = useState<Record<number, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 生成练习题
  const generateMutation = trpc.practiceQuestions.generateFromError.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("练习题生成成功！");
      } else {
        // @ts-ignore
        toast.error(`生成失败：${data.error}`);
      }
    },
    onError: (error) => {
      toast.error(`生成失败：${error.message}`);
    },
  });

  // 批改答案
  const gradeMutation = trpc.practiceQuestions.gradeAnswer.useMutation({
    onSuccess: (data, variables) => {
      if (data.success) {
        setGradingResults((prev) => ({
          ...prev,
          [currentQuestionIndex]: data.grading,
        }));
        toast.success("批改完成！");
      } else {
        toast.error(`批改失败：${data.error}`);
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(`批改失败：${error.message}`);
      setIsSubmitting(false);
    },
  });

  // 初始化时生成练习题
  useState(() => {
    if (errorQuestionId && !generateMutation.data && !generateMutation.isPending) {
      setTimeout(() => {
        generateMutation.mutate({ errorQuestionId, count: 3 });
      }, 100);
    }
  });

  const handleAnswerChange = (answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: answer,
    }));
  };

  const handleSubmitAnswer = () => {
    // @ts-ignore
    const currentQuestion = generateMutation.data?.questions?.[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];

    if (!currentQuestion || !userAnswer || !userAnswer.trim()) {
      toast.error("请先输入答案");
      return;
    }

    setIsSubmitting(true);
    gradeMutation.mutate({
      questionContent: currentQuestion.content,
      correctAnswer: currentQuestion.answer,
      userAnswer: userAnswer,
      // @ts-ignore
      subject: generateMutation.data?.errorQuestion?.subject || "math",
    });
  };

  const handleNextQuestion = () => {
    if (
      // @ts-ignore
      generateMutation.data?.questions &&
      // @ts-ignore
      currentQuestionIndex < generateMutation.data.questions.length - 1
    ) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  if (authLoading || generateMutation.isPending) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {generateMutation.isPending ? "AI正在生成练习题..." : "加载中..."}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!generateMutation.data || !generateMutation.data.success) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              // @ts-ignore
              {generateMutation.data?.error || "练习题生成失败"}
            </AlertDescription>
          </Alert>
          <Button onClick={() => setLocation("/error-questions")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回错题本
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // @ts-ignore
  const questions = generateMutation.data.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const currentGrading = gradingResults[currentQuestionIndex];
  const currentAnswer = userAnswers[currentQuestionIndex] || "";

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-4xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/error-questions/${errorQuestionId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回错题详情
            </Button>
            <div>
              <h1 className="text-3xl font-bold">针对性练习</h1>
              <p className="text-muted-foreground mt-1">
                // @ts-ignore
                基于错题：{generateMutation.data.errorQuestion?.title}
              </p>
            </div>
          </div>
        </div>

        {/* 进度指示器 */}
        <div className="flex items-center gap-2 mb-6">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-2 rounded-full ${
                index === currentQuestionIndex
                  ? "bg-primary"
                  : index < currentQuestionIndex
                  ? "bg-green-500"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* 题目卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                第 {currentQuestionIndex + 1} 题 / 共 {questions.length} 题
              </CardTitle>
              <Badge
                variant={
                  currentQuestion.difficulty === "easy"
                    ? "secondary"
                    : currentQuestion.difficulty === "hard"
                    ? "destructive"
                    : "default"
                }
              >
                {currentQuestion.difficulty === "easy"
                  ? "简单"
                  : currentQuestion.difficulty === "hard"
                  ? "困难"
                  : "中等"}
              </Badge>
            </div>
            <CardDescription>{currentQuestion.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 题目内容 */}
            <ChartVisualization content={currentQuestion.content} />

            {/* 答题区域 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">你的答案：</label>
              <Textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="请输入你的答案..."
                rows={6}
                disabled={!!currentGrading}
              />
            </div>

            {/* 提交按钮 */}
            {!currentGrading && (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI批改中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    提交答案
                  </>
                )}
              </Button>
            )}

            {/* 批改结果 */}
            {currentGrading && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  {currentGrading.isCorrect === "correct" ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-600">完全正确！</span>
                    </>
                  ) : currentGrading.isCorrect === "partial" ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold text-yellow-600">部分正确</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-red-600">答案错误</span>
                    </>
                  )}
                  <Badge variant="outline" className="ml-auto">
                    得分：{currentGrading.score} 分
                  </Badge>
                </div>

                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        <strong>批改意见：</strong>
                        <p className="mt-1">{currentGrading.feedback}</p>
                      </div>
                      <div>
                        <strong>改进建议：</strong>
                        <p className="mt-1">{currentGrading.suggestions}</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">标准答案：</h4>
                  <LatexText text={currentQuestion.answer} className="prose prose-sm max-w-none dark:prose-invert" />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">详细解析：</h4>
                  <LatexText text={currentQuestion.explanation} className="prose prose-sm max-w-none dark:prose-invert" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 导航按钮 */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            上一题
          </Button>
          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={handleNextQuestion}>下一题</Button>
          ) : (
            <Button onClick={() => setLocation(`/error-questions/${errorQuestionId}`)}>
              完成练习
            </Button>
          )}
        </div>

        {/* 练习总结 */}
        {Object.keys(gradingResults).length === questions.length && (
          <Card className="mt-6 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                练习完成！
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  总题数：{questions.length} 题
                </p>
                <p>
                  平均得分：
                  {Math.round(
                    Object.values(gradingResults).reduce(
                      (sum: number, r: any) => sum + r.score,
                      0
                    ) / questions.length
                  )}{" "}
                  分
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  继续努力，反复练习才能真正掌握知识点！
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
