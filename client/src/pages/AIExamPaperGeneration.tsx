import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AIExamPaperGeneration() {
  const [config, setConfig] = useState({
    title: "",
    grade: "grade9" as const,
    subject: "math" as const,
    totalScore: 100,
    minQualityScore: 80,
    allowDuplicateKnowledgePoints: false,
    prioritizeRecentQuestions: true,
    difficultyDistribution: {
      easy: 3,
      medium: 5,
      hard: 2,
    },
    questionTypeDistribution: {
      choice: 5,
      blank: 2,
      calculation: 2,
      short_answer: 1,
    },
  });

  const [generatedPaper, setGeneratedPaper] = useState<any>(null);

  // AI组卷
  const generatePaper = trpc.aiExamPaper.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedPaper(data);
      toast.success("组卷成功！");
    },
    onError: (error) => {
      toast.error(`组卷失败: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!config.title) {
      toast.error("请输入试卷标题");
      return;
    }

    generatePaper.mutate(config);
  };

  const totalQuestions =
    Object.values(config.questionTypeDistribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          AI智能组卷
        </h1>
        <p className="text-muted-foreground mt-2">
          基于试题数据库，使用AI算法智能生成高质量试卷
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：配置面板 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">试卷标题</Label>
                <Input
                  id="title"
                  placeholder="例如：2024年深圳中考数学模拟试卷"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grade">年级</Label>
                  <Select
                    value={config.grade}
                    onValueChange={(value: any) => setConfig({ ...config, grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grade7">初一</SelectItem>
                      <SelectItem value="grade8">初二</SelectItem>
                      <SelectItem value="grade9">初三</SelectItem>
                      <SelectItem value="grade10">高一</SelectItem>
                      <SelectItem value="grade11">高二</SelectItem>
                      <SelectItem value="grade12">高三</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">学科</Label>
                  <Select
                    value={config.subject}
                    onValueChange={(value: any) => setConfig({ ...config, subject: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chinese">语文</SelectItem>
                      <SelectItem value="math">数学</SelectItem>
                      <SelectItem value="english">英语</SelectItem>
                      <SelectItem value="physics">物理</SelectItem>
                      <SelectItem value="chemistry">化学</SelectItem>
                      <SelectItem value="biology">生物</SelectItem>
                      <SelectItem value="politics">政治</SelectItem>
                      <SelectItem value="history">历史</SelectItem>
                      <SelectItem value="geography">地理</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="totalScore">总分</Label>
                <Input
                  id="totalScore"
                  type="number"
                  value={config.totalScore}
                  onChange={(e) =>
                    setConfig({ ...config, totalScore: parseInt(e.target.value) || 100 })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* 难度分布 */}
          <Card>
            <CardHeader>
              <CardTitle>难度分布</CardTitle>
              <CardDescription>
                调整简单、中等、困难题目的数量
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>简单题</Label>
                  <span className="text-sm font-medium">{config.difficultyDistribution.easy} 题</span>
                </div>
                <Slider
                  value={[config.difficultyDistribution.easy]}
                  onValueChange={([value]) =>
                    setConfig({
                      ...config,
                      difficultyDistribution: { ...config.difficultyDistribution, easy: value },
                    })
                  }
                  max={20}
                  step={1}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>中等题</Label>
                  <span className="text-sm font-medium">{config.difficultyDistribution.medium} 题</span>
                </div>
                <Slider
                  value={[config.difficultyDistribution.medium]}
                  onValueChange={([value]) =>
                    setConfig({
                      ...config,
                      difficultyDistribution: { ...config.difficultyDistribution, medium: value },
                    })
                  }
                  max={20}
                  step={1}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>困难题</Label>
                  <span className="text-sm font-medium">{config.difficultyDistribution.hard} 题</span>
                </div>
                <Slider
                  value={[config.difficultyDistribution.hard]}
                  onValueChange={([value]) =>
                    setConfig({
                      ...config,
                      difficultyDistribution: { ...config.difficultyDistribution, hard: value },
                    })
                  }
                  max={20}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* 题型分布 */}
          <Card>
            <CardHeader>
              <CardTitle>题型分布</CardTitle>
              <CardDescription>
                设置各种题型的数量
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>选择题</Label>
                  <Input
                    type="number"
                    value={config.questionTypeDistribution.choice || 0}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        questionTypeDistribution: {
                          ...config.questionTypeDistribution,
                          choice: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label>填空题</Label>
                  <Input
                    type="number"
                    value={config.questionTypeDistribution.blank || 0}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        questionTypeDistribution: {
                          ...config.questionTypeDistribution,
                          blank: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label>计算题</Label>
                  <Input
                    type="number"
                    value={config.questionTypeDistribution.calculation || 0}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        questionTypeDistribution: {
                          ...config.questionTypeDistribution,
                          calculation: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label>简答题</Label>
                  <Input
                    type="number"
                    value={config.questionTypeDistribution.short_answer || 0}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        questionTypeDistribution: {
                          ...config.questionTypeDistribution,
                          short_answer: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 高级选项 */}
          <Card>
            <CardHeader>
              <CardTitle>高级选项</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>最低质量分数</Label>
                  <p className="text-sm text-muted-foreground">只选择质量分≥此值的题目</p>
                </div>
                <Input
                  type="number"
                  className="w-20"
                  value={config.minQualityScore}
                  onChange={(e) =>
                    setConfig({ ...config, minQualityScore: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>允许知识点重复</Label>
                  <p className="text-sm text-muted-foreground">多个题目可以考查相同知识点</p>
                </div>
                <Switch
                  checked={config.allowDuplicateKnowledgePoints}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, allowDuplicateKnowledgePoints: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>优先最近题目</Label>
                  <p className="text-sm text-muted-foreground">优先选择最近添加的题目</p>
                </div>
                <Switch
                  checked={config.prioritizeRecentQuestions}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, prioritizeRecentQuestions: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：预览和操作 */}
        <div className="space-y-6">
          {/* 统计信息 */}
          <Card>
            <CardHeader>
              <CardTitle>试卷统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">总题数</span>
                <span className="font-medium">{totalQuestions} 题</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">总分</span>
                <span className="font-medium">{config.totalScore} 分</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">简单题</span>
                <span className="font-medium">{config.difficultyDistribution.easy} 题</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">中等题</span>
                <span className="font-medium">{config.difficultyDistribution.medium} 题</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">困难题</span>
                <span className="font-medium">{config.difficultyDistribution.hard} 题</span>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={generatePaper.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generatePaper.isPending ? "生成中..." : "开始组卷"}
              </Button>

              {generatedPaper && (
                <>
                  <Button className="w-full" variant="outline" size="lg">
                    <Eye className="w-4 h-4 mr-2" />
                    预览试卷
                  </Button>
                  <Button className="w-full" variant="outline" size="lg">
                    <Download className="w-4 h-4 mr-2" />
                    导出试卷
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* 组卷结果 */}
          {generatedPaper && (
            <Card>
              <CardHeader>
                <CardTitle>组卷结果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">统计信息</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">实际题数</span>
                      <span>{generatedPaper.statistics.totalQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">知识点覆盖</span>
                      <span>{generatedPaper.statistics.knowledgePointCoverage.length} 个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">平均质量分</span>
                      <span>{generatedPaper.statistics.averageQualityScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {generatedPaper.suggestions && generatedPaper.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">AI建议</p>
                    <div className="space-y-2">
                      {generatedPaper.suggestions.map((suggestion: string, index: number) => (
                        <div
                          key={index}
                          className="text-sm p-2 bg-muted rounded-md"
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
