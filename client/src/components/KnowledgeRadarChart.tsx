import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface KnowledgeRadarChartProps {
  data: Array<{
    knowledgePoint: string;
    masteryLevel: number;
    errorCount: number;
  }>;
}

export function KnowledgeRadarChart({ data }: KnowledgeRadarChartProps) {
  // 转换数据格式为recharts需要的格式
  const chartData = data.map(item => ({
    subject: item.knowledgePoint,
    掌握度: item.masteryLevel,
    错题数: Math.max(0, 100 - item.errorCount * 10), // 反向显示，错题越多分数越低
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>知识点掌握度雷达图</CardTitle>
        <CardDescription>
          直观展示各知识点的掌握情况，掌握度越高表示该知识点越熟练
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Radar
              name="掌握度"
              dataKey="掌握度"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            />
            <Radar
              name="正确率"
              dataKey="错题数"
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive))"
              fillOpacity={0.3}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
