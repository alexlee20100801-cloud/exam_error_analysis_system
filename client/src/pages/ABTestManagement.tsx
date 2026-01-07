import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Play, Pause, CheckCircle, TrendingUp, Users, BarChart3, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ABTestManagement() {
  const [activeTab, setActiveTab] = useState("experiments");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedExperimentId, setSelectedExperimentId] = useState<number | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // 表单状态
  const [experimentName, setExperimentName] = useState("");
  const [experimentDescription, setExperimentDescription] = useState("");
  const [controlAlgorithm, setControlAlgorithm] = useState("baseline_recommendation");
  const [treatmentAlgorithm, setTreatmentAlgorithm] = useState("enhanced_recommendation");
  const [trafficSplitRatio, setTrafficSplitRatio] = useState(0.5);

  // 查询实验列表
  const { data: experiments, isLoading: experimentsLoading, refetch: refetchExperiments } = trpc.abTest.getAllExperiments.useQuery({});

  // 查询实验详情
  const { data: experimentDetail } = trpc.abTest.getExperimentDetail.useQuery(
    { experimentId: selectedExperimentId! },
    { enabled: !!selectedExperimentId }
  );

  // 查询统计结果
  const { data: statistics } = trpc.abTest.getStatistics.useQuery(
    { experimentId: selectedExperimentId! },
    { enabled: !!selectedExperimentId }
  );

  // 创建实验
  const createExperimentMutation = trpc.abTest.createExperiment.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsCreateDialogOpen(false);
      resetForm();
      refetchExperiments();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 启动实验
  const startExperimentMutation = trpc.abTest.startExperiment.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchExperiments();
    },
    onError: (error) => {
      toast.error(`启动失败: ${error.message}`);
    },
  });

  // 暂停实验
  const pauseExperimentMutation = trpc.abTest.pauseExperiment.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchExperiments();
    },
    onError: (error) => {
      toast.error(`暂停失败: ${error.message}`);
    },
  });

  // 完成实验
  const completeExperimentMutation = trpc.abTest.completeExperiment.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchExperiments();
    },
    onError: (error) => {
      toast.error(`完成失败: ${error.message}`);
    },
  });

  // 计算统计
  const calculateStatisticsMutation = trpc.abTest.calculateStatistics.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`计算失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setExperimentName("");
    setExperimentDescription("");
    setControlAlgorithm("baseline_recommendation");
    setTreatmentAlgorithm("enhanced_recommendation");
    setTrafficSplitRatio(0.5);
  };

  const handleCreateExperiment = () => {
    if (!experimentName.trim()) {
      toast.error("请输入实验名称");
      return;
    }

    createExperimentMutation.mutate({
      experimentName,
      experimentDescription,
      controlAlgorithm,
      treatmentAlgorithm,
      trafficSplitRatio,
    });
  };

  const handleStartExperiment = (experimentId: number) => {
    startExperimentMutation.mutate({ experimentId });
  };

  const handlePauseExperiment = (experimentId: number) => {
    pauseExperimentMutation.mutate({ experimentId });
  };

  const handleCompleteExperiment = (experimentId: number) => {
    if (confirm("确定要完成此实验吗?完成后将无法继续收集数据。")) {
      completeExperimentMutation.mutate({ experimentId });
    }
  };

  const handleCalculateStatistics = (experimentId: number) => {
    calculateStatisticsMutation.mutate({ experimentId });
  };

  const handleViewReport = (experimentId: number) => {
    setSelectedExperimentId(experimentId);
    setIsReportDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: "草稿", variant: "secondary" as const },
      running: { label: "运行中", variant: "default" as const },
      paused: { label: "已暂停", variant: "secondary" as const },
      completed: { label: "已完成", variant: "default" as const },
      archived: { label: "已归档", variant: "outline" as const },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 准备图表数据
  const prepareChartData = () => {
    if (!statistics || statistics.length === 0) return [];

    const metrics = ["CTR", "使用率", "满意度"];
    return metrics.map((metricName) => {
      const metricData = statistics.find((s) => s.metricName === metricName);
      return {
        metric: metricName,
        对照组: metricData ? metricData.controlMean * 100 : 0,
        实验组: metricData ? metricData.treatmentMean * 100 : 0,
      };
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B测试管理</h1>
          <p className="text-muted-foreground mt-1">管理推荐算法A/B测试实验和查看效果报告</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>创建新实验</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建A/B测试实验</DialogTitle>
              <DialogDescription>配置实验参数,测试不同推荐算法的效果</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="experimentName">实验名称</Label>
                <Input
                  id="experimentName"
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                  placeholder="例如: 增强推荐算法测试"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experimentDescription">实验描述</Label>
                <Textarea
                  id="experimentDescription"
                  value={experimentDescription}
                  onChange={(e) => setExperimentDescription(e.target.value)}
                  placeholder="描述实验目的和预期效果"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="controlAlgorithm">对照组算法</Label>
                  <Input
                    id="controlAlgorithm"
                    value={controlAlgorithm}
                    onChange={(e) => setControlAlgorithm(e.target.value)}
                    placeholder="baseline_recommendation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treatmentAlgorithm">实验组算法</Label>
                  <Input
                    id="treatmentAlgorithm"
                    value={treatmentAlgorithm}
                    onChange={(e) => setTreatmentAlgorithm(e.target.value)}
                    placeholder="enhanced_recommendation"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trafficSplitRatio">流量分配比例 (实验组占比)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="trafficSplitRatio"
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={trafficSplitRatio}
                    onChange={(e) => setTrafficSplitRatio(parseFloat(e.target.value) || 0.5)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {(trafficSplitRatio * 100).toFixed(0)}% 实验组 / {((1 - trafficSplitRatio) * 100).toFixed(0)}% 对照组
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateExperiment} disabled={createExperimentMutation.isPending}>
                {createExperimentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                创建实验
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="experiments">实验列表</TabsTrigger>
          <TabsTrigger value="running">运行中</TabsTrigger>
          <TabsTrigger value="completed">已完成</TabsTrigger>
        </TabsList>

        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>所有实验</CardTitle>
              <CardDescription>查看和管理所有A/B测试实验</CardDescription>
            </CardHeader>
            <CardContent>
              {experimentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : experiments && experiments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>实验名称</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>对照组算法</TableHead>
                      <TableHead>实验组算法</TableHead>
                      <TableHead>对照组人数</TableHead>
                      <TableHead>实验组人数</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {experiments.map((experiment) => (
                      <TableRow key={experiment.id}>
                        <TableCell className="font-medium">{experiment.experimentName}</TableCell>
                        <TableCell>{getStatusBadge(experiment.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{experiment.controlAlgorithm}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{experiment.treatmentAlgorithm}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {experiment.controlGroupSize}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {experiment.treatmentGroupSize}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(experiment.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {experiment.status === "draft" && (
                              <Button size="sm" onClick={() => handleStartExperiment(experiment.id)}>
                                <Play className="h-3 w-3 mr-1" />
                                启动
                              </Button>
                            )}
                            {experiment.status === "running" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handlePauseExperiment(experiment.id)}>
                                  <Pause className="h-3 w-3 mr-1" />
                                  暂停
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleCompleteExperiment(experiment.id)}>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  完成
                                </Button>
                              </>
                            )}
                            {(experiment.status === "completed" || experiment.status === "running") && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleCalculateStatistics(experiment.id)}>
                                  <BarChart3 className="h-3 w-3 mr-1" />
                                  计算
                                </Button>
                                <Button size="sm" variant="default" onClick={() => handleViewReport(experiment.id)}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  报告
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">暂无实验</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="running" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>运行中的实验</CardTitle>
              <CardDescription>正在收集数据的实验</CardDescription>
            </CardHeader>
            <CardContent>
              {experiments?.filter((e) => e.status === "running").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无运行中的实验</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>实验名称</TableHead>
                      <TableHead>对照组人数</TableHead>
                      <TableHead>实验组人数</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {experiments
                      ?.filter((e) => e.status === "running")
                      .map((experiment) => (
                        <TableRow key={experiment.id}>
                          <TableCell className="font-medium">{experiment.experimentName}</TableCell>
                          <TableCell>{experiment.controlGroupSize}</TableCell>
                          <TableCell>{experiment.treatmentGroupSize}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {experiment.startDate ? new Date(experiment.startDate).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => handlePauseExperiment(experiment.id)}>
                                <Pause className="h-3 w-3 mr-1" />
                                暂停
                              </Button>
                              <Button size="sm" variant="default" onClick={() => handleViewReport(experiment.id)}>
                                <Eye className="h-3 w-3 mr-1" />
                                报告
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>已完成的实验</CardTitle>
              <CardDescription>查看历史实验结果</CardDescription>
            </CardHeader>
            <CardContent>
              {experiments?.filter((e) => e.status === "completed").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无已完成的实验</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>实验名称</TableHead>
                      <TableHead>对照组人数</TableHead>
                      <TableHead>实验组人数</TableHead>
                      <TableHead>完成时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {experiments
                      ?.filter((e) => e.status === "completed")
                      .map((experiment) => (
                        <TableRow key={experiment.id}>
                          <TableCell className="font-medium">{experiment.experimentName}</TableCell>
                          <TableCell>{experiment.controlGroupSize}</TableCell>
                          <TableCell>{experiment.treatmentGroupSize}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {experiment.endDate ? new Date(experiment.endDate).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="default" onClick={() => handleViewReport(experiment.id)}>
                              <Eye className="h-3 w-3 mr-1" />
                              查看报告
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* A/B测试效果报告对话框 */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>A/B测试效果报告</DialogTitle>
            <DialogDescription>
              {experimentDetail?.experimentName} - 对比实验组与对照组的关键指标
            </DialogDescription>
          </DialogHeader>

          {experimentDetail && statistics && statistics.length > 0 ? (
            <div className="space-y-6">
              {/* 实验概况 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">实验概况</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">对照组算法</div>
                      <div className="mt-1 font-medium">{experimentDetail.controlAlgorithm}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">实验组算法</div>
                      <div className="mt-1 font-medium">{experimentDetail.treatmentAlgorithm}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">对照组样本量</div>
                      <div className="mt-1 font-medium">{experimentDetail.controlGroupSize} 人</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">实验组样本量</div>
                      <div className="mt-1 font-medium">{experimentDetail.treatmentGroupSize} 人</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 关键指标对比图表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">关键指标对比</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="对照组" fill="#94a3b8" />
                      <Bar dataKey="实验组" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 统计显著性检验结果 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">统计检验结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>指标</TableHead>
                        <TableHead>对照组均值</TableHead>
                        <TableHead>实验组均值</TableHead>
                        <TableHead>提升幅度</TableHead>
                        <TableHead>P值</TableHead>
                        <TableHead>显著性</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.map((stat) => {
                        const improvement = ((stat.treatmentMean - stat.controlMean) / stat.controlMean) * 100;
                        return (
                          <TableRow key={stat.id}>
                            <TableCell className="font-medium">{stat.metricName}</TableCell>
                            <TableCell>{(stat.controlMean * 100).toFixed(2)}%</TableCell>
                            <TableCell>{(stat.treatmentMean * 100).toFixed(2)}%</TableCell>
                            <TableCell>
                              <Badge variant={improvement > 0 ? "default" : "destructive"}>
                                {improvement > 0 ? "+" : ""}
                                {improvement.toFixed(2)}%
                              </Badge>
                            </TableCell>
                            <TableCell>{stat.pValue ? stat.pValue.toFixed(4) : "-"}</TableCell>
                            <TableCell>
                              {stat.isSignificant ? (
                                <Badge variant="default">显著</Badge>
                              ) : (
                                <Badge variant="secondary">不显著</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 结论和建议 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">结论和建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {statistics.map((stat) => (
                      stat.recommendation && (
                        <div key={stat.id} className="p-3 bg-muted rounded-md">
                          <div className="font-medium text-sm mb-1">{stat.metricName}</div>
                          <p className="text-sm text-muted-foreground">{stat.recommendation}</p>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无统计数据,请先计算统计结果
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
