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
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResults, setOcrResults] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{total: number, completed: number}>({total: 0, completed: 0});
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    subject: "",
    grade: "",
    difficulty: "",
    userAnswer: "",
    userNotes: "",
  });

  const uploadMutation = trpc.errorQuestion.uploadWithOCR.useMutation();

  const saveMutation = trpc.errorQuestion.create.useMutation({
    onSuccess: () => {
      toast.success("保存成功", {
        description: "错题已保存到错题本",
      });
      setLocation("/error-questions");
    },
    onError: (error: any) => {
      toast.error("保存失败", {
        description: error.message,
      });
    },
  });

  // 直接调用相机拍照(移动端)
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      // 设置 capture 属性以调用相机
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  // 从相册选择图片
  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 检查文件数量
    if (files.length > 10) {
      toast.error("文件数量过多", {
        description: "最多只能一次上传10张图片",
      });
      return;
    }

    // 检查文件大小和类型
    for (const file of files) {
      if (file.size > 16 * 1024 * 1024) {
        toast.error("文件过大", {
          description: `${file.name} 大小超过16MB`,
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("文件类型错误", {
          description: `${file.name} 不是图片文件`,
        });
        return;
      }
    }

    setImageFiles(files);
    
    // 创建预览
    const previews: string[] = [];
    let loadedCount = 0;
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews[index] = e.target?.result as string;
        loadedCount++;
        
        if (loadedCount === files.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadAndOCR = async () => {
    if (imageFiles.length === 0) {
      toast.error("请选择图片", {
        description: "请先选择要上传的错题图片",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({total: imageFiles.length, completed: 0});
    const results: string[] = [];

    try {
      // 批量处理图片
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        // 将图片转换为base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        
        // 调用上传和OCR接口
        const data = await uploadMutation.mutateAsync({
          imageBase64: base64,
          fileName: file.name,
        });
        
        results.push(data.ocrText || '');
        setUploadProgress(prev => ({...prev, completed: i + 1}));
      }
      
      setOcrResults(results);
      
      // 如果只有21张图，自动填充到表单
      if (results.length === 1 && results[0]) {
        setFormData(prev => ({
          ...prev,
          content: results[0],
        }));
      }
      
      toast.success("批量识别完成", {
        description: `已成功识别 ${results.length} 张图片`,
      });
      
      setIsUploading(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("上传失败", {
        description: error instanceof Error ? error.message : '未知错误',
      });
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    // 验证必填字段
    if (!formData.subject) {
      toast.error("请选择科目");
      return;
    }

    if (!formData.grade) {
      toast.error("请选择年级");
      return;
    }

    // 今grade推断schoolLevel
    const schoolLevel = formData.grade.startsWith("junior") ? "junior" : "senior";

    // 批量保存逻辑
    if (ocrResults.length > 1) {
      // 批量保存多个错题
      let successCount = 0;
      
      for (let i = 0; i < ocrResults.length; i++) {
        try {
          await saveMutation.mutateAsync({
            title: formData.title || `错题 ${i + 1}`,
            content: ocrResults[i] || '',
            subject: formData.subject,
            grade: formData.grade,
            difficulty: formData.difficulty || 'medium',
            userAnswer: formData.userAnswer,
            userNotes: formData.userNotes,
            schoolLevel,
            imageUrl: imagePreviews[i] || undefined,
            imageKey: imageFiles[i]?.name || undefined,
          });
          successCount++;
        } catch (error) {
          console.error(`保存第${i + 1}题失败:`, error);
        }
      }
      
      if (successCount > 0) {
        toast.success(`批量保存成功`, {
          description: `已成功保存 ${successCount}/${ocrResults.length} 道错题`,
        });
        setLocation("/error-questions");
      } else {
        toast.error("批量保存失败");
      }
    } else {
      // 单个保存
      if (!formData.title.trim()) {
        toast.error("请输入标题");
        return;
      }

      if (!formData.content.trim()) {
        toast.error("请输入题目内容");
        return;
      }

      saveMutation.mutate({
        ...formData,
        schoolLevel,
        imageUrl: imagePreviews[0] || undefined,
        imageKey: imageFiles[0]?.name || undefined,
      });
    }
  };

  const handleClearImage = (index?: number) => {
    if (index !== undefined) {
      // 删除单个图片
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
      setOcrResults(prev => prev.filter((_, i) => i !== index));
    } else {
      // 清空所有图片
      setImageFiles([]);
      setImagePreviews([]);
      setOcrResults([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="container max-w-4xl py-4 px-4 sm:py-8">
      <Card>
        <CardHeader>
          <CardTitle>上传错题</CardTitle>
          <CardDescription>拍照或选择图片，系统将自动识别题目内容</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 图片上传区域 */}
          <div className="space-y-4">
            <Label>错题图片</Label>
            
            {imagePreviews.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-6 md:p-8 text-center space-y-4">
                {/* 移动端优化:垂直布局,更大的按钮 */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-12 sm:h-10"
                    onClick={handleCameraCapture}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    拍照上传
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-12 sm:h-10"
                    onClick={handleGallerySelect}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    从相册选择
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  支持 JPG、PNG 格式，最大 16MB，最多10张
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 批量图片预览 - 移动端优化 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative border rounded-lg overflow-hidden">
                      <img
                        src={preview}
                        alt={`错题预览 ${index + 1}`}
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleClearImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {ocrResults[index] && (
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          ✓ 已识别
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  {ocrResults.length === 0 && (
                    <Button
                      type="button"
                      onClick={handleUploadAndOCR}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          批量识别中... ({uploadProgress.completed}/{uploadProgress.total})
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          开始批量识别 ({imagePreviews.length}张)
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleClearImage()}
                  >
                    清空所有
                  </Button>
                </div>
                
                {ocrResults.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                      ✓ 批量识别完成
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      已成功识别 {ocrResults.length} 张图片，请逐个保存或修正
                    </p>
                  </div>
                )}
              </div>
            )}
            
                <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
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
