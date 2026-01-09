import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { StudyTimeTrendChart } from '../components/StudyTimeTrendChart';
import { SubjectMasteryRadarChart } from '../components/SubjectMasteryRadarChart';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Clock, TrendingUp, Target, Activity } from 'lucide-react';

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

export function LearningAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  // 计算日期范围
  const getDateRange = (range: TimeRange) => {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const dateRange = getDateRange(timeRange);

  // 获取学习时长趋势
  const { data: trendData, isLoading: trendLoading } = trpc.learningAnalytics.getStudyTimeTrend.useQuery(dateRange);

  // 获取总学习时长
  const { data: totalTime, isLoading: totalLoading } = trpc.learningAnalytics.getTotalStudyTime.useQuery(dateRange);

  // 获取学科掌握度
  const { data: masteryData, isLoading: masteryLoading } = trpc.learningAnalytics.getSubjectMastery.useQuery();

  // 获取学习活动统计
  const { data: activityStats, isLoading: activityLoading } = trpc.learningAnalytics.getActivityStats.useQuery(dateRange);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const timeRangeLabels: Record<TimeRange, string> = {
    week: '最近一周',
    month: '最近一月',
    quarter: '最近三月',
    year: '最近一年',
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">学习数据可视化</h1>
          <p className="text-muted-foreground mt-1">
            查看你的学习时长趋势和各学科掌握情况
          </p>
        </div>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">最近一周</SelectItem>
            <SelectItem value="month">最近一月</SelectItem>
            <SelectItem value="quarter">最近三月</SelectItem>
            <SelectItem value="year">最近一年</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总学习时长</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {totalLoading ? (
              <div className="text-2xl font-bold">加载中...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatDuration(totalTime?.totalDuration || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {timeRangeLabels[timeRange]}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学习次数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {totalLoading ? (
              <div className="text-2xl font-bold">加载中...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalTime?.sessionCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {timeRangeLabels[timeRange]}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均掌握度</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {masteryLoading ? (
              <div className="text-2xl font-bold">加载中...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {masteryData && masteryData.length > 0
                    ? (
                        masteryData.reduce((sum, item) => sum + item.masteryRate, 0) /
                        masteryData.length
                      ).toFixed(1)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">所有学科平均</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">复习活动</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="text-2xl font-bold">加载中...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {activityStats?.find((s) => s.activityType === 'review')?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {timeRangeLabels[timeRange]}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 图表 */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {trendLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>学习时长趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center">
                  加载中...
                </div>
              </CardContent>
            </Card>
          ) : trendData && trendData.length > 0 ? (
            <StudyTimeTrendChart data={trendData} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>学习时长趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  暂无学习记录
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {masteryLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>各学科掌握度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center">
                  加载中...
                </div>
              </CardContent>
            </Card>
          ) : (
            <SubjectMasteryRadarChart data={masteryData || []} />
          )}
        </div>
      </div>

      {/* 学习活动分布 */}
      {activityStats && activityStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>学习活动分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityStats.map((stat: any) => {
                const activityLabels: Record<string, string> = {
                  review: '复习错题',
                  practice: '练习',
                  analysis: 'AI分析',
                  upload: '上传错题',
                };
                const total = activityStats.reduce((sum, s) => sum + Number(s.totalDuration), 0);
                const percentage = total > 0 ? (Number(stat.totalDuration) / total) * 100 : 0;

                return (
                  <div key={stat.activityType} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {activityLabels[stat.activityType] || stat.activityType}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDuration(Number(stat.totalDuration))} ({stat.count}次)
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
