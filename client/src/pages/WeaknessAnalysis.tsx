import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  BookOpen, 
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function WeaknessAnalysis() {
  const { data: user } = trpc.auth.me.useQuery();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // 获取薄弱点分析数据
  const { data: analysis, isLoading, refetch } = trpc.weakness.analyze.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  // 获取雷达图数据
  const { data: radarData } = trpc.weakness.getRadarData.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">正在分析您的学习数据...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis || analysis.totalErrorQuestions === 0) {
    return (
      <div className="container py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            暂无错题数据，请先录入错题后再进行薄弱点分析。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI薄弱点分析
          </h1>
          <p className="text-muted-foreground mt-2">
            基于您的错题数据，智能分析薄弱知识点，提供个性化学习建议
          </p>
        </div>
        <Button onClick={() => refetch()}>
          <TrendingUp className="h-4 w-4 mr-2" />
          重新分析
        </Button>
      </div>

      {/* 整体概况 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错题总数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalErrorQuestions}</div>
            <p className="text-xs text-muted-foreground">
              需要重点关注
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">整体掌握率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.overallMasteryRate.toFixed(1)}%</div>
            <Progress value={analysis.overallMasteryRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">薄弱知识点</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.weakKnowledgePoints.length}</div>
            <p className="text-xs text-muted-foreground">
              需要加强练习
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分析时间</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {new Date(analysis.analysisDate).toLocaleDateString('zh-CN')}
            </div>
            <p className="text-xs text-muted-foreground">
              最后更新
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 学习建议 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            学习建议
          </CardTitle>
          <CardDescription>
            基于您的学习情况，我们为您提供以下建议
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">{idx + 1}</span>
                </div>
                <p className="text-sm">{rec}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 薄弱知识点详情 */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">知识点列表</TabsTrigger>
          <TabsTrigger value="path">学习路径</TabsTrigger>
          <TabsTrigger value="chart">可视化分析</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>薄弱知识点详情</CardTitle>
              <CardDescription>
                按错误率排序，优先关注错误率高的知识点
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.weakKnowledgePoints.map((wp, idx) => (
                  <Card key={wp.knowledgePointId} className="border-l-4" style={{
                    borderLeftColor: wp.errorRate > 70 ? '#ef4444' : wp.errorRate > 50 ? '#f59e0b' : '#10b981'
                  }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span>{idx + 1}. {wp.name}</span>
                            <Badge variant={wp.difficulty === 'hard' ? 'destructive' : wp.difficulty === 'medium' ? 'default' : 'secondary'}>
                              {wp.difficulty === 'hard' ? '困难' : wp.difficulty === 'medium' ? '中等' : '简单'}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {wp.subject} · {wp.grade}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-destructive">
                            {wp.errorRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">错误率</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">错题数</div>
                          <div className="font-medium">{wp.errorCount} 题</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">练习次数</div>
                          <div className="font-medium">{wp.totalPracticeCount} 次</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">掌握度</div>
                          <div className="font-medium">{wp.masteryLevel}%</div>
                        </div>
                      </div>

                      <div>
                        <Progress value={wp.masteryLevel} className="h-2" />
                      </div>

                      {wp.improvementSuggestion && (
                        <Alert>
                          <Brain className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <strong>AI建议：</strong>{wp.improvementSuggestion}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          查看相关错题 ({wp.relatedQuestionIds.length})
                        </Button>
                        <Button size="sm">
                          开始练习
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="path" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>个性化学习路径</CardTitle>
              <CardDescription>
                按照从易到难的顺序，逐步攻克薄弱知识点
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.learningPath.map((node, idx) => (
                  <div key={node.knowledgePointId} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                        node.status === 'completed' ? 'bg-green-500 text-white' :
                        node.status === 'in_progress' ? 'bg-blue-500 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < analysis.learningPath.length - 1 && (
                        <div className="w-0.5 h-16 bg-gray-200" />
                      )}
                    </div>

                    <Card className="flex-1">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{node.name}</CardTitle>
                          <Badge variant={
                            node.status === 'completed' ? 'default' :
                            node.status === 'in_progress' ? 'secondary' :
                            'outline'
                          }>
                            {node.status === 'completed' ? '已完成' :
                             node.status === 'in_progress' ? '进行中' :
                             '未开始'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            预计 {node.estimatedTime} 分钟
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {node.recommendedQuestions.length} 道推荐题目
                          </span>
                        </div>

                        {node.prerequisiteIds.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            前置知识点：{node.prerequisiteIds.join(', ')}
                          </div>
                        )}

                        <Button size="sm" className="w-full" disabled={node.status === 'completed'}>
                          {node.status === 'completed' ? '已完成' : '开始学习'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                知识点掌握度可视化
              </CardTitle>
              <CardDescription>
                多维度展示您的学习情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  可视化图表功能开发中，敬请期待！
                  <br />
                  将支持：雷达图、热力图、趋势图等多种图表展示方式。
                </AlertDescription>
              </Alert>

              {/* 简单的文本统计 */}
              <div className="mt-6 space-y-4">
                <h4 className="font-medium">学科分布统计</h4>
                {radarData && radarData.map((item: any) => (
                  <div key={item.subject} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.subject}</span>
                      <span className="font-medium">{item.mastery.toFixed(1)}%</span>
                    </div>
                    <Progress value={item.mastery} />
                    <div className="text-xs text-muted-foreground">
                      共 {item.totalPoints} 个知识点
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
