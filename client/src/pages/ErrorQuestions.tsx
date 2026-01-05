import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Upload, Camera, FileText, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";
import { ErrorExportDialog } from "@/components/ErrorExportDialog";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import { SCHOOL_LEVELS, SUBJECTS, type SchoolLevel, type Subject } from "../../../shared/subjects";

export default function ErrorQuestions() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const levelParam = searchParams.get('level');
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"photo" | "manual">("photo");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [errorExportDialogOpen, setErrorExportDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<SchoolLevel | "all">(
    levelParam === 'junior' ? 'junior' : levelParam === 'senior' ? 'senior' : "all"
  );
  const [selectedSubject, setSelectedSubject] = useState<Subject | "all">("all");
  
  // 表单状态
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const utils = trpc.useUtils();
  
  // 根据筛选条件动态查询
  const { data: allQuestions, isLoading: isLoadingAll } = trpc.errorQuestions.list.useQuery(
    { limit: 50 },
    { enabled: selectedLevel === "all" && selectedSubject === "all" }
  );
  
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
  
  const errorQuestions = selectedLevel === "all" && selectedSubject === "all" 
    ? allQuestions
    : selectedLevel !== "all" && selectedSubject === "all"
    ? levelQuestions
    : levelSubjectQuestions;
    
  const isLoading = isLoadingAll || isLoadingLevel || isLoadingLevelSubject;
  
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
    <DashboardLayout>
      <div className="space-y-6">
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
                    <Label htmlFor="content">题目内容 *</Label>
                    <Textarea
                      id="content"
                      placeholder="输入完整的题目内容..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
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
      <ErrorExportDialog 
        open={errorExportDialogOpen} 
        onOpenChange={setErrorExportDialogOpen}
        defaultFilters={{
          subjects: selectedSubject !== "all" ? [selectedSubject] : undefined,
        }}
      />

        {/* 板块和学科筛选器 */}
        <Card>
          <CardHeader>
            <CardTitle>分类筛选</CardTitle>
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
              
              {/* 统计信息 */}
              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  共 <span className="font-semibold text-foreground">{errorQuestions?.length || 0}</span> 道错题
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
          <div className="grid gap-4">
            {errorQuestions.map((question) => (
              <Card key={question.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{question.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {subjectOptions.find(s => s.value === question.subject)?.label} · 
                        {gradeOptions.find(g => g.value === question.grade)?.label}
                        {question.difficulty && ` · ${question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难'}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {question.isAnalyzed ? (
                        <span className="flex items-center text-sm text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          已分析
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAnalyze(question.id)}
                          disabled={analyzeMutation.isPending}
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
                  <div className="space-y-3 cursor-pointer" onClick={() => setLocation(`/error-questions/${question.id}`)}>
                    {question.imageUrl && (
                      <img src={question.imageUrl} alt="题目" className="max-h-48 rounded border" />
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">
                      {question.content}
                    </p>
                    {question.errorAnalysis && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-foreground mb-1">错误分析：</p>
                        <p className="text-sm text-muted-foreground">{question.errorAnalysis}</p>
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
      </div>
    </DashboardLayout>
  );
}
