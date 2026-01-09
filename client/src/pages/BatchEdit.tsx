import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECTS = [
  { value: 'math', label: '数学' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
  { value: 'chinese', label: '语文' },
  { value: 'english', label: '英语' },
  { value: 'biology', label: '生物' },
  { value: 'politics', label: '政治' },
  { value: 'history', label: '历史' },
  { value: 'geography', label: '地理' },
];

const GRADES = [
  { value: 'junior1', label: '七年级' },
  { value: 'junior2', label: '八年级' },
  { value: 'junior3', label: '九年级' },
  { value: 'senior1', label: '高一' },
  { value: 'senior2', label: '高二' },
  { value: 'senior3', label: '高三' },
];

const DIFFICULTIES = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
];

export default function BatchEdit() {
  const [, params] = useRoute('/batch-edit/:sessionId');
  const sessionId = params?.sessionId ? parseInt(params.sessionId) : null;
  const [location, setLocation] = useLocation();
  // toast imported from sonner

  const [batchSubject, setBatchSubject] = useState<string>('');
  const [batchGrade, setBatchGrade] = useState<string>('');
  const [batchDifficulty, setBatchDifficulty] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const { data: session, isLoading: sessionLoading } = trpc.errorQuestions.getBatchSession.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const confirmMutation = trpc.errorQuestions.confirmBatchUpload.useMutation({
    onSuccess: () => {
      toast.success('批量确认成功', { description: '所有错题已保存到错题本' });
      setLocation('/error-questions');
    },
    onError: (error: any) => {
      toast.error('批量确认失败', { description: error.message });
    },
  });

  const updateItemMutation = trpc.errorQuestions.updateBatchItem.useMutation({
    onSuccess: () => {
      toast.success('更新成功', { description: '错题属性已更新' });
    },
    onError: (error: any) => {
      toast.error('更新失败', { description: error.message });
    },
  });

  useEffect(() => {
    if (session?.items && session.items.length > 0) {
      setSelectedItems(new Set(session.items.map((item: any) => item.id)));
    }
  }, [session]);

  if (!sessionId) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              无效的会话ID
            </CardTitle>
            <CardDescription>请从上传页面进入批量编辑</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/upload-error-question')}>
              返回上传页面
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              会话不存在
            </CardTitle>
            <CardDescription>该批量上传会话不存在或已过期</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/upload-error-question')}>
              返回上传页面
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleBatchUpdate = () => {
    const updates: any = {};
    if (batchSubject) updates.subject = batchSubject;
    if (batchGrade) updates.grade = batchGrade;
    if (batchDifficulty) updates.difficulty = batchDifficulty;

    if (Object.keys(updates).length === 0) {
      toast({
        title: '请选择要批量更新的属性',
        variant: 'destructive',
      });
      return;
    }

    const itemIds = Array.from(selectedItems);
    Promise.all(
      itemIds.map(itemId =>
        updateItemMutation.mutateAsync({ itemId, ...updates })
      )
    ).then(() => {
      toast({
        title: '批量更新成功',
        description: `已更新${itemIds.length}个错题`,
      });
      // 重新加载数据
      window.location.reload();
    });
  };

  const handleConfirm = () => {
    confirmMutation.mutate({ sessionId: sessionId! });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === session.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(session.items.map((item: any) => item.id)));
    }
  };

  const toggleSelectItem = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  return (
    <div className="container py-8 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">批量编辑错题</h1>
        <p className="text-muted-foreground mt-2">
          批量修改错题属性,然后确认保存到错题本
        </p>
      </div>

      {/* 批量操作面板 */}
      <Card>
        <CardHeader>
          <CardTitle>批量操作</CardTitle>
          <CardDescription>
            选择要批量修改的属性,将应用到所有选中的错题
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>科目</Label>
              <Select value={batchSubject} onValueChange={setBatchSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="选择科目" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(subject => (
                    <SelectItem key={subject.value} value={subject.value}>
                      {subject.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>年级</Label>
              <Select value={batchGrade} onValueChange={setBatchGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(grade => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>难度</Label>
              <Select value={batchDifficulty} onValueChange={setBatchDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="选择难度" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(difficulty => (
                    <SelectItem key={difficulty.value} value={difficulty.value}>
                      {difficulty.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleBatchUpdate}
              disabled={updateItemMutation.isPending || selectedItems.size === 0}
            >
              {updateItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              应用到选中项 ({selectedItems.size})
            </Button>
            <Button variant="outline" onClick={toggleSelectAll}>
              {selectedItems.size === session.items.length ? '取消全选' : '全选'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 错题列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            错题列表 ({session.items.length}个)
          </h2>
          <Button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending || session.items.length === 0}
            size="lg"
          >
            {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" />
            确认保存到错题本
          </Button>
        </div>

        {session.items.map((item: any, index: any) => (
          <Card key={item.id} className={selectedItems.has(item.id) ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleSelectItem(item.id)}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                  <div>
                    <CardTitle className="text-lg">错题 #{index + 1}</CardTitle>
                    <CardDescription>
                      OCR识别置信度: {(item.ocrConfidence * 100).toFixed(1)}%
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={item.subject ? 'default' : 'secondary'}>
                    {item.subject ? SUBJECTS.find(s => s.value === item.subject)?.label : '未设置科目'}
                  </Badge>
                  <Badge variant={item.grade ? 'default' : 'secondary'}>
                    {item.grade ? GRADES.find(g => g.value === item.grade)?.label : '未设置年级'}
                  </Badge>
                  <Badge variant={item.difficulty ? 'default' : 'secondary'}>
                    {item.difficulty ? DIFFICULTIES.find(d => d.value === item.difficulty)?.label : '未设置难度'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.imageUrl && (
                <div>
                  <Label>错题图片</Label>
                  <img
                    src={item.imageUrl}
                    alt="错题"
                    className="mt-2 max-w-full h-auto rounded-lg border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>题目内容</Label>
                <Textarea
                  value={item.questionContent || ''}
                  readOnly
                  rows={3}
                  className="resize-none"
                />
              </div>

              {item.studentAnswer && (
                <div className="space-y-2">
                  <Label>学生答案</Label>
                  <Textarea
                    value={item.studentAnswer}
                    readOnly
                    rows={2}
                    className="resize-none"
                  />
                </div>
              )}

              {item.correctAnswer && (
                <div className="space-y-2">
                  <Label>正确答案</Label>
                  <Textarea
                    value={item.correctAnswer}
                    readOnly
                    rows={2}
                    className="resize-none"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
