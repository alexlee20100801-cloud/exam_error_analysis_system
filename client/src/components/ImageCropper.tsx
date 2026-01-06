import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crop, X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

interface CropArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImages: string[]) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export function ImageCropper({ imageUrl, onCropComplete, onSkip, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropAreas, setCropAreas] = useState<CropArea[]>([]);
  const [currentCrop, setCurrentCrop] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      drawCanvas(img, cropAreas, null, scale, rotation);
    };
    img.onerror = () => {
      toast.error('图片加载失败', {
        description: '请检查图片URL是否正确'
      });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 绘制画布
  const drawCanvas = useCallback((
    img: HTMLImageElement,
    areas: CropArea[],
    currentArea: CropArea | null,
    currentScale: number,
    currentRotation: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小
    const container = containerRef.current;
    if (!container) return;

    const maxWidth = container.clientWidth - 40;
    const maxHeight = 600;
    const scaleFactor = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

    canvas.width = img.width * scaleFactor * currentScale;
    canvas.height = img.height * scaleFactor * currentScale;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 应用旋转
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((currentRotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // 绘制图片
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    ctx.restore();

    // 绘制已有的裁剪区域
    areas.forEach((area, index) => {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        area.x * scaleFactor * currentScale,
        area.y * scaleFactor * currentScale,
        area.width * scaleFactor * currentScale,
        area.height * scaleFactor * currentScale
      );

      // 绘制序号
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(
        `${index + 1}`,
        area.x * scaleFactor * currentScale + 5,
        area.y * scaleFactor * currentScale + 20
      );
    });

    // 绘制当前正在绘制的裁剪区域
    if (currentArea) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentArea.x * scaleFactor * currentScale,
        currentArea.y * scaleFactor * currentScale,
        currentArea.width * scaleFactor * currentScale,
        currentArea.height * scaleFactor * currentScale
      );
      ctx.setLineDash([]);
    }
  }, []);

  // 重新绘制画布
  useEffect(() => {
    if (image) {
      drawCanvas(image, cropAreas, currentCrop, scale, rotation);
    }
  }, [image, cropAreas, currentCrop, scale, rotation, drawCanvas]);

  // 鼠标按下
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / canvas.width) * image.width;
    const y = ((e.clientY - rect.top) / canvas.height) * image.height;

    setIsDragging(true);
    setDragStart({ x, y });
    setCurrentCrop({
      id: Date.now().toString(),
      x,
      y,
      width: 0,
      height: 0
    });
  };

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !currentCrop || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / canvas.width) * image.width;
    const y = ((e.clientY - rect.top) / canvas.height) * image.height;

    setCurrentCrop({
      ...currentCrop,
      width: x - dragStart.x,
      height: y - dragStart.y
    });
  };

  // 鼠标抬起
  const handleMouseUp = () => {
    if (currentCrop && Math.abs(currentCrop.width) > 20 && Math.abs(currentCrop.height) > 20) {
      // 标准化裁剪区域（处理负宽高）
      const normalizedCrop: CropArea = {
        ...currentCrop,
        x: currentCrop.width < 0 ? currentCrop.x + currentCrop.width : currentCrop.x,
        y: currentCrop.height < 0 ? currentCrop.y + currentCrop.height : currentCrop.y,
        width: Math.abs(currentCrop.width),
        height: Math.abs(currentCrop.height)
      };

      setCropAreas([...cropAreas, normalizedCrop]);
      toast.success(`已添加区域 ${cropAreas.length + 1}`);
    }

    setIsDragging(false);
    setDragStart(null);
    setCurrentCrop(null);
  };

  // 删除最后一个裁剪区域
  const handleRemoveLastCrop = () => {
    if (cropAreas.length > 0) {
      setCropAreas(cropAreas.slice(0, -1));
      toast.info('已删除最后一个区域');
    }
  };

  // 清除所有裁剪区域
  const handleClearAll = () => {
    setCropAreas([]);
    toast.info('已清除所有区域');
  };

  // 完成裁剪
  const handleComplete = async () => {
    if (cropAreas.length === 0) {
      toast.error('请至少框选一个区域');
      return;
    }

    if (!image) return;

    try {
      const croppedImages: string[] = [];

      for (const area of cropAreas) {
        const canvas = document.createElement('canvas');
        canvas.width = area.width;
        canvas.height = area.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(
            image,
            area.x,
            area.y,
            area.width,
            area.height,
            0,
            0,
            area.width,
            area.height
          );

          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          croppedImages.push(croppedDataUrl);
        }
      }

      onCropComplete(croppedImages);
    } catch (error) {
      toast.error('裁剪失败', {
        description: '请重试'
      });
    }
  };

  // 缩放
  const handleZoomIn = () => setScale(Math.min(scale + 0.2, 3));
  const handleZoomOut = () => setScale(Math.max(scale - 0.2, 0.5));
  const handleRotate = () => setRotation((rotation + 90) % 360);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Crop className="h-5 w-5" />
                框选识别区域
              </h3>
              <p className="text-sm text-muted-foreground">
                在图片上拖动鼠标框选需要识别的题目区域，可框选多个区域
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={containerRef}
            className="border rounded-lg overflow-auto bg-muted/30 flex items-center justify-center"
            style={{ maxHeight: '600px' }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              已框选 <span className="font-semibold text-foreground">{cropAreas.length}</span> 个区域
            </div>
            <div className="flex gap-2">
              {cropAreas.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLastCrop}
                  >
                    撤销上一个
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                  >
                    清除全部
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              取消
            </Button>
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              跳过框选，识别全图
            </Button>
            <Button
              onClick={handleComplete}
              disabled={cropAreas.length === 0}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              完成框选 ({cropAreas.length})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
