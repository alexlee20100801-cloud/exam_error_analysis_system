import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Route, 
  CheckCircle2, 
  Lock, 
  Play, 
  Trophy, 
  Clock, 
  Target,
  Sparkles,
  ArrowRight,
  BookOpen,
  XCircle,
  TrendingUp,
  Brain
} from "lucide-react";
import { LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// 常量定义
const SUBJECTS = {
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

const GRADES = {
  junior1: "初一",
  junior2: "初二",
  junior3: "初三",
  senior1: "高一",
  senior2: "高二",
  senior3: "高三",
};

const DIFFICULTIES = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const DIFFICULTY_COLORS = {
  easy: "bg-green-100 text-green-700 border-green-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  hard: "bg-red-100 text-red-700 border-red-300",
};

const STATUS_CONFIG = {
  locked: {
    icon: Lock,
    label: "未解锁",
    color: "text-gray-400",
    bgColor: "bg-gray-100",
  },
  available: {
    icon: Play,
    label: "可学习",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  in_progress: {
    icon: Clock,
    label: "学习中",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  completed: {
    icon: CheckCircle2,
    label: "已完成",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
};

export default function LearningPath() {
  const { user } = useAuth();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [questionResults, setQuestionResults] = useState<Record<number, boolean>>({});

  // 获取所有学习路径
  const { data: paths, refetch: refetchPaths } = trpc.learningPath.getAll.useQuery();

  // 获取路径详情
  const { data: pathDetail, refetch: refetchDetail } = trpc.learningPath.getDetail.useQuery(
    { pathId: selectedPathId! },
    { enabled: !!selectedPathId }
  );

  // 获取节点题目
  const { data: nodeQuestions } = trpc.learningPath.getNodeQuestions.useQuery(
    {
      pathId: selectedPathId!,
      nodeId: selectedNode?.id || "",
    },
    { enabled: !!selectedPathId && !!selectedNode }
  );

  // 获取路径统计数据
  const { data: statistics } = trpc.learningPath.getStatistics.useQuery(
    { pathId: selectedPathId! },
    { enabled: !!selectedPathId }
  );

  // 生成学习路径
  const generateMutation = trpc.learningPath.generate.useMutation({
    onSuccess: (data) => {
      toast.success("学习路径生成成功！");
      setShowGenerateDialog(false);
      setSelectedPathId(data.pathId);
      refetchPaths();
    },
    onError: (error) => {
      toast.error(`生成失败：${error.message}`);
    },
  });

  // 完成节点
  const completeNodeMutation = trpc.learningPath.completeNode.useMutation({
    onSuccess: () => {
      toast.success("节点完成！已解锁下一节点");
      setSelectedNode(null);
      setCurrentQuestionIndex(0);
      setQuestionResults({});
      refetchPaths();
      refetchDetail();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

  // 重置答题状态
  useEffect(() => {
    if (selectedNode) {
      setCurrentQuestionIndex(0);
      setUserAnswer("");
      setShowResult(false);
      setQuestionResults({});
    }
  }, [selectedNode]);

  const handleGenerate = () => {
    if (!selectedSubject || !user?.grade) {
      toast.error("请选择学科");
      return;
    }

    generateMutation.mutate({
      subject: selectedSubject,
      grade: user.grade,
    });
  };

  const handleStartNode = (node: any) => {
    setSelectedNode(node);
  };

  const handleSubmitAnswer = () => {
    if (!nodeQuestions || !nodeQuestions[currentQuestionIndex]) return;

    const currentQuestion = nodeQuestions[currentQuestionIndex];
    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();

    setQuestionResults(prev => ({
      ...prev,
      [currentQuestionIndex]: isCorrect,
    }));
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (!nodeQuestions) return;

    if (currentQuestionIndex < nodeQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserAnswer("");
      setShowResult(false);
    } else {
      // 所有题目完成，计算得分
      const correctCount = Object.values(questionResults).filter(Boolean).length + (questionResults[currentQuestionIndex] ? 1 : 0);
      const score = Math.round((correctCount / nodeQuestions.length) * 100);

      if (!selectedPathId || !selectedNode) return;

      completeNodeMutation.mutate({
        pathId: selectedPathId,
        nodeId: selectedNode.id,
        score,
      });
    }
  };

  const completedQuestionsCount = Object.keys(questionResults).length;
  const totalQuestions = nodeQuestions?.length || 0;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Route className="h-8 w-8 text-purple-500" />
          个性化学习路径
        </h1>
        <p className="text-muted-foreground mt-2">
          基于你的错题分析，为你定制专属的学习提升路径
        </p>
      </div>

      {/* 路径列表 */}
      {!selectedPathId && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">我的学习路径</h2>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              生成新路径
            </Button>
          </div>

          {!paths || paths.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Route className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  还没有学习路径，点击上方按钮生成你的专属学习路径
                </p>
                <Button onClick={() => setShowGenerateDialog(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  立即生成
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paths.map((path: any) => (
                <Card
                  key={path.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedPathId(path.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {path.title}
                          {path.progress >= 100 && (
                            <Trophy className="h-5 w-5 text-yellow-500" />
                          )}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {path.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">
                          {SUBJECTS[path.subject as keyof typeof SUBJECTS]}
                        </Badge>
                        <Badge variant="outline">
                          {GRADES[path.grade as keyof typeof GRADES]}
                        </Badge>
                        <span className="ml-auto">
                          {path.completedNodes}/{path.totalNodes} 节点
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">学习进度</span>
                          <span className="font-medium">{Math.round(path.progress)}%</span>
                        </div>
                        <Progress value={path.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 路径详情 */}
      {selectedPathId && pathDetail && (
        <div className="space-y-6">
          {/* 统计面板 */}
          {statistics && statistics.completedNodes > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 得分趋势图 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    得分趋势
                  </CardTitle>
                  <CardDescription>展示你在各节点的得分变化</CardDescription>
                </CardHeader>
                <CardContent>
                  {statistics.scoresTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={statistics.scoresTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="nodeIndex" 
                          label={{ value: '节点序号', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          label={{ value: '得分', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="得分"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      暂无数据
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 知识点掌握度雷达图 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    知识点掌握度
                  </CardTitle>
                  <CardDescription>展示各知识点的掌握程度</CardDescription>
                </CardHeader>
                <CardContent>
                  {statistics.knowledgePointMastery.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={statistics.knowledgePointMastery}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="knowledgePoint" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Tooltip />
                        <Radar 
                          name="掌握度" 
                          dataKey="masteryLevel" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      暂无数据
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 学习指标卡片 */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {statistics.averageScore}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">平均得分</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {statistics.improvement > 0 ? '+' : ''}{statistics.improvement}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">进步幅度</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {statistics.totalStudyTime}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">学习时长(分钟)</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {statistics.completedNodes}/{statistics.totalNodes}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">完成节点</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setSelectedPathId(null)}
            >
              返回列表
            </Button>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{pathDetail.title}</h2>
              <p className="text-muted-foreground">{pathDetail.description}</p>
            </div>
          </div>

          {/* 进度概览 */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {pathDetail.completedNodes}
                  </div>
                  <div className="text-sm text-muted-foreground">已完成节点</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{pathDetail.totalNodes}</div>
                  <div className="text-sm text-muted-foreground">总节点数</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round(pathDetail.progress)}%
                  </div>
                  <div className="text-sm text-muted-foreground">完成进度</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {pathDetail.nodes.reduce((sum: number, n: any) => sum + n.estimatedTime, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">预计总时长(分钟)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 学习路径可视化 */}
          <Card>
            <CardHeader>
              <CardTitle>学习路径</CardTitle>
              <CardDescription>
                按照从易到难的顺序完成每个节点，解锁下一阶段的学习内容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pathDetail.nodes.map((node: any, index: number) => {
                  const statusConfig = STATUS_CONFIG[node.status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = statusConfig.icon;
                  const isAvailable = node.status === "available" || node.status === "in_progress";

                  return (
                    <div key={node.id} className="relative">
                      {/* 连接线 */}
                      {index < pathDetail.nodes.length - 1 && (
                        <div className="absolute left-6 top-16 w-0.5 h-8 bg-gray-200" />
                      )}

                      <Card
                        className={`transition-all ${
                          isAvailable
                            ? "border-2 border-primary/50 shadow-md"
                            : node.status === "completed"
                            ? "border-green-200"
                            : "opacity-60"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* 状态图标 */}
                            <div
                              className={`p-3 rounded-full ${statusConfig.bgColor} shrink-0`}
                            >
                              <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                            </div>

                            {/* 节点信息 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg">
                                    {node.knowledgePointName}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                      variant="outline"
                                      className={DIFFICULTY_COLORS[node.difficulty as keyof typeof DIFFICULTY_COLORS]}
                                    >
                                      {DIFFICULTIES[node.difficulty as keyof typeof DIFFICULTIES]}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {node.estimatedTime}分钟
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      第 {node.order + 1} 节点
                                    </span>
                                  </div>
                                </div>

                                {/* 操作按钮 */}
                                {isAvailable && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartNode(node)}
                                  >
                                    {node.status === "in_progress" ? "继续学习" : "开始学习"}
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                  </Button>
                                )}
                                {node.status === "completed" && (
                                  <Badge variant="outline" className="bg-green-50">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    已完成
                                  </Badge>
                                )}
                                {node.status === "locked" && (
                                  <Badge variant="outline" className="bg-gray-50">
                                    <Lock className="h-3 w-3 mr-1" />
                                    未解锁
                                  </Badge>
                                )}
                              </div>

                              {/* 推荐题目 */}
                              {node.recommendedQuestions && node.recommendedQuestions.length > 0 && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <BookOpen className="h-4 w-4" />
                                    <span>推荐练习题：{node.recommendedQuestions.length} 道</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 生成路径对话框 */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成学习路径</DialogTitle>
            <DialogDescription>
              系统将分析你的错题记录，为你生成个性化的学习提升路径
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择学科</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择学科" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUBJECTS).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <Target className="h-4 w-4 inline mr-1" />
                系统将基于你在该学科的错题记录，智能生成按难度递进的学习路径
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!selectedSubject || generateMutation.isPending}
            >
              {generateMutation.isPending ? "生成中..." : "开始生成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 节点答题对话框 */}
      <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {selectedNode?.knowledgePointName}
            </DialogTitle>
            <DialogDescription>
              难度：{selectedNode && DIFFICULTIES[selectedNode.difficulty as keyof typeof DIFFICULTIES]} |
              题目进度：{completedQuestionsCount}/{totalQuestions}
            </DialogDescription>
          </DialogHeader>

          {nodeQuestions && nodeQuestions.length > 0 ? (
            <div className="space-y-6 py-4">
              {/* 题目内容 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    题目 {currentQuestionIndex + 1} / {nodeQuestions.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose max-w-none">
                    <p className="text-base font-medium">
                      {nodeQuestions[currentQuestionIndex].content}
                    </p>
                  </div>

                  {/* 答案输入 */}
                  {!showResult && (
                    <div className="space-y-2">
                      <Label>你的答案</Label>
                      <Textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="请输入你的答案..."
                        rows={4}
                        className="resize-none"
                      />
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!userAnswer.trim()}
                        className="w-full"
                      >
                        提交答案
                      </Button>
                    </div>
                  )}

                  {/* 结果展示 */}
                  {showResult && (
                    <div className="space-y-4">
                      <div
                        className={`p-4 rounded-lg border-2 ${
                          questionResults[currentQuestionIndex]
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {questionResults[currentQuestionIndex] ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                              <span className="font-semibold text-green-900">回答正确！</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="font-semibold text-red-900">回答错误</span>
                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium">你的答案：</span>
                            <span className="text-sm ml-2">{userAnswer}</span>
                          </div>
                          <div>
                            <span className="text-sm font-medium">正确答案：</span>
                            <span className="text-sm ml-2 text-green-700 font-medium">
                              {nodeQuestions[currentQuestionIndex].answer}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 解析 */}
                      {nodeQuestions[currentQuestionIndex].explanation && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-2">
                            <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <div className="font-semibold text-blue-900 mb-1">题目解析</div>
                              <p className="text-sm text-blue-800">
                                {nodeQuestions[currentQuestionIndex].explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <Button onClick={handleNextQuestion} className="w-full">
                        {currentQuestionIndex < nodeQuestions.length - 1
                          ? "下一题"
                          : "完成节点"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 题目进度条 */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>练习进度</span>
                  <span>
                    {completedQuestionsCount}/{totalQuestions} 题
                  </span>
                </div>
                <Progress
                  value={(completedQuestionsCount / totalQuestions) * 100}
                  className="h-2"
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无推荐题目</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
