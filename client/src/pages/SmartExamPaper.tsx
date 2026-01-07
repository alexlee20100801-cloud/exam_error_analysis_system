import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, 
  Sparkles, 
  Download, 
  Printer,
  CheckCircle2,
  Clock,
  Target,
  Shuffle,
  BookOpen,
  Calendar
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SmartExamPaper() {
  const { data: user } = trpc.auth.me.useQuery();

  // 组卷配置
  const [paperConfig, setPaperConfig] = useState({
    title: "",
    subject: "",
    grade: "",
    questionCount: 20,
    difficulty: "mixed",
    includeAnswer: true,
    includeAnalysis: true,
    paperSize: "A4",
    layout: "single",
  });

  // 生成专属复习卷
  const generateAdaptivePaper = trpc.examPaper.generateAdaptive.useMutation({
    onSuccess: (data) => {
      toast.success(`组卷成功！已生成 ${data.questionCount} 道题目的专属复习卷`);
    },
    onError: (error) => {
      toast.error(`组卷失败：${error.message}`);
    },
  });

  // 随机练习
  const generateRandomPractice = trpc.examPaper.randomPractice.useMutation({
    onSuccess: (data) => {
      toast.success(`练习开始！已为您准备 ${data.length} 道随机题目`);
    },
  });

  // 章节练习
  const generateChapterPractice = trpc.examPaper.chapterPractice.useMutation({
    onSuccess: (data) => {
      toast.success(`练习开始！已为您准备 ${data.length} 道章节题目`);
    },
  });

  const handleGenerateAdaptivePaper = () => {
    if (!paperConfig.title || !paperConfig.subject || !paperConfig.grade) {
      toast.error("请完善试卷信息：标题、学科和年级为必填项");
      return;
    }

    generateAdaptivePaper.mutate({
      userId: user?.id?.toString() || "",
      title: paperConfig.title,
      subject: paperConfig.subject,
      grade: paperConfig.grade,
      questionCount: paperConfig.questionCount,
      difficulty: paperConfig.difficulty as any,
    });
  };

  return (
    <div className="container py-8 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          智能组卷
        </h1>
        <p className="text-muted-foreground mt-2">
          基于薄弱点分析，自动生成专属复习卷，告别盲目刷题
        </p>
      </div>

      <Tabs defaultValue="adaptive" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="adaptive">
            <Target className="h-4 w-4 mr-2" />
            专属复习卷
          </TabsTrigger>
          <TabsTrigger value="random">
            <Shuffle className="h-4 w-4 mr-2" />
            随机练习
          </TabsTrigger>
          <TabsTrigger value="chapter">
            <BookOpen className="h-4 w-4 mr-2" />
            章节练习
          </TabsTrigger>
          <TabsTrigger value="timed">
            <Clock className="h-4 w-4 mr-2" />
            限时练习
          </TabsTrigger>
        </TabsList>

        {/* 专属复习卷 */}
        <TabsContent value="adaptive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>生成专属复习卷</CardTitle>
              <CardDescription>
                基于您的薄弱知识点，AI自动选题组卷，针对性强化练习
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">试卷标题 *</Label>
                  <Input
                    id="title"
                    placeholder="例如：数学薄弱点专项练习"
                    value={paperConfig.title}
                    onChange={(e) => setPaperConfig({ ...paperConfig, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">学科 *</Label>
                  <Select
                    value={paperConfig.subject}
                    onValueChange={(value) => setPaperConfig({ ...paperConfig, subject: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择学科" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="math">数学</SelectItem>
                      <SelectItem value="chinese">语文</SelectItem>
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

                <div className="space-y-2">
                  <Label htmlFor="grade">年级 *</Label>
                  <Select
                    value={paperConfig.grade}
                    onValueChange={(value) => setPaperConfig({ ...paperConfig, grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择年级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grade_7">初一</SelectItem>
                      <SelectItem value="grade_8">初二</SelectItem>
                      <SelectItem value="grade_9">初三</SelectItem>
                      <SelectItem value="grade_10">高一</SelectItem>
                      <SelectItem value="grade_11">高二</SelectItem>
                      <SelectItem value="grade_12">高三</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questionCount">题目数量</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="5"
                    max="50"
                    value={paperConfig.questionCount}
                    onChange={(e) => setPaperConfig({ ...paperConfig, questionCount: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">难度分布</Label>
                  <Select
                    value={paperConfig.difficulty}
                    onValueChange={(value) => setPaperConfig({ ...paperConfig, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">简单</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="hard">困难</SelectItem>
                      <SelectItem value="mixed">混合 (3:5:2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paperSize">纸张大小</Label>
                  <Select
                    value={paperConfig.paperSize}
                    onValueChange={(value) => setPaperConfig({ ...paperConfig, paperSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>试卷选项</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeAnswer"
                      checked={paperConfig.includeAnswer}
                      onCheckedChange={(checked) => 
                        setPaperConfig({ ...paperConfig, includeAnswer: checked as boolean })
                      }
                    />
                    <label htmlFor="includeAnswer" className="text-sm cursor-pointer">
                      包含参考答案
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeAnalysis"
                      checked={paperConfig.includeAnalysis}
                      onCheckedChange={(checked) => 
                        setPaperConfig({ ...paperConfig, includeAnalysis: checked as boolean })
                      }
                    />
                    <label htmlFor="includeAnalysis" className="text-sm cursor-pointer">
                      包含详细解析
                    </label>
                  </div>
                </div>
              </div>

              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <strong>智能选题：</strong>系统会根据您的薄弱知识点自动选择最适合的题目，
                  优先选择错误率高、未掌握的题目，帮助您高效复习。
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateAdaptivePaper}
                  disabled={generateAdaptivePaper.isPending}
                  className="flex-1"
                >
                  {generateAdaptivePaper.isPending ? (
                    <>生成中...</>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      生成专属复习卷
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 随机练习 */}
        <TabsContent value="random" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>随机练习模式</CardTitle>
              <CardDescription>
                从错题库中随机抽取题目，适合日常练习和保持题感
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>学科</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部学科</SelectItem>
                      <SelectItem value="math">数学</SelectItem>
                      <SelectItem value="chinese">语文</SelectItem>
                      <SelectItem value="english">英语</SelectItem>
                      <SelectItem value="physics">物理</SelectItem>
                      <SelectItem value="chemistry">化学</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>题目数量</Label>
                  <Input type="number" defaultValue="10" min="5" max="30" />
                </div>
              </div>

              <Button className="w-full">
                <Shuffle className="h-4 w-4 mr-2" />
                开始随机练习
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 章节练习 */}
        <TabsContent value="chapter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>章节练习模式</CardTitle>
              <CardDescription>
                按照教材章节顺序练习，系统复习知识点
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>学科</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择学科" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="math">数学</SelectItem>
                      <SelectItem value="physics">物理</SelectItem>
                      <SelectItem value="chemistry">化学</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>章节</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择章节" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chapter1">第一章</SelectItem>
                      <SelectItem value="chapter2">第二章</SelectItem>
                      <SelectItem value="chapter3">第三章</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>题目数量</Label>
                  <Input type="number" defaultValue="15" min="5" max="30" />
                </div>
              </div>

              <Button className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                开始章节练习
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 限时练习 */}
        <TabsContent value="timed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>限时练习模式</CardTitle>
              <CardDescription>
                模拟考试环境，培养时间管理能力
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>学科</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择学科" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="math">数学</SelectItem>
                      <SelectItem value="physics">物理</SelectItem>
                      <SelectItem value="chemistry">化学</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>时间限制（分钟）</Label>
                  <Input type="number" defaultValue="30" min="10" max="120" />
                </div>

                <div className="space-y-2">
                  <Label>题目数量</Label>
                  <Input type="number" defaultValue="20" min="10" max="50" />
                </div>
              </div>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  限时练习将全屏显示，倒计时结束后自动提交。建议在安静的环境中进行。
                </AlertDescription>
              </Alert>

              <Button className="w-full">
                <Clock className="h-4 w-4 mr-2" />
                开始限时练习
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 我的试卷列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              我的试卷
            </span>
            <Badge variant="secondary">3 份</Badge>
          </CardTitle>
          <CardDescription>
            查看和管理已生成的试卷
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">数学薄弱点专项练习 #{i}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          2026-01-07
                        </span>
                        <span>20 题</span>
                        <span>100 分</span>
                        <Badge variant="outline">未完成</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        导出
                      </Button>
                      <Button size="sm" variant="outline">
                        <Printer className="h-4 w-4 mr-1" />
                        打印
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
