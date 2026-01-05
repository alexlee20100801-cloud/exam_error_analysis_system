import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, Calendar, Bell, BookOpen, TrendingUp, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getSubjectName } from "@shared/subjects";
import { toast } from "sonner";

export default function Review() {
  const [, setLocation] = useLocation();

  // 获取待复习错题
  const { data: dueReviews, isLoading: dueLoading, refetch: refetchDue } = trpc.reviewPlan.getDueReviews.useQuery();

  // 获取所有复习计划
  const { data: allPlans, isLoading: plansLoading, refetch: refetchPlans } = trpc.reviewPlan.getAllReviewPlans.useQuery();

  // 获取复习统计
  const { data: stats, isLoading: statsLoading } = trpc.reviewPlan.getReviewStats.useQuery();

  // 获取复习间隔配置
  const { data: intervals } = trpc.reviewPlan.getReviewIntervals.useQuery();

  // 标记已复习
  const markReviewedMutation = trpc.reviewPlan.markAsReviewed.useMutation({
    onSuccess: () => {
      toast.success("已标记为已复习");
      refetchDue();
      refetchPlans();
    },
    onError: (error) => {
      toast.error(`标记失败：${error.message}`);
    },
  });

  // 发送复习提醒
  const sendReminderMutation = trpc.reviewPlan.sendReviewReminder.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("复习提醒已发送");
      } else {
        toast.info("暂无待复习内容");
      }
    },
    onError: (error) => {
      toast.error(`发送失败：${error.message}`);
    },
  });

  const handleMarkReviewed = (errorQuestionId: number) => {
    markReviewedMutation.mutate({ errorQuestionId });
  };

  const handleSendReminder = () => {
    sendReminderMutation.mutate();
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return `已逾期 ${Math.abs(days)} 天`;
    } else if (days === 0) {
      return "今天";
    } else if (days === 1) {
      return "明天";
    } else {
      return `${days} 天后`;
    }
  };

  if (dueLoading || plansLoading || statsLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">复习计划</h1>
            <p className="text-muted-foreground mt-1">基于艾宾浩斯遗忘曲线的智能复习提醒</p>
          </div>
          <Button onClick={handleSendReminder} disabled={sendReminderMutation.isPending}>
            <Bell className="h-4 w-4 mr-2" />
            发送复习提醒
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待复习</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.dueCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">已到复习时间</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">计划中</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.totalCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">复习计划总数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已掌握</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.completedCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">完成所有复习轮次</p>
            </CardContent>
          </Card>
        </div>

        {/* 艾宾浩斯复习间隔说明 */}
        {intervals && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                艾宾浩斯遗忘曲线
              </CardTitle>
              <CardDescription>科学的复习间隔，帮助您高效记忆</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {intervals.intervals.map((days, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    第 {index + 1} 次：{days} 天后
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                完成5轮复习后，该错题将被标记为"已掌握"
              </p>
            </CardContent>
          </Card>
        )}

        {/* 复习列表 */}
        <Tabs defaultValue="due" className="space-y-4">
          <TabsList>
            <TabsTrigger value="due" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              待复习 ({dueReviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              全部计划 ({allPlans?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* 待复习列表 */}
          <TabsContent value="due" className="space-y-4">
            {!dueReviews || dueReviews.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  太棒了！暂无待复习错题，继续保持学习状态 🎉
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {dueReviews.map((review) => (
                  <Card key={review.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getSubjectName(review.subject)}</Badge>
                            <Badge variant="secondary">第 {review.reviewRound + 1} 次复习</Badge>
                            <Badge variant="destructive">
                              {formatDate(review.nextReviewAt)}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg cursor-pointer hover:text-primary" onClick={() => setLocation(`/error-questions/${review.id}`)}>
                            {review.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            已复习 {review.reviewCount || 0} 次
                          </span>
                          {review.lastReviewedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              上次复习：{new Date(review.lastReviewedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/error-questions/${review.id}`)}
                          >
                            查看详情
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMarkReviewed(review.id)}
                            disabled={markReviewedMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            标记已复习
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 全部计划列表 */}
          <TabsContent value="all" className="space-y-4">
            {!allPlans || allPlans.length === 0 ? (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  还没有复习计划，在错题详情页点击"加入复习计划"开始使用吧！
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {allPlans.map((plan) => (
                  <Card key={plan.id} className={plan.isDue ? "border-orange-200 bg-orange-50/30" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getSubjectName(plan.subject)}</Badge>
                            <Badge variant="secondary">第 {plan.reviewRound + 1} 次复习</Badge>
                            {plan.isDue ? (
                              <Badge variant="destructive">待复习</Badge>
                            ) : (
                              <Badge>{formatDate(plan.nextReviewAt)}</Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg cursor-pointer hover:text-primary" onClick={() => setLocation(`/error-questions/${plan.id}`)}>
                            {plan.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            已复习 {plan.reviewCount || 0} 次
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            下次复习：{new Date(plan.nextReviewAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/error-questions/${plan.id}`)}
                          >
                            查看详情
                          </Button>
                          {plan.isDue && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkReviewed(plan.id)}
                              disabled={markReviewedMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              标记已复习
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
