import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, Brain, AlertTriangle, TrendingUp, BookOpen, Video, Target, Lightbulb, GitCompare, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getSubjectName } from "@shared/subjects";

export default function KnowledgePointDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const knowledgePointId = parseInt(params.id || "0");

  // 获取知识点详情数据
  const { data: detail, isLoading, error } = trpc.knowledgePointDetail.getDetail.useQuery({
    knowledgePointId,
  });

  // 获取错题对比分析数据
  const { data: comparison, isLoading: comparisonLoading } = trpc.knowledgePointDetail.getErrorComparison.useQuery(
    { knowledgePointId },
    { enabled: !!detail && detail.errors.length >= 2 } // 只有当错题数>=2时才请求
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !detail || !detail.info) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>加载知识点详情失败：{error?.message || "数据不存在"}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const { info, errors, practices, progress, masteryTrend, aiAnalysis, stats } = detail;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* 头部导航 */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/report")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{info.name}</h1>
            <p className="text-muted-foreground mt-1">
              {getSubjectName(info.subject as any)} · {info.difficulty === "easy" ? "简单" : info.difficulty === "medium" ? "中等" : "困难"}
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">掌握度</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.masteryLevel}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.masteryLevel >= 80 ? "已掌握" : stats.masteryLevel >= 60 ? "基本掌握" : "需加强"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">错题数</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.errorCount}</div>
              <p className="text-xs text-muted-foreground mt-1">累计错题</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">练习次数</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.practiceCount}</div>
              <p className="text-xs text-muted-foreground mt-1">累计练习</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">正确率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.correctRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">平均正确率</p>
            </CardContent>
          </Card>
        </div>

        {/* AI易错原因分析 */}
        {aiAnalysis && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI易错原因分析
              </CardTitle>
              <CardDescription>基于您的错题记录，AI自动总结的易错模式和改进建议</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 总结 */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-600" />
                  易错原因总结
                </h3>
                <p className="text-sm leading-relaxed">{aiAnalysis.summary}</p>
              </div>

              {/* 常见错误模式 */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold mb-3">常见错误模式</h3>
                <ul className="space-y-2">
                  {aiAnalysis.commonPatterns.map((pattern: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="mt-1 h-5 w-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="leading-relaxed">{pattern}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 改进建议 */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold mb-3">改进建议</h3>
                <ul className="space-y-2">
                  {aiAnalysis.suggestions.map((suggestion: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="mt-1 h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        ✓
                      </div>
                      <span className="leading-relaxed">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 错题对比分析 */}
        {comparison && comparison.totalErrors >= 2 && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-purple-600" />
                错题横向对比分析
              </CardTitle>
              <CardDescription>
                AI自动识别{comparison.totalErrors}道错题的错误类型并生成专项练习建议
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 整体错误模式 */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  整体错误模式
                </h3>
                <p className="text-sm leading-relaxed">{comparison.overallPattern}</p>
              </div>

              {/* 错误类型分组 */}
              {comparison.errorGroups.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">错误类型分组（共{comparison.errorGroups.length}类）</h3>
                  {comparison.errorGroups.map((group, index) => (
                    <div key={index} className="p-4 bg-white rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-medium">
                            {group.count}
                          </div>
                          <div>
                            <h4 className="font-semibold">{group.errorTypeName}</h4>
                            <p className="text-xs text-muted-foreground">{group.count}道错题</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">共同模式：</span>{group.commonPattern}
                      </p>
                      <div className="space-y-2">
                        {group.errors.map((error) => (
                          <div
                            key={error.id}
                            className="p-2 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => setLocation(`/error-questions/${error.id}`)}
                          >
                            <div className="font-medium">{error.title}</div>
                            {error.errorAnalysis && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {error.errorAnalysis}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 专项练习建议 */}
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-600" />
                  举一反三·专项练习建议
                </h3>
                <ul className="space-y-2">
                  {comparison.targetedSuggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="mt-1 h-5 w-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="leading-relaxed">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 掌握度趋势图 */}
        <Card>
          <CardHeader>
            <CardTitle>掌握度趋势</CardTitle>
            <CardDescription>近8周的练习正确率变化</CardDescription>
          </CardHeader>
          <CardContent>
            {masteryTrend && masteryTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={masteryTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="正确率(%)"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="practiceCount"
                    name="练习次数"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                暂无练习数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 错题列表 */}
        <Card>
          <CardHeader>
            <CardTitle>相关错题</CardTitle>
            <CardDescription>该知识点下的所有错题（共{errors.length}道）</CardDescription>
          </CardHeader>
          <CardContent>
            {errors.length > 0 ? (
              <div className="space-y-3">
                {errors.slice(0, 10).map((error) => (
                  <div
                    key={error.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/error-questions/${error.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{error.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {error.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{error.difficulty === "easy" ? "简单" : error.difficulty === "medium" ? "中等" : "困难"}</span>
                          <span>{new Date(error.createdAt).toLocaleDateString()}</span>
                          {error.isMastered && (
                            <span className="text-green-600 font-medium">已掌握</span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        查看详情
                      </Button>
                    </div>
                  </div>
                ))}
                {errors.length > 10 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" onClick={() => setLocation("/error-questions")}>
                      查看全部 {errors.length} 道错题
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无相关错题</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 学习资源推荐 */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                视频学习
              </CardTitle>
              <CardDescription>观看相关讲解视频</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => setLocation(`/videos?keyword=${encodeURIComponent(info.name)}`)}
              >
                搜索学习视频
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                针对性练习
              </CardTitle>
              <CardDescription>生成该知识点的练习题</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  // 如果有错题，跳转到第一道错题的练习题生成页面
                  if (errors.length > 0) {
                    setLocation(`/practice-questions/${errors[0].id}`);
                  }
                }}
                disabled={errors.length === 0}
              >
                {errors.length > 0 ? "开始练习" : "暂无错题可生成练习"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
