/**
 * AI真题练习页面
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, CheckCircle2, XCircle, TrendingUp, Filter } from "lucide-react";
import { toast } from "sonner";
import { LatexText } from "@/components/LatexPreview";

const subjectNames: Record<string, string> = {
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

const gradeNames: Record<string, string> = {
  junior1: "初一",
  junior2: "初二",
  junior3: "初三",
  senior1: "高一",
  senior2: "高二",
  senior3: "高三",
};

const difficultyNames: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
};

export function QuestionPractice() {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [answeringQuestion, setAnsweringQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [startTime, setStartTime] = useState<number>(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 获取题目列表
  const { data: questionsData, isLoading, refetch } = trpc.questions.list.useQuery({
    subject: selectedSubject || undefined,
    difficulty: selectedDifficulty || undefined,
    limit: 20,
  });

  // 获取练习统计
  const { data: stats } = trpc.questions.getStatistics.useQuery();

  // 提交答案
  const submitAnswerMutation = trpc.questions.submitAnswer.useMutation({
    onSuccess: (data) => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      setResult({ ...data, timeSpent });
      setShowResult(true);
      refetch();
    },
    onError: (error) => {
      toast.error(`提交失败: ${error.message}`);
    },
  });

  const handleStartQuestion = (question: any) => {
    setAnsweringQuestion(question);
    setUserAnswer("");
    setStartTime(Date.now());
    setShowResult(false);
    setResult(null);
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      toast.error("请输入答案");
      return;
    }

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    submitAnswerMutation.mutate({
      questionId: answeringQuestion.id,
      userAnswer: userAnswer.trim(),
      timeSpent,
    });
  };

  const handleNextQuestion = () => {
    setAnsweringQuestion(null);
    setUserAnswer("");
    setShowResult(false);
    setResult(null);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* 页面标题和统计 */}
        <div>
          <h1 className="text-3xl font-bold mb-2">AI真题练习</h1>
          <p className="text-muted-foreground">AI每日更新，海量真题等你来挑战</p>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">总练习</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  正确
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  错误
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.wrong}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  正确率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.accuracy}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 筛选器 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              筛选条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">学科</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部学科" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部学科</SelectItem>
                    {Object.entries(subjectNames).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">难度</label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部难度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部难度</SelectItem>
                    {Object.entries(difficultyNames).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => refetch()} className="w-full">
                  应用筛选
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 题目列表 */}
        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </div>
          )}

          {!isLoading && questionsData?.questions.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无题目，请调整筛选条件或联系管理员生成题目</p>
              </CardContent>
            </Card>
          )}

          {!isLoading &&
            questionsData?.questions.map((question: any) => (
              <Card key={question.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{question.title}</CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">{question.content}</CardDescription>
                    </div>
                    <Button onClick={() => handleStartQuestion(question)} size="sm" className="shrink-0">
                      开始答题
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{subjectNames[question.subject]}</Badge>
                    <Badge variant="outline">{gradeNames[question.grade]}</Badge>
                    <Badge className={difficultyColors[question.difficulty]}>{difficultyNames[question.difficulty]}</Badge>
                    {question.knowledgePoints?.slice(0, 3).map((kp: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {kp}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* 答题对话框 */}
        <Dialog open={!!answeringQuestion} onOpenChange={(open) => !open && handleNextQuestion()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{answeringQuestion?.title}</DialogTitle>
              <DialogDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{subjectNames[answeringQuestion?.subject]}</Badge>
                  <Badge className={difficultyColors[answeringQuestion?.difficulty]}>
                    {difficultyNames[answeringQuestion?.difficulty]}
                  </Badge>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* 题目内容 */}
              <div>
                <h3 className="font-semibold mb-2">题目</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <LatexText text={answeringQuestion?.content || ''} className="prose prose-sm max-w-none dark:prose-invert" />
                </div>
              </div>

              {/* 选择题选项 */}
              {answeringQuestion?.questionType === "choice" && answeringQuestion?.options && (
                <div>
                  <h3 className="font-semibold mb-2">选项</h3>
                  <div className="space-y-2">
                    {answeringQuestion.options.map((option: string, idx: number) => (
                      <div key={idx} className="bg-muted p-3 rounded-lg">
                        {String.fromCharCode(65 + idx)}. {option}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 答案输入 */}
              {!showResult && (
                <div>
                  <h3 className="font-semibold mb-2">你的答案</h3>
                  <Textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="请输入你的答案..."
                    rows={4}
                    className="resize-none"
                  />
                  <div className="mt-4 flex gap-2">
                    <Button onClick={handleSubmitAnswer} disabled={submitAnswerMutation.isPending} className="flex-1">
                      {submitAnswerMutation.isPending ? "提交中..." : "提交答案"}
                    </Button>
                    <Button onClick={handleNextQuestion} variant="outline">
                      取消
                    </Button>
                  </div>
                </div>
              )}

              {/* 答题结果 */}
              {showResult && result && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg ${
                      result.isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-600">回答正确！</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="font-semibold text-red-600">回答错误</span>
                        </>
                      )}
                      <span className="text-sm text-muted-foreground ml-auto">用时: {result.timeSpent}秒</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">你的答案</h3>
                    <div className="bg-muted p-3 rounded-lg">{userAnswer}</div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">正确答案</h3>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <LatexText text={result.correctAnswer} className="prose prose-sm max-w-none" />
                    </div>
                  </div>

                  {result.explanation && (
                    <div>
                      <h3 className="font-semibold mb-2">详细解析</h3>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <LatexText text={result.explanation} className="prose prose-sm max-w-none" />
                      </div>
                    </div>
                  )}

                  <Button onClick={handleNextQuestion} className="w-full">
                    继续练习
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
