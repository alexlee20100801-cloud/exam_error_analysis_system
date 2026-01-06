import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";

/**
 * 题目审核详情页面
 */

export default function QuestionReviewDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const questionId = parseInt(params.id || "0");

  // 审核评分
  const [accuracyScore, setAccuracyScore] = useState(5);
  const [difficultyScore, setDifficultyScore] = useState(5);
  const [clarityScore, setClarityScore] = useState(5);
  const [discriminationScore, setDiscriminationScore] = useState(5);
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState("");

  // 获取题目详情
  const { data, isLoading } = trpc.questionReview.getQuestionWithHistory.useQuery({
    questionId,
  });

  // 提交审核
  const submitReviewMutation = trpc.questionReview.submitReview.useMutation({
    onSuccess: () => {
      alert("审核提交成功");
      navigate("/admin/question-review");
    },
    onError: (error) => {
      alert(`审核提交失败: ${error.message}`);
    },
  });

  const handleSubmitReview = (status: "approved" | "rejected" | "needs_revision") => {
    submitReviewMutation.mutate({
      questionId,
      status,
      scores: {
        accuracy: accuracyScore,
        difficulty: difficultyScore,
        clarity: clarityScore,
        discrimination: discriminationScore,
      },
      notes,
      suggestions,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <div className="text-center">加载中...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <div className="text-center">题目不存在</div>
        </div>
      </DashboardLayout>
    );
  }

  const { question, reviews } = data;

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/admin/question-review")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <h1 className="text-3xl font-bold">题目审核</h1>
        </div>

        {/* 题目信息 */}
        <Card>
          <CardHeader>
            <CardTitle>题目详情</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge>{question.subject}</Badge>
              <Badge>{question.grade}</Badge>
              <Badge variant="secondary">{question.difficulty}</Badge>
              <Badge>{question.source || "builtin"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>题目标题</Label>
              <p className="mt-1">{question.title}</p>
            </div>

            <div>
              <Label>题目内容</Label>
              <div className="mt-1 p-4 bg-muted rounded-md whitespace-pre-wrap">
                {question.content}
              </div>
            </div>

            <div>
              <Label>答案</Label>
              <div className="mt-1 p-4 bg-muted rounded-md whitespace-pre-wrap">
                {question.answer}
              </div>
            </div>

            {question.explanation && (
              <div>
                <Label>解析</Label>
                <div className="mt-1 p-4 bg-muted rounded-md whitespace-pre-wrap">
                  {question.explanation}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 质量评分 */}
        <Card>
          <CardHeader>
            <CardTitle>质量评分</CardTitle>
            <CardDescription>对题目的各个维度进行评分（1-5分）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>准确性 ({accuracyScore}分)</Label>
              <Slider
                value={[accuracyScore]}
                onValueChange={([v]) => setAccuracyScore(v)}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                题目内容、答案、解析是否准确无误
              </p>
            </div>

            <div>
              <Label>难度适当性 ({difficultyScore}分)</Label>
              <Slider
                value={[difficultyScore]}
                onValueChange={([v]) => setDifficultyScore(v)}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                难度标注是否与实际相符
              </p>
            </div>

            <div>
              <Label>表述清晰度 ({clarityScore}分)</Label>
              <Slider
                value={[clarityScore]}
                onValueChange={([v]) => setClarityScore(v)}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                题目表述是否清晰易懂
              </p>
            </div>

            <div>
              <Label>区分度 ({discriminationScore}分)</Label>
              <Slider
                value={[discriminationScore]}
                onValueChange={([v]) => setDiscriminationScore(v)}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                题目是否能有效区分不同水平的学生
              </p>
            </div>

            <div>
              <Label>审核意见</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="请输入审核意见..."
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label>修改建议</Label>
              <Textarea
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                placeholder="如需修改，请输入具体建议..."
                className="mt-2"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* 审核操作 */}
        <Card>
          <CardHeader>
            <CardTitle>审核决策</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={() => handleSubmitReview("approved")}
                disabled={submitReviewMutation.isPending}
                className="flex-1"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                通过
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSubmitReview("needs_revision")}
                disabled={submitReviewMutation.isPending}
                className="flex-1"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                需要修改
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleSubmitReview("rejected")}
                disabled={submitReviewMutation.isPending}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                拒绝
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 审核历史 */}
        {reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>审核历史</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.reviewerName}</span>
                        <Badge
                          variant={
                            review.status === "approved"
                              ? "default"
                              : review.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {review.status === "approved"
                            ? "通过"
                            : review.status === "rejected"
                            ? "拒绝"
                            : "需修改"}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {review.overallScore && (
                      <div className="text-sm mb-2">
                        综合评分: {review.overallScore.toFixed(2)}分
                      </div>
                    )}

                    {review.notes && (
                      <div className="text-sm text-muted-foreground">
                        {review.notes}
                      </div>
                    )}

                    {review.suggestions && (
                      <div className="text-sm text-muted-foreground mt-1">
                        修改建议: {review.suggestions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
