import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Circle, 
  Square, 
  ArrowRight, 
  Type, 
  Highlighter, 
  Eraser, 
  Save, 
  Undo,
  Redo,
  Download,
  ZoomIn,
  ZoomOut,
  Move
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Annotation {
  id?: number;
  type: 'marker' | 'arrow' | 'text' | 'highlight' | 'rectangle' | 'circle';
  data: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    text?: string;
    color?: string;
    fontSize?: number;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
  };
  color: string;
}

interface ImageAnnotatorProps {
  imageUrl: string;
  itemType: 'error_question' | 'practice_pool' | 'question_bank' | 'real_exam';
  itemId: number;
  onSave?: () => void;
}

const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];

export function ImageAnnotator({ imageUrl, itemType, itemId, onSave }: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'marker' | 'arrow' | 'text' | 'highlight' | 'rectangle' | 'circle' | 'eraser' | 'move'>('marker');
  const [color, setColor] = useState('#FF0000');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const { data: savedAnnotations, refetch } = trpc.annotations.getByItem.useQuery({
    itemType,
    itemId,
  });

  const createMutation = trpc.annotations.create.useMutation({
    onSuccess: () => {
      toast.success('标注已保存');
      refetch();
      onSave?.();
    },
    onError: () => {
      toast.error('保存标注失败');
    },
  });

  const deleteMutation = trpc.annotations.delete.useMutation({
    onSuccess: () => {
      toast.success('标注已删除');
      refetch();
    },
  });

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      if (canvasRef.current) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        redrawCanvas(img, []);
      }
    };
  }, [imageUrl]);

  // 加载已保存的标注
  useEffect(() => {
    if (savedAnnotations && savedAnnotations.length > 0) {
      const loadedAnnotations: Annotation[] = savedAnnotations.map((ann: any) => ({
        id: ann.id,
        type: ann.annotationType,
        data: ann.annotationData,
        color: ann.color,
      }));
      setAnnotations(loadedAnnotations);
      if (image) {
        redrawCanvas(image, loadedAnnotations);
      }
    }
  }, [savedAnnotations, image]);

  const redrawCanvas = (img: HTMLImageElement, anns: Annotation[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制图片
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // 绘制所有标注
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    anns.forEach((ann) => {
      drawAnnotation(ctx, ann);
    });
    ctx.restore();
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = 3;

    switch (ann.type) {
      case 'circle':
        if (ann.data.radius) {
          ctx.beginPath();
          ctx.arc(ann.data.x, ann.data.y, ann.data.radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case 'rectangle':
        if (ann.data.width && ann.data.height) {
          ctx.strokeRect(ann.data.x, ann.data.y, ann.data.width, ann.data.height);
        }
        break;

      case 'arrow':
        if (ann.data.startX !== undefined && ann.data.startY !== undefined && 
            ann.data.endX !== undefined && ann.data.endY !== undefined) {
          drawArrow(ctx, ann.data.startX, ann.data.startY, ann.data.endX, ann.data.endY);
        }
        break;

      case 'text':
        if (ann.data.text) {
          ctx.font = `${ann.data.fontSize || 16}px Arial`;
          ctx.fillText(ann.data.text, ann.data.x, ann.data.y);
        }
        break;

      case 'highlight':
        if (ann.data.width && ann.data.height) {
          ctx.globalAlpha = 0.3;
          ctx.fillRect(ann.data.x, ann.data.y, ann.data.width, ann.data.height);
          ctx.globalAlpha = 1;
        }
        break;

      case 'marker':
        ctx.beginPath();
        ctx.arc(ann.data.x, ann.data.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        break;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'move') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    const pos = getCanvasCoordinates(e);
    setStartPos(pos);
    setIsDrawing(true);

    if (tool === 'marker') {
      const newAnnotation: Annotation = {
        type: 'marker',
        data: { x: pos.x, y: pos.y },
        color,
      };
      addAnnotation(newAnnotation);
    } else if (tool === 'text') {
      setTextPosition(pos);
      setShowTextInput(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && tool === 'move') {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      if (image) {
        redrawCanvas(image, annotations);
      }
      return;
    }

    if (!isDrawing || !startPos || !image) return;

    const pos = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 临时绘制
    redrawCanvas(image, annotations);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;

    switch (tool) {
      case 'circle':
        const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case 'rectangle':
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
        break;

      case 'arrow':
        drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y);
        break;

      case 'highlight':
        ctx.globalAlpha = 0.3;
        ctx.fillRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
        ctx.globalAlpha = 1;
        break;
    }
    ctx.restore();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !startPos) return;

    const pos = getCanvasCoordinates(e);
    let newAnnotation: Annotation | null = null;

    switch (tool) {
      case 'circle':
        const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
        newAnnotation = {
          type: 'circle',
          data: { x: startPos.x, y: startPos.y, radius },
          color,
        };
        break;

      case 'rectangle':
        newAnnotation = {
          type: 'rectangle',
          data: {
            x: startPos.x,
            y: startPos.y,
            width: pos.x - startPos.x,
            height: pos.y - startPos.y,
          },
          color,
        };
        break;

      case 'arrow':
        newAnnotation = {
          type: 'arrow',
          data: {
            x: startPos.x,
            y: startPos.y,
            startX: startPos.x,
            startY: startPos.y,
            endX: pos.x,
            endY: pos.y,
          },
          color,
        };
        break;

      case 'highlight':
        newAnnotation = {
          type: 'highlight',
          data: {
            x: startPos.x,
            y: startPos.y,
            width: pos.x - startPos.x,
            height: pos.y - startPos.y,
          },
          color,
        };
        break;
    }

    if (newAnnotation) {
      addAnnotation(newAnnotation);
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  const addAnnotation = (annotation: Annotation) => {
    const newAnnotations = [...annotations, annotation];
    setAnnotations(newAnnotations);
    
    // 添加到历史记录
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    if (image) {
      redrawCanvas(image, newAnnotations);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput || !textPosition) return;

    const newAnnotation: Annotation = {
      type: 'text',
      data: {
        x: textPosition.x,
        y: textPosition.y,
        text: textInput,
        fontSize: 16,
      },
      color,
    };

    addAnnotation(newAnnotation);
    setTextInput('');
    setShowTextInput(false);
    setTextPosition(null);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevAnnotations = history[newIndex] || [];
      setAnnotations(prevAnnotations);
      if (image) {
        redrawCanvas(image, prevAnnotations);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextAnnotations = history[newIndex];
      setAnnotations(nextAnnotations);
      if (image) {
        redrawCanvas(image, nextAnnotations);
      }
    }
  };

  const handleSave = async () => {
    // 保存所有未保存的标注
    const unsavedAnnotations = annotations.filter(ann => !ann.id);
    
    for (const ann of unsavedAnnotations) {
      await createMutation.mutateAsync({
        itemType,
        itemId,
        imageUrl,
        annotationType: ann.type,
        annotationData: ann.data,
        color: ann.color,
      });
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
    if (image) {
      redrawCanvas(image, annotations);
    }
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
    if (image) {
      redrawCanvas(image, annotations);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'annotated-image.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1">
            <Button
              variant={tool === 'marker' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('marker')}
            >
              <Circle className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('circle')}
            >
              <Circle className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'rectangle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('rectangle')}
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'arrow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('arrow')}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('text')}
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'highlight' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('highlight')}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'move' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('move')}
            >
              <Move className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-1 ml-4">
            {COLORS.map((c: any) => (
              <button
                key={c}
                className={`w-6 h-6 rounded border-2 ${color === c ? 'border-black' : 'border-gray-300'}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <div className="flex gap-1 ml-auto">
            <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex <= 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
              <Redo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button onClick={handleSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              保存标注
            </Button>
          </div>
        </div>
      </Card>

      <div className="relative border rounded-lg overflow-auto max-h-[600px]">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDrawing(false);
            setIsPanning(false);
          }}
        />
      </div>

      {showTextInput && (
        <Card className="p-4">
          <div className="space-y-2">
            <Label>输入文字注释</Label>
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="输入注释文字..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleTextSubmit();
                  }
                }}
              />
              <Button onClick={handleTextSubmit}>添加</Button>
              <Button variant="outline" onClick={() => {
                setShowTextInput(false);
                setTextInput('');
                setTextPosition(null);
              }}>
                取消
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
