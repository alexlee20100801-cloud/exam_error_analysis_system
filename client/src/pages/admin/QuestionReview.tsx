import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, Eye, BarChart3 } from "lucide-react";

import { useLocation } from "wouter";

/**
 * 题目审核队列管理页面
 */

export default function QuestionReview() {
  const [, navigate] = useLocation();

  
  // 筛选条件
  const [subject, setSubject] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // 获取待审核题目
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = trpc.questionReview.getPendingQuestions.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    subject: subject || undefined,
    grade: grade || undefined,
    source: source || undefined,
  });

  // 获取审核统计
  const { data: stats } = trpc.questionReview.getStats.useQuery();

  // 批量审核
  const batchReviewMutation = trpc.questionReview.batchReview.useMutation({
    onSuccess: (result) => {
      alert(`批量审核完成\n成功: ${result.successCount}, 失败: ${result.failedCount}`);
      refetchPending();
    },
    onError: (error) => {
      alert(`批量审核失败: ${error.message}`);
    },
  });

  // 选中的题目ID
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleSelectQuestion = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) {
      alert("请至少选择一个题目进行批量审核");
      return;
    }

    batchReviewMutation.mutate({
      questionIds: selectedIds,
      status: "approved",
    });
    setSelectedIds([]);
  };

  const handleBatchReject = () => {
    if (selectedIds.length === 0) {
      alert("请至少选择一个题目进行批量审核");
      return;
    }

    batchReviewMutation.mutate({
      questionIds: selectedIds,
      status: "rejected",
    });
    setSelectedIds([]);
  };

  const getDifficultyLabel = (difficulty: string) => {
    const map: Record<string, string> = {
      easy: "简单",
      medium: "中等",
      hard: "困难",
    };
    return map[difficulty] || difficulty;
  };

  const getSubjectLabel = (subject: string) => {
    const map: Record<string, string> = {
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
    return map[subject] || subject;
  };

  const getGradeLabel = (grade: string) => {
    const map: Record<string, string> = {
      junior1: "初一",
      junior2: "初二",
      junior3: "初三",
      senior1: "高一",
      senior2: "高二",
      senior3: "高三",
    };
    return map[grade] || grade;
  };

  const getSourceLabel = (source: string) => {
    const map: Record<string, string> = {
      builtin: "内置",
      thirdparty: "第三方",
      ai_generated: "AI生成",
    };
    return map[source] || source;
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">题目审核</h1>
            <p className="text-muted-foreground mt-2">
              审核AI生成的题目，确保题库质量
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/review-history")}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            审核历史
          </Button>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">待审核</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已通过</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalApproved}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">通过率</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.approvalRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均质量分</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.averageQualityScore.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 筛选和批量操作 */}
        <Card>
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">学科</label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部学科" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部学科</SelectItem>
                    <SelectItem value="math">数学</SelectItem>
                    <SelectItem value="chinese">语文</SelectItem>
                    <SelectItem value="english">英语</SelectItem>
                    <SelectItem value="physics">物理</SelectItem>
                    <SelectItem value="chemistry">化学</SelectItem>
                    <SelectItem value="biology">生物</SelectItem>
                    <SelectItem value="politics">政治</SelectItem>
                    <SelectItem value="history">历史</SelectItem>
                    <SelectItem value="geography">地理</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">年级</label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部年级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部年级</SelectItem>
                    <SelectItem value="junior1">初一</SelectItem>
                    <SelectItem value="junior2">初二</SelectItem>
                    <SelectItem value="junior3">初三</SelectItem>
                    <SelectItem value="senior1">高一</SelectItem>
                    <SelectItem value="senior2">高二</SelectItem>
                    <SelectItem value="senior3">高三</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">来源</label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部来源" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部来源</SelectItem>
                    <SelectItem value="ai_generated">AI生成</SelectItem>
                    <SelectItem value="builtin">内置</SelectItem>
                    <SelectItem value="thirdparty">第三方</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  已选择 {selectedIds.length} 个题目
                </span>
                <Button
                  size="sm"
                  onClick={handleBatchApprove}
                  disabled={batchReviewMutation.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  批量通过
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchReject}
                  disabled={batchReviewMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  批量拒绝
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIds([])}
                >
                  取消选择
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 题目列表 */}
        <Card>
          <CardHeader>
            <CardTitle>待审核题目</CardTitle>
            <CardDescription>
              共 {pendingData?.total || 0} 个待审核题目
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : !pendingData?.questions.length ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无待审核题目
              </div>
            ) : (
              <div className="space-y-4">
                {pendingData.questions.map((question) => (
                  <div
                    key={question.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(question.id)}
                        onChange={() => handleSelectQuestion(question.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">
                            {getSubjectLabel(question.subject)}
                          </Badge>
                          <Badge variant="outline">
                            {getGradeLabel(question.grade)}
                          </Badge>
                          <Badge variant="secondary">
                            {getDifficultyLabel(question.difficulty)}
                          </Badge>
                          <Badge>
                            {getSourceLabel(question.source || "builtin")}
                          </Badge>
                        </div>

                        <h3 className="font-medium">{question.title}</h3>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {question.content}
                        </p>

                        <div className="text-xs text-muted-foreground">
                          创建时间: {new Date(question.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/question-review/${question.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        审核
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {pendingData && pendingData.total > pageSize && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {page + 1} 页 / 共 {Math.ceil(pendingData.total / pageSize)} 页
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * pageSize >= pendingData.total}
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
