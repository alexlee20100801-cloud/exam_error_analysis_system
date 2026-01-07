import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Wand2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface BatchImageUploadProps {
  onUploadComplete?: (results: any[]) => void;
  maxFiles?: number;
}

export function BatchImageUpload({ onUploadComplete, maxFiles = 20 }: BatchImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [autoOCR, setAutoOCR] = useState(true);
  const [autoRemoveHandwriting, setAutoRemoveHandwriting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > maxFiles) {
      toast({
        title: "文件数量超限",
        description: `最多只能上传 ${maxFiles} 个文件`,
        variant: "destructive",
      });
      return;
    }

    const newImages: UploadedImage[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }));

    setImages(prev => [...prev, ...newImages]);
  }, [images.length, maxFiles, toast]);

  // 移除图片
  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  // 批量上传
  const handleBatchUpload = async () => {
    if (images.length === 0) {
      toast({
        title: "请选择图片",
        description: "请先选择要上传的图片",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // 模拟上传过程（实际应该调用API）
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // 更新状态为上传中
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'uploading', progress: 0 } : img
        ));

        // 模拟上传进度
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setImages(prev => prev.map(img => 
            img.id === image.id ? { ...img, progress } : img
          ));
        }

        // 标记为成功
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'success', progress: 100 } : img
        ));
      }

      toast({
        title: "上传成功",
        description: `成功上传 ${images.length} 张图片`,
      });

      if (onUploadComplete) {
        onUploadComplete(images);
      }
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 清空所有
  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const pendingCount = images.filter(img => img.status === 'pending').length;
  const successCount = images.filter(img => img.status === 'success').length;
  const errorCount = images.filter(img => img.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          批量图片上传
        </CardTitle>
        <CardDescription>
          支持批量拍照录入，自动OCR识别和手写笔迹清除
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 选项 */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="autoOCR" 
              checked={autoOCR}
              onCheckedChange={(checked) => setAutoOCR(checked as boolean)}
            />
            <Label htmlFor="autoOCR" className="flex items-center gap-1 cursor-pointer">
              <FileText className="h-4 w-4" />
              自动OCR识别
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="autoRemoveHandwriting" 
              checked={autoRemoveHandwriting}
              onCheckedChange={(checked) => setAutoRemoveHandwriting(checked as boolean)}
            />
            <Label htmlFor="autoRemoveHandwriting" className="flex items-center gap-1 cursor-pointer">
              <Wand2 className="h-4 w-4" />
              自动清除笔迹
            </Label>
          </div>
        </div>

        {/* 文件选择 */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
          <input
            type="file"
            id="batch-file-input"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <label htmlFor="batch-file-input" className="cursor-pointer">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">点击选择图片或拖拽到此处</p>
            <p className="text-sm text-muted-foreground">
              支持 JPG、PNG、HEIC 等格式，最多 {maxFiles} 张
            </p>
          </label>
        </div>

        {/* 统计信息 */}
        {images.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex gap-4 text-sm">
              <div>
                总计: <span className="font-medium">{images.length}</span>
              </div>
              {pendingCount > 0 && (
                <div className="text-muted-foreground">
                  待上传: <span className="font-medium">{pendingCount}</span>
                </div>
              )}
              {successCount > 0 && (
                <div className="text-green-600">
                  成功: <span className="font-medium">{successCount}</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="text-red-600">
                  失败: <span className="font-medium">{errorCount}</span>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAll}
              disabled={isUploading}
            >
              清空全部
            </Button>
          </div>
        )}

        {/* 图片预览列表 */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                  <img 
                    src={image.preview} 
                    alt={image.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* 状态覆盖层 */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  {image.status === 'pending' && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => removeImage(image.id)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {image.status === 'success' && (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  )}
                  {image.status === 'error' && (
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  )}
                </div>

                {/* 上传进度 */}
                {image.status === 'uploading' && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/70">
                    <Progress value={image.progress} className="h-1" />
                  </div>
                )}

                {/* 文件名 */}
                <p className="text-xs truncate mt-1 text-center text-muted-foreground">
                  {image.file.name}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        {images.length > 0 && (
          <div className="flex gap-2">
            <Button 
              onClick={handleBatchUpload} 
              disabled={isUploading || images.length === 0}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  开始上传 ({images.length})
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
