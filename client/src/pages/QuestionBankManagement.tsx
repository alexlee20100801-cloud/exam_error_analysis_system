import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Upload, Download, Search, FileText } from "lucide-react";

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

const QUESTION_TYPES = {
  choice: "选择题",
  blank: "填空题",
  short_answer: "简答题",
  calculation: "计算题",
  essay: "论述题",
};

export default function QuestionBankManagement() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    difficulty: "",
    questionType: "",
    searchKeyword: "",
  });
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBatchUploadDialogOpen, setIsBatchUploadDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [csvData, setCsvData] = useState("");

  // 获取题目列表
  const { data: questionsData = { items: [], total: 0 }, isLoading, refetch } = trpc.questionBank.getCategories.useQuery() as any;

  // 创建题目
  const createMutation = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      toast.success("题目创建成功");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  // 更新题目
  const updateMutation = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      toast.success("题目更新成功");
      setIsEditDialogOpen(false);
      setEditingQuestion(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });

  // 删除题目
  const deleteMutation = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      toast.success("题目删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  // 批量导入
  const batchImportMutation = trpc.system.notifyOwner.useMutation({
    onSuccess: (result) => {
      toast.success((result as any).message || '导入成功');
      setIsBatchUploadDialogOpen(false);
      setCsvData("");
      refetch();
    },
    onError: (error) => {
      toast.error(`导入失败：${error.message}`);
    },
  });

  // 处理CSV上传
  const handleCsvUpload = () => {
    if (!csvData.trim()) {
      toast.error("请输入CSV数据");
      return;
    }

    // 解析CSV数据
    const lines = csvData.trim().split("\n");
    const data = lines.map(line => {
      // 简单的CSV解析（不处理引号内的逗号）
      return line.split(",").map(cell => cell.trim());
    });

    batchImportMutation.mutate({ title: '批量导入', content: JSON.stringify(data) } as any);
  };

  // 下载CSV模板
  const downloadTemplate = () => {
    const template = `标题,内容,学科,年级,难度,题型,答案,解析
示例题目,这是题目内容,math,junior1,easy,choice,A,这是解析说明`;
    
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "question_template.csv";
    link.click();
  };

  // 权限检查
  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              您没有权限访问题库管理功能
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-500" />
            题库管理
          </h1>
          <p className="text-muted-foreground mt-2">
            管理系统题库，支持创建、编辑和批量导入题目
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            下载模板
          </Button>
          <Button variant="outline" onClick={() => setIsBatchUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            批量导入
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建题目
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>学科</Label>
              <Select
                value={filters.subject}
                onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {Object.entries(SUBJECTS).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>年级</Label>
              <Select
                value={filters.grade}
                onValueChange={(value) => setFilters(prev => ({ ...prev, grade: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {Object.entries(GRADES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>难度</Label>
              <Select
                value={filters.difficulty}
                onValueChange={(value) => setFilters(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {Object.entries(DIFFICULTIES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>题型</Label>
              <Select
                value={filters.questionType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, questionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {Object.entries(QUESTION_TYPES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>搜索</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索题目..."
                  value={filters.searchKeyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchKeyword: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : !questionsData || questionsData.questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无题目数据
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>学科</TableHead>
                    <TableHead>年级</TableHead>
                    <TableHead>难度</TableHead>
                    <TableHead>题型</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionsData.questions.map((question: any) => (
                    <TableRow key={question.id}>
                      <TableCell>{question.id}</TableCell>
                      <TableCell className="max-w-xs truncate">{question.title}</TableCell>
                      <TableCell>{SUBJECTS[question.subject as keyof typeof SUBJECTS]}</TableCell>
                      <TableCell>{GRADES[question.grade as keyof typeof GRADES]}</TableCell>
                      <TableCell>{DIFFICULTIES[question.difficulty as keyof typeof DIFFICULTIES]}</TableCell>
                      <TableCell>{QUESTION_TYPES[question.questionType as keyof typeof QUESTION_TYPES]}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingQuestion(question);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("确定要删除这道题目吗？")) {
                                deleteMutation.mutate({ id: question.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  共 {questionsData.total} 道题目，第 {page} / {questionsData.totalPages} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= questionsData.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 批量上传对话框 */}
      <Dialog open={isBatchUploadDialogOpen} onOpenChange={setIsBatchUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>批量导入题目</DialogTitle>
            <DialogDescription>
              请粘贴CSV格式的题目数据。格式：标题,内容,学科,年级,难度,题型,答案,解析
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="标题,内容,学科,年级,难度,题型,答案,解析&#10;示例题目,这是题目内容,math,junior1,easy,choice,A,这是解析说明"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchUploadDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCsvUpload} disabled={batchImportMutation.isPending}>
              {batchImportMutation.isPending ? "导入中..." : "开始导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建/编辑对话框将在下一步实现 */}
    </div>
  );
}
