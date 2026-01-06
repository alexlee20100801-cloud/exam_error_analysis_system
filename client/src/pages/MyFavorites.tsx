import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, BookOpen, AlertCircle, FileQuestion, Trash2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * 个人题库（收藏）页面
 */
export default function MyFavorites() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"all" | "error_question" | "practice_question" | "question">("all");
  const [exportFormat, setExportFormat] = useState<"pdf" | "word">("pdf");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // 获取收藏统计
  const { data: statsData } = trpc.favorites.stats.useQuery();

  // 获取收藏列表
  const questionType = activeTab === "all" ? undefined : activeTab;
  const { data, isLoading, refetch } = trpc.favorites.list.useQuery({
    questionType,
  });

  // 取消收藏
  // 导出收藏
  const exportMutation = trpc.favorites.export.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        // 将base64数据转换为Blob并下载
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: exportFormat === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("导出成功！");
        setIsExportDialogOpen(false);
      }
    },
    onError: (error) => {
      toast.error(`导出失败：${error.message}`);
    },
  });

  const removeMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      toast.success("已取消收藏");
      refetch();
    },
    onError: (error) => {
      toast.error(`取消收藏失败：${error.message}`);
    },
  });

  const handleRemove = (questionId: number, questionType: "error_question" | "practice_question" | "question") => {
    if (confirm("确定要取消收藏这道题目吗？")) {
      removeMutation.mutate({ questionId, questionType });
    }
  };

  const handleExport = () => {
    const questionType = activeTab === "all" ? undefined : activeTab;
    exportMutation.mutate({
      format: exportFormat,
      questionType,
    });
  };

  const handleViewQuestion = (questionId: number, questionType: string) => {
    if (questionType === "error_question") {
      setLocation(`/mistakes/${questionId}`);
    } else if (questionType === "practice_question") {
      // 练习题需要通过practicePool查看
      toast.info("请从专项练习页面查看该题目");
    } else {
      toast.info("题目详情页面开发中");
    }
  };

  const difficultyMap: Record<string, { label: string; color: string }> = {
    easy: { label: "简单", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    medium: { label: "中等", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    hard: { label: "困难", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  };

  const questionTypeMap: Record<string, { label: string; icon: React.ReactNode }> = {
    error_question: { label: "错题", icon: <AlertCircle className="h-4 w-4" /> },
    practice_question: { label: "练习题", icon: <FileQuestion className="h-4 w-4" /> },
    question: { label: "题库题", icon: <BookOpen className="h-4 w-4" /> },
  };

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500" />
            我的题库
          </h1>
          <p className="text-muted-foreground">
            收藏的题目将保存在这里，方便后续复习和练习
          </p>
        </div>
        
        {/* 导出按钮 */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              导出题目
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>导出收藏题目</DialogTitle>
              <DialogDescription>
                选择导出格式，将当前筛选的题目导出为文档
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>导出格式</Label>
                <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as "pdf" | "word")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="cursor-pointer">
                      PDF文档 (适合打印和阅读)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="word" id="word" />
                    <Label htmlFor="word" className="cursor-pointer">
                      Word文档 (适合编辑和批注)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  将导出当前筛选条件下的所有题目（
                  {activeTab === "all" ? "全部题目" :
                   activeTab === "error_question" ? "错题" :
                   activeTab === "practice_question" ? "练习题" : "题库题"}
                  ）
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleExport} disabled={exportMutation.isPending}>
                {exportMutation.isPending ? "导出中..." : "开始导出"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      {statsData?.success && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {statsData.stats.total}
                </div>
                <p className="text-sm text-muted-foreground">总收藏</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {statsData.stats.errorQuestions}
                </div>
                <p className="text-sm text-muted-foreground">错题</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {statsData.stats.practiceQuestions}
                </div>
                <p className="text-sm text-muted-foreground">练习题</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {statsData.stats.questions}
                </div>
                <p className="text-sm text-muted-foreground">题库题</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 收藏列表 */}
      <Card>
        <CardHeader>
          <CardTitle>收藏列表</CardTitle>
          <CardDescription>按类型筛选查看收藏的题目</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="error_question">错题</TabsTrigger>
              <TabsTrigger value="practice_question">练习题</TabsTrigger>
              <TabsTrigger value="question">题库题</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">加载中...</p>
                  </div>
                </div>
              ) : !data?.success || data.favorites.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无收藏</h3>
                  <p className="text-muted-foreground mb-4">
                    在题目页面点击收藏按钮，将题目添加到个人题库
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.favorites.map((item: any) => (
                    <div
                      key={`${item.favorite.questionType}-${item.favorite.questionId}`}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {/* 题目信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {/* 题目类型标签 */}
                          <Badge variant="outline" className="flex items-center gap-1">
                            {questionTypeMap[item.favorite.questionType]?.icon}
                            {questionTypeMap[item.favorite.questionType]?.label}
                          </Badge>

                          {/* 难度标签 */}
                          {item.question?.difficulty && (
                            <Badge className={difficultyMap[item.question.difficulty]?.color || ""}>
                              {difficultyMap[item.question.difficulty]?.label || item.question.difficulty}
                            </Badge>
                          )}

                          {/* 学科标签 */}
                          {item.question?.subject && (
                            <Badge variant="secondary">
                              {item.question.subject === "math" ? "数学" :
                               item.question.subject === "chinese" ? "语文" :
                               item.question.subject === "english" ? "英语" :
                               item.question.subject}
                            </Badge>
                          )}
                        </div>

                        <h4 className="font-medium mb-2 line-clamp-2">
                          {item.question?.title || "题目"}
                        </h4>

                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {item.question?.content || ""}
                        </p>

                        {item.favorite.note && (
                          <p className="text-sm text-muted-foreground italic">
                            备注：{item.favorite.note}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          收藏时间：{new Date(item.favorite.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewQuestion(item.favorite.questionId, item.favorite.questionType)}
                        >
                          查看详情
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemove(item.favorite.questionId, item.favorite.questionType)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          取消收藏
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
