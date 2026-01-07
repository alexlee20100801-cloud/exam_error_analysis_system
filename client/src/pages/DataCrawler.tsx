import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Play, Pause, Trash2, RefreshCw, Database, FileText, Tags } from 'lucide-react';
import { toast } from 'sonner';

export default function DataCrawler() {

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('tasks');

  // 表单状态
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<'education_cloud' | 'school_bank' | 'web_crawler' | 'manual_upload'>('web_crawler');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [targetSubject, setTargetSubject] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [scheduleType, setScheduleType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');

  // 查询
  const { data: tasks, refetch: refetchTasks } = trpc.dataCrawler.crawlerTasks.list.useQuery();
  const { data: rawQuestions, refetch: refetchQuestions } = trpc.dataCrawler.rawQuestions.list.useQuery();
  const { data: sources, refetch: refetchSources } = trpc.dataCrawler.crawlerSources.list.useQuery();

  // 变更
  const createTask = trpc.dataCrawler.crawlerTasks.create.useMutation({
    onSuccess: () => {
      toast({ title: '创建成功', description: '爬虫任务已创建' });
      setCreateDialogOpen(false);
      refetchTasks();
      resetForm();
    },
    onError: (error) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' });
    },
  });

  const executeTask = trpc.dataCrawler.crawlerTasks.execute.useMutation({
    onSuccess: () => {
      toast({ title: '执行成功', description: '爬虫任务已启动' });
      refetchTasks();
    },
    onError: (error) => {
      toast({ title: '执行失败', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTask = trpc.dataCrawler.crawlerTasks.delete.useMutation({
    onSuccess: () => {
      toast({ title: '删除成功', description: '爬虫任务已删除' });
      refetchTasks();
    },
    onError: (error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setTaskName('');
    setSourceUrl('');
    setSourceType('');
    setTargetSubject('');
    setTargetGrade('');
    setScheduleType('once');
  };

  const handleCreateTask = () => {
    if (!taskName) {
      toast({ title: '请填写任务名称', variant: 'destructive' });
      return;
    }

    createTask.mutate({
      taskName,
      taskType,
      sourceUrl: sourceUrl || undefined,
      sourceType: sourceType || undefined,
      targetSubject: targetSubject as any || undefined,
      targetGrade: targetGrade as any || undefined,
      scheduleType,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      running: 'default',
      completed: 'secondary',
      failed: 'destructive',
      paused: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getProcessingStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      raw: 'outline',
      ocr_done: 'default',
      metadata_extracted: 'default',
      quality_checked: 'secondary',
      approved: 'secondary',
      rejected: 'destructive',
    };
    const labels: Record<string, string> = {
      raw: '原始',
      ocr_done: 'OCR完成',
      metadata_extracted: '元数据提取完成',
      quality_checked: '质量检查完成',
      approved: '已批准',
      rejected: '已拒绝',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">数据采集管理</h1>
          <p className="text-muted-foreground mt-2">管理爬虫任务、原始试题和数据源</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建爬虫任务
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建爬虫任务</DialogTitle>
              <DialogDescription>配置新的数据采集任务</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="taskName">任务名称 *</Label>
                <Input
                  id="taskName"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="例如：深圳市2024年期末试题采集"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taskType">任务类型</Label>
                <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="education_cloud">教育云平台</SelectItem>
                    <SelectItem value="school_bank">学校题库</SelectItem>
                    <SelectItem value="web_crawler">网页爬虫</SelectItem>
                    <SelectItem value="manual_upload">手动上传</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sourceUrl">来源URL</Label>
                <Input
                  id="sourceUrl"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://example.com/questions"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sourceType">来源类型</Label>
                <Input
                  id="sourceType"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  placeholder="例如：深圳市教育局、XX中学"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="targetSubject">目标学科</Label>
                  <Select value={targetSubject} onValueChange={setTargetSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择学科" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chinese">语文</SelectItem>
                      <SelectItem value="math">数学</SelectItem>
                      <SelectItem value="english">英语</SelectItem>
                      <SelectItem value="physics">物理</SelectItem>
                      <SelectItem value="chemistry">化学</SelectItem>
                      <SelectItem value="biology">生物</SelectItem>
                      <SelectItem value="politics">政治</SelectItem>
                      <SelectItem value="history">历史</SelectItem>
                      <SelectItem value="geography">地理</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="targetGrade">目标年级</Label>
                  <Select value={targetGrade} onValueChange={setTargetGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择年级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior1">初一</SelectItem>
                      <SelectItem value="junior2">初二</SelectItem>
                      <SelectItem value="junior3">初三</SelectItem>
                      <SelectItem value="senior1">高一</SelectItem>
                      <SelectItem value="senior2">高二</SelectItem>
                      <SelectItem value="senior3">高三</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scheduleType">调度类型</Label>
                <Select value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">单次执行</SelectItem>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTask} disabled={createTask.isPending}>
                {createTask.isPending ? '创建中...' : '创建任务'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">
            <Database className="mr-2 h-4 w-4" />
            爬虫任务
          </TabsTrigger>
          <TabsTrigger value="questions">
            <FileText className="mr-2 h-4 w-4" />
            原始试题
          </TabsTrigger>
          <TabsTrigger value="sources">
            <Tags className="mr-2 h-4 w-4" />
            数据源
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>爬虫任务列表</CardTitle>
              <CardDescription>管理和执行数据采集任务</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>任务名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>进度</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks && tasks.length > 0 ? (
                    tasks.map((task: any) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.taskName}</TableCell>
                        <TableCell>{task.taskType}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          {task.totalItems > 0 ? (
                            <span>
                              {task.processedItems}/{task.totalItems}
                              <span className="text-muted-foreground ml-2">
                                ({Math.round((task.processedItems / task.totalItems) * 100)}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">未开始</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(task.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => executeTask.mutate({ id: task.id })}
                              disabled={task.status === 'running'}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteTask.mutate({ id: task.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        暂无爬虫任务
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>原始试题列表</CardTitle>
              <CardDescription>查看和审核采集的试题</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>来源</TableHead>
                    <TableHead>学科</TableHead>
                    <TableHead>年级</TableHead>
                    <TableHead>处理状态</TableHead>
                    <TableHead>质量分数</TableHead>
                    <TableHead>采集时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawQuestions && rawQuestions.length > 0 ? (
                    rawQuestions.map((question: any) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium">{question.sourceName || question.sourceType}</TableCell>
                        <TableCell>{question.subject || '-'}</TableCell>
                        <TableCell>{question.grade || '-'}</TableCell>
                        <TableCell>{getProcessingStatusBadge(question.processingStatus)}</TableCell>
                        <TableCell>
                          {question.qualityScore ? (
                            <span>{parseFloat(question.qualityScore).toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">未评分</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(question.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        暂无原始试题
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>数据源列表</CardTitle>
              <CardDescription>管理爬虫数据源配置</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>来源名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>地区</TableHead>
                    <TableHead>可信度</TableHead>
                    <TableHead>试题数量</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources && sources.length > 0 ? (
                    sources.map((source: any) => (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium">{source.sourceName}</TableCell>
                        <TableCell>{source.sourceType}</TableCell>
                        <TableCell>{source.region}</TableCell>
                        <TableCell>
                          {source.credibilityScore ? (
                            <span>{parseFloat(source.credibilityScore).toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">未评分</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {source.totalQuestions}
                          <span className="text-muted-foreground ml-2">
                            (已批准: {source.approvedQuestions})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={source.isActive ? 'default' : 'outline'}>
                            {source.isActive ? '活跃' : '停用'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        暂无数据源
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
