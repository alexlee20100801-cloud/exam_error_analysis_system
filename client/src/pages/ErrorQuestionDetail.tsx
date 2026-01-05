import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, 
  Brain, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  Video,
  ClipboardList
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function ErrorQuestionDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, params] = useRoute("/error-questions/:id");
  const [, setLocation] = useLocation();
  
  const questionId = params?.id ? parseInt(params.id) : 0;

  // 获取错题详情
  const { data: question, isLoading: questionLoading } = trpc.errorQuestions.getById.useQuery(
    { questionId },
    { enabled: !!questionId }
  );

  // 深度分析mutation
  const analyzeDetailedMutation = trpc.aiAnalysis.analyzeQuestionDetailed.useMutation({
    onSuccess: () => {
      toast.success("AI深度分析完成！");
      utils.errorQuestions.getById.invalidate({ questionId });
    },
    onError: (error) => {
      toast.error(`分析失败：${error.message}`);
    },
  });

  const utils = trpc.useUtils();

  if (authLoading || questionLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!question) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>错题不存在或已被删除</AlertDescription>
          </Alert>
          <Button onClick={() => setLocation("/error-questions")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回错题本
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleDetailedAnalysis = () => {
    analyzeDetailedMutation.mutate({ questionId });
  };

  const difficultyMap = {
    easy: { label: "简单", color: "bg-green-100 text-green-800" },
    medium: { label: "中等", color: "bg-yellow-100 text-yellow-800" },
    hard: { label: "困难", color: "bg-red-100 text-red-800" },
  };

  const subjectMap: Record<string, string> = {
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

  const gradeMap: Record<string, string> = {
    junior1: "初一",
    junior2: "初二",
    junior3: "初三",
    senior1: "高一",
    senior2: "高二",
    senior3: "高三",
  };

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-6xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/error-questions")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{question.title || "错题详情"}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{subjectMap[question.subject]}</Badge>
                <Badge variant="outline">{gradeMap[question.grade]}</Badge>
                {question.difficulty && (
                  <Badge className={difficultyMap[question.difficulty].color}>
                    {difficultyMap[question.difficulty].label}
                  </Badge>
                )}
                {question.isMastered && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    已掌握
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleDetailedAnalysis}
            disabled={analyzeDetailedMutation.isPending}
            size="lg"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {analyzeDetailedMutation.isPending ? "分析中..." : "AI深度分析"}
          </Button>
        </div>

        {/* 题目内容 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              题目内容
            </CardTitle>
          </CardHeader>
          <CardContent>
            {question.imageUrl && (
              <img
                src={question.imageUrl}
                alt="题目图片"
                className="w-full max-w-2xl rounded-lg border mb-4"
              />
            )}
            <div className="prose max-w-none">
              <Streamdown>{question.content}</Streamdown>
            </div>
          </CardContent>
        </Card>

        {/* 答案对比 */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {question.userAnswer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  我的答案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Streamdown>{question.userAnswer}</Streamdown>
              </CardContent>
            </Card>
          )}
          
          {question.correctAnswer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  正确答案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Streamdown>{question.correctAnswer}</Streamdown>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI分析结果 */}
        {question.isAnalyzed && question.detailedAnalysis ? (
          <Tabs defaultValue="overview" className="mb-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">总览</TabsTrigger>
              <TabsTrigger value="keypoints">考点解读</TabsTrigger>
              <TabsTrigger value="mistakes">易错分析</TabsTrigger>
              <TabsTrigger value="solving">解题思路</TabsTrigger>
              <TabsTrigger value="advice">学习建议</TabsTrigger>
            </TabsList>

            {/* 总览 */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    错误类型分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium mb-2">
                    {JSON.parse(question.detailedAnalysis).errorType}
                  </p>
                  <Streamdown>{JSON.parse(question.detailedAnalysis).errorAnalysis}</Streamdown>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    知识点关联
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {JSON.parse(question.detailedAnalysis).knowledgePoints?.map((kp: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant={kp.importance === "high" ? "default" : "secondary"}
                      >
                        {kp.name}
                        <span className="ml-1 text-xs">
                          ({kp.importance === "high" ? "重点" : kp.importance === "medium" ? "常规" : "辅助"})
                        </span>
                      </Badge>
                    ))}
                  </div>
                  <Streamdown>{JSON.parse(question.detailedAnalysis).knowledgeGraph}</Streamdown>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 考点解读 */}
            <TabsContent value="keypoints">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    核心考点深度解读
                  </CardTitle>
                  <CardDescription>
                    本题涉及的核心考点及其在考试中的重要性
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">核心考点列表：</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {JSON.parse(question.detailedAnalysis).keyPoints?.map((point: string, idx: number) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">详细解读：</h4>
                    <Streamdown>{JSON.parse(question.detailedAnalysis).keyPointsExplanation}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 易错分析 */}
            <TabsContent value="mistakes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    常见易错点深度分析
                  </CardTitle>
                  <CardDescription>
                    帮助你避免类似错误
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>常见易错点：</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {JSON.parse(question.detailedAnalysis).commonMistakes?.map((mistake: string, idx: number) => (
                          <li key={idx}>{mistake}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">深度分析：</h4>
                    <Streamdown>{JSON.parse(question.detailedAnalysis).mistakesAnalysis}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 解题思路 */}
            <TabsContent value="solving">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    正确解题思路
                  </CardTitle>
                  <CardDescription>
                    详细的解题步骤和策略
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">解题步骤：</h4>
                    <ol className="list-decimal list-inside space-y-2">
                      {JSON.parse(question.detailedAnalysis).solvingSteps?.map((step: string, idx: number) => (
                        <li key={idx} className="pl-2">{step}</li>
                      ))}
                    </ol>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">解题策略：</h4>
                    <Streamdown>{JSON.parse(question.detailedAnalysis).solvingStrategy}</Streamdown>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">解题技巧：</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {JSON.parse(question.detailedAnalysis).tips?.map((tip: string, idx: number) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 学习建议 */}
            <TabsContent value="advice">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    针对性学习建议
                  </CardTitle>
                  <CardDescription>
                    帮助你巩固薄弱知识点
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">学习建议：</h4>
                    <Streamdown>{JSON.parse(question.detailedAnalysis).studyAdvice}</Streamdown>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">练习方向：</h4>
                    <Streamdown>{JSON.parse(question.detailedAnalysis).practiceDirection}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : question.isAnalyzed ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                基础AI分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {question.errorAnalysis && (
                <div>
                  <h4 className="font-semibold mb-2">错误分析：</h4>
                  <Streamdown>{question.errorAnalysis}</Streamdown>
                </div>
              )}
              {question.detailedExplanation && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">详细解析：</h4>
                    <Streamdown>{question.detailedExplanation}</Streamdown>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Alert className="mb-6">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              点击右上角的"AI深度分析"按钮，获取详细的考点解读、易错点分析和学习建议
            </AlertDescription>
          </Alert>
        )}

        {/* 快捷操作 */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                视频学习
              </CardTitle>
              <CardDescription>观看相关知识点讲解视频</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                查找学习视频
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                针对性练习
              </CardTitle>
              <CardDescription>生成相似题目巩固知识</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                生成练习题
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                标记状态
              </CardTitle>
              <CardDescription>更新题目掌握情况</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={question.isMastered ? "secondary" : "default"}
                className="w-full"
              >
                {question.isMastered ? "已掌握" : "标记为已掌握"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
