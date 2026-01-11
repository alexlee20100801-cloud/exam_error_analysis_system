import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Upload, X, Loader2, RotateCcw, ZoomIn, ZoomOut, Check } from "lucide-react";

interface MobileQuickUploadProps {
  onUploadComplete?: (data: { imageUrl: string; ocrText: string }) => void;
  onCancel?: () => void;
}

export function MobileQuickUpload({ onUploadComplete, onCancel }: MobileQuickUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  // 直接调用相机拍照
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.click();
    }
  };

  // 从相册选择
  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.setAttribute('accept', 'image/*');
      fileInputRef.current.click();
    }
  };

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.error("文件过大", { description: "请选择小于16MB的图片" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("文件类型错误", { description: "请选择图片文件" });
      return;
    }

    setImageFile(file);
    setRotation(0);
    setZoom(1);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // 旋转图片
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 缩放图片
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  // 处理并上传图片
  const handleUpload = async () => {
    if (!imageFile || !imagePreview) {
      toast.error("请先选择图片");
      return;
    }

    setIsUploading(true);
    setIsProcessing(true);

    try {
      // 如果有旋转或缩放，先处理图片
      let finalBase64 = imagePreview;
      
      if (rotation !== 0 || zoom !== 1) {
        finalBase64 = await processImage(imagePreview, rotation, zoom);
      }

      toast.success("图片已准备好", { description: "请在上传页面完成保存" });
      
      if (onUploadComplete) {
        onUploadComplete({
          imageUrl: finalBase64,
          ocrText: "",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("处理失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // 处理图片（旋转、缩放）
  const processImage = (base64: string, rotation: number, zoom: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        // 计算旋转后的尺寸
        const radians = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        const newWidth = img.width * cos + img.height * sin;
        const newHeight = img.width * sin + img.height * cos;

        canvas.width = newWidth * zoom;
        canvas.height = newHeight * zoom;

        // 移动到中心并旋转
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radians);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = base64;
    });
  };

  // 清除图片
  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setRotation(0);
    setZoom(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
        <h2 className="font-medium">快速上传错题</h2>
        <div className="w-10" />
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 overflow-auto p-4">
        {!imagePreview ? (
          // 选择图片界面
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <div className="text-center space-y-2">
              <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">拍照或选择错题图片</h3>
              <p className="text-sm text-muted-foreground">
                支持JPG、PNG格式，最大16MB
              </p>
            </div>

            <div className="flex flex-col w-full max-w-xs gap-3">
              <Button
                size="lg"
                className="h-14 text-lg"
                onClick={handleCameraCapture}
              >
                <Camera className="mr-3 h-6 w-6" />
                拍照上传
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-lg"
                onClick={handleGallerySelect}
              >
                <Upload className="mr-3 h-6 w-6" />
                从相册选择
              </Button>
            </div>

            {/* 快捷提示 */}
            <Card className="w-full max-w-xs">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">拍照小技巧</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 保持光线充足，避免阴影</li>
                  <li>• 尽量垂直拍摄，避免倾斜</li>
                  <li>• 确保题目完整清晰可见</li>
                  <li>• 可以拍摄后裁剪调整</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : (
          // 图片预览和编辑界面
          <div className="h-full flex flex-col">
            {/* 图片预览 */}
            <div className="flex-1 relative bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={imagePreview}
                alt="预览"
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                }}
              />
              
              {/* 处理中遮罩 */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>正在处理中...</p>
                  </div>
                </div>
              )}
            </div>

            {/* 编辑工具栏 */}
            <div className="flex items-center justify-center gap-4 py-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRotate}
                disabled={isUploading}
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={isUploading || zoom <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={isUploading || zoom >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleClear}
                disabled={isUploading}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {imagePreview && (
        <div className="p-4 border-t bg-background/95 backdrop-blur">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={handleClear}
              disabled={isUploading}
            >
              重新选择
            </Button>
            <Button
              className="flex-1 h-12"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  确认上传
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 隐藏的canvas用于图片处理 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
