import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Trash2, Check, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'text' | 'formula' | 'chart' | 'table' | 'image' | 'mixed';
}

interface ImageRegionSelectorProps {
  imageUrl: string;
  regions: Region[];
  onRegionsChange: (regions: Region[]) => void;
  onRegionTypeChange?: (regionId: string, type: Region['type']) => void;
}

/**
 * 图像区域框选编辑器
 * 支持鼠标拖拽框选、多区域管理、区域类型设置
 */
export function ImageRegionSelector({
  imageUrl,
  regions,
  onRegionsChange,
  onRegionTypeChange,
}: ImageRegionSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 加载图像
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      // 自动调整画布大小
      if (containerRef.current && canvasRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const scaleToFit = containerWidth / img.width;
        setScale(Math.min(scaleToFit, 1));
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 绘制画布
  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制图像
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // 绘制已有区域
    regions.forEach((region) => {
      drawRegion(ctx, region, region.id === selectedRegionId);
    });

    // 绘制当前正在绘制的区域
    if (currentRegion) {
      drawRegion(ctx, currentRegion, true);
    }
  }, [image, regions, currentRegion, selectedRegionId, scale]);

  // 绘制区域
  const drawRegion = (ctx: CanvasRenderingContext2D, region: Region, isSelected: boolean) => {
    const x = region.x * scale;
    const y = region.y * scale;
    const width = region.width * scale;
    const height = region.height * scale;

    // 绘制矩形框
    ctx.strokeStyle = isSelected ? '#3b82f6' : getRegionColor(region.type);
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(x, y, width, height);

    // 绘制半透明填充
    ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)';
    ctx.fillRect(x, y, width, height);

    // 绘制类型标签
    ctx.fillStyle = getRegionColor(region.type);
    ctx.fillRect(x, y - 20, 80, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(getRegionTypeLabel(region.type), x + 5, y - 6);
  };

  // 获取区域类型颜色
  const getRegionColor = (type: Region['type']): string => {
    const colors = {
      text: '#10b981',
      formula: '#f59e0b',
      chart: '#3b82f6',
      table: '#8b5cf6',
      image: '#ec4899',
      mixed: '#6b7280',
    };
    return colors[type];
  };

  // 获取区域类型标签
  const getRegionTypeLabel = (type: Region['type']): string => {
    const labels = {
      text: '文字',
      formula: '公式',
      chart: '图表',
      table: '表格',
      image: '图画',
      mixed: '混合',
    };
    return labels[type];
  };

  // 鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // 检查是否点击了已有区域
    const clickedRegion = regions.find((region) => {
      return (
        x >= region.x &&
        x <= region.x + region.width &&
        y >= region.y &&
        y <= region.y + region.height
      );
    });

    if (clickedRegion) {
      setSelectedRegionId(clickedRegion.id);
    } else {
      // 开始绘制新区域
      setIsDrawing(true);
      setStartPoint({ x, y });
      setSelectedRegionId(null);
    }
  };

  // 鼠标移动事件
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const width = Math.abs(x - startPoint.x);
    const height = Math.abs(y - startPoint.y);
    const regionX = Math.min(x, startPoint.x);
    const regionY = Math.min(y, startPoint.y);

    setCurrentRegion({
      id: 'temp',
      x: regionX,
      y: regionY,
      width,
      height,
      type: 'text',
    });
  };

  // 鼠标松开事件
  const handleMouseUp = () => {
    if (isDrawing && currentRegion && currentRegion.width > 10 && currentRegion.height > 10) {
      const newRegion: Region = {
        ...currentRegion,
        id: `region-${Date.now()}`,
      };
      onRegionsChange([...regions, newRegion]);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRegion(null);
  };

  // 删除选中的区域
  const handleDeleteRegion = () => {
    if (selectedRegionId) {
      onRegionsChange(regions.filter((r) => r.id !== selectedRegionId));
      setSelectedRegionId(null);
    }
  };

  // 更改区域类型
  const handleChangeRegionType = (type: Region['type']) => {
    if (selectedRegionId) {
      const updatedRegions = regions.map((r: any) =>
        r.id === selectedRegionId ? { ...r, type } : r
      );
      onRegionsChange(updatedRegions);
      if (onRegionTypeChange) {
        onRegionTypeChange(selectedRegionId, type);
      }
    }
  };

  // 缩放控制
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, 0.3));
  };

  const selectedRegion = regions.find((r) => r.id === selectedRegionId);

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">缩放:</span>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {selectedRegion && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">区域类型:</span>
              <div className="flex gap-1">
                {(['text', 'formula', 'chart', 'table', 'image', 'mixed'] as const).map((type: any) => (
                  <Button
                    key={type}
                    variant={selectedRegion.type === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleChangeRegionType(type)}
                  >
                    {getRegionTypeLabel(type)}
                  </Button>
                ))}
              </div>
              <Button variant="destructive" size="sm" onClick={handleDeleteRegion}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 画布容器 */}
      <Card className="p-4">
        <div
          ref={containerRef}
          className="relative overflow-auto border rounded-lg bg-gray-50"
          style={{ maxHeight: '600px' }}
        >
          <canvas
            ref={canvasRef}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </Card>

      {/* 区域列表 */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">已框选区域 ({regions.length})</h3>
        <div className="space-y-2">
          {regions.map((region: any) => (
            <div
              key={region.id}
              className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                region.id === selectedRegionId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedRegionId(region.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: getRegionColor(region.type) }}
                />
                <span className="text-sm font-medium">{getRegionTypeLabel(region.type)}</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(region.width)} × {Math.round(region.height)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegionsChange(regions.filter((r) => r.id !== region.id));
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {regions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              在图像上拖拽鼠标来框选区域
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
