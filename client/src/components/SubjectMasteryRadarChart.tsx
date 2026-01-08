import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface SubjectMasteryRadarChartProps {
  data: Array<{
    subject: string;
    masteryRate: number;
    totalQuestions: number;
    masteredQuestions: number;
  }>;
}

const SUBJECT_NAMES: Record<string, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  politics: '政治',
  history: '历史',
  geography: '地理',
};

export function SubjectMasteryRadarChart({ data }: SubjectMasteryRadarChartProps) {
  const chartData = {
    labels: data.map((item) => SUBJECT_NAMES[item.subject] || item.subject),
    datasets: [
      {
        label: '掌握度 (%)',
        data: data.map((item) => item.masteryRate),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const index = context.dataIndex;
            const item = data[index];
            return [
              `掌握度: ${item.masteryRate.toFixed(1)}%`,
              `已掌握: ${item.masteredQuestions}/${item.totalQuestions}题`,
            ];
          },
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: function (value: any) {
            return value + '%';
          },
        },
        pointLabels: {
          font: {
            size: 14,
          },
        },
      },
    },
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>各学科掌握度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            暂无数据，请先添加错题
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>各学科掌握度</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <Radar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
