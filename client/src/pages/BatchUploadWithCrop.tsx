import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Upload, Loader2, X, Crop, Check, Grid3x3, Scissors } from "lucide-react";
import { ImageCropper } from "@/components/ImageCropper";
import { Badge } from "@/components/ui/badge";

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  cropped?: string; // 裁剪后的base64
  ocrText?: string;
}

const CROP_PRESETS = [
  { label: "A4纸比例 (√2:1)", value: "a4", ratio: 1.414 },
  { label: "16:9 宽屏", value: "16:9", ratio: 16 / 9 },
  { label: "4:3 标准", value: "4:3", ratio: 4 / 3 },
  { label: "1:1 正方形", value: "1:1", ratio: 1 },
  { label: "3:4 竖屏", value: "3:4", ratio: 3 / 4 },
  { label: "自由裁剪", value: "free", ratio: 0 },
];

export default function BatchUploadWithCrop() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentCropImageId, setCurrentCropImageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, completed: 0 });

  const uploadMutation = trpc.errorQuestions.uploadWithOCR.useMutation();
  const batchCreateMutation = trpc.batchUpload.createSession.useMutation();

  // 直接调用相机拍照(移动端)
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  // 从相册选择图片
  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 检查文件数量
    if (images.length + files.length > 20) {
      toast.error("文件数量过多", {
        description: "最多只能一次上传20张图片",
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

    // 创建预览
    const newImages: ImageItem[] = [];
    let loadedCount = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: e.target?.result as string,
        });
        loadedCount++;

        if (loadedCount === files.length) {
          setImages((prev) => [...prev, ...newImages]);
          toast.success(`已添加 ${files.length} 张图片`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 移除图片
  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    toast.info("已移除图片");
  };

  // 打开裁剪对话框
  const handleOpenCrop = (id: string) => {
    setCurrentCropImageId(id);
  };

  // 裁剪完成
  const handleCropComplete = (croppedImages: string[]) => {
    if (!currentCropImageId || croppedImages.length === 0) return;

    // 更新图片的裁剪结果
    setImages((prev) =>
      prev.map((img) =>
        img.id === currentCropImageId
          ? { ...img, cropped: croppedImages[0] }
          : img
      )
    );

    setCurrentCropImageId(null);
    toast.success("裁剪完成");
  };

  // 跳过裁剪
  const handleSkipCrop = () => {
    setCurrentCropImageId(null);
  };

  // 批量上传和OCR
  const handleBatchUploadAndOCR = async () => {
    if (images.length === 0) {
      toast.error("请选择图片", {
        description: "请先选择要上传的错题图片",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({ total: images.length, completed: 0 });

    try {
      const results: ImageItem[] = [];

      // 批量处理图片
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // 使用裁剪后的图片或原图
        const imageData = image.cropped || image.preview;

        // 调用上传和OCR接口
        const data = await uploadMutation.mutateAsync({
          imageBase64: imageData,
          fileName: image.file.name,
        });

        results.push({
          ...image,
          ocrText: data.ocrText || "",
        });

        setUploadProgress((prev) => ({ ...prev, completed: i + 1 }));
      }

      setImages(results);

      toast.success("批量识别完成", {
        description: `已成功识别 ${results.length} 张图片`,
      });

      // 创建批量编辑会话
      const sessionData = await batchCreateMutation.mutateAsync({
        items: results.map((img, index) => ({
          imageUrl: img.cropped || img.preview,
          ocrText: img.ocrText || "",
          orderIndex: index,
        })),
      });

      // 跳转到批量编辑页面
      setLocation(`/batch-edit/${sessionData.id}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("上传失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 批量应用裁剪预设
  const handleBatchCrop = (preset: typeof CROP_PRESETS[0]) => {
    toast.info(`批量裁剪功能`, {
      description: `将对所有图片应用 ${preset.label} 裁剪比例`,
    });
    // TODO: 实现批量裁剪逻辑
  };

  const currentCropImage = images.find((img) => img.id === currentCropImageId);

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">批量上传错题（含裁剪）</h1>
        <p className="text-muted-foreground">
          支持批量上传多张错题图片，可对每张图片进行裁剪调整
        </p>
      </div>

      {/* 上传区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择图片</CardTitle>
          <CardDescription>
            支持拍照或从相册选择，最多20张图片，每张不超过16MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCameraCapture} variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              拍照
            </Button>
            <Button onClick={handleGallerySelect} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              从相册选择
            </Button>
          </div>

          {images.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                已选择 {images.length} 张图片
                {images.filter((img) => img.cropped).length > 0 && (
                  <span className="ml-2">
                    · {images.filter((img) => img.cropped).length} 张已裁剪
                  </span>
                )}
              </div>
              <Button
                onClick={handleBatchUploadAndOCR}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    识别中 ({uploadProgress.completed}/{uploadProgress.total})
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    开始识别并编辑
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 批量裁剪预设 */}
      {images.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5" />
              批量裁剪预设
            </CardTitle>
            <CardDescription>
              选择一个预设比例，快速裁剪所有图片
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CROP_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchCrop(preset)}
                >
                  <Scissors className="mr-2 h-3 w-3" />
                  {preset.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 图片预览网格 */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>图片预览</CardTitle>
            <CardDescription>
              点击裁剪按钮可对单张图片进行裁剪调整
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="relative group border rounded-lg overflow-hidden bg-muted"
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={image.cropped || image.preview}
                      alt={`预览 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {image.cropped && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 left-2"
                      >
                        已裁剪
                      </Badge>
                    )}
                    {image.ocrText && (
                      <Badge
                        variant="default"
                        className="absolute top-2 right-2"
                      >
                        已识别
                      </Badge>
                    )}
                  </div>

                  {/* 悬浮操作按钮 */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenCrop(image.id)}
                    >
                      <Crop className="mr-1 h-3 w-3" />
                      裁剪
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveImage(image.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* 序号 */}
                  <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 裁剪对话框 */}
      {currentCropImage && (
        <Dialog
          open={!!currentCropImageId}
          onOpenChange={(open) => !open && setCurrentCropImageId(null)}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>裁剪图片</DialogTitle>
              <DialogDescription>
                拖动鼠标框选需要的区域，支持多区域裁剪
              </DialogDescription>
            </DialogHeader>
            <ImageCropper
              imageUrl={currentCropImage.preview}
              onCropComplete={handleCropComplete}
              onSkip={handleSkipCrop}
              onCancel={() => setCurrentCropImageId(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 空状态 */}
      {images.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Upload className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">还没有选择图片</p>
            <p className="text-sm text-muted-foreground mb-6">
              点击上方按钮开始上传错题图片
            </p>
            <div className="flex gap-3">
              <Button onClick={handleCameraCapture} variant="outline">
                <Camera className="mr-2 h-4 w-4" />
                拍照
              </Button>
              <Button onClick={handleGallerySelect}>
                <Upload className="mr-2 h-4 w-4" />
                从相册选择
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
