import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Heart, Clock, CheckCircle2, XCircle, School, Calendar, Sparkles, TrendingUp } from "lucide-react";

// 常量定义
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

const GRADES = {
  junior1: "初一",
  junior2: "初二",
  junior3: "初三",
  senior1: "高一",
  senior2: "高二",
  senior3: "高三",
};

const DIFFICULTIES = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export default function RealExamPractice() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    subject: "",
    grade: user?.grade || "",
    difficulty: "",
    school: "",
  });
  
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // 获取智能推荐
  const { data: recommendedQuestions } = trpc.realExam.getRecommendedQuestions.useQuery({
    limit: 6,
  });

  const { data: recommendationStats } = trpc.realExam.getRecommendationStats.useQuery();

  // 获取真题列表
  const { data: questionsData, isLoading, refetch } = trpc.realExam.getRealExamQuestions.useQuery({
    ...filters,
    limit: 50,
  });

  // 获取可用学校列表
  const { data: schools } = trpc.realExam.getAvailableSchools.useQuery({
    region: user?.region || undefined,
  });

  // 获取收藏的真题
  const { data: bookmarkedQuestions } = trpc.realExam.getBookmarkedQuestions.useQuery();

  // 收藏/取消收藏
  const toggleBookmarkMutation = trpc.realExam.toggleBookmark.useMutation({
    onSuccess: () => {
      toast.success("操作成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  // 记录练习
  const recordPracticeMutation = trpc.realExam.recordPractice.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // 处理答题提交
  const handleSubmitAnswer = () => {
    if (!selectedQuestion || !userAnswer.trim()) {
      toast.error("请输入答案");
      return;
    }

    // 简单的答案比较（去除空格后比较）
    const correctAnswer = selectedQuestion.answer.replace(/\s/g, "").toLowerCase();
    const submittedAnswer = userAnswer.replace(/\s/g, "").toLowerCase();
    const correct = correctAnswer === submittedAnswer;

    setIsCorrect(correct);
    setShowResult(true);

    // 记录练习
    recordPracticeMutation.mutate({
      questionId: selectedQuestion.id,
      userAnswer,
      isCorrect: correct,
      score: correct ? selectedQuestion.score || 10 : 0,
    });
  };

  // 关闭答题对话框
  const handleCloseDialog = () => {
    setSelectedQuestion(null);
    setUserAnswer("");
    setShowResult(false);
    setIsCorrect(false);
  };

  // 检查题目是否已收藏
  const isBookmarked = (questionId: number) => {
    return bookmarkedQuestions?.some((q: any) => q.questionId === questionId);
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-500" />
          真题练习
        </h1>
        <p className="text-muted-foreground mt-2">
          练习深圳地区名校真题，提升应试能力
        </p>
      </div>

      {/* 智能推荐面板 */}
      {recommendedQuestions && recommendedQuestions.length > 0 && (
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    智能推荐
                    <Badge variant="secondary" className="text-xs">
                      基于你的错题分析
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {recommendationStats && (
                      <span className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        已分析 {recommendationStats.totalErrorQuestions} 道错题，
                        发现 {recommendationStats.weakKnowledgePointsCount} 个薄弱知识点
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedQuestions.map((rec: any) => (
                <Card
                  key={rec.question.id}
                  className="hover:shadow-md transition-shadow bg-white"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">
                          {rec.question.title}
                        </CardTitle>
                        {rec.reason && (
                          <Badge variant="outline" className="text-xs mb-2">
                            {rec.reason}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleBookmarkMutation.mutate({
                            questionId: rec.question.id,
                          })
                        }
                        className="shrink-0"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            isBookmarked(rec.question.id)
                              ? "fill-red-500 text-red-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {SUBJECTS[rec.question.subject as keyof typeof SUBJECTS]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {
                          DIFFICULTIES[
                            rec.question.difficulty as keyof typeof DIFFICULTIES
                          ]
                        }
                      </Badge>
                      {rec.question.sourceSchool && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <School className="h-3 w-3" />
                          {rec.question.sourceSchool}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedQuestion(rec.question)}
                    >
                      开始练习
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 筛选器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>学科</Label>
              <Select
                value={filters.subject}
                onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {Object.entries(SUBJECTS).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>年级</Label>
              <Select
                value={filters.grade}
                onValueChange={(value) => setFilters(prev => ({ ...prev, grade: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {Object.entries(GRADES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>难度</Label>
              <Select
                value={filters.difficulty}
                onValueChange={(value) => setFilters(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {Object.entries(DIFFICULTIES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>来源学校</Label>
              <Select
                value={filters.school}
                onValueChange={(value) => setFilters(prev => ({ ...prev, school: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {schools?.filter((school): school is string => school !== null).map((school) => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 真题列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      ) : !questionsData || questionsData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无符合条件的真题</p>
            <p className="text-sm mt-2">请尝试调整筛选条件</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questionsData.map((question: any) => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{question.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {question.content}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBookmarkMutation.mutate({ questionId: question.id })}
                    className="shrink-0"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        isBookmarked(question.id)
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">
                    {SUBJECTS[question.subject as keyof typeof SUBJECTS]}
                  </Badge>
                  <Badge variant="secondary">
                    {GRADES[question.grade as keyof typeof GRADES]}
                  </Badge>
                  <Badge variant="outline">
                    {DIFFICULTIES[question.difficulty as keyof typeof DIFFICULTIES]}
                  </Badge>
                  {question.sourceSchool && (
                    <Badge variant="outline" className="gap-1">
                      <School className="h-3 w-3" />
                      {question.sourceSchool}
                    </Badge>
                  )}
                  {question.examYear && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {question.examYear}年
                    </Badge>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => setSelectedQuestion(question)}
                >
                  开始答题
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 答题对话框 */}
      <Dialog open={!!selectedQuestion} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuestion?.title}</DialogTitle>
            <DialogDescription>
              {selectedQuestion?.sourceSchool && `来源：${selectedQuestion.sourceSchool}`}
              {selectedQuestion?.examYear && ` · ${selectedQuestion.examYear}年`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 题目内容 */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{selectedQuestion?.content}</p>
            </div>

            {/* 答案输入 */}
            {!showResult && (
              <div className="space-y-2">
                <Label>你的答案</Label>
                <Textarea
                  placeholder="请输入你的答案..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  rows={6}
                  disabled={showResult}
                />
              </div>
            )}

            {/* 结果展示 */}
            {showResult && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect
                      ? "bg-green-50 border-green-500"
                      : "bg-red-50 border-red-500"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
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
                  </div>
                  <div className="text-sm">
                    <p className="font-medium mb-1">你的答案：</p>
                    <p className="text-muted-foreground">{userAnswer}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">正确答案：</p>
                  <p className="text-blue-800 whitespace-pre-wrap">
                    {selectedQuestion?.answer}
                  </p>
                </div>

                {selectedQuestion?.explanation && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="font-medium mb-2">解析：</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {!showResult ? (
              <>
                <Button variant="outline" onClick={handleCloseDialog}>
                  取消
                </Button>
                <Button onClick={handleSubmitAnswer}>
                  提交答案
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseDialog}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
