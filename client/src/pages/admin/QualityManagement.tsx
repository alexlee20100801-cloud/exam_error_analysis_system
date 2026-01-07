import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, TrendingDown, Eye, BarChart3, Award } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

export default function QualityManagement() {
  const [, setLocation] = useLocation();
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [minScore, setMinScore] = useState(60);

  const { data: qualityStats, isLoading } = trpc.quality.getQualityStats.useQuery();
  
  const { data: lowQualityQuestions, refetch } = trpc.quality.getLowQualityQuestions.useQuery({
    threshold: minScore,
    limit: 50
  });

  const recalculateMutation = trpc.quality.recalculateScore.useMutation({
    onSuccess: () => {
      toast.success("重新计算完成");
      refetch();
    },
    onError: (error) => {
      toast.error(`计算失败: ${error.message}`);
    }
  });

  const viewDetail = (question: any) => {
    setSelectedQuestion(question);
    setShowDetailDialog(true);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-600">优秀</Badge>;
    if (score >= 80) return <Badge className="bg-blue-600">良好</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-600">中等</Badge>;
    if (score >= 60) return <Badge className="bg-orange-600">及格</Badge>;
    return <Badge variant="destructive">不及格</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            质量评分管理
          </h1>
          <p className="text-muted-foreground mt-2">
            多维度评估试题质量,持续优化题库内容
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="overview">质量概览</TabsTrigger>
            <TabsTrigger value="lowquality">低质量试题</TabsTrigger>
            <TabsTrigger value="rules">评分规则</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">平均质量分</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(qualityStats?.averageScore || 0)}`}>
                    {qualityStats?.averageScore?.toFixed(1) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    题库整体质量水平
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-600" />
                    优秀试题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {qualityStats?.excellentCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    评分 ≥ 90 分
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    良好试题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {qualityStats?.goodCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    评分 80-90 分
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    低质量试题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {qualityStats?.poorCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    评分 &lt; 60 分
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>质量分布</CardTitle>
                <CardDescription>各分数段试题数量统计</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">优秀 (90-100分)</span>
                      <span className="text-sm text-muted-foreground">
                        {qualityStats?.excellentCount || 0} 个
                      </span>
                    </div>
                    <Progress value={(qualityStats?.excellentCount || 0) / (qualityStats?.totalCount || 1) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">良好 (80-89分)</span>
                      <span className="text-sm text-muted-foreground">
                        {qualityStats?.goodCount || 0} 个
                      </span>
                    </div>
                    <Progress value={(qualityStats?.goodCount || 0) / (qualityStats?.totalCount || 1) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">中等 (70-79分)</span>
                      <span className="text-sm text-muted-foreground">
                        {qualityStats?.mediumCount || 0} 个
                      </span>
                    </div>
                    <Progress value={(qualityStats?.mediumCount || 0) / (qualityStats?.totalCount || 1) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">及格 (60-69分)</span>
                      <span className="text-sm text-muted-foreground">
                        {qualityStats?.passCount || 0} 个
                      </span>
                    </div>
                    <Progress value={(qualityStats?.passCount || 0) / (qualityStats?.totalCount || 1) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">不及格 (&lt;60分)</span>
                      <span className="text-sm text-muted-foreground">
                        {qualityStats?.poorCount || 0} 个
                      </span>
                    </div>
                    <Progress value={(qualityStats?.poorCount || 0) / (qualityStats?.totalCount || 1) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>学科质量对比</CardTitle>
                <CardDescription>各学科平均质量分</CardDescription>
              </CardHeader>
              <CardContent>
                {qualityStats?.subjectScores && Object.keys(qualityStats.subjectScores).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(qualityStats.subjectScores).map(([subject, score]) => (
                      <div key={subject} className="flex items-center justify-between">
                        <span className="font-medium">{subject}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getScoreColor(score as number)}`}>
                            {(score as number).toFixed(1)}
                          </span>
                          {getScoreBadge(score as number)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">暂无数据</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lowquality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>低质量试题筛选</CardTitle>
                <CardDescription>
                  设置最低质量分阈值,筛选需要改进的试题
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">最低质量分: {minScore}</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refetch()}
                    >
                      应用筛选
                    </Button>
                  </div>
                  <Slider
                    value={[minScore]}
                    onValueChange={(value) => setMinScore(value[0])}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    加载中...
                  </div>
                ) : lowQualityQuestions && lowQualityQuestions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>试题ID</TableHead>
                        <TableHead>学科</TableHead>
                        <TableHead>质量分</TableHead>
                        <TableHead>等级</TableHead>
                        <TableHead>主要问题</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowQualityQuestions.map((question: any) => (
                        <TableRow key={question.id}>
                          <TableCell className="font-mono">{question.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{question.subject}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold ${getScoreColor(question.qualityScore)}`}>
                              {question.qualityScore.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getScoreBadge(question.qualityScore)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {question.qualityIssues || "无"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewDetail(question)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                详情
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => recalculateMutation.mutate({ questionId: question.id })}
                              >
                                重算
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">未发现低质量试题</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      所有试题质量均达标
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>质量评分规则</CardTitle>
                <CardDescription>多维度评分体系说明</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold">完整性 (30分)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      题干、选项、答案、解析是否完整齐全
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold">准确性 (30分)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      内容是否准确无误,符合学科规范
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold">规范性 (20分)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      格式、排版、语言表达是否规范
                    </p>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-4">
                    <h3 className="font-semibold">难度适中 (10分)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      难度标注是否合理,符合目标年级水平
                    </p>
                  </div>

                  <div className="border-l-4 border-pink-500 pl-4">
                    <h3 className="font-semibold">知识点标注 (10分)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      知识点标注是否准确、完整
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">评分等级</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>90-100分</span>
                      <Badge className="bg-green-600">优秀</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>80-89分</span>
                      <Badge className="bg-blue-600">良好</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>70-79分</span>
                      <Badge className="bg-yellow-600">中等</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>60-69分</span>
                      <Badge className="bg-orange-600">及格</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>&lt;60分</span>
                      <Badge variant="destructive">不及格</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>质量评分详情</DialogTitle>
              <DialogDescription>
                试题 ID: {selectedQuestion?.id} | 总分: {selectedQuestion?.qualityScore?.toFixed(1)}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              {selectedQuestion && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">试题内容</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">题干:</span>
                        <p className="mt-1 text-muted-foreground">{selectedQuestion.content}</p>
                      </div>
                      {selectedQuestion.options && (
                        <div>
                          <span className="font-medium">选项:</span>
                          <p className="mt-1 text-muted-foreground">{selectedQuestion.options}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">评分详情</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">完整性</span>
                          <span className="font-bold">{selectedQuestion.completenessScore || 0}/30</span>
                        </div>
                        <Progress value={(selectedQuestion.completenessScore || 0) / 30 * 100} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">准确性</span>
                          <span className="font-bold">{selectedQuestion.accuracyScore || 0}/30</span>
                        </div>
                        <Progress value={(selectedQuestion.accuracyScore || 0) / 30 * 100} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">规范性</span>
                          <span className="font-bold">{selectedQuestion.standardScore || 0}/20</span>
                        </div>
                        <Progress value={(selectedQuestion.standardScore || 0) / 20 * 100} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">难度适中</span>
                          <span className="font-bold">{selectedQuestion.difficultyScore || 0}/10</span>
                        </div>
                        <Progress value={(selectedQuestion.difficultyScore || 0) / 10 * 100} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">知识点标注</span>
                          <span className="font-bold">{selectedQuestion.knowledgeScore || 0}/10</span>
                        </div>
                        <Progress value={(selectedQuestion.knowledgeScore || 0) / 10 * 100} />
                      </div>
                    </CardContent>
                  </Card>

                  {selectedQuestion.qualityIssues && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">发现的问题</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {selectedQuestion.qualityIssues}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                关闭
              </Button>
              {selectedQuestion && (
                <Button
                  variant="default"
                  onClick={() => {
                    recalculateMutation.mutate({ questionId: selectedQuestion.id });
                    setShowDetailDialog(false);
                  }}
                >
                  重新计算评分
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
