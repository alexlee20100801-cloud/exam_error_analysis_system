/**
 * 图表标注工具组件
 * 支持在图表图片上添加箭头、文字、标记等标注
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Type,
  Square,
  Circle,
  Pencil,
  Eraser,
  Save,
  Undo,
  Redo,
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AnnotationTemplateSelector } from "./AnnotationTemplateSelector";
import { AIAnnotationAssistant } from "./AIAnnotationAssistant";

type AnnotationType = "arrow" | "text" | "rect" | "circle" | "pen" | "eraser";

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  type: AnnotationType;
  points: Point[];
  text?: string;
  color: string;
  lineWidth: number;
}

interface ChartAnnotationToolProps {
  imageUrl: string;
  initialAnnotations?: Annotation[];
  onSave?: (annotations: Annotation[]) => void;
  readOnly?: boolean;
}

export function ChartAnnotationTool({
  imageUrl,
  initialAnnotations = [],
  onSave,
  readOnly = false,
}: ChartAnnotationToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [currentTool, setCurrentTool] = useState<AnnotationType>("arrow");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(3);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<Point>({ x: 0, y: 0 });
  const [history, setHistory] = useState<Annotation[][]>([initialAnnotations]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // 加载图片
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      imageRef.current = img;
      redrawCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 重绘画布
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageRef.current) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制图片
    ctx.drawImage(imageRef.current, 0, 0);

    // 绘制所有标注
    annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation);
    });

    // 绘制当前正在绘制的标注
    if (currentAnnotation) {
      drawAnnotation(ctx, currentAnnotation);
    }
  };

  // 绘制单个标注
  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = annotation.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const { type, points, text } = annotation;

    if (points.length === 0) return;

    switch (type) {
      case "arrow":
        if (points.length >= 2) {
          const start = points[0];
          const end = points[points.length - 1];
          drawArrow(ctx, start, end);
        }
        break;

      case "text":
        if (text && points.length > 0) {
          ctx.font = `${annotation.lineWidth * 6}px sans-serif`;
          ctx.fillText(text, points[0].x, points[0].y);
        }
        break;

      case "rect":
        if (points.length >= 2) {
          const start = points[0];
          const end = points[points.length - 1];
          ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        }
        break;

      case "circle":
        if (points.length >= 2) {
          const start = points[0];
          const end = points[points.length - 1];
          const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          );
          ctx.beginPath();
          ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case "pen":
        if (points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
        }
        break;
    }
  };

  // 绘制箭头
  const drawArrow = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const headLength = 15;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // 绘制线条
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // 绘制箭头
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // 获取鼠标/触摸在画布上的位置
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      // 触摸事件
      if (e.touches.length === 0) {
        // 使用changedTouches（用于touchend事件）
        clientX = e.changedTouches[0]?.clientX || 0;
        clientY = e.changedTouches[0]?.clientY || 0;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      // 鼠标事件
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // 开始绘制（鼠标）
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const pos = getMousePos(e);

    if (currentTool === "text") {
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }

    if (currentTool === "eraser") {
      // 查找并删除点击位置附近的标注
      const clickedAnnotation = annotations.find((ann) =>
        ann.points.some(
          (p) => Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2)) < 20
        )
      );
      if (clickedAnnotation) {
        const newAnnotations = annotations.filter((ann) => ann.id !== clickedAnnotation.id);
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        toast.success("标注已删除");
      }
      return;
    }

    setIsDrawing(true);
    setCurrentAnnotation({
      id: Date.now().toString(),
      type: currentTool,
      points: [pos],
      color,
      lineWidth,
    });
  };

  // 开始绘制（触摸）
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();

    const pos = getMousePos(e);

    if (currentTool === "text") {
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }

    if (currentTool === "eraser") {
      const clickedAnnotation = annotations.find((ann) =>
        ann.points.some(
          (p) => Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2)) < 20
        )
      );
      if (clickedAnnotation) {
        const newAnnotations = annotations.filter((ann) => ann.id !== clickedAnnotation.id);
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        toast.success("标注已删除");
      }
      return;
    }

    setIsDrawing(true);
    setCurrentAnnotation({
      id: Date.now().toString(),
      type: currentTool,
      points: [pos],
      color,
      lineWidth,
    });
  };

  // 结束绘制（触摸）
  const handleTouchEnd = () => {
    if (!isDrawing || !currentAnnotation || readOnly) return;

    const newAnnotations = [...annotations, currentAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  // 绘制中（鼠标）
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation || readOnly) return;

    const pos = getMousePos(e);

    if (currentTool === "pen") {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...currentAnnotation.points, pos],
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [currentAnnotation.points[0], pos],
      });
    }
  };

  // 绘制中（触摸）
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation || readOnly) return;
    e.preventDefault();

    const pos = getMousePos(e);

    if (currentTool === "pen") {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...currentAnnotation.points, pos],
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [currentAnnotation.points[0], pos],
      });
    }

    redrawCanvas();
    if (currentAnnotation) {
      drawAnnotation(
        canvasRef.current?.getContext("2d")!,
        { ...currentAnnotation, points: currentTool === "pen" ? [...currentAnnotation.points, pos] : [currentAnnotation.points[0], pos] }
      );
    }
  };

  // 结束绘制（鼠标）
  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation || readOnly) return;

    const newAnnotations = [...annotations, currentAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setCurrentAnnotation(null);
    setIsDrawing(false);
  };

  // 添加文字标注
  const handleAddText = () => {
    if (!textInput.trim()) {
      toast.error("请输入文字内容");
      return;
    }

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: "text",
      points: [textPosition],
      text: textInput,
      color,
      lineWidth,
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setTextInput("");
    setShowTextInput(false);
    toast.success("文字标注已添加");
  };

  // 添加到历史记录
  const addToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  };

  // 重做
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  // 清空所有标注
  const handleClear = () => {
    const newAnnotations: Annotation[] = [];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    toast.success("已清空所有标注");
  };

  // 保存标注
  const handleSave = () => {
    if (onSave) {
      onSave(annotations);
      toast.success("标注已保存");
    }
  };

  // 下载标注后的图片
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `annotated-chart-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("图片已下载");
    });
  };

  // 重绘画布
  useEffect(() => {
    redrawCanvas();
  }, [annotations, currentAnnotation]);

  const tools = [
    { type: "arrow" as AnnotationType, icon: ArrowRight, label: "箭头" },
    { type: "text" as AnnotationType, icon: Type, label: "文字" },
    { type: "rect" as AnnotationType, icon: Square, label: "矩形" },
    { type: "circle" as AnnotationType, icon: Circle, label: "圆形" },
    { type: "pen" as AnnotationType, icon: Pencil, label: "画笔" },
    { type: "eraser" as AnnotationType, icon: Eraser, label: "橡皮擦" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>图表标注工具</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && (
          <>
            {/* 模板和AI辅助 */}
            <div className="flex flex-wrap gap-2 mb-4">
              <AnnotationTemplateSelector
                onApplyTemplate={(templateAnnotations) => {
                  // 转换模板标注格式为组件标注格式
                  const converted = templateAnnotations.map((ann: any) => ({
                    id: Date.now().toString() + Math.random(),
                    type: ann.type === "highlight" ? "rect" : ann.type,
                    points: [
                      { x: ann.x, y: ann.y },
                      { x: ann.endX || ann.x + (ann.width || 0), y: ann.endY || ann.y + (ann.height || 0) },
                    ],
                    text: ann.text,
                    color: ann.color,
                    lineWidth: 2,
                  }));
                  const newAnnotations = [...annotations, ...converted];
                  setAnnotations(newAnnotations);
                  addToHistory(newAnnotations);
                  toast.success("已应用模板");
                }}
              />
              <AIAnnotationAssistant
                imageUrl={imageUrl}
                onAcceptAnnotations={(aiAnnotations) => {
                  const converted = aiAnnotations.map((ann: any) => ({
                    id: Date.now().toString() + Math.random(),
                    type: ann.type === "highlight" ? "rect" : ann.type,
                    points: [
                      { x: ann.x, y: ann.y },
                      { x: ann.endX || ann.x + (ann.width || 0), y: ann.endY || ann.y + (ann.height || 0) },
                    ],
                    text: ann.text,
                    color: ann.color,
                    lineWidth: 2,
                  }));
                  const newAnnotations = [...annotations, ...converted];
                  setAnnotations(newAnnotations);
                  addToHistory(newAnnotations);
                  toast.success("已应用AI标注");
                }}
              />
            </div>

            <Separator />

            {/* 工具栏 */}
            <div className="flex flex-wrap gap-2 md:gap-2 sm:gap-1">
              {tools.map((tool: any) => {
                const Icon = tool.icon;
                return (
                  <Button
                    key={tool.type}
                    variant={currentTool === tool.type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool(tool.type)}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {tool.label}
                  </Button>
                );
              })}
            </div>

            <Separator />

            {/* 颜色和线宽设置 */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="color">颜色</Label>
                <input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-8 rounded border cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="lineWidth">粗细</Label>
                <Input
                  id="lineWidth"
                  type="range"
                  min="1"
                  max="10"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{lineWidth}px</span>
              </div>
            </div>

            <Separator />

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-2 md:gap-2 sm:gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex === 0}
              >
                <Undo className="h-4 w-4 mr-1" />
                撤销
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
              >
                <Redo className="h-4 w-4 mr-1" />
                重做
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-1" />
                清空
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                下载
              </Button>
              {onSave && (
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </Button>
              )}
            </div>

            <Separator />
          </>
        )}

        {/* 画布 */}
        <div className="relative border rounded-lg overflow-hidden bg-gray-50">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="max-w-full h-auto cursor-crosshair touch-none"
            style={{ display: "block" }}
          />

          {/* 文字输入框 */}
          {showTextInput && (
            <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg space-y-2">
              <Label htmlFor="textInput">输入文字</Label>
              <Input
                id="textInput"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="输入标注文字..."
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddText}>
                  确定
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowTextInput(false);
                    setTextInput("");
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>

        {readOnly && annotations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">暂无标注</p>
        )}
      </CardContent>
    </Card>
  );
}
