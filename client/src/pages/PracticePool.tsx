import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, TrendingUp, Clock, Target, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * 专项练习池页面
 * 展示所有错题生成的强化练习题
 */
export default function PracticePool() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed">("all");

  // 获取用户的专项练习池
  const { data: poolData, isLoading } = trpc.practicePools.getMyPracticePool.useQuery({
    status: activeTab === "all" ? undefined : activeTab,
  });

  // 获取统计数据
  const { data: stats } = trpc.practicePools.getStats.useQuery();

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

  const practices = poolData?.practices || [];
  const totalPools = stats?.stats?.total || 0;
  const completedPools = stats?.stats?.completed || 0;
  const pendingPools = stats?.stats?.pending || 0;
  const avgScore = stats?.stats?.averageScore || 0;

  return (
    <div className="container py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">专项练习</h1>
        <p className="text-muted-foreground">
          针对错题生成的强化练习，帮助你巩固薄弱知识点
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总练习题</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPools}</div>
            <p className="text-xs text-muted-foreground">个专项练习题</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPools}</div>
            <p className="text-xs text-muted-foreground">
              完成率 {totalPools > 0 ? Math.round((completedPools / totalPools) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均得分</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}分</div>
            <p className="text-xs text-muted-foreground">练习平均得分</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待练习</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPools}</div>
            <p className="text-xs text-muted-foreground">个练习题待完成</p>
          </CardContent>
        </Card>
      </div>

      {/* 标签页筛选 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="pending">待练习</TabsTrigger>
          <TabsTrigger value="completed">已完成</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 练习题列表 */}
      {practices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无专项练习</h3>
            <p className="text-muted-foreground text-center mb-4">
              当你有错题时，可以为错题生成针对性的练习题
            </p>
            <Button onClick={() => navigate("/mistakes")}>
              查看我的错题
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {practices.map((practice: any) => {
            const errorQuestion = practice.errorQuestion;
            const practiceQuestion = practice.question;
            const poolInfo = practice.pool;

            if (!errorQuestion || !practiceQuestion) return null;

            return (
              <Card
                key={poolInfo.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/practice/${poolInfo.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={poolInfo.status === "completed" ? "default" : "secondary"}>
                      {poolInfo.status === "completed" ? "已完成" : 
                       poolInfo.status === "pending" ? "待练习" : "已跳过"}
                    </Badge>
                    <Badge variant="outline">
                      {poolInfo.difficulty === "easy" ? "简单" :
                       poolInfo.difficulty === "medium" ? "中等" : "困难"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">
                    {errorQuestion.subject} - {errorQuestion.knowledgePoint}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    来源错题：{errorQuestion.questionText}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* 练习题内容预览 */}
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      练习题：{practiceQuestion.questionText}
                    </div>

                    {/* 得分（如果已完成） */}
                    {poolInfo.status === "completed" && poolInfo.score !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">得分</span>
                        <span className="font-medium text-lg">
                          {poolInfo.score}分
                        </span>
                      </div>
                    )}

                    {/* 完成时间 */}
                    {poolInfo.completedAt && (
                      <div className="text-xs text-muted-foreground">
                        完成于 {new Date(poolInfo.completedAt).toLocaleDateString()}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <Button
                      className="w-full mt-4"
                      variant={poolInfo.status === "completed" ? "outline" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/practice/${poolInfo.id}`);
                      }}
                    >
                      {poolInfo.status === "completed" ? "查看详情" : "开始练习"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
