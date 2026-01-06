import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, PieChart, LineChart, Table as TableIcon, ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react";

interface ChartData {
  type: 'table' | 'chart';
  title?: string;
  data: any;
  rawText: string;
}

interface ChartVisualizationProps {
  content: string;
  imageUrl?: string;
}

/**
 * 图表可视化组件
 * 从题目内容中识别并展示图表和表格，支持缩放、拖拽和全屏查看
 */
export function ChartVisualization({ content, imageUrl }: ChartVisualizationProps) {
  const [charts, setCharts] = useState<ChartData[]>([]);

  useEffect(() => {
    const detected = detectChartsAndTables(content);
    setCharts(detected);
  }, [content]);

  if (charts.length === 0 && !imageUrl) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 题目图片（可能包含图表） */}
      {imageUrl && <ImageViewer imageUrl={imageUrl} />}

      {/* 识别到的表格和图表 */}
      {charts.map((chart, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {chart.type === 'table' ? (
                <>
                  <TableIcon className="h-5 w-5 text-blue-500" />
                  {chart.title || `表格 ${index + 1}`}
                </>
              ) : (
                <>
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  {chart.title || `图表 ${index + 1}`}
                </>
              )}
              <Badge variant="outline" className="ml-auto">
                {chart.type === 'table' ? '表格数据' : '图表描述'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chart.type === 'table' ? (
              <TableRenderer data={chart.data} />
            ) : (
              <ChartRenderer data={chart.data} rawText={chart.rawText} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 图片查看器（支持缩放、拖拽、全屏）
 */
function ImageViewer({ imageUrl }: { imageUrl: string }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const imageControls = (
    <div className="flex items-center gap-2 mb-2">
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
        onClick={handleZoomOut}
        disabled={scale <= 0.5}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        disabled={scale === 1 && position.x === 0 && position.y === 0}
      >
        重置
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsFullscreen(true)}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
      {scale > 1 && (
        <Badge variant="secondary" className="ml-auto">
          <Move className="h-3 w-3 mr-1" />
          可拖拽
        </Badge>
      )}
      <Badge variant="outline" className={scale === 1 ? "ml-auto" : ""}>
        {Math.round(scale * 100)}%
      </Badge>
    </div>
  );

  const imageElement = (
    <div
      ref={imageRef}
      className={`relative rounded-lg border bg-muted/30 p-4 overflow-hidden ${
        scale > 1 ? 'cursor-move' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ userSelect: 'none' }}
    >
      <img
        src={imageUrl}
        alt="题目图片"
        className="max-w-full h-auto mx-auto rounded transition-transform"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transformOrigin: 'center',
        }}
        draggable={false}
      />
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            题目图片
            <Badge variant="secondary" className="ml-auto">可能包含图表</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {imageControls}
          {imageElement}
          <p className="text-sm text-muted-foreground mt-2">
            💡 提示：如果图片中包含图表或表格，请仔细观察数据关系
          </p>
        </CardContent>
      </Card>

      {/* 全屏对话框 */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-6">
          <DialogHeader>
            <DialogTitle>题目图片 - 全屏查看</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {imageControls}
            <div
              className={`relative rounded-lg border bg-muted/30 p-4 overflow-auto max-h-[70vh] ${
                scale > 1 ? 'cursor-move' : 'cursor-default'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ userSelect: 'none' }}
            >
              <img
                src={imageUrl}
                alt="题目图片"
                className="max-w-full h-auto mx-auto rounded transition-transform"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transformOrigin: 'center',
                }}
                draggable={false}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 表格渲染器
 */
function TableRenderer({ data }: { data: any }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!data || !data.headers || !data.rows) {
    return <div className="text-sm text-muted-foreground">表格数据格式错误</div>;
  }

  const tableElement = (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {data.headers.map((header: string, i: number) => (
              <TableHead key={i} className="font-semibold text-center whitespace-nowrap">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row: string[], rowIndex: number) => (
            <TableRow key={rowIndex} className="hover:bg-muted/30">
              {row.map((cell: string, cellIndex: number) => (
                <TableCell key={cellIndex} className="text-center whitespace-nowrap">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            全屏查看
          </Button>
        </div>
        {tableElement}
      </div>

      {/* 全屏对话框 */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-6">
          <DialogHeader>
            <DialogTitle>表格数据 - 全屏查看</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[80vh]">
            {tableElement}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 图表渲染器（显示图表描述）
 */
function ChartRenderer({ data, rawText }: { data: any; rawText: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chartContent = (
    <div className="space-y-3">
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
        <div className="flex items-start gap-3">
          <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              图表描述
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
              {rawText}
            </p>
          </div>
        </div>
      </div>
      {data.type && (
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {data.type === 'bar' ? '柱状图' : 
             data.type === 'line' ? '折线图' : 
             data.type === 'pie' ? '饼图' : 
             '其他图表'}
          </Badge>
          {data.variables && (
            <span className="text-sm text-muted-foreground">
              变量：{data.variables.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            全屏查看
          </Button>
        </div>
        {chartContent}
      </div>

      {/* 全屏对话框 */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-6">
          <DialogHeader>
            <DialogTitle>图表描述 - 全屏查看</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[80vh]">
            {chartContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 从内容中检测图表和表格
 */
function detectChartsAndTables(content: string): ChartData[] {
  const results: ChartData[] = [];

  // 检测表格（Markdown表格格式）
  const tableRegex = /\|(.+)\|[\r\n]+\|[\s:-]+\|[\r\n]+((?:\|.+\|[\r\n]+)+)/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(content)) !== null) {
    const headerLine = tableMatch[1];
    const bodyLines = tableMatch[2];
    
    const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
    const rows = bodyLines.trim().split('\n').map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell)
    );

    results.push({
      type: 'table',
      data: { headers, rows },
      rawText: tableMatch[0],
    });
  }

  // 检测表格（中文描述）
  const chineseTableRegex = /(?:表格|数据表|统计表)[:：]?\s*[\r\n]+((?:.+[\r\n]+)+?)(?=[\r\n]{2,}|$)/gi;
  let chineseTableMatch;
  while ((chineseTableMatch = chineseTableRegex.exec(content)) !== null) {
    const tableText = chineseTableMatch[1].trim();
    const lines = tableText.split('\n').map(l => l.trim()).filter(l => l);
    
    if (lines.length >= 2) {
      // 尝试解析为表格
      const parsed = parseChineseTable(lines);
      if (parsed) {
        results.push({
          type: 'table',
          title: chineseTableMatch[0].split(/[:：]/)[0].trim(),
          data: parsed,
          rawText: tableText,
        });
      }
    }
  }

  // 检测图表描述
  const chartKeywords = ['图表', '柱状图', '折线图', '饼图', '散点图', '曲线图', '函数图像'];
  const chartRegex = new RegExp(`(${chartKeywords.join('|')})([^。！？\\n]+[。！？]?)`, 'g');
  let chartMatch;
  while ((chartMatch = chartRegex.exec(content)) !== null) {
    const chartType = chartMatch[1];
    const description = chartMatch[0];
    
    results.push({
      type: 'chart',
      title: chartType,
      data: {
        type: getChartType(chartType),
        variables: extractVariables(description),
      },
      rawText: description,
    });
  }

  // 检测数学函数图像
  const functionRegex = /(?:函数|图像)[:：]?\s*([yfx]\s*=\s*[^。，\n]+)/gi;
  let functionMatch;
  while ((functionMatch = functionRegex.exec(content)) !== null) {
    results.push({
      type: 'chart',
      title: '函数图像',
      data: {
        type: 'line',
        function: functionMatch[1].trim(),
      },
      rawText: functionMatch[0],
    });
  }

  return results;
}

/**
 * 解析中文表格
 */
function parseChineseTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  // 尝试按空格或制表符分割
  const firstLine = lines[0];
  const separator = firstLine.includes('\t') ? '\t' : /\s{2,}/;
  
  const headers = firstLine.split(separator).map(h => h.trim()).filter(h => h);
  if (headers.length < 2) return null;

  const rows = lines.slice(1).map(line => 
    line.split(separator).map(cell => cell.trim()).filter(cell => cell)
  ).filter(row => row.length > 0);

  if (rows.length === 0) return null;

  return { headers, rows };
}

/**
 * 获取图表类型
 */
function getChartType(keyword: string): string {
  if (keyword.includes('柱状')) return 'bar';
  if (keyword.includes('折线') || keyword.includes('曲线')) return 'line';
  if (keyword.includes('饼')) return 'pie';
  return 'other';
}

/**
 * 提取变量名
 */
function extractVariables(text: string): string[] {
  const variables: string[] = [];
  
  // 提取单个字母变量（x, y, t等）
  const singleVarRegex = /\b([a-zA-Z])\b/g;
  let match;
  while ((match = singleVarRegex.exec(text)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables.slice(0, 5); // 最多返回5个变量
}
