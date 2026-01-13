import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  BookOpen,
  Languages,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
} from "lucide-react";

const CATEGORIES = [
  { value: "general", label: "通用" },
  { value: "math", label: "数学" },
  { value: "physics", label: "物理" },
  { value: "chemistry", label: "化学" },
  { value: "biology", label: "生物" },
  { value: "chinese", label: "语文" },
  { value: "english", label: "英语" },
  { value: "history", label: "历史" },
  { value: "geography", label: "地理" },
  { value: "politics", label: "政治" },
];

const REVIEW_STATUS = [
  { value: "pending", label: "待校对", color: "bg-yellow-500" },
  { value: "reviewed", label: "已校对", color: "bg-blue-500" },
  { value: "approved", label: "已通过", color: "bg-green-500" },
  { value: "rejected", label: "已拒绝", color: "bg-red-500" },
];

interface TerminologyFormData {
  category: string;
  subCategory?: string;
  termChinese: string;
  termJapanese?: string;
  termKorean?: string;
  termEnglish?: string;
  descriptionChinese?: string;
  descriptionJapanese?: string;
  descriptionKorean?: string;
  descriptionEnglish?: string;
}

export default function TerminologyManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<"japanese" | "korean" | undefined>();
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TerminologyFormData>({
    category: "general",
    termChinese: "",
  });
  const [reviewData, setReviewData] = useState({
    language: "japanese" as "japanese" | "korean",
    action: "approved" as "approved" | "corrected" | "rejected",
    newTerm: "",
    newDescription: "",
    reviewNotes: "",
    isNativeSpeaker: false,
  });

  const utils = trpc.useUtils();

  // 查询术语列表
  const { data: terminologyList, isLoading } = trpc.terminologyManagement.getTerminologyList.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    language: selectedLanguage,
    reviewStatus: selectedReviewStatus === "all" ? undefined : selectedReviewStatus as any,
    search: searchTerm || undefined,
    limit: 50,
    offset: 0,
  });

  // 查询待校对统计
  const { data: pendingStats } = trpc.terminologyManagement.getPendingReviewStats.useQuery();

  // 创建术语
  const createMutation = trpc.terminologyManagement.createTerminology.useMutation({
    onSuccess: () => {
      toast.success("术语创建成功");
      setIsCreateDialogOpen(false);
      resetForm();
      utils.terminologyManagement.getTerminologyList.invalidate();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新术语
  const updateMutation = trpc.terminologyManagement.updateTerminology.useMutation({
    onSuccess: () => {
      toast.success("术语更新成功");
      setIsEditDialogOpen(false);
      resetForm();
      utils.terminologyManagement.getTerminologyList.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除术语
  const deleteMutation = trpc.terminologyManagement.deleteTerminology.useMutation({
    onSuccess: () => {
      toast.success("术语删除成功");
      utils.terminologyManagement.getTerminologyList.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 提交校对
  const submitReviewMutation = trpc.terminologyManagement.submitReview.useMutation({
    onSuccess: () => {
      toast.success("校对提交成功");
      setIsReviewDialogOpen(false);
      utils.terminologyManagement.getTerminologyList.invalidate();
      utils.terminologyManagement.getPendingReviewStats.invalidate();
    },
    onError: (error) => {
      toast.error(`校对失败: ${error.message}`);
    },
  });

  // 导入术语
  const importAllMutation = trpc.terminologyManagement.importAllTerminology.useMutation({
    onSuccess: () => {
      toast.success("术语导入成功");
      utils.terminologyManagement.getTerminologyList.invalidate();
    },
    onError: (error) => {
      toast.error(`导入失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      category: "general",
      termChinese: "",
    });
    setSelectedTermId(null);
  };

  const handleCreate = () => {
    if (!formData.termChinese.trim()) {
      toast.error("请输入中文术语");
      return;
    }
    createMutation.mutate(formData as any);
  };

  const handleUpdate = () => {
    if (!selectedTermId || !formData.termChinese.trim()) {
      toast.error("请输入中文术语");
      return;
    }
    updateMutation.mutate({
      id: selectedTermId,
      data: formData as any,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除这个术语吗？")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleEdit = (term: any) => {
    setSelectedTermId(term.id);
    setFormData({
      category: term.category,
      subCategory: term.subCategory || "",
      termChinese: term.termChinese,
      termJapanese: term.termJapanese || "",
      termKorean: term.termKorean || "",
      termEnglish: term.termEnglish || "",
      descriptionChinese: term.descriptionChinese || "",
      descriptionJapanese: term.descriptionJapanese || "",
      descriptionKorean: term.descriptionKorean || "",
      descriptionEnglish: term.descriptionEnglish || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleReview = (term: any) => {
    setSelectedTermId(term.id);
    setReviewData({
      language: "japanese",
      action: "approved",
      newTerm: "",
      newDescription: "",
      reviewNotes: "",
      isNativeSpeaker: false,
    });
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!selectedTermId) return;
    submitReviewMutation.mutate({
      terminologyId: selectedTermId,
      ...reviewData,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = REVIEW_STATUS.find((s) => s.value === status);
    if (!statusConfig) return null;
    return (
      <Badge variant="outline" className={`${statusConfig.color} text-white`}>
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              术语管理
            </h1>
            <p className="text-muted-foreground mt-1">
              管理教育术语的多语言翻译和校对
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => importAllMutation.mutate()}
              disabled={importAllMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${importAllMutation.isPending ? "animate-spin" : ""}`} />
              导入预设术语
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加术语
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>添加新术语</DialogTitle>
                  <DialogDescription>
                    添加新的教育术语及其多语言翻译
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>学科分类</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>子分类</Label>
                      <Input
                        value={formData.subCategory || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, subCategory: e.target.value })
                        }
                        placeholder="如：代数、几何等"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>中文术语 *</Label>
                      <Input
                        value={formData.termChinese}
                        onChange={(e) =>
                          setFormData({ ...formData, termChinese: e.target.value })
                        }
                        placeholder="输入中文术语"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>英文术语</Label>
                      <Input
                        value={formData.termEnglish || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, termEnglish: e.target.value })
                        }
                        placeholder="English term"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>日语术语</Label>
                      <Input
                        value={formData.termJapanese || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, termJapanese: e.target.value })
                        }
                        placeholder="日本語用語"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>韩语术语</Label>
                      <Input
                        value={formData.termKorean || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, termKorean: e.target.value })
                        }
                        placeholder="한국어 용어"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>中文描述</Label>
                    <Textarea
                      value={formData.descriptionChinese || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, descriptionChinese: e.target.value })
                      }
                      placeholder="术语的详细描述"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "创建中..." : "创建"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Languages className="h-4 w-4" />
                日语待校对
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingStats?.japanese?.reduce((sum, s) => sum + Number(s.count), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                共 {pendingStats?.japanese?.length || 0} 个分类
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Languages className="h-4 w-4" />
                韩语待校对
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingStats?.korean?.reduce((sum, s) => sum + Number(s.count), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                共 {pendingStats?.korean?.length || 0} 个分类
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                术语总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {terminologyList?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">当前筛选结果</p>
            </CardContent>
          </Card>
        </div>

        {/* 筛选和搜索 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索术语..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="学科分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedLanguage || "all"}
                onValueChange={(value) =>
                  setSelectedLanguage(value === "all" ? undefined : (value as "japanese" | "korean"))
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="语言" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部语言</SelectItem>
                  <SelectItem value="japanese">日语</SelectItem>
                  <SelectItem value="korean">韩语</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedReviewStatus} onValueChange={setSelectedReviewStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="校对状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {REVIEW_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 术语列表 */}
        <Card>
          <CardHeader>
            <CardTitle>术语列表</CardTitle>
            <CardDescription>
              管理和校对多语言教育术语
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : terminologyList && terminologyList.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>中文</TableHead>
                      <TableHead>英文</TableHead>
                      <TableHead>日语</TableHead>
                      <TableHead>韩语</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>日语状态</TableHead>
                      <TableHead>韩语状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terminologyList.map((term) => (
                      <TableRow key={term.id}>
                        <TableCell className="font-medium">
                          {term.termChinese}
                        </TableCell>
                        <TableCell>{term.termEnglish || "-"}</TableCell>
                        <TableCell>{term.termJapanese || "-"}</TableCell>
                        <TableCell>{term.termKorean || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CATEGORIES.find((c) => c.value === term.category)?.label || term.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(term.japaneseReviewStatus || "pending")}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(term.koreanReviewStatus || "pending")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReview(term)}
                              title="校对"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(term)}
                              title="编辑"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(term.id)}
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无术语数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑术语</DialogTitle>
              <DialogDescription>修改术语信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>学科分类</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>子分类</Label>
                  <Input
                    value={formData.subCategory || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, subCategory: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>中文术语 *</Label>
                  <Input
                    value={formData.termChinese}
                    onChange={(e) =>
                      setFormData({ ...formData, termChinese: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>英文术语</Label>
                  <Input
                    value={formData.termEnglish || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, termEnglish: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>日语术语</Label>
                  <Input
                    value={formData.termJapanese || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, termJapanese: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>韩语术语</Label>
                  <Input
                    value={formData.termKorean || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, termKorean: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>中文描述</Label>
                <Textarea
                  value={formData.descriptionChinese || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, descriptionChinese: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 校对对话框 */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>术语校对</DialogTitle>
              <DialogDescription>
                对术语翻译进行校对和审核
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>校对语言</Label>
                <Select
                  value={reviewData.language}
                  onValueChange={(value: "japanese" | "korean") =>
                    setReviewData({ ...reviewData, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="japanese">日语</SelectItem>
                    <SelectItem value="korean">韩语</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>校对结果</Label>
                <Select
                  value={reviewData.action}
                  onValueChange={(value: "approved" | "corrected" | "rejected") =>
                    setReviewData({ ...reviewData, action: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">通过</SelectItem>
                    <SelectItem value="corrected">修正</SelectItem>
                    <SelectItem value="rejected">拒绝</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reviewData.action === "corrected" && (
                <>
                  <div className="space-y-2">
                    <Label>修正后的术语</Label>
                    <Input
                      value={reviewData.newTerm}
                      onChange={(e) =>
                        setReviewData({ ...reviewData, newTerm: e.target.value })
                      }
                      placeholder="输入修正后的翻译"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>修正后的描述</Label>
                    <Textarea
                      value={reviewData.newDescription}
                      onChange={(e) =>
                        setReviewData({ ...reviewData, newDescription: e.target.value })
                      }
                      placeholder="输入修正后的描述"
                      rows={3}
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>校对备注</Label>
                <Textarea
                  value={reviewData.reviewNotes}
                  onChange={(e) =>
                    setReviewData({ ...reviewData, reviewNotes: e.target.value })
                  }
                  placeholder="添加校对备注..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="nativeSpeaker"
                  checked={reviewData.isNativeSpeaker}
                  onChange={(e) =>
                    setReviewData({ ...reviewData, isNativeSpeaker: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="nativeSpeaker">我是该语言的母语者</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmitReview} disabled={submitReviewMutation.isPending}>
                {submitReviewMutation.isPending ? "提交中..." : "提交校对"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
