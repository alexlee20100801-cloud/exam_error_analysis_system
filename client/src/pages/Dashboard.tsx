import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BookOpen, Brain, Target, TrendingUp, Calendar, Video, Trophy, Flame, GraduationCap, BookMarked } from "lucide-react";
import { SCHOOL_LEVELS, SUBJECTS } from "../../../shared/subjects";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: errorQuestions, isLoading: loadingQuestions } = trpc.errorQuestions.list.useQuery({ limit: 10 });
  const { data: progress, isLoading: loadingProgress } = trpc.practice.getProgress.useQuery();
  const { data: reviewStats, isLoading: loadingReview } = trpc.review.getStatistics.useQuery();
  const { data: achievementStats } = trpc.achievements.getStats.useQuery();
  const { data: streakData } = trpc.achievements.getCurrentStreak.useQuery();
  const { data: fullStats } = trpc.stats.getFullStats.useQuery();

  const totalQuestions = errorQuestions?.length || 0;
  const analyzedQuestions = errorQuestions?.filter(q => q.isAnalyzed).length || 0;
  const masteredQuestions = errorQuestions?.filter(q => q.isMastered).length || 0;
  
  const totalKnowledgePoints = progress?.length || 0;
  const masteredKnowledgePoints = progress?.filter(p => p.status === "mastered").length || 0;
  const learningKnowledgePoints = progress?.filter(p => p.status === "learning").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">学习概览</h1>
          <p className="text-muted-foreground mt-2">欢迎回来！查看你的学习进度和待办任务</p>
        </div>

        {/* 板块统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              板块统计
            </CardTitle>
            <CardDescription>按初中、高中分类的错题数量</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {fullStats?.byLevel.junior || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {SCHOOL_LEVELS.junior.name}
                </div>
              </div>
              <div className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {fullStats?.byLevel.senior || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {SCHOOL_LEVELS.senior.name}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 学科统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5" />
              学科分布
            </CardTitle>
            <CardDescription>各学科错题数量统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(SUBJECTS).map(([key, subject]) => {
                const count = fullStats?.bySubject.all[key] || 0;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{subject.icon}</span>
                      <span className="text-sm font-medium">{subject.name}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{count} 道</span>
                  </div>
                );
              })}
              {!fullStats?.bySubject.all || Object.keys(fullStats.bySubject.all).length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  暂无错题数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">错题总数</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuestions}</div>
              <p className="text-xs text-muted-foreground">
                已分析 {analyzedQuestions} 题
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已掌握</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{masteredQuestions}</div>
              <p className="text-xs text-muted-foreground">
                掌握率 {totalQuestions > 0 ? Math.round((masteredQuestions / totalQuestions) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">知识点</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalKnowledgePoints}</div>
              <p className="text-xs text-muted-foreground">
                已掌握 {masteredKnowledgePoints} 个
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待复习</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviewStats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">
                紧急 {reviewStats?.byPriority.urgent || 0} 个
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学习成就</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {achievementStats?.unlockedCount || 0}/{achievementStats?.totalCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                总积分 {achievementStats?.totalPoints || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">连续打卡</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{streakData?.streak || 0} 天</div>
              <p className="text-xs text-muted-foreground">保持学习习惯</p>
            </CardContent>
          </Card>
        </div>

        {/* 主要功能区 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 最近错题 */}
          <Card>
            <CardHeader>
              <CardTitle>最近错题</CardTitle>
              <CardDescription>查看和管理你的错题本</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingQuestions ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : errorQuestions && errorQuestions.length > 0 ? (
                <div className="space-y-3">
                  {errorQuestions.slice(0, 5).map((question) => (
                    <div key={question.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm line-clamp-1">{question.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {question.subject} · {question.grade}
                          {question.isAnalyzed && <span className="ml-2 text-primary">✓ 已分析</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/error-questions">查看全部错题</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">还没有错题记录</p>
                  <Button asChild>
                    <Link href="/error-questions">上传第一道错题</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 学习进度 */}
          <Card>
            <CardHeader>
              <CardTitle>学习进度</CardTitle>
              <CardDescription>知识点掌握情况</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProgress ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : progress && progress.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>已掌握</span>
                      <span className="font-medium">{masteredKnowledgePoints} / {totalKnowledgePoints}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-chart-2 transition-all"
                        style={{ width: `${totalKnowledgePoints > 0 ? (masteredKnowledgePoints / totalKnowledgePoints) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>学习中</span>
                      <span className="font-medium">{learningKnowledgePoints} 个</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-chart-3 transition-all"
                        style={{ width: `${totalKnowledgePoints > 0 ? (learningKnowledgePoints / totalKnowledgePoints) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/report">查看详细报告</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">开始练习后即可查看进度</p>
                  <Button asChild>
                    <Link href="/practice">开始练习</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用功能快捷入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2" asChild>
                <Link href="/error-questions">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <span>上传错题</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2" asChild>
                <Link href="/practice">
                  <Target className="h-8 w-8 text-chart-2" />
                  <span>开始练习</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2" asChild>
                <Link href="/videos">
                  <Video className="h-8 w-8 text-chart-3" />
                  <span>视频学习</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
