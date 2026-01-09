/**
 * 实验监控仪表板页面
 * 实时显示A/B测试实验状态、数据对比和决策建议
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TrendingUp, Users, Activity, AlertCircle, CheckCircle, Play, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ExperimentDashboard() {
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 查询所有实验
  // @ts-ignore
  const { data: experiments, isLoading, refetch } = trpc.abTest.listExperiments.useQuery({
    status: "all",
    limit: 50,
  });

  // 查询实验统计
  // @ts-ignore
  const { data: stats } = trpc.abTest.getExperimentStats.useQuery();

  // 手动触发A/B测试决策检查
  const triggerDecisionMutation = trpc.scheduledTasksManagement.triggerAbTestDecision.useMutation({
    onSuccess: (result) => {
      if (result.status === "success") {
        toast.success("A/B测试决策检查已完成", {
          description: `生成了 ${result.result?.decisionsCount || 0} 个决策建议`,
        });
        refetch();
      } else {
        toast.error("A/B测试决策检查失败", {
          description: result.errorMessage,
        });
      }
    },
    onError: (error) => {
      toast.error("触发决策检查失败", {
        description: error.message,
      });
    },
  });

  const handleTriggerDecision = () => {
    triggerDecisionMutation.mutate();
  };

  const handleViewDetail = (experiment: any) => {
    setSelectedExperiment(experiment);
    setDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge variant="default" className="bg-blue-500"><Activity className="w-3 h-3 mr-1" />运行中</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />已完成</Badge>;
      case "paused":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />已暂停</Badge>;
      case "draft":
        return <Badge variant="outline">草稿</Badge>;
      case "archived":
        return <Badge variant="outline">已归档</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDecisionBadge = (recommendation: string | null) => {
    if (!recommendation) return <Badge variant="outline">待决策</Badge>;
    
    switch (recommendation) {
      case "rollout_treatment":
        return <Badge variant="default" className="bg-green-500">建议上线实验组</Badge>;
      case "keep_control":
        return <Badge variant="default" className="bg-yellow-500">建议保持对照组</Badge>;
      case "needs_review":
        return <Badge variant="default" className="bg-orange-500">需要人工审核</Badge>;
      case "inconclusive":
        return <Badge variant="outline">结果不确定</Badge>;
      default:
        return <Badge variant="outline">{recommendation}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">实验监控仪表板</h1>
          <p className="text-muted-foreground mt-1">
            实时监控A/B测试实验状态和自动决策建议
          </p>
        </div>
        <Button onClick={handleTriggerDecision} disabled={triggerDecisionMutation.isPending}>
          {triggerDecisionMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          手动触发决策检查
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">运行中实验</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.runningExperiments || 0}</div>
            <p className="text-xs text-muted-foreground">
              总实验数: {stats?.totalExperiments || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待决策实验</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingDecisions || 0}</div>
            <p className="text-xs text-muted-foreground">
              需要关注
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">参与用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              跨所有实验
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均提升率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgImprovement ? `${stats.avgImprovement.toFixed(1)}%` : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              实验组 vs 对照组
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 实验列表 */}
      <Card>
        <CardHeader>
          <CardTitle>实验列表</CardTitle>
          <CardDescription>
            查看所有A/B测试实验的状态和决策建议
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : experiments && experiments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>实验名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>对照组/实验组</TableHead>
                    <TableHead>样本量</TableHead>
                    <TableHead>决策状态</TableHead>
                    <TableHead>决策建议</TableHead>
                    <TableHead>置信度</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.map((exp: any) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.experimentName}</TableCell>
                      <TableCell>{getStatusBadge(exp.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{exp.controlAlgorithm}</div>
                          <div className="text-muted-foreground">vs {exp.treatmentAlgorithm}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>对照: {exp.controlGroupSize}</div>
                          <div>实验: {exp.treatmentGroupSize}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={exp.decisionStatus === "notified" ? "default" : "outline"}>
                          {exp.decisionStatus === "pending" ? "待决策" : 
                           exp.decisionStatus === "ready_for_decision" ? "已分析" :
                           exp.decisionStatus === "decided" ? "已决策" :
                           exp.decisionStatus === "notified" ? "已通知" : exp.decisionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{getDecisionBadge(exp.decisionRecommendation)}</TableCell>
                      <TableCell>
                        {exp.decisionConfidence ? (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{(exp.decisionConfidence * 100).toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(exp)}
                        >
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                暂无实验数据。请先创建A/B测试实验。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 实验详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedExperiment?.experimentName}</DialogTitle>
            <DialogDescription>
              {selectedExperiment?.experimentDescription}
            </DialogDescription>
          </DialogHeader>
          {selectedExperiment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">实验状态</div>
                  <div>{getStatusBadge(selectedExperiment.status)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">决策状态</div>
                  <div>
                    <Badge variant={selectedExperiment.decisionStatus === "notified" ? "default" : "outline"}>
                      {selectedExperiment.decisionStatus === "pending" ? "待决策" : 
                       selectedExperiment.decisionStatus === "ready_for_decision" ? "已分析" :
                       selectedExperiment.decisionStatus === "decided" ? "已决策" :
                       selectedExperiment.decisionStatus === "notified" ? "已通知" : selectedExperiment.decisionStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedExperiment.decisionRecommendation && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>决策建议</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <div>{getDecisionBadge(selectedExperiment.decisionRecommendation)}</div>
                      <div className="text-sm">
                        置信度: {selectedExperiment.decisionConfidence ? `${(selectedExperiment.decisionConfidence * 100).toFixed(0)}%` : "未知"}
                      </div>
                      {selectedExperiment.decisionReason && (
                        <div className="text-sm mt-2 p-3 bg-muted rounded-md">
                          {selectedExperiment.decisionReason}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">对照组</div>
                  <div className="text-lg font-bold">{selectedExperiment.controlAlgorithm}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    样本量: {selectedExperiment.controlGroupSize}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">实验组</div>
                  <div className="text-lg font-bold">{selectedExperiment.treatmentAlgorithm}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    样本量: {selectedExperiment.treatmentGroupSize}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="text-sm font-medium mb-2">决策阈值配置</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">最小样本量</div>
                    <div className="font-medium">{selectedExperiment.minSampleSize}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">显著性水平</div>
                    <div className="font-medium">{selectedExperiment.significanceLevel}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">最小效应量</div>
                    <div className="font-medium">{(selectedExperiment.minEffectSize * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
