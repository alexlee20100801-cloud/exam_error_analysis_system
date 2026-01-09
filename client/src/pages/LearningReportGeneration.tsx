import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { FileText, TrendingUp, Clock, Target, Award, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export function LearningReportGeneration() {
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // 获取报告列表
  const { data: reports, isLoading: reportsLoading } = trpc.learningReportGeneration.getReports.useQuery({
    limit: 20,
  });

  // 获取报告详情
  const { data: reportDetail, isLoading: detailLoading } = trpc.learningReportGeneration.getReportById.useQuery(
    { reportId: selectedReportId! },
    { enabled: selectedReportId !== null }
  );

  // 生成报告
  const generateReport = trpc.learningReportGeneration.generate.useMutation({
    onSuccess: (data) => {
      toast({
        // @ts-ignore
        title: '报告生成成功',
        description: '学习报告已生成完成',
      });
      utils.learningReportGeneration.getReports.invalidate();
      setSelectedReportId(data.reportId);
    },
    onError: () => {
      toast({
        // @ts-ignore
        title: '生成失败',
        description: '报告生成过程中出现错误，请稍后重试',
        variant: 'destructive',
      });
    },
  });

  const handleGenerateWeekly = () => {
    generateReport.mutate({ reportType: 'weekly' });
  };

  const handleGenerateMonthly = () => {
    generateReport.mutate({ reportType: 'monthly' });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">学习报告</h1>
          <p className="text-muted-foreground mt-1">
            自动生成周报/月报，分析学习情况并提供改进建议
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateWeekly}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            生成周报
          </Button>
          <Button
            onClick={handleGenerateMonthly}
            disabled={generateReport.isPending}
            variant="outline"
          >
            {generateReport.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            生成月报
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 报告列表 */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>历史报告</CardTitle>
            <CardDescription>查看过往的学习报告</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-2">
                {reports.map((report: any) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedReportId === report.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={report.reportType === 'weekly' ? 'default' : 'secondary'}>
                        {report.reportType === 'weekly' ? '周报' : '月报'}
                      </Badge>
                      {report.status === 'generating' && (
                        <Badge variant="outline">生成中</Badge>
                      )}
                      {report.status === 'failed' && (
                        <Badge variant="destructive">失败</Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      生成于 {formatDate(report.createdAt)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无报告</p>
                <p className="text-sm mt-2">点击上方按钮生成第一份报告</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 报告详情 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>报告详情</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedReportId ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>请选择一份报告查看详情</p>
              </div>
            ) : detailLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                <p className="mt-4 text-muted-foreground">加载中...</p>
              </div>
            ) : reportDetail ? (
              <div className="space-y-6">
                {/* 报告头部 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {reportDetail.reportType === 'weekly' ? '周报' : '月报'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(reportDetail.periodStart)} - {formatDate(reportDetail.periodEnd)}
                    </p>
                  </div>
                  {reportDetail.progressScore && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {Number(reportDetail.progressScore).toFixed(0)}
                      </div>
                      <div className="text-sm text-muted-foreground">学习进步评分</div>
                    </div>
                  )}
                </div>

                {/* 统计数据 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">学习时长</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatDuration(reportDetail.totalStudyTime)}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">新增错题</span>
                    </div>
                    <div className="text-2xl font-bold">{reportDetail.newQuestionsCount}</div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">复习次数</span>
                    </div>
                    <div className="text-2xl font-bold">{reportDetail.reviewedQuestionsCount}</div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">已掌握</span>
                    </div>
                    <div className="text-2xl font-bold">{reportDetail.masteredQuestionsCount}</div>
                  </div>
                </div>

                {/* 学科掌握度 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">各学科掌握度</h3>
                  <div className="space-y-3">
                    {Object.entries(JSON.parse(reportDetail.subjectMastery as string) as Record<string, number>).map(
                      ([subject, rate]) => (
                        <div key={subject}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {SUBJECT_NAMES[subject] || subject}
                            </span>
                            <span className="text-sm text-muted-foreground">{rate.toFixed(1)}%</span>
                          </div>
                          <Progress value={rate} />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 薄弱环节 */}
                {reportDetail.weakKnowledgePoints && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">薄弱环节</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {(JSON.parse(reportDetail.weakKnowledgePoints as string) as Array<any>).map(
                        (item, index) => (
                          <div key={index} className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {SUBJECT_NAMES[item.subject] || item.subject}
                              </span>
                              <Badge variant="destructive">{item.masteryRate.toFixed(1)}%</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              已掌握 {item.masteredQuestions}/{item.totalQuestions} 题
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* AI改进建议 */}
                {reportDetail.improvementSuggestions && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      AI改进建议
                    </h3>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg whitespace-pre-wrap">
                      {reportDetail.improvementSuggestions}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>报告不存在或已被删除</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
