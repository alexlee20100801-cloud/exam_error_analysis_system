import { useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Camera, Upload, Loader2, X, Crop, Check, Grid3x3, Scissors, Zap, Settings } from 'lucide-react';
import { ImageCropper } from '@/components/ImageCropper';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

// 裁剪预设
const CROP_PRESETS = [
  { label: "A4纸比例 (√2:1)", value: "a4", ratio: 1.414 },
  { label: "16:9 宽屏", value: "16:9", ratio: 16 / 9 },
  { label: "4:3 标准", value: "4:3", ratio: 4 / 3 },
  { label: "1:1 正方形", value: "1:1", ratio: 1 },
  { label: "3:4 竖屏", value: "3:4", ratio: 3 / 4 },
  { label: "自由裁剪", value: "free", ratio: 0 },
];

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  cropped?: string;
  ocrText?: string;
}

interface FileItem {
  id: string;
  file: File;
  status: 'pending' | 'cropping' | 'parsing' | 'parsed' | 'error';
  preview?: string;
  croppedImages?: string[];
  parsedContent?: any;
  fileUrl?: string;
  error?: string;
}

export default function UnifiedUpload() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'quick' | 'detailed'>('quick');

  // 快速模式状态
  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentCropImageId, setCurrentCropImageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, completed: 0 });

  // 详细模式状态
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [currentCroppingFile, setCurrentCroppingFile] = useState<FileItem | null>(null);

  // tRPC mutations
  const uploadMutation = trpc.errorQuestion.uploadWithOCR.useMutation();
  const batchCreateMutation = trpc.batchUpload.createSession.useMutation();

  // ==================== 快速模式函数 ====================

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (uploadMode === 'quick') {
      handleQuickModeFileSelect(files);
    } else {
      handleDetailedModeFileSelect(files);
    }
  };

  const handleQuickModeFileSelect = (files: File[]) => {
    if (images.length + files.length > 20) {
      toast.error("文件数量过多", {
        description: "最多只能一次上传20张图片",
      });
      return;
    }

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

  const handleDetailedModeFileSelect = (files: File[]) => {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const newFileItems: FileItem[] = [];

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        toast.error(`文件 ${file.name} 类型不支持`);
        continue;
      }

      const maxSize = file.type.startsWith('image/') ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`文件 ${file.name} 过大`);
        continue;
      }

      const fileItem: FileItem = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending'
      };

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileItems(prev => prev.map(item =>
            item.id === fileItem.id ? { ...item, preview: e.target?.result as string } : item
          ));
        };
        reader.readAsDataURL(file);
      }

      newFileItems.push(fileItem);
    }

    setFileItems(prev => [...prev, ...newFileItems]);
    toast.success(`已添加 ${newFileItems.length} 个文件`);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    toast.info("已移除图片");
  };

  const handleRemoveFile = (fileId: string) => {
    setFileItems(prev => prev.filter(item => item.id !== fileId));
  };

  const handleOpenCrop = (id: string) => {
    setCurrentCropImageId(id);
  };

  const handleCropComplete = (croppedImages: string[]) => {
    if (!currentCropImageId || croppedImages.length === 0) return;

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

  const handleSkipCrop = () => {
    setCurrentCropImageId(null);
  };

  const handleBatchUploadAndOCR = async () => {
    if (images.length === 0) {
      toast.error("请选择图片");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ total: images.length, completed: 0 });

    try {
      const results: ImageItem[] = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageData = image.cropped || image.preview;

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

      const sessionData = await batchCreateMutation.mutateAsync({
        items: results.map((img, index) => ({
          imageUrl: img.cropped || img.preview,
          ocrText: img.ocrText || "",
          orderIndex: index,
        })),
      });

      setLocation(`/batch-edit/${sessionData.sessionId}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartCropping = (fileItem: FileItem) => {
    setCurrentCroppingFile(fileItem);
    setFileItems(prev => prev.map(item =>
      item.id === fileItem.id ? { ...item, status: 'cropping' } : item
    ));
  };

  const handleCropCompleteDetailed = async (croppedImages: string[]) => {
    if (!currentCroppingFile) return;

    setFileItems(prev => prev.map(item =>
      item.id === currentCroppingFile.id
        ? { ...item, croppedImages, status: 'parsing' }
        : item
    ));

    setCurrentCroppingFile(null);
  };

  const handleCancelCropping = () => {
    if (currentCroppingFile) {
      setFileItems(prev => prev.map(item =>
        item.id === currentCroppingFile.id ? { ...item, status: 'pending' } : item
      ));
    }
    setCurrentCroppingFile(null);
  };

  const currentCropImage = images.find((img) => img.id === currentCropImageId);
  const currentCropFileImage = currentCroppingFile?.preview;

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">上传错题</h1>
        <p className="text-muted-foreground">
          支持多种上传方式：拍照、图片、PDF、Word文档等
        </p>
      </div>

      {/* 模式选择 */}
      <Tabs value={uploadMode} onValueChange={(value: any) => setUploadMode(value)} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            快速批量上传
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            详细编辑模式
          </TabsTrigger>
        </TabsList>

        {/* 快速模式 */}
        <TabsContent value="quick" className="space-y-6">
          <Card>
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
            <Card>
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
                      onClick={() => {
                        toast.info(`批量裁剪功能`, {
                          description: `将对所有图片应用 ${preset.label} 裁剪比例`,
                        });
                      }}
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
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenCrop(image.id)}
                        >
                          <Crop className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveImage(image.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 详细模式 */}
        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>选择文件</CardTitle>
              <CardDescription>
                支持图片（JPG/PNG）、PDF或Word文档
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleGallerySelect} variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  选择文件
                </Button>
              </div>

              {fileItems.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  {fileItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-muted rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 裁剪对话框 - 快速模式 */}
      <Dialog open={!!currentCropImageId} onOpenChange={(open) => {
        if (!open) setCurrentCropImageId(null);
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>裁剪图片</DialogTitle>
            <DialogDescription>
              调整裁剪框以选择题目区域
            </DialogDescription>
          </DialogHeader>
          {currentCropImage && (
            <ImageCropper
              imageUrl={currentCropImage.preview}
              onCropComplete={handleCropComplete}
              onSkip={handleSkipCrop}
              aspectRatio={0}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 裁剪对话框 - 详细模式 */}
      <Dialog open={!!currentCroppingFile} onOpenChange={(open) => {
        if (!open) handleCancelCropping();
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>裁剪图片</DialogTitle>
            <DialogDescription>
              调整裁剪框以选择题目区域
            </DialogDescription>
          </DialogHeader>
          {currentCropFileImage && (
            <ImageCropper
              imageUrl={currentCropFileImage}
              onCropComplete={handleCropCompleteDetailed}
              onSkip={() => handleCancelCropping()}
              aspectRatio={0}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
