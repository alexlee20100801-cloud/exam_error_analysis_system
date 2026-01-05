import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  BookOpen
} from "lucide-react";

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

  // 获取所有学习路径
  const { data: paths, refetch: refetchPaths } = trpc.learningPath.getAll.useQuery();

  // 获取路径详情
  const { data: pathDetail } = trpc.learningPath.getDetail.useQuery(
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
      toast.success("节点完成！");
      refetchPaths();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });

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

  const handleCompleteNode = (nodeId: string) => {
    if (!selectedPathId) return;

    completeNodeMutation.mutate({
      pathId: selectedPathId,
      nodeId,
      score: 80, // 默认分数，实际应该根据练习结果
    });
  };

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
                                    onClick={() => handleCompleteNode(node.id)}
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
    </div>
  );
}
