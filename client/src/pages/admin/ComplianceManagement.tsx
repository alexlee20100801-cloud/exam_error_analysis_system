import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Eye, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export default function ComplianceManagement() {
  const [, setLocation] = useLocation();
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const { data: pendingQuestions, isLoading, refetch } = trpc.compliance.getPendingReviews.useQuery({
    limit: 50
  });

  const reviewMutation = trpc.compliance.reviewQuestion.useMutation({
    onSuccess: () => {
      toast.success("审核完成");
      refetch();
      setShowReviewDialog(false);
      setReviewNote("");
    },
    onError: (error) => {
      toast.error(`审核失败: ${error.message}`);
    }
  });

  const handleApprove = (questionId: number) => {
    reviewMutation.mutate({
      questionId,
      status: "approved",
      reviewNote
    });
  };

  const handleReject = (questionId: number) => {
    if (!reviewNote.trim()) {
      toast.error("请填写拒绝原因");
      return;
    }
    reviewMutation.mutate({
      questionId,
      status: "rejected",
      reviewNote
    });
  };

  const openReviewDialog = (question: any) => {
    setSelectedQuestion(question);
    setReviewNote("");
    setShowReviewDialog(true);
  };

  const getComplianceStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "待审核" },
      approved: { variant: "default", label: "已通过" },
      rejected: { variant: "destructive", label: "已拒绝" },
      flagged: { variant: "outline", label: "已标记" }
    };
    const config = statusMap[status] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getIssueSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { variant: any; label: string }> = {
      high: { variant: "destructive", label: "高风险" },
      medium: { variant: "secondary", label: "中风险" },
      low: { variant: "outline", label: "低风险" }
    };
    const config = severityMap[severity] || severityMap.low;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/question-bank")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回题库管理
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            合规审核管理
          </h1>
          <p className="text-muted-foreground mt-2">
            确保试题内容符合教育规范和政策要求
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="pending">待审核</TabsTrigger>
            <TabsTrigger value="flagged">已标记</TabsTrigger>
            <TabsTrigger value="statistics">统计分析</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>待审核试题列表</CardTitle>
                <CardDescription>
                  系统自动检测出的潜在合规问题,需要人工审核确认
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    加载中...
                  </div>
                ) : pendingQuestions && pendingQuestions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>试题ID</TableHead>
                        <TableHead>学科</TableHead>
                        <TableHead>问题类型</TableHead>
                        <TableHead>风险等级</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingQuestions.map((question: any) => (
                        <TableRow key={question.id}>
                          <TableCell className="font-mono">{question.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{question.subject}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {question.issues?.map((issue: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getIssueSeverityBadge(question.severity || "low")}
                          </TableCell>
                          <TableCell>
                            {getComplianceStatusBadge(question.complianceStatus)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReviewDialog(question)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                审核
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">暂无待审核试题</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      所有试题均已通过合规检查
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flagged" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>已标记问题</CardTitle>
                <CardDescription>历史标记的合规问题记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  功能开发中...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">待审核总数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{pendingQuestions?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    需要人工审核的试题
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">高风险问题</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {pendingQuestions?.filter((q: any) => q.severity === "high").length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    需要优先处理
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">中低风险</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {pendingQuestions?.filter((q: any) => q.severity !== "high").length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    常规审核流程
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>问题类型分布</CardTitle>
                <CardDescription>各类合规问题统计</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingQuestions && pendingQuestions.length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(
                      pendingQuestions.reduce((acc: any, question: any) => {
                        question.issues?.forEach((issue: string) => {
                          acc[issue] = (acc[issue] || 0) + 1;
                        });
                        return acc;
                      }, {})
                    ).map(([issue, count]) => (
                      <div key={issue} className="flex items-center justify-between">
                        <span className="font-medium">{issue}</span>
                        <Badge variant="secondary">{count as number} 个</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">暂无数据</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>试题审核</DialogTitle>
              <DialogDescription>
                试题 ID: {selectedQuestion?.id} | 学科: {selectedQuestion?.subject}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] pr-4">
              {selectedQuestion && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">试题内容</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="font-medium text-sm">题干:</span>
                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedQuestion.content}
                        </p>
                      </div>
                      {selectedQuestion.options && (
                        <div>
                          <span className="font-medium text-sm">选项:</span>
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedQuestion.options}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        检测到的问题
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedQuestion.issues?.map((issue: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <Badge variant="secondary">{issue}</Badge>
                          </div>
                        ))}
                        {selectedQuestion.complianceDetails && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {selectedQuestion.complianceDetails}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">审核意见</label>
                    <Textarea
                      placeholder="请填写审核意见或拒绝原因..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                取消
              </Button>
              {selectedQuestion && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedQuestion.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    拒绝
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleApprove(selectedQuestion.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    通过
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
