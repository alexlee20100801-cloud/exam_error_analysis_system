import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle, FileText, Trophy, ArrowLeft } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { LatexText } from "@/components/LatexPreview";

export default function ExamPaperDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/exam-paper/:id");
  // @ts-ignore
  const paperId = params?.id ? parseInt(params.id) : 0;

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 获取试卷详情
  const { data: paperDetail, isLoading } = trpc.realExam.getExamPaperDetail.useQuery(
    { paperId },
    { enabled: paperId > 0 }
  );

  // 提交试卷
  const submitMutation = trpc.realExam.submitExamPaper.useMutation({
    onSuccess: (result) => {
      setIsSubmitted(true);
      toast.success(`试卷已提交！得分：${result.totalScore}/${result.maxScore}`);
    },
    onError: (error) => {
      toast.error(`提交失败：${error.message}`);
    },
  });

  // 计时器
  useEffect(() => {
    if (isSubmitted || !paperDetail) return;

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, isSubmitted, paperDetail]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 处理答案变化
  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // 提交试卷
  const handleSubmit = () => {
    if (!paperDetail) return;

    const answerList = paperDetail.questionsDetail.map(q => ({
      questionId: q.id,
      userAnswer: answers[q.id] || "",
    }));

    submitMutation.mutate({
      paperId,
      answers: answerList,
      timeSpent: Math.floor(elapsedTime / 60), // 转换为分钟
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!paperDetail) {
    return (
      <div className="container py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">试卷不存在</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setLocation("/exam-generator")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回生成器
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果已提交，显示结果
  if (isSubmitted || paperDetail.isCompleted) {
    const result = submitMutation.data;
    
    return (
      <div className="container py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">试卷已完成</CardTitle>
            <CardDescription>{paperDetail.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {result?.totalScore || paperDetail.userScore || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">得分</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{paperDetail.totalScore}</div>
                <div className="text-sm text-muted-foreground mt-1">满分</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {result?.percentage.toFixed(1) || 
                   ((parseFloat(paperDetail.userScore || "0") / paperDetail.totalScore) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">正确率</div>
              </div>
            </div>

            <div className="mt-6 flex gap-4 justify-center">
              <Button onClick={() => setLocation("/exam-generator")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回生成器
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                查看详细解析
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      {/* 试卷头部 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{paperDetail.title}</CardTitle>
              <CardDescription className="mt-2">
                总分：{paperDetail.totalScore}分 | 题数：{paperDetail.totalQuestions}题
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-lg font-mono">
              <Clock className="h-5 w-5" />
              {formatTime(elapsedTime)}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 题目列表 */}
      <div className="space-y-6">
        {paperDetail.questionsDetail.map((question, index) => {
          const questionTypeMap: Record<string, string> = {
            choice: "选择题",
            blank: "填空题",
            short_answer: "简答题",
            calculation: "计算题",
            essay: "论述题",
          };

          return (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    <span className="text-muted-foreground mr-2">
                      {index + 1}.
                    </span>
                    {question.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                      {questionTypeMap[question.questionType] || question.questionType}
                    </span>
                    <span className="font-medium">{question.score}分</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <LatexText text={question.content} className="prose prose-sm max-w-none dark:prose-invert" />
                </div>

                <div className="space-y-2">
                  <Label>你的答案</Label>
                  <Textarea
                    placeholder="请输入答案..."
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 提交按钮 */}
      <Card className="mt-6 sticky bottom-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              已答题：{Object.keys(answers).length} / {paperDetail.totalQuestions}
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/exam-generator")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  "提交中..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    提交试卷
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
