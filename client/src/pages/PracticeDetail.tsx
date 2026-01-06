import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { SimilarPracticesSection } from "@/components/SimilarPracticesSection";

/**
 * 专项练习详情和答题页面
 */
export default function PracticeDetail() {
  const [, params] = useRoute("/practice/:id");
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  
  const practiceId = params?.id ? parseInt(params.id) : 0;
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 获取练习详情 - 这里需要修改API来支持单个练习查询
  const { data: practiceData, isLoading } = trpc.practicePools.getMyPracticePool.useQuery({});
  
  // 提交答案
  const completeMutation = trpc.practicePools.completePractice.useMutation({
    onSuccess: () => {
      toast.success("答案已提交！");
      setIsSubmitted(true);
    },
    onError: (error) => {
      toast.error(`提交失败：${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 找到当前练习
  const practice = practiceData?.practices?.find((p: any) => p.pool.id === practiceId);
  
  if (!practice) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">练习不存在</h3>
            <Button onClick={() => navigate("/practice-pool")}>
              返回练习列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errorQuestion = practice.errorQuestion;
  const practiceQuestion = practice.question;
  const poolInfo = practice.pool;

  const handleSubmit = () => {
    if (!userAnswer.trim()) {
      toast.error("请先作答");
      return;
    }

    // 简单的评分逻辑：随机生成分数（实际应该由后端评分）
    const score = Math.floor(Math.random() * 40) + 60; // 60-100分

    completeMutation.mutate({
      practicePoolId: poolInfo.id,
      score,
    });
  };

  const isCorrect = poolInfo.score && poolInfo.score >= 60;
  const alreadyCompleted = poolInfo.status === "completed";

  return (
    <div className="container py-8 max-w-4xl">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/practice-pool")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回练习列表
      </Button>

      {/* 来源错题 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>来源错题</CardTitle>
            <Badge variant="outline">
              {errorQuestion?.subject}
            </Badge>
          </div>
          <CardDescription>
            了解你之前的错误，有助于更好地完成练习
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">题目</h4>
            <p className="text-sm whitespace-pre-wrap">{errorQuestion?.content}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">正确答案</h4>
            <p className="text-sm text-green-600">{errorQuestion?.correctAnswer}</p>
          </div>

        </CardContent>
      </Card>

      {/* 练习题 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>专项练习题</CardTitle>
            <div className="flex gap-2">
              <Badge variant={poolInfo.difficulty === "easy" ? "secondary" : 
                            poolInfo.difficulty === "medium" ? "default" : "destructive"}>
                {poolInfo.difficulty === "easy" ? "简单" :
                 poolInfo.difficulty === "medium" ? "中等" : "困难"}
              </Badge>
              {alreadyCompleted && (
                <Badge variant={isCorrect ? "default" : "destructive"}>
                  {isCorrect ? "正确" : "错误"}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 题目 */}
          <div>
            <h4 className="font-medium mb-3">题目</h4>
              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
              {practiceQuestion?.content || practiceQuestion?.title}
            </p>
          </div>

          {/* 答题区域 */}
          {!alreadyCompleted ? (
            <div>
              <h4 className="font-medium mb-3">你的答案</h4>
              {practiceQuestion && practiceQuestion.questionType === "choice" ? (
                <RadioGroup value={userAnswer} onValueChange={setUserAnswer}>
                  <div className="space-y-2">
                    {["A", "B", "C", "D"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={option} />
                        <Label htmlFor={option} className="cursor-pointer">
                          选项 {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : (
                <Textarea
                  placeholder="请输入你的答案..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              )}
            </div>
          ) : (
            <>
              {/* 显示用户答案 */}
              <div>
                <h4 className="font-medium mb-3">你的答案</h4>
                <div className={`p-4 rounded-lg ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <p className="text-sm whitespace-pre-wrap">
                    已提交
                  </p>
                </div>
              </div>

              {/* 题目内容 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  题目内容
                </h4>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm text-green-700 whitespace-pre-wrap">
                    {practiceQuestion?.content}
                  </p>
                </div>
              </div>

              {/* 得分 */}
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2">
                  {poolInfo.score}分
                </div>
                <p className="text-muted-foreground">
                  {isCorrect ? "做得很好！继续保持！" : "再接再厉，多加练习！"}
                </p>
              </div>
            </>
          )}

          {/* 提交按钮 */}
          {!alreadyCompleted && (
            <div className="flex gap-4">
              <Button
                onClick={handleSubmit}
                disabled={completeMutation.isPending}
                className="flex-1"
              >
                {completeMutation.isPending ? "提交中..." : "提交答案"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/practice-pool")}
              >
                稍后再做
              </Button>
            </div>
          )}

          {/* 已完成的操作按钮 */}
          {alreadyCompleted && (
            <div className="flex gap-4">
              <Button
                onClick={() => navigate("/practice-pool")}
                className="flex-1"
              >
                返回练习列表
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/mistakes")}
              >
                查看更多错题
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 相似题推荐 */}
      <div className="mt-8">
        <SimilarPracticesSection practicePoolId={practiceId} />
      </div>
    </div>
  );
}
