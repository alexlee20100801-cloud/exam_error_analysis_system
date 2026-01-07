import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, Upload, Loader2, X, Check } from "lucide-react";

const SUBJECTS = [
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

const GRADES = [
  { value: "junior1", label: "初一" },
  { value: "junior2", label: "初二" },
  { value: "junior3", label: "初三" },
  { value: "senior1", label: "高一" },
  { value: "senior2", label: "高二" },
  { value: "senior3", label: "高三" },
];

const DIFFICULTIES = [
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
  { value: "hard", label: "困难" },
];

export default function UploadError() {
  const [, setLocation] = useLocation();
  // toast is imported from sonner
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>("");
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    subject: "",
    grade: "",
    difficulty: "",
    userAnswer: "",
    userNotes: "",
  });

  const uploadMutation = trpc.errorQuestion.uploadWithOCR.useMutation({
    onSuccess: (data) => {
      toast.success("上传成功", {
        description: "错题已成功上传并识别",
      });
      
      // 如果有OCR结果，填充到表单
      if (data.ocrText) {
        setOcrResult(data.ocrText);
        setFormData(prev => ({
          ...prev,
          content: data.ocrText,
        }));
      }
      
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error("上传失败", {
        description: error.message,
      });
      setIsUploading(false);
    },
  });

  const saveMutation = trpc.errorQuestion.create.useMutation({
    onSuccess: () => {
      toast.success("保存成功", {
        description: "错题已保存到错题本",
      });
      setLocation("/error-questions");
    },
    onError: (error) => {
      toast.error("保存失败", {
        description: error.message,
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件大小 (16MB限制)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("文件过大", {
        description: "图片大小不能超过16MB",
      });
      return;
    }

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      toast.error("文件类型错误", {
        description: "请上传图片文件",
      });
      return;
    }

    setImageFile(file);
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndOCR = async () => {
    if (!imageFile) {
      toast.error("请选择图片", {
        description: "请先选择要上传的错题图片",
      });
      return;
    }

    setIsUploading(true);

    try {
      // 将图片转换为base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // 调用上传和OCR接口
        await uploadMutation.mutateAsync({
          imageBase64: base64,
          fileName: imageFile.name,
        });
      };
      reader.readAsDataURL(imageFile);
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    // 验证必填字段
    if (!formData.title.trim()) {
      toast.error("请输入标题");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("请输入题目内容");
      return;
    }

    if (!formData.subject) {
      toast.error("请选择科目");
      return;
    }

    if (!formData.grade) {
      toast.error("请选择年级");
      return;
    }

    // 从grade推断schoolLevel
    const schoolLevel = formData.grade.startsWith("junior") ? "junior" : "senior";

    saveMutation.mutate({
      ...formData,
      schoolLevel,
      imageUrl: imagePreview || undefined,
      imageKey: imageFile?.name || undefined,
    });
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setOcrResult("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>上传错题</CardTitle>
          <CardDescription>拍照或选择图片，系统将自动识别题目内容</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 图片上传区域 */}
          <div className="space-y-4">
            <Label>错题图片</Label>
            
            {!imagePreview ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                <div className="flex justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    选择图片
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // 移动端会调用相机
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute("capture", "environment");
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    拍照
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  支持 JPG、PNG 格式，最大 16MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="错题预览"
                    className="w-full h-auto"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleClearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {!ocrResult && (
                  <Button
                    type="button"
                    onClick={handleUploadAndOCR}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        识别中...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        开始识别
                      </>
                    )}
                  </Button>
                )}
                
                {ocrResult && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                      ✓ 识别完成
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      已自动填充题目内容，请检查并修正
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 表单字段 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题 *</Label>
              <input
                id="title"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="例如：二次函数综合题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">科目 *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="选择科目" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject.value} value={subject.value}>
                        {subject.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">年级 *</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) => setFormData({ ...formData, grade: value })}
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">难度</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="选择难度" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((difficulty) => (
                      <SelectItem key={difficulty.value} value={difficulty.value}>
                        {difficulty.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">题目内容 *</Label>
              <Textarea
                id="content"
                placeholder="题目内容（如已识别会自动填充）"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userAnswer">我的答案</Label>
              <Textarea
                id="userAnswer"
                placeholder="记录你的答案"
                value={formData.userAnswer}
                onChange={(e) => setFormData({ ...formData, userAnswer: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userNotes">笔记</Label>
              <Textarea
                id="userNotes"
                placeholder="记录你的思考和笔记"
                value={formData.userNotes}
                onChange={(e) => setFormData({ ...formData, userNotes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/error-questions")}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存错题"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
