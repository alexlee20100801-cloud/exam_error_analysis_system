/**
 * 成就展示页面
 */

import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Award,
  BookOpen,
  Target,
  Flame,
  Brain,
  Share2,
  Trophy,
  Star,
  Zap,
  Medal,
  Crown,
  Lightbulb,
  Compass,
  ShieldCheck,
  Heart,
  BookMarked,
  Library,
  GraduationCap,
  PenTool,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  BookOpen,
  Target,
  Flame,
  Brain,
  Share2,
  Trophy,
  Star,
  Zap,
  Medal,
  Crown,
  Lightbulb,
  Compass,
  ShieldCheck,
  Heart,
  BookMarked,
  Library,
  GraduationCap,
  PenTool,
};

export default function Achievements() {
  const { user, loading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: achievements, isLoading: achievementsLoading } =
    trpc.achievements.getUserAchievements.useQuery();
  const { data: stats } = trpc.achievements.getStats.useQuery();
  const { data: streakData } = trpc.achievements.getCurrentStreak.useQuery();
  const { data: calendar } = trpc.achievements.getCheckInCalendar.useQuery();

  const checkInMutation = trpc.achievements.checkIn.useMutation({
    onSuccess: (data) => {
      toast.success(`打卡成功！当前连续 ${data.streak} 天`);
    },
  });

  if (loading || achievementsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  const categories = [
    { value: "all", label: "全部" },
    { value: "learning", label: "学习" },
    { value: "practice", label: "练习" },
    { value: "streak", label: "打卡" },
    { value: "mastery", label: "掌握" },
    { value: "social", label: "社交" },
  ];

  const filteredAchievements =
    selectedCategory === "all"
      ? achievements
      : achievements?.filter((a) => a.achievement.category === selectedCategory);

  const unlockedAchievements = achievements?.filter((a) => a.unlocked) || [];
  const lockedAchievements = achievements?.filter((a) => !a.unlocked) || [];

  // 生成打卡日历（最近30天）
  const generateCalendar = () => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const hasCheckIn = calendar?.calendar[dateStr] || false;
      days.push({
        date: dateStr,
        day: date.getDate(),
        hasCheckIn,
      });
    }
    return days;
  };

  const calendarDays = generateCalendar();

  const handleCheckIn = () => {
    checkInMutation.mutate({ activityType: "error_question" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">学习成就</h1>
          <p className="text-muted-foreground mt-2">
            通过完成学习任务解锁徽章，记录你的学习历程
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已解锁成就</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.unlockedCount || 0}/{stats?.totalCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                完成度 {stats?.completionRate || 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总积分</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPoints || 0}</div>
              <p className="text-xs text-muted-foreground">成就积分</p>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日打卡</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending}
                className="w-full"
                size="sm"
              >
                {checkInMutation.isPending ? "打卡中..." : "立即打卡"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 打卡日历 */}
        <Card>
          <CardHeader>
            <CardTitle>打卡日历</CardTitle>
            <CardDescription>最近30天的学习记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-2">
              {calendarDays.map((day: any) => (
                <div
                  key={day.date}
                  className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                    day.hasCheckIn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  title={day.date}
                >
                  {day.day}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 成就列表 */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            {categories.map((cat: any) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-4 mt-4">
            {/* 已解锁成就 */}
            {unlockedAchievements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">已解锁</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAchievements
                    ?.filter((a) => a.unlocked)
                    .map((item: any) => {
                      const Icon = iconMap[item.achievement.icon || 'Award'] || Award;
                      return (
                        <Card key={item.achievement.id} className="relative overflow-hidden">
                          <div
                            className="absolute inset-0 opacity-10"
                            style={{ backgroundColor: item.achievement.color || '#6366f1' }}
                          />
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div
                                className="p-3 rounded-lg"
                                style={{ backgroundColor: (item.achievement.color || '#6366f1') + "20" }}
                              >
                                <Icon className="h-6 w-6" />
                              </div>
                              <Badge variant="secondary">
                                +{item.achievement.points} 积分
                              </Badge>
                            </div>
                            <CardTitle className="mt-4">{item.achievement.name}</CardTitle>
                            <CardDescription>{item.achievement.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground">
                              解锁于{" "}
                              {item.unlockedAt
                                ? new Date(item.unlockedAt).toLocaleDateString("zh-CN")
                                : ""}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 未解锁成就 */}
            {lockedAchievements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">未解锁</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAchievements
                    ?.filter((a) => !a.unlocked)
                    .map((item: any) => {
                      const Icon = iconMap[item.achievement.icon || 'Award'] || Award;
                      const progressPercent = Math.floor(
                        (item.progress / item.achievement.requirement) * 100
                      );
                      return (
                        <Card
                          key={item.achievement.id}
                          className="relative overflow-hidden opacity-60"
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="p-3 rounded-lg bg-muted">
                                <Icon className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <Badge variant="outline">
                                +{item.achievement.points} 积分
                              </Badge>
                            </div>
                            <CardTitle className="mt-4">{item.achievement.name}</CardTitle>
                            <CardDescription>{item.achievement.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>进度</span>
                              <span>
                                {item.progress}/{item.achievement.requirement}
                              </span>
                            </div>
                            <Progress value={progressPercent} />
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
