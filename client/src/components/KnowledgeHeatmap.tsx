import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HeatmapCell {
  date: string;
  value: number;
  label: string;
}

interface KnowledgeHeatmapProps {
  data: HeatmapCell[];
  title?: string;
  description?: string;
}

export function KnowledgeHeatmap({ data, title = "学习热力图", description = "展示最近的学习活动和错题趋势" }: KnowledgeHeatmapProps) {
  // 按日期分组数据
  const groupedData = data.reduce((acc, item) => {
    const date = new Date(item.date);
    const week = Math.floor((date.getTime() - new Date(data[0]?.date || Date.now()).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const day = date.getDay();
    
    if (!acc[week]) acc[week] = [];
    acc[week][day] = item;
    
    return acc;
  }, {} as Record<number, HeatmapCell[]>);

  // 获取颜色强度
  const getColor = (value: number) => {
    if (value === 0) return 'bg-muted';
    if (value < 3) return 'bg-green-200 dark:bg-green-900';
    if (value < 6) return 'bg-green-300 dark:bg-green-800';
    if (value < 9) return 'bg-green-400 dark:bg-green-700';
    if (value < 12) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weeks = Object.keys(groupedData).map(Number).sort((a, b) => a - b);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 图例 */}
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-muted rounded-sm" />
              <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm" />
              <div className="w-3 h-3 bg-green-300 dark:bg-green-800 rounded-sm" />
              <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm" />
              <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-sm" />
              <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm" />
            </div>
            <span>多</span>
          </div>

          {/* 热力图 */}
          <div className="overflow-x-auto">
            <div className="inline-flex gap-1">
              {/* 星期标签 */}
              <div className="flex flex-col gap-1 justify-start pt-5">
                {weekDays.map((day, idx) => (
                  <div key={idx} className="h-3 text-xs text-muted-foreground flex items-center">
                    {idx % 2 === 1 ? day : ''}
                  </div>
                ))}
              </div>

              {/* 热力格子 */}
              {weeks.map((week: any) => (
                <div key={week} className="flex flex-col gap-1">
                  {/* 月份标签（仅在第一周显示） */}
                  {week === weeks[0] && (
                    <div className="h-4 text-xs text-muted-foreground mb-1">
                      {new Date(groupedData[week][0]?.date || Date.now()).toLocaleDateString('zh-CN', { month: 'short' })}
                    </div>
                  )}
                  {weekDays.map((_, dayIdx) => {
                    const cell = groupedData[week]?.[dayIdx];
                    return (
                      <div
                        key={dayIdx}
                        className={`w-3 h-3 rounded-sm ${cell ? getColor(cell.value) : 'bg-muted'} hover:ring-2 hover:ring-primary transition-all cursor-pointer`}
                        title={cell ? `${cell.date}: ${cell.label}` : '无数据'}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex gap-4 text-sm text-muted-foreground pt-2 border-t">
            <div>
              总天数: <span className="font-medium text-foreground">{data.length}</span>
            </div>
            <div>
              活跃天数: <span className="font-medium text-foreground">{data.filter(d => d.value > 0).length}</span>
            </div>
            <div>
              总活动: <span className="font-medium text-foreground">{data.reduce((sum, d) => sum + d.value, 0)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
