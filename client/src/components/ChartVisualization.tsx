import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, PieChart, LineChart, Table as TableIcon } from "lucide-react";

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
 * 从题目内容中识别并展示图表和表格
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
      {imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              题目图片
              <Badge variant="secondary" className="ml-auto">可能包含图表</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg border bg-muted/30 p-4">
              <img 
                src={imageUrl} 
                alt="题目图片" 
                className="max-w-full h-auto mx-auto rounded"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              💡 提示：如果图片中包含图表或表格，请仔细观察数据关系
            </p>
          </CardContent>
        </Card>
      )}

      {/* 识别到的表格 */}
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
 * 表格渲染器
 */
function TableRenderer({ data }: { data: any }) {
  if (!data || !data.headers || !data.rows) {
    return <div className="text-sm text-muted-foreground">表格数据格式错误</div>;
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {data.headers.map((header: string, i: number) => (
              <TableHead key={i} className="font-semibold text-center">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row: string[], rowIndex: number) => (
            <TableRow key={rowIndex} className="hover:bg-muted/30">
              {row.map((cell: string, cellIndex: number) => (
                <TableCell key={cellIndex} className="text-center">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * 图表渲染器（显示图表描述）
 */
function ChartRenderer({ data, rawText }: { data: any; rawText: string }) {
  return (
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
