import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Upload, Camera, FileText, Loader2, CheckCircle, AlertCircle, Download, Clock, Star, Trash2, FileDown, CheckCheck, CalendarPlus, Tag, BarChart3, Share2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportDialog } from "@/components/ExportDialog";
import { ErrorExportDialog } from "@/components/ErrorExportDialog";
import { EnhancedExportDialog } from "@/components/EnhancedExportDialog";
import { BatchExportDialog } from "@/components/BatchExportDialog";
import { AdvancedExportDialog } from "@/components/AdvancedExportDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { TagManagementDialog } from "@/components/TagManagementDialog";
import { TagSelector } from "@/components/TagSelector";
import { useState } from "react";
import { toast } from "sonner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/useMobile";
import { RefreshCw } from "lucide-react";
import { VoiceInputButtonEnhanced } from "@/components/VoiceInputButtonEnhanced";
import { LatexEditor } from "@/components/LatexEditor";
import { useLocation, useSearch } from "wouter";
import { SCHOOL_LEVELS, SUBJECTS, type SchoolLevel, type Subject } from "../../../shared/subjects";
import { BatchOperationToolbar } from "@/components/BatchOperationToolbar";
import { SEO } from "@/components/SEO";

export default function ErrorQuestions() {
  // SEO优化
  const seoData = {
    title: "错题管理",
    description: "管理和分析你的错题，通过AI智能分析找出知识薄弱点，获取个性化学习建议，提高学习效率。",
    keywords: "错题管理,错题分析,AI分析,知识点,学习建议,个性化学习",
    canonical: "https://exam-error-analysis.manus.space/error-questions",
  };
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const levelParam = searchParams.get('level');
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"photo" | "manual">("photo");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [errorExportDialogOpen, setErrorExportDialogOpen] = useState(false);
  const [enhancedExportDialogOpen, setEnhancedExportDialogOpen] = useState(false);
  const [batchExportDialogOpen, setBatchExportDialogOpen] = useState(false);
  const [tagManagementDialogOpen, setTagManagementDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<SchoolLevel | "all">(
    levelParam === 'junior' ? 'junior' : levelParam === 'senior' ? 'senior' : "all"
  );
  const [selectedSubject, setSelectedSubject] = useState<Subject | "all">("all");
  const [selectedSemester, setSelectedSemester] = useState<"all" | "first" | "second">("all");
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);
  const [batchMasteredDialogOpen, setBatchMasteredDialogOpen] = useState(false);
  const [batchReviewDialogOpen, setBatchReviewDialogOpen] = useState(false);
  const [batchDifficultyDialogOpen, setBatchDifficultyDialogOpen] = useState(false);
  const [batchTagDialogOpen, setBatchTagDialogOpen] = useState(false);
  const [batchDifficulty, setBatchDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [batchTagId, setBatchTagId] = useState<number | null>(null);
  const [advancedExportDialogOpen, setAdvancedExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // 标签数据
  const { data: allTags = [] } = trpc.tags.list.useQuery();
  
  // 加入复习计划mutation
  const addToReviewMutation = trpc.reviewPlan.addToReviewPlan.useMutation({
    onSuccess: () => {
      toast.success("已加入复习计划");
    },
    onError: (error) => {
      toast.error(`加入失败：${error.message}`);
    },
  });
  
  const handleAddToReview = (errorQuestionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    addToReviewMutation.mutate({ errorQuestionId });
  };
  
  // 收藏/取消收藏mutation
  const toggleFavoriteMutation = trpc.errorQuestions.toggleFavorite.useMutation({
    onSuccess: (data) => {
      if (data.isFavorite) {
        toast.success("已收藏");
      } else {
        toast.success("已取消收藏");
      }
      utils.errorQuestions.list.invalidate();
      utils.errorQuestions.listBySchoolLevel.invalidate();
      utils.errorQuestions.listBySchoolLevelAndSubject.invalidate();
    },
    onError: (error) => {
      toast.error(`操作失败：${error.message}`);
    },
  });
  
  const handleToggleFavorite = (questionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate({ questionId });
  };

  // 删除单个错题
  const deleteMutation = trpc.errorQuestions.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      utils.errorQuestions.list.invalidate();
      utils.errorQuestions.listBySchoolLevel.invalidate();
      utils.errorQuestions.listBySchoolLevelAndSubject.invalidate();
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  // 批量删除错题
  const batchDeleteMutation = trpc.errorQuestions.batchDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`成功删除${data.successCount}道错题${data.failCount > 0 ? `，${data.failCount}道失败` : ''}`);
      utils.errorQuestions.list.invalidate();
      utils.errorQuestions.listBySchoolLevel.invalidate();
      utils.errorQuestions.listBySchoolLevelAndSubject.invalidate();
      setSelectedQuestionIds([]);
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`批量删除失败：${error.message}`);
    },
  });

  const handleDeleteClick = (questionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestionToDelete(questionId);
    setDeleteDialogOpen(true);
  };

  const handleBatchDeleteClick = () => {
    if (selectedQuestionIds.length === 0) {
      toast.error("请先选择要删除的错题");
      return;
    }
    setQuestionToDelete(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (questionToDelete) {
      deleteMutation.mutate({ questionId: questionToDelete });
    } else if (selectedQuestionIds.length > 0) {
      batchDeleteMutation.mutate({ questionIds: selectedQuestionIds });
    }
  };

  // 批量标记为已掌握
  const batchMarkMasteredMutation = trpc.errorQuestions.batchMarkMastered.useMutation({
    onSuccess: (data) => {
      toast.success(`成功标记${data.successCount}道错题为已掌握${data.failCount > 0 ? `，${data.failCount}道失败` : ''}`);
      utils.errorQuestions.list.invalidate();
      utils.errorQuestions.listBySchoolLevel.invalidate();
      utils.errorQuestions.listBySchoolLevelAndSubject.invalidate();
      setSelectedQuestionIds([]);
      setBatchMasteredDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`批量标记失败：${error.message}`);
    },
  });

  // 批量加入复习计划
  const batchAddToReviewMutation = trpc.reviewPlan.batchAddToReviewPlan.useMutation({
    onSuccess: (data) => {
      toast.success(`成功添加${data.successCount}道错题到复习计划${data.failCount > 0 ? `，${data.failCount}道失败` : ''}`);
      setSelectedQuestionIds([]);
      setBatchReviewDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`批量添加失败：${error.message}`);
    },
  });

  // 批量修改难度
  const batchUpdateDifficultyMutation = trpc.errorQuestions.batchUpdateDifficulty.useMutation({
    onSuccess: (data) => {
      toast.success(`成功修改${data.successCount}道错题的难度${data.failCount > 0 ? `，${data.failCount}道失败` : ''}`);
      utils.errorQuestions.list.invalidate();
      utils.errorQuestions.listBySchoolLevel.invalidate();
      utils.errorQuestions.listBySchoolLevelAndSubject.invalidate();
      setSelectedQuestionIds([]);
      setBatchDifficultyDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`批量修改难度失败：${error.message}`);
    },
  });

  // 批量添加标签
  const batchAddTagMutation = trpc.errorQuestions.batchAddTag.useMutation({
    onSuccess: (data) => {
      toast.success(`成功为${data.successCount}道错题添加标签${data.failCount > 0 ? `，${data.failCount}道失败` : ''}`);
      utils.errorQuestions.list.invalidate();
      utils.errorQuestions.listBySchoolLevel.invalidate();
      utils.errorQuestions.listBySchoolLevelAndSubject.invalidate();
      setSelectedQuestionIds([]);
      setBatchTagDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`批量添加标签失败：${error.message}`);
    },
  });

  const handleBatchMarkMastered = () => {
    if (selectedQuestionIds.length === 0) {
      toast.error("请先选择要标记的错题");
      return;
    }
    setBatchMasteredDialogOpen(true);
  };

  const handleBatchAddToReview = () => {
    if (selectedQuestionIds.length === 0) {
      toast.error("请先选择要加入复习计划的错题");
      return;
    }
    setBatchReviewDialogOpen(true);
  };

  const handleBatchUpdateDifficulty = () => {
    if (selectedQuestionIds.length === 0) {
      toast.error("请先选择要修改难度的错题");
      return;
    }
    setBatchDifficultyDialogOpen(true);
  };

  const handleBatchAddTag = () => {
    if (selectedQuestionIds.length === 0) {
      toast.error("请先选择要添加标签的错题");
      return;
    }
    setBatchTagDialogOpen(true);
  };

  const handleSelectQuestion = (questionId: number, checked: boolean) => {
    if (checked) {
      setSelectedQuestionIds([...selectedQuestionIds, questionId]);
    } else {
      setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== questionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && errorQuestions) {
      setSelectedQuestionIds(errorQuestions.map(q => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };
  
  // 表单状态
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [semester, setSemester] = useState<"first" | "second" | null>(null);
  const [semesterReason, setSemesterReason] = useState<string>("");
  const [isIdentifyingSemester, setIsIdentifyingSemester] = useState(false);

  const utils = trpc.useUtils();
  
  // 根据筛选条件动态查询
  const { data: allQuestions, isLoading: isLoadingAll, refetch: refetchAll } = trpc.errorQuestions.list.useQuery(
    { limit: 50 },
    { enabled: selectedLevel === "all" && selectedSubject === "all" }
  );
  
  // 下拉刷新
  const handleRefresh = async () => {
    await refetchAll();
    toast.success("刷新成功");
  };
  
  const { ref: pullToRefreshRef, pullState } = usePullToRefresh<HTMLDivElement>({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: !isMobile,
  });
  
  const { data: levelQuestions, isLoading: isLoadingLevel } = trpc.errorQuestions.listBySchoolLevel.useQuery(
    { schoolLevel: selectedLevel as SchoolLevel, limit: 50 },
    { enabled: selectedLevel !== "all" && selectedSubject === "all" }
  );
  
  const { data: levelSubjectQuestions, isLoading: isLoadingLevelSubject } = trpc.errorQuestions.listBySchoolLevelAndSubject.useQuery(
    { 
      schoolLevel: selectedLevel as SchoolLevel, 
      subject: selectedSubject as Subject,
      limit: 50 
    },
    { enabled: selectedLevel !== "all" && selectedSubject !== "all" }
  );
  
  let errorQuestions = selectedLevel === "all" && selectedSubject === "all" 
    ? allQuestions
    : selectedLevel !== "all" && selectedSubject === "all"
    ? levelQuestions
    : levelSubjectQuestions;
  
  // 前端筛选：学期、收藏（标签筛选由后端处理）
  if (errorQuestions) {
    errorQuestions = errorQuestions.filter(q => {
      // 学期筛选
      if (selectedSemester !== "all" && q.semester !== selectedSemester) {
        return false;
      }
      // 收藏筛选
      if (showFavoriteOnly && !q.isFavorite) {
        return false;
      }
      return true;
    });
  }
    
  const isLoading = isLoadingAll || isLoadingLevel || isLoadingLevelSubject;
  
  const identifySemesterMutation = trpc.semester.identifyQuestionSemester.useMutation();

  // AI识别学期
  const handleIdentifySemester = async () => {
    if (!grade || !subject || !content) {
      toast.error("请先填写年级、学科和题目内容");
      return;
    }

    setIsIdentifyingSemester(true);
    try {
      const result = await identifySemesterMutation.mutateAsync({
        grade,
        subject,
        questionContent: content
      });
      setSemester(result.semester);
      setSemesterReason(result.reason);
      toast.success(`AI识别完成：${result.reason}`);
    } catch (error) {
      toast.error("学期识别失败，请手动选择");
    } finally {
      setIsIdentifyingSemester(false);
    }
  };

  const createManualMutation = trpc.errorQuestions.create.useMutation({
    onSuccess: () => {
      toast.success("错题创建成功！");
      utils.errorQuestions.list.invalidate();
      resetForm();
      setUploadDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  const createFromImageMutation = trpc.errorQuestions.createFromImage.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("错题上传成功，OCR识别完成！");
        utils.errorQuestions.list.invalidate();
        resetForm();
        setUploadDialogOpen(false);
      } else {
        toast.error(`上传失败：${data.error}`);
      }
    },
    onError: (error) => {
      toast.error(`上传失败：${error.message}`);
    },
  });

  const analyzeMutation = trpc.aiAnalysis.analyzeQuestion.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("AI分析完成！");
        utils.errorQuestions.list.invalidate();
      } else {
        toast.error(`分析失败：${data.error}`);
      }
    },
    onError: (error) => {
      toast.error(`分析失败：${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSubject("");
    setGrade("");
    setImageFile(null);
    setImagePreview("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!title || !subject || !grade) {
      toast.error("请填写必填项");
      return;
    }

    if (uploadMethod === "photo") {
      if (!imageFile || !imagePreview) {
        toast.error("请选择图片");
        return;
      }
      
      createFromImageMutation.mutate({
        imageBase64: imagePreview,
        title,
        subject: subject as any,
        grade: grade as any,
      });
    } else {
      if (!content) {
        toast.error("请输入题目内容");
        return;
      }
      
      createManualMutation.mutate({
        title,
        content,
        subject: subject as any,
        grade: grade as any,
      });
    }
  };

  const handleAnalyze = (questionId: number) => {
    analyzeMutation.mutate({ questionId });
  };

  const subjectOptions = [
    { value: "chinese", label: "语文" },
    { value: "math", label: "数学" },
    { value: "english", label: "英语" },
    { value: "physics", label: "物理" },
    { value: "chemistry", label: "化学" },
    { value: "biology", label: "生物" },
    { value: "politics", label: "政治" },
    { value: "history", label: "历史" },
    { value: "geography", label: "地理" },
  ];

  const gradeOptions = [
    { value: "junior1", label: "初一" },
    { value: "junior2", label: "初二" },
    { value: "junior3", label: "初三" },
    { value: "senior1", label: "高一" },
    { value: "senior2", label: "高二" },
    { value: "senior3", label: "高三" },
  ];

  return (
    <>
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonical={seoData.canonical}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": seoData.title,
          "description": seoData.description,
          "url": seoData.canonical,
          "inLanguage": "zh-CN"
        }}
      />
      <DashboardLayout>
      <div ref={pullToRefreshRef} className="space-y-6 relative">
        {/* 下拉刷新提示 */}
        {isMobile && (pullState.isPulling || pullState.isRefreshing) && (
          <div 
            className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-200"
            style={{ 
              top: `${Math.min(pullState.pullDistance, 80)}px`,
              opacity: pullState.progress 
            }}
          >
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <RefreshCw className={`h-4 w-4 ${pullState.isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {pullState.isRefreshing ? '刷新中...' : pullState.progress >= 1 ? '释放刷新' : '下拉刷新'}
              </span>
            </div>
          </div>
        )}
        {/* 页面标题和操作按钮 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">错题本</h1>
            <p className="text-muted-foreground mt-2">管理和分析你的错题</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={() => setExportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              导出Excel
            </Button>
            <Button variant="outline" size="lg" onClick={() => setErrorExportDialogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              导出PDF
            </Button>
            <Button variant="outline" size="lg" onClick={() => setEnhancedExportDialogOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              增强导出
            </Button>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>            <DialogTrigger asChild>
              <Button size="lg">
                <Upload className="mr-2 h-4 w-4" />
                上传错题
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>上传错题</DialogTitle>
                <DialogDescription>选择上传方式：拍照上传或手动输入</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* 上传方式选择 */}
                <div className="flex gap-4">
                  <Button
                    variant={uploadMethod === "photo" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setUploadMethod("photo")}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    拍照上传
                  </Button>
                  <Button
                    variant={uploadMethod === "manual" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setUploadMethod("manual")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    手动输入
                  </Button>
                </div>

                {/* 基本信息 */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">题目标题 *</Label>
                    <Input
                      id="title"
                      placeholder="例如：二次函数应用题"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">学科 *</Label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择学科" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjectOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="grade">年级 *</Label>
                      <Select value={grade} onValueChange={setGrade}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择年级" />
                        </SelectTrigger>
                        <SelectContent>
                          {gradeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 学期选择和AI识别 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="semester">学期</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleIdentifySemester}
                        disabled={isIdentifyingSemester || !grade || !subject || !content}
                      >
                        {isIdentifyingSemester ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            AI识别中...
                          </>
                        ) : (
                          "AI自动识别"
                        )}
                      </Button>
                    </div>
                    <Select 
                      value={semester || ""} 
                      onValueChange={(v) => setSemester(v as "first" | "second")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择学期或使用AI识别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first">上学期</SelectItem>
                        <SelectItem value="second">下学期</SelectItem>
                      </SelectContent>
                    </Select>
                    {semesterReason && (
                      <p className="text-sm text-muted-foreground">
                        {semesterReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* 拍照上传 */}
                {uploadMethod === "photo" && (
                  <div>
                    <Label htmlFor="image">上传图片 *</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                    {imagePreview && (
                      <div className="mt-4">
                        <img src={imagePreview} alt="预览" className="max-h-64 rounded-lg border" />
                      </div>
                    )}
                  </div>
                )}

                {/* 手动输入 */}
                {uploadMethod === "manual" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="content">题目内容 *</Label>
                      <VoiceInputButtonEnhanced
                        onTranscript={(text) => setContent((prev) => prev + text)}
                        lang={subject === "english" ? "en-US" : "zh-CN"}
                        size="sm"
                        mode="advanced"
                      />
                    </div>
                    <LatexEditor
                      value={content}
                      onChange={setContent}
                      placeholder="输入完整的题目内容，或点击语音输入按钮...支持LaTeX公式"
                      rows={8}
                    />
                  </div>
                )}

                {/* 提交按钮 */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    取消
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createManualMutation.isPending || createFromImageMutation.isPending}
                  >
                    {(createManualMutation.isPending || createFromImageMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    提交
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* 导出对话框 */}
        <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <TagManagementDialog 
        open={tagManagementDialogOpen} 
        onOpenChange={setTagManagementDialogOpen}
      />
      <ErrorExportDialog 
        open={errorExportDialogOpen} 
        onOpenChange={setErrorExportDialogOpen}
        defaultFilters={{
          subjects: selectedSubject !== "all" ? [selectedSubject] : undefined,
        }}
      />
      <EnhancedExportDialog 
        open={enhancedExportDialogOpen} 
        onOpenChange={setEnhancedExportDialogOpen}
        defaultFilters={{
          subjects: selectedSubject !== "all" ? [selectedSubject] : undefined,
        }}
      />
      <BatchExportDialog 
        open={batchExportDialogOpen} 
        onOpenChange={setBatchExportDialogOpen}
        selectedQuestionIds={selectedQuestionIds}
        onExportComplete={() => setSelectedQuestionIds([])}
      />
      <AdvancedExportDialog 
        open={advancedExportDialogOpen} 
        onOpenChange={setAdvancedExportDialogOpen}
        selectedQuestionIds={selectedQuestionIds}
      />
      <ShareDialog 
        open={shareDialogOpen} 
        onOpenChange={setShareDialogOpen}
        selectedQuestionIds={selectedQuestionIds}
      />
      
      {/* 批量标记已掌握对话框 */}
      <Dialog open={batchMasteredDialogOpen} onOpenChange={setBatchMasteredDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量标记为已掌握</DialogTitle>
            <DialogDescription>
              确定要将选中的 {selectedQuestionIds.length} 道错题标记为已掌握吗？
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setBatchMasteredDialogOpen(false)}
              disabled={batchMarkMasteredMutation.isPending}
            >
              取消
            </Button>
            <Button 
              onClick={() => batchMarkMasteredMutation.mutate({ questionIds: selectedQuestionIds })}
              disabled={batchMarkMasteredMutation.isPending}
            >
              {batchMarkMasteredMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量加入复习计划对话框 */}
      <Dialog open={batchReviewDialogOpen} onOpenChange={setBatchReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量加入复习计划</DialogTitle>
            <DialogDescription>
              确定要将选中的 {selectedQuestionIds.length} 道错题加入复习计划吗？
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setBatchReviewDialogOpen(false)}
              disabled={batchAddToReviewMutation.isPending}
            >
              取消
            </Button>
            <Button 
              onClick={() => batchAddToReviewMutation.mutate({ errorQuestionIds: selectedQuestionIds })}
              disabled={batchAddToReviewMutation.isPending}
            >
              {batchAddToReviewMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量修改难度对话框 */}
      <Dialog open={batchDifficultyDialogOpen} onOpenChange={setBatchDifficultyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量修改难度</DialogTitle>
            <DialogDescription>
              为选中的 {selectedQuestionIds.length} 道错题设置难度等级
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>难度等级</Label>
              <Select value={batchDifficulty} onValueChange={(v) => setBatchDifficulty(v as "easy" | "medium" | "hard")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setBatchDifficultyDialogOpen(false)}
              disabled={batchUpdateDifficultyMutation.isPending}
            >
              取消
            </Button>
            <Button 
              onClick={() => batchUpdateDifficultyMutation.mutate({ 
                questionIds: selectedQuestionIds, 
                difficulty: batchDifficulty 
              })}
              disabled={batchUpdateDifficultyMutation.isPending}
            >
              {batchUpdateDifficultyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量添加标签对话框 */}
      <Dialog open={batchTagDialogOpen} onOpenChange={setBatchTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量添加标签</DialogTitle>
            <DialogDescription>
              为选中的 {selectedQuestionIds.length} 道错题添加标签
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择标签</Label>
              <Select 
                value={batchTagId?.toString() || ""} 
                onValueChange={(v) => setBatchTagId(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择一个标签" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#6366f1' }} />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setBatchTagDialogOpen(false)}
              disabled={batchAddTagMutation.isPending}
            >
              取消
            </Button>
            <Button 
              onClick={() => {
                if (!batchTagId) {
                  toast.error("请选择一个标签");
                  return;
                }
                batchAddTagMutation.mutate({ 
                  questionIds: selectedQuestionIds, 
                  tagId: batchTagId 
                });
              }}
              disabled={batchAddTagMutation.isPending || !batchTagId}
            >
              {batchAddTagMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {questionToDelete 
                ? "确定要删除这道错题吗？此操作不可恢复。" 
                : `确定要删除选中的 ${selectedQuestionIds.length} 道错题吗？此操作不可恢复。`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending || batchDeleteMutation.isPending}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending || batchDeleteMutation.isPending}
            >
              {(deleteMutation.isPending || batchDeleteMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        {/* 板块和学科筛选器 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>分类筛选</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setTagManagementDialogOpen(true)}>
                标签管理
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* 板块筛选 */}
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2">板块</Label>
                <Select value={selectedLevel} onValueChange={(v) => {
                  setSelectedLevel(v as SchoolLevel | "all");
                  setSelectedSubject("all"); // 重置学科筛选
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="junior">{SCHOOL_LEVELS.junior.name}</SelectItem>
                    <SelectItem value="senior">{SCHOOL_LEVELS.senior.name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 学科筛选 */}
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2">学科</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={(v) => setSelectedSubject(v as Subject | "all")}
                  disabled={selectedLevel === "all"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {Object.entries(SUBJECTS).map(([key, subject]) => (
                      <SelectItem key={key} value={key}>
                        {subject.icon} {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 学期筛选 */}
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2">学期</Label>
                <Select 
                  value={selectedSemester} 
                  onValueChange={(v) => setSelectedSemester(v as "all" | "first" | "second")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="first">上学期</SelectItem>
                    <SelectItem value="second">下学期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 标签筛选 */}
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2">标签</Label>
                <Select 
                  value={selectedTagIds.length > 0 ? selectedTagIds[0].toString() : "all"}
                  onValueChange={(v) => {
                    if (v === "all") {
                      setSelectedTagIds([]);
                    } else {
                      setSelectedTagIds([parseInt(v)]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#6366f1' }} />
                          {tag.name} ({tag.errorCount})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 收藏筛选 */}
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2">收藏</Label>
                <Select 
                  value={showFavoriteOnly ? "favorite" : "all"}
                  onValueChange={(v) => setShowFavoriteOnly(v === "favorite")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="favorite">仅显示收藏</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 统计信息 */}
              <div className="flex items-end gap-4">
                <div className="text-sm text-muted-foreground">
                  共 <span className="font-semibold text-foreground">{errorQuestions?.length || 0}</span> 道错题
                  {selectedQuestionIds.length > 0 && (
                    <span className="ml-2 text-primary font-semibold">
                      （已选择 {selectedQuestionIds.length} 道）
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 错题列表 */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : errorQuestions && errorQuestions.length > 0 ? (
          <div className="space-y-4">
            {/* 全选复选框 */}
            <div className="flex items-center gap-2 px-2">
              <Checkbox
                checked={errorQuestions.length > 0 && selectedQuestionIds.length === errorQuestions.length}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                全选
              </Label>
            </div>
            
            {errorQuestions.map((question) => (
              <Card 
                key={question.id} 
                className="hover:shadow-lg hover:border-primary/50 transition-all duration-200 group"
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    {/* 复选框 */}
                    <div className="flex items-start pt-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedQuestionIds.includes(question.id)}
                        onCheckedChange={(checked) => handleSelectQuestion(question.id, checked as boolean)}
                        id={`question-${question.id}`}
                      />
                    </div>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setLocation(`/error-questions/${question.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">
                          {question.title}
                        </CardTitle>
                        {question.isMastered && (
                          <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            已掌握
                          </span>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          {SUBJECTS[question.subject as Subject]?.icon}
                          {subjectOptions.find(s => s.value === question.subject)?.label}
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>{gradeOptions.find(g => g.value === question.grade)?.label}</span>
                        {question.difficulty && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className={`font-medium ${
                              question.difficulty === 'easy' ? 'text-green-600 dark:text-green-400' :
                              question.difficulty === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难'}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* 收藏按钮 */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleToggleFavorite(question.id, e)}
                        disabled={toggleFavoriteMutation.isPending}
                        className="h-8 w-8"
                      >
                        <Star className={`h-4 w-4 ${question.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </Button>
                      
                      {/* 删除按钮 */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleDeleteClick(question.id, e)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      {question.isAnalyzed ? (
                        <>
                          <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full">
                            <CheckCircle className="h-4 w-4" />
                            已分析
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleAddToReview(question.id, e)}
                            disabled={addToReviewMutation.isPending}
                            className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            加入复习
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyze(question.id);
                          }}
                          disabled={analyzeMutation.isPending}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          {analyzeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "AI分析"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {question.imageUrl && (
                      <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                        <img 
                          src={question.imageUrl} 
                          alt="题目" 
                          className="max-h-48 w-auto mx-auto object-contain group-hover:scale-105 transition-transform duration-200" 
                        />
                      </div>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed">
                      {question.content}
                    </p>
                    {question.errorAnalysis && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 rounded-lg">
                        <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          错误分析
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-300 line-clamp-2">{question.errorAnalysis}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">还没有错题记录</p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                上传第一道错题
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 批量操作工具栏 */}
        <BatchOperationToolbar
          selectedCount={selectedQuestionIds.length}
          totalCount={errorQuestions?.length || 0}
          onMarkMastered={handleBatchMarkMastered}
          onAddToReview={handleBatchAddToReview}
          onUpdateDifficulty={handleBatchUpdateDifficulty}
          onAddTag={handleBatchAddTag}
          onBatchExport={() => setBatchExportDialogOpen(true)}
          onAdvancedExport={() => setAdvancedExportDialogOpen(true)}
          onPrintPreview={() => setLocation(`/print-preview/${selectedQuestionIds.join(',')}`)}
          onShare={() => setShareDialogOpen(true)}
          onDelete={handleBatchDeleteClick}
          onClearSelection={() => setSelectedQuestionIds([])}
          isMarkingMastered={batchMarkMasteredMutation.isPending}
          isAddingToReview={batchAddToReviewMutation.isPending}
          isUpdatingDifficulty={batchUpdateDifficultyMutation.isPending}
          isAddingTag={batchAddTagMutation.isPending}
          isDeleting={batchDeleteMutation.isPending}
        />
      </div>
    </DashboardLayout>
    </>
  );
}
