import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * 复习计划页面
 * 基于艾宾浩斯遗忘曲线的智能复习提醒
 */
export default function ReviewPlan() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // 获取今日待复习列表
  const { data: reviewList, isLoading: listLoading, refetch: refetchList } = trpc.review.getTodayReviewList.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 获取复习统计信息
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.review.getEbbinghausStats.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 标记为已复习
  const markAsReviewedMutation = trpc.review.markAsReviewed.useMutation({
    onSuccess: () => {
      toast.success("已标记为复习完成");
      refetchList();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`标记失败: ${error.message}`);
    },
  });

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">请先登录</p>
        </div>
      </DashboardLayout>
    );
  }

  // 紧急程度颜色和图标
  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return {
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'destructive' as const,
          icon: AlertCircle,
          label: '逾期',
        };
      case 'today':
        return {
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          badge: 'default' as const,
          icon: Clock,
          label: '今天',
        };
      case 'soon':
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'secondary' as const,
          icon: Calendar,
          label: '即将',
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          badge: 'outline' as const,
          icon: CheckCircle2,
          label: '稍后',
        };
    }
  };

  // 学科中文名映射
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

  // 年级中文名映射
  const gradeNames: Record<string, string> = {
    junior1: "初一",
    junior2: "初二",
    junior3: "初三",
    senior1: "高一",
    senior2: "高二",
    senior3: "高三",
  };

  // 处理开始复习
  const handleStartReview = (questionId: number) => {
    setLocation(`/error-questions/${questionId}`);
  };

  // 处理标记为已复习
  const handleMarkAsReviewed = (questionId: number) => {
    markAsReviewedMutation.mutate({ errorQuestionId: questionId });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">智能复习计划</h1>
          <p className="text-muted-foreground mt-2">
            基于艾宾浩斯遗忘曲线，科学安排复习时间
          </p>
        </div>

        {/* 复习统计卡片 */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i: any) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  逾期未复习
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.urgentCount}</div>
                <p className="text-xs text-red-600 mt-1">需要立即复习</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
                  <Clock className="h-4 w-4" />
                  今日待复习
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.todayCount}</div>
                <p className="text-xs text-orange-600 mt-1">今天需要复习</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                  <Calendar className="h-4 w-4" />
                  即将到期
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.soonCount}</div>
                <p className="text-xs text-blue-600 mt-1">1-2天内需复习</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  已掌握
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.completedCount}</div>
                <p className="text-xs text-green-600 mt-1">完成5次复习</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* 艾宾浩斯遗忘曲线说明 */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              艾宾浩斯遗忘曲线
            </CardTitle>
            <CardDescription>
              根据记忆规律，我们为您安排了科学的复习时间节点
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                  1
                </div>
                <span className="text-sm text-muted-foreground">首次学习后1天</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                  2
                </div>
                <span className="text-sm text-muted-foreground">第2次复习后2天</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                  3
                </div>
                <span className="text-sm text-muted-foreground">第3次复习后4天</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                  4
                </div>
                <span className="text-sm text-muted-foreground">第4次复习后7天</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                  5
                </div>
                <span className="text-sm text-muted-foreground">第5次复习后15天</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 今日待复习列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              今日待复习列表
            </CardTitle>
            <CardDescription>
              {reviewList && reviewList.length > 0
                ? `共有 ${reviewList.length} 道错题需要复习`
                : "暂无待复习内容"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i: any) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : reviewList && reviewList.length > 0 ? (
              <div className="space-y-4">
                {reviewList.map((item: any) => {
                  const urgencyStyle = getUrgencyStyle(item.urgency);
                  const UrgencyIcon = urgencyStyle.icon;

                  return (
                    <Card
                      key={item.id}
                      className={`${urgencyStyle.border} ${urgencyStyle.bg} transition-all hover:shadow-md`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            {/* 标题和紧急程度 */}
                            <div className="flex items-center gap-2">
                              <UrgencyIcon className={`h-4 w-4 ${urgencyStyle.color}`} />
                              <Badge variant={urgencyStyle.badge}>{urgencyStyle.label}</Badge>
                              <Badge variant="outline">
                                {subjectNames[item.subject] || item.subject}
                              </Badge>
                              <Badge variant="outline">
                                {gradeNames[item.grade] || item.grade}
                              </Badge>
                            </div>

                            {/* 题目标题 */}
                            <h4 className="font-medium text-foreground line-clamp-2">
                              {item.title}
                            </h4>

                            {/* 复习进度 */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {item.stageDescription}
                                </span>
                                <span className="text-muted-foreground">
                                  已复习 {item.reviewCount}/5 次
                                </span>
                              </div>
                              <Progress value={item.progress} className="h-2" />
                            </div>

                            {/* 时间信息 */}
                            {item.lastReviewedAt && (
                              <p className="text-xs text-muted-foreground">
                                上次复习：
                                {new Date(item.lastReviewedAt).toLocaleDateString("zh-CN")}
                              </p>
                            )}
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleStartReview(item.id)}
                            >
                              开始复习
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsReviewed(item.id)}
                              disabled={markAsReviewedMutation.isPending}
                            >
                              标记完成
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">太棒了！今天没有需要复习的内容</p>
                <p className="text-sm text-muted-foreground mt-2">
                  继续保持，坚持复习才能牢固掌握知识
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
