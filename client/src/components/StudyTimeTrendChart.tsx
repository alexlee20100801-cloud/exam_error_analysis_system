import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StudyTimeTrendChartProps {
  data: Array<{
    date: string;
    subject: string;
    totalDuration: number;
  }>;
}

const SUBJECT_COLORS: Record<string, { bg: string; border: string }> = {
  chinese: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgb(239, 68, 68)' },
  math: { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgb(59, 130, 246)' },
  english: { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgb(16, 185, 129)' },
  physics: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgb(245, 158, 11)' },
  chemistry: { bg: 'rgba(168, 85, 247, 0.2)', border: 'rgb(168, 85, 247)' },
  biology: { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgb(236, 72, 153)' },
  politics: { bg: 'rgba(14, 165, 233, 0.2)', border: 'rgb(14, 165, 233)' },
  history: { bg: 'rgba(251, 146, 60, 0.2)', border: 'rgb(251, 146, 60)' },
  geography: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgb(34, 197, 94)' },
};

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

export function StudyTimeTrendChart({ data }: StudyTimeTrendChartProps) {
  // 按日期分组数据
  const dateMap = new Map<string, Map<string, number>>();
  data.forEach((item) => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, new Map());
    }
    dateMap.get(item.date)!.set(item.subject, item.totalDuration / 60); // 转换为分钟
  });

  // 获取所有日期并排序
  const dates = Array.from(dateMap.keys()).sort();

  // 获取所有学科
  const subjects = Array.from(new Set(data.map((item) => item.subject)));

  // 构建Chart.js数据集
  const datasets = subjects.map((subject) => ({
    label: SUBJECT_NAMES[subject] || subject,
    data: dates.map((date) => dateMap.get(date)?.get(subject) || 0),
    borderColor: SUBJECT_COLORS[subject]?.border || 'rgb(156, 163, 175)',
    backgroundColor: SUBJECT_COLORS[subject]?.bg || 'rgba(156, 163, 175, 0.2)',
    fill: true,
    tension: 0.4,
  }));

  const chartData = {
    labels: dates.map((date) => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += Math.round(context.parsed.y) + ' 分钟';
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '学习时长（分钟）',
        },
        ticks: {
          callback: function (value: any) {
            return value + ' 分';
          },
        },
      },
      x: {
        title: {
          display: true,
          text: '日期',
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>学习时长趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
