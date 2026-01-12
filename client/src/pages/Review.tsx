import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, Calendar, Bell, BookOpen, TrendingUp, Sparkles, Eye, Play, Star, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getSubjectName } from "@shared/subjects";
import { toast } from "sonner";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useIsMobile } from "@/hooks/useMobile";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VoiceInputButtonEnhanced } from "@/components/VoiceInputButtonEnhanced";

export default function Review() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [reviewingQuestion, setReviewingQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const isMobile = useIsMobile();

  // 获取待复习错题
  const { data: dueReviews, isLoading: dueLoading, refetch: refetchDue } = trpc.reviewPlan.getDueReviews.useQuery();
  
  // 复习列表中的切换逻辑
  const currentReviewIndex = dueReviews?.findIndex((r: any) => r.id === reviewingQuestion?.id) ?? -1;
  const hasPreviousReview = currentReviewIndex > 0;
  const hasNextReview = currentReviewIndex >= 0 && currentReviewIndex < (dueReviews?.length ?? 0) - 1;
  
  const goToPreviousReview = () => {
    if (hasPreviousReview && dueReviews) {
      const prevReview = dueReviews[currentReviewIndex - 1];
      setReviewingQuestion(prevReview);
      setUserAnswer("");
      setShowAnswer(false);
      toast.info(t('errorQuestion.switchToPrevious'));
    }
  };
  
  const goToNextReview = () => {
    if (hasNextReview && dueReviews) {
      const nextReview = dueReviews[currentReviewIndex + 1];
      setReviewingQuestion(nextReview);
      setUserAnswer("");
      setShowAnswer(false);
      toast.info(t('errorQuestion.switchToNext'));
    }
  };
  
  // 手势识别
  const { ref: dialogSwipeRef, swipeState: dialogSwipeState } = useSwipeGesture<HTMLDivElement>({
    onSwipeLeft: goToNextReview,
    onSwipeRight: goToPreviousReview,
    minSwipeDistance: 80,
    preventDefaultTouchMove: true,
  });

  // 获取所有复习计划
  const { data: allPlans, isLoading: plansLoading, refetch: refetchPlans } = trpc.reviewPlan.getAllReviewPlans.useQuery();

  // 获取复习统计
  const { data: stats, isLoading: statsLoading } = trpc.reviewPlan.getReviewStats.useQuery();

  // 获取复习间隔配置
  const { data: intervals } = trpc.reviewPlan.getReviewIntervals.useQuery();

  // 标记已复习
  const markReviewedMutation = trpc.reviewPlan.markAsReviewed.useMutation({
    onSuccess: () => {
      toast.success(t('review.markCompleted'));
      refetchDue();
      refetchPlans();
    },
    onError: (error) => {
      toast.error(`${t('errors.saveError')}: ${error.message}`);
    },
  });

  // 发送复习提醒
  const sendReminderMutation = trpc.reviewPlan.sendReviewReminder.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(t('review.sendReminder'));
      } else {
        toast.info(t('review.noContent'));
      }
    },
    onError: (error) => {
      toast.error(`${t('errors.serverError')}: ${error.message}`);
    },
  });

  const handleMarkReviewed = (errorQuestionId: number) => {
    markReviewedMutation.mutate({ errorQuestionId });
  };

  const handleSendReminder = () => {
    sendReminderMutation.mutate();
  };

  const handleStartReview = (question: any) => {
    setReviewingQuestion(question);
    setUserAnswer("");
    setShowAnswer(false);
  };

  const handleSubmitReview = () => {
    setShowAnswer(true);
  };

  const handleCompleteReview = () => {
    if (reviewingQuestion) {
      markReviewedMutation.mutate({ errorQuestionId: reviewingQuestion.id });
      setReviewingQuestion(null);
      setUserAnswer("");
      setShowAnswer(false);
    }
  };

  // 收藏/取消收藏
  const toggleFavoriteMutation = trpc.errorQuestions.toggleFavorite.useMutation({
    onSuccess: (data) => {
      if (data.isFavorite) {
        toast.success("已收藏");
      } else {
        toast.success("已取消收藏");
      }
      // 更新当前题目的收藏状态
      if (reviewingQuestion) {
        setReviewingQuestion({
          ...reviewingQuestion,
          isFavorite: data.isFavorite,
        });
      }
      refetchDue();
      refetchPlans();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  const handleToggleFavorite = () => {
    if (reviewingQuestion) {
      toggleFavoriteMutation.mutate({ questionId: reviewingQuestion.id });
    }
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Clock className="h-8 w-8 text-primary" />
              {t('review.title')}
            </h1>
            <p className="text-muted-foreground mt-2">{t('review.subtitle')}</p>
          </div>
          <Button onClick={handleSendReminder} disabled={sendReminderMutation.isPending} size="lg">
            <Bell className="h-4 w-4 mr-2" />
            {sendReminderMutation.isPending ? t('review.sending') : t('review.sendReminder')}
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">{t('review.stats.dueCount')}</CardTitle>
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats?.dueCount || 0}</div>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">{t('review.stats.dueDescription')}</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('review.stats.totalCount')}</CardTitle>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalCount || 0}</div>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">{t('review.stats.totalDescription')}</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">{t('review.stats.completedCount')}</CardTitle>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.completedCount || 0}</div>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">{t('review.stats.completedDescription')}</p>
            </CardContent>
          </Card>
        </div>

        {/* 艾宾浩斯复习间隔说明 */}
        {intervals && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                {t('review.ebbinghaus.title')}
              </CardTitle>
              <CardDescription>{t('review.ebbinghaus.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {intervals.intervals.map((days, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {t('review.ebbinghaus.round', { round: index + 1 })}: {t('review.ebbinghaus.daysLater', { days })}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {t('review.ebbinghaus.completionHint')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 复习列表 */}
        <Tabs defaultValue="due" className="space-y-4">
          <TabsList>
            <TabsTrigger value="due" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('review.tabs.due')} ({dueReviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('review.tabs.all')} ({allPlans?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* 待复习列表 */}
          <TabsContent value="due" className="space-y-4">
            {!dueReviews || dueReviews.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {t('review.noContent')} 🎉
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {dueReviews.map((review: any) => (
                  <Card key={review.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getSubjectName(review.subject)}</Badge>
                            <Badge variant="secondary">{t('review.ebbinghaus.round', { round: review.reviewRound + 1 })}</Badge>
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
                            {t('review.completed')}: {review.reviewCount || 0}
                          </span>
                          {review.lastReviewedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {t('common.date')}: {new Date(review.lastReviewedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/error-questions/${review.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('common.details')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStartReview(review)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            {t('review.startReview')}
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
                  {t('review.noContent')}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {allPlans.map((plan: any) => (
                  <Card key={plan.id} className={plan.isDue ? "border-orange-200 bg-orange-50/30" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getSubjectName(plan.subject)}</Badge>
                            <Badge variant="secondary">{t('review.ebbinghaus.round', { round: plan.reviewRound + 1 })}</Badge>
                            {plan.isDue ? (
                              <Badge variant="destructive">{t('review.stats.dueCount')}</Badge>
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
                            {t('review.completed')}: {plan.reviewCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {t('review.reviewDialog.nextRound')}: {new Date(plan.nextReviewAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/error-questions/${plan.id}`)}
                          >
                            {t('common.details')}
                          </Button>
                          {plan.isDue && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkReviewed(plan.id)}
                              disabled={markReviewedMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {t('review.reviewDialog.markAsReviewed')}
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

      {/* 复习答题对话框 */}
      <Dialog open={!!reviewingQuestion} onOpenChange={(open) => !open && setReviewingQuestion(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div ref={dialogSwipeRef}>
            {/* 移动端滑动提示 */}
            {isMobile && dialogSwipeState.isSwiping && (
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                <div className="bg-black/80 text-white px-6 py-4 rounded-full flex items-center gap-3 backdrop-blur-sm">
                  {dialogSwipeState.direction === "left" && hasNextReview && (
                    <>
                      <ChevronRight className="h-6 w-6" />
                      <span className="text-sm font-medium">{t('common.next')}</span>
                    </>
                  )}
                  {dialogSwipeState.direction === "right" && hasPreviousReview && (
                    <>
                      <ChevronLeft className="h-6 w-6" />
                      <span className="text-sm font-medium">{t('common.previous')}</span>
                    </>
                  )}
                  {dialogSwipeState.direction === "left" && !hasNextReview && (
                    <span className="text-sm font-medium">{t('errorQuestion.switchToNext')}</span>
                  )}
                  {dialogSwipeState.direction === "right" && !hasPreviousReview && (
                    <span className="text-sm font-medium">{t('errorQuestion.switchToPrevious')}</span>
                  )}
                </div>
              </div>
            )}
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                {t('review.reviewDialog.title')}
              </DialogTitle>
              {reviewingQuestion && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleFavorite}
                  disabled={toggleFavoriteMutation.isPending}
                  className="flex items-center gap-1"
                >
                  <Star
                    className={`h-5 w-5 ${reviewingQuestion.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                  />
                  {reviewingQuestion.isFavorite ? t('errorQuestion.actions.unfavorite') : t('errorQuestion.actions.favorite')}
                </Button>
              )}
            </div>
            <DialogDescription>
              {t('review.reviewDialog.answerPlaceholder')}
            </DialogDescription>
          </DialogHeader>

          {reviewingQuestion && (
            <div className="space-y-6">
              {/* 错题信息 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getSubjectName(reviewingQuestion.subject)}</Badge>
                  <Badge variant="secondary">{t('review.ebbinghaus.round', { round: reviewingQuestion.reviewRound + 1 })}</Badge>
                  <Badge>{reviewingQuestion.difficulty === "easy" ? t('errorQuestion.difficulty.easy') : reviewingQuestion.difficulty === "medium" ? t('errorQuestion.difficulty.medium') : t('errorQuestion.difficulty.hard')}</Badge>
                </div>
                <h3 className="text-lg font-semibold">{reviewingQuestion.title}</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{reviewingQuestion.content}</p>
                  {reviewingQuestion.imageUrl && (
                    <img src={reviewingQuestion.imageUrl} alt="题目图片" className="mt-4 max-w-full rounded-lg" />
                  )}
                </div>
              </div>

              {/* 答题区域 */}
              {!showAnswer && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="user-answer">{t('review.reviewDialog.yourAnswer')}</Label>
                    <VoiceInputButtonEnhanced
                      onTranscript={(text) => setUserAnswer((prev) => prev + text)}
                      lang={reviewingQuestion.subject === "english" ? "en-US" : "zh-CN"}
                      size="sm"
                      mode="advanced"
                    />
                  </div>
                  <Textarea
                    id="user-answer"
                    placeholder={t('review.reviewDialog.answerPlaceholder')}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <Button onClick={handleSubmitReview} className="w-full" disabled={!userAnswer.trim()}>
                    {t('review.reviewDialog.showCorrectAnswer')}
                  </Button>
                </div>
              )}

              {/* 答案和解析 */}
              {showAnswer && (
                <div className="space-y-4">
                  {/* 用户答案 */}
                  {userAnswer && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">{t('review.reviewDialog.yourAnswer')}</Label>
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="whitespace-pre-wrap">{userAnswer}</p>
                      </div>
                    </div>
                  )}

                  {/* 正确答案 */}
                  {reviewingQuestion.correctAnswer && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold text-green-700 dark:text-green-400">{t('review.reviewDialog.correctAnswer')}</Label>
                      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
                        <p className="whitespace-pre-wrap text-green-900 dark:text-green-100">{reviewingQuestion.correctAnswer}</p>
                      </div>
                    </div>
                  )}

                  {/* 详细解析 */}
                  {reviewingQuestion.detailedExplanation && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">{t('review.reviewDialog.analysis')}</Label>
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="whitespace-pre-wrap">{reviewingQuestion.detailedExplanation}</p>
                      </div>
                    </div>
                  )}

                  {/* 错误分析 */}
                  {reviewingQuestion.errorAnalysis && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold text-orange-700 dark:text-orange-400">{t('errorQuestion.detail.errorAnalysis')}</Label>
                      <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-900">
                        <p className="whitespace-pre-wrap text-orange-900 dark:text-orange-100">{reviewingQuestion.errorAnalysis}</p>
                      </div>
                    </div>
                  )}

                  {/* 完成复习按钮 */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAnswer(false);
                        setUserAnswer("");
                      }}
                      className="flex-1"
                    >
                      {t('common.retry')}
                    </Button>
                    <Button
                      onClick={handleCompleteReview}
                      disabled={markReviewedMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('review.reviewDialog.markAsReviewed')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
