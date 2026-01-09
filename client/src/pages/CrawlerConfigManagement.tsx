import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2, TrendingUp, AlertCircle } from "lucide-react";

export default function CrawlerConfigManagement() {
  const [activeTab, setActiveTab] = useState("rules");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");

  // 查询规则列表
  const { data: rules, isLoading: rulesLoading, refetch: refetchRules } = trpc.crawlerConfig.getRules.useQuery({});
  
  // 查询性能统计
  const { data: performanceStats, isLoading: statsLoading } = trpc.crawlerConfig.getPerformanceSummary.useQuery({});
  
  // 查询调优建议
  const { data: tuneSuggestions, isLoading: suggestionsLoading } = trpc.crawlerConfig.getAutoTuneSuggestions.useQuery(
    { websiteName: selectedWebsite },
    { enabled: !!selectedWebsite }
  );

  // 创建规则
  const createRuleMutation = trpc.crawlerConfig.createRule.useMutation({
    onSuccess: () => {
      toast.success("规则创建成功");
      setIsCreateDialogOpen(false);
      refetchRules();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新规则
  const updateRuleMutation = trpc.crawlerConfig.updateRule.useMutation({
    onSuccess: () => {
      toast.success("规则更新成功");
      refetchRules();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除规则
  const deleteRuleMutation = trpc.crawlerConfig.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("规则删除成功");
      refetchRules();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const handleCreateRule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createRuleMutation.mutate({
      websiteName: formData.get("websiteName") as string,
      websiteUrl: formData.get("websiteUrl") as string,
      ruleType: formData.get("ruleType") as "css_selector" | "xpath" | "regex",
      targetField: formData.get("targetField") as string,
      selectorRule: formData.get("selectorRule") as string,
      fallbackRule: formData.get("fallbackRule") as string || undefined,
      priority: parseInt(formData.get("priority") as string) || 0,
    });
  };

  const handleToggleActive = (id: number, currentStatus: number) => {
    updateRuleMutation.mutate({
      id,
      isActive: currentStatus === 1 ? false : true,
    });
  };

  const handleDeleteRule = (id: number) => {
    if (confirm("确定要删除这条规则吗？")) {
      deleteRuleMutation.mutate({ id });
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">爬虫配置管理</h1>
        <p className="text-muted-foreground mt-2">
          管理题目数据源的爬虫选择器规则，监控爬取效果，获取优化建议
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">选择器规则</TabsTrigger>
          <TabsTrigger value="performance">性能统计</TabsTrigger>
          <TabsTrigger value="suggestions">调优建议</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              共 {rules?.length || 0} 条规则
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  添加规则
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <form onSubmit={handleCreateRule}>
                  <DialogHeader>
                    <DialogTitle>创建选择器规则</DialogTitle>
                    <DialogDescription>
                      为特定网站配置HTML元素选择器规则
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="websiteName">网站名称</Label>
                      <Input id="websiteName" name="websiteName" placeholder="例如：菁优网" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="websiteUrl">网站URL</Label>
                      <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://example.com" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ruleType">规则类型</Label>
                      <Select name="ruleType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="选择规则类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="css_selector">CSS选择器</SelectItem>
                          <SelectItem value="xpath">XPath</SelectItem>
                          <SelectItem value="regex">正则表达式</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="targetField">目标字段</Label>
                      <Input id="targetField" name="targetField" placeholder="例如：question_content" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="selectorRule">选择器规则</Label>
                      <Textarea id="selectorRule" name="selectorRule" placeholder="例如：.question-content" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fallbackRule">备用规则（可选）</Label>
                      <Textarea id="fallbackRule" name="fallbackRule" placeholder="当主规则失败时使用" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority">优先级</Label>
                      <Input id="priority" name="priority" type="number" defaultValue="0" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createRuleMutation.isPending}>
                      {createRuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      创建规则
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {rulesLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : rules && rules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>网站</TableHead>
                      <TableHead>目标字段</TableHead>
                      <TableHead>规则类型</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>成功率</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.websiteName}</TableCell>
                        <TableCell>{rule.targetField}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.ruleType}</Badge>
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          {rule.successRate ? (
                            <span className={parseFloat(rule.successRate) >= 80 ? "text-green-600" : parseFloat(rule.successRate) >= 50 ? "text-yellow-600" : "text-red-600"}>
                              {rule.successRate}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">未测试</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive === 1 ? "default" : "secondary"}>
                            {rule.isActive === 1 ? "启用" : "禁用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(rule.id, rule.isActive)}
                            >
                              {rule.isActive === 1 ? "禁用" : "启用"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  暂无规则，点击"添加规则"创建第一条规则
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>爬取性能汇总</CardTitle>
              <CardDescription>各网站的爬取成功率和数据质量统计</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : performanceStats && performanceStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>网站</TableHead>
                      <TableHead>总尝试</TableHead>
                      <TableHead>成功</TableHead>
                      <TableHead>失败</TableHead>
                      <TableHead>成功率</TableHead>
                      <TableHead>平均响应时间</TableHead>
                      <TableHead>数据质量</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceStats.map((stat: any) => (
                      <TableRow key={stat.websiteName}>
                        <TableCell className="font-medium">{stat.websiteName}</TableCell>
                        <TableCell>{stat.totalAttempts}</TableCell>
                        <TableCell className="text-green-600">{stat.totalSuccessful}</TableCell>
                        <TableCell className="text-red-600">{stat.totalFailed}</TableCell>
                        <TableCell>
                          <span className={parseFloat(stat.successRate) >= 80 ? "text-green-600" : parseFloat(stat.successRate) >= 50 ? "text-yellow-600" : "text-red-600"}>
                            {stat.successRate}%
                          </span>
                        </TableCell>
                        <TableCell>{Math.round(stat.avgResponseTime)}ms</TableCell>
                        <TableCell>
                          {stat.avgQualityScore ? (
                            <span>{(stat.avgQualityScore * 100).toFixed(1)}%</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  暂无性能数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="grid gap-2">
            <Label>选择网站</Label>
            <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
              <SelectTrigger>
                <SelectValue placeholder="选择要分析的网站" />
              </SelectTrigger>
              <SelectContent>
                {rules?.map((rule: any) => (
                  <SelectItem key={rule.websiteName} value={rule.websiteName}>
                    {rule.websiteName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedWebsite && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  自动调优建议
                </CardTitle>
                <CardDescription>
                  基于爬取效果数据的优化建议
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suggestionsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : tuneSuggestions && tuneSuggestions.length > 0 ? (
                  <div className="space-y-4">
                    {tuneSuggestions.map((suggestion, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">规则 #{suggestion.ruleId} - {suggestion.targetField}</p>
                            <p className="text-sm text-muted-foreground mt-1">{suggestion.suggestion}</p>
                            {suggestion.currentSuccessRate && (
                              <p className="text-sm mt-2">
                                当前成功率: <span className="text-red-600">{suggestion.currentSuccessRate}%</span>
                              </p>
                            )}
                            {suggestion.avgResponseTime && (
                              <p className="text-sm">
                                平均响应时间: <span className="text-yellow-600">{suggestion.avgResponseTime}ms</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无优化建议，当前配置运行良好
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
