import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Bell, Clock, CheckCircle, SkipForward, Trash2, RefreshCw } from "lucide-react";
import { Link } from "wouter";

export default function ReviewReminders() {
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  // 获取待复习列表
  const pendingQuery = trpc.reviewReminders.getPending.useQuery(undefined, {
    enabled: activeTab === "pending",
  });

  // 获取所有提醒
  const allQuery = trpc.reviewReminders.getAll.useQuery(
    { status: undefined },
    { enabled: activeTab === "all" }
  );

  // 获取统计数据
  const statsQuery = trpc.reviewReminders.getStats.useQuery();

  // 标记已复习
  const markReviewedMutation = trpc.reviewReminders.markReviewed.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      pendingQuery.refetch();
      allQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 跳过提醒
  const skipMutation = trpc.reviewReminders.skip.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      pendingQuery.refetch();
      allQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 删除提醒
  const deleteMutation = trpc.reviewReminders.delete.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      pendingQuery.refetch();
      allQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleMarkReviewed = (reminderId: number) => {
    markReviewedMutation.mutate({ reminderId });
  };

  const handleSkip = (reminderId: number) => {
    skipMutation.mutate({ reminderId });
  };

  const handleDelete = (reminderId: number) => {
    if (confirm("确定要删除这个提醒吗？")) {
      deleteMutation.mutate({ reminderId });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getQuestionTypeLabel = (type: string) => {
    return type === "error_question" ? "错题" : "练习题";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">待复习</Badge>;
      case "completed":
        return <Badge className="bg-green-500">已完成</Badge>;
      case "skipped":
        return <Badge variant="secondary">已跳过</Badge>;
      case "deleted":
        return <Badge variant="destructive">已删除</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const reminders = activeTab === "pending" ? pendingQuery.data?.reminders : allQuery.data?.reminders;
  const isLoading = activeTab === "pending" ? pendingQuery.isLoading : allQuery.isLoading;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">学习提醒</h1>
        <p className="text-muted-foreground">
          基于艾宾浩斯遗忘曲线的智能复习提醒系统
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">待复习（已到期）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {statsQuery.data?.stats.pendingDue || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">需要立即复习</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">待复习（未到期）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {statsQuery.data?.stats.pendingFuture || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">计划中的复习</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">总复习次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {statsQuery.data?.stats.totalReviews || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">累计复习记录</p>
          </CardContent>
        </Card>
      </div>

      {/* 提醒列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>复习提醒列表</CardTitle>
              <CardDescription>管理您的学习复习计划</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                pendingQuery.refetch();
                allQuery.refetch();
                statsQuery.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                <Bell className="h-4 w-4 mr-2" />
                待复习
              </TabsTrigger>
              <TabsTrigger value="all">
                <Clock className="h-4 w-4 mr-2" />
                全部提醒
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : reminders && reminders.length > 0 ? (
                <div className="space-y-4">
                  {reminders.map((reminder: any) => (
                    <Card key={reminder.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {getQuestionTypeLabel(reminder.questionType)}
                              </Badge>
                              {getStatusBadge(reminder.status)}
                              <span className="text-sm text-muted-foreground">
                                第 {reminder.reviewCount + 1} 次复习
                              </span>
                            </div>

                            <h3 className="font-medium mb-2">
                              {reminder.question?.title || reminder.question?.content?.substring(0, 50) + "..."}
                            </h3>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                <Clock className="h-4 w-4 inline mr-1" />
                                复习时间：{formatDate(reminder.nextReviewDate)}
                              </span>
                              {reminder.lastReviewedAt && (
                                <span>
                                  上次复习：{formatDate(reminder.lastReviewedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Link href={`/${reminder.questionType === "error_question" ? "error-questions" : "practice"}/${reminder.questionId}`}>
                              <Button variant="default" size="sm">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                去复习
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSkip(reminder.id)}
                              disabled={skipMutation.isPending}
                            >
                              <SkipForward className="h-4 w-4 mr-1" />
                              跳过
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reminder.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无待复习的题目</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    系统会根据艾宾浩斯遗忘曲线自动安排复习计划
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : reminders && reminders.length > 0 ? (
                <div className="space-y-4">
                  {reminders.map((reminder: any) => (
                    <Card key={reminder.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {getQuestionTypeLabel(reminder.questionType)}
                              </Badge>
                              {getStatusBadge(reminder.status)}
                              <span className="text-sm text-muted-foreground">
                                已复习 {reminder.reviewCount} 次
                              </span>
                            </div>

                            <h3 className="font-medium mb-2">
                              {reminder.question?.title || reminder.question?.content?.substring(0, 50) + "..."}
                            </h3>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                <Clock className="h-4 w-4 inline mr-1" />
                                下次复习：{formatDate(reminder.nextReviewDate)}
                              </span>
                              {reminder.lastReviewedAt && (
                                <span>
                                  上次复习：{formatDate(reminder.lastReviewedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            {reminder.status === "pending" && (
                              <>
                                <Link href={`/${reminder.questionType === "error_question" ? "error-questions" : "practice"}/${reminder.questionId}`}>
                                  <Button variant="default" size="sm">
                                    查看
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(reminder.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无提醒记录</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
