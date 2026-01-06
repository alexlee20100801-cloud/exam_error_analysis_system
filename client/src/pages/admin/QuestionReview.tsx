import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Edit, Eye, AlertCircle, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

const SUBJECT_NAMES: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  politics: '政治',
  history: '历史',
  geography: '地理',
};

const GRADE_NAMES: Record<string, string> = {
  grade7: '初一',
  grade8: '初二',
  grade9: '初三',
  grade10: '高一',
  grade11: '高二',
  grade12: '高三',
};

const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const STATUS_NAMES: Record<string, string> = {
  pending: '待审核',
  approved: '已批准',
  rejected: '已拒绝',
  needs_revision: '需修改',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  needs_revision: 'bg-blue-100 text-blue-800',
};

export default function QuestionReview() {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'word' | 'markdown'>('word');
  const [includeAnswer, setIncludeAnswer] = useState(true);
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    answer: '',
    explanation: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  });

  const utils = trpc.useUtils();
  const pageSize = 10;

  // 获取待审核题目
  const { data: pendingData, isLoading: pendingLoading } = trpc.questionReview.getPendingQuestions.useQuery({
    subject: selectedSubject || undefined,
    grade: selectedGrade || undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  // 获取审核统计
  const { data: stats } = trpc.questionReview.getStats.useQuery();

  // 审核题目
  const reviewMutation = trpc.questionReview.reviewQuestion.useMutation({
    onSuccess: (data) => {
      toast.success(`题目已${data.newStatus === 'approved' ? '批准' : data.newStatus === 'rejected' ? '拒绝' : '标记为需修改'}`);
      utils.questionReview.getPendingQuestions.invalidate();
      utils.questionReview.getStats.invalidate();
      setShowDetailDialog(false);
      setReviewNotes('');
    },
    onError: (error) => {
      toast.error(`审核失败: ${error.message}`);
    },
  });

  // 修改题目
  const modifyMutation = trpc.questionReview.modifyQuestion.useMutation({
    onSuccess: () => {
      toast.success('题目已修改');
      utils.questionReview.getPendingQuestions.invalidate();
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error(`修改失败: ${error.message}`);
    },
  });

  const handleViewDetail = (question: any) => {
    setSelectedQuestion(question);
    setShowDetailDialog(true);
  };

  const handleEdit = (question: any) => {
    setSelectedQuestion(question);
    setEditForm({
      title: question.title,
      content: question.content,
      answer: question.answer,
      explanation: question.explanation || '',
      difficulty: question.difficulty,
    });
    setShowEditDialog(true);
  };

  const handleReview = (action: 'approve' | 'reject' | 'request_revision') => {
    if (!selectedQuestion) return;

    reviewMutation.mutate({
      questionId: selectedQuestion.id,
      action,
      notes: reviewNotes || undefined,
    });
  };

  // 导出题目
  const exportMutation = trpc.questionExport.exportQuestions.useMutation({
    onSuccess: (data) => {
      toast.success('导出成功，正在下载...');
      // 下载文件
      const link = document.createElement('a');
      link.href = data.url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportDialog(false);
      setSelectedQuestions([]);
    },
    onError: (error) => {
      toast.error(`导出失败: ${error.message}`);
    },
  });

  const handleToggleQuestion = (questionId: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleExport = () => {
    if (selectedQuestions.length === 0) {
      toast.error('请选择要导出的题目');
      return;
    }
    setShowExportDialog(true);
  };

  const handleConfirmExport = () => {
    exportMutation.mutate({
      questionIds: selectedQuestions,
      format: exportFormat,
      includeAnswer,
      includeExplanation,
      title: '审核题目集',
    });
  };

  const handleSaveEdit = () => {
    if (!selectedQuestion) return;

    modifyMutation.mutate({
      questionId: selectedQuestion.id,
      updates: editForm,
      notes: '管理员修改了题目内容',
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">题目审核管理</h1>
          <p className="text-muted-foreground mt-2">
            审核AI生成的题目，确保题目质量
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          {stats.totalStats.map((stat) => (
            <Card key={stat.status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {STATUS_NAMES[stat.status]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>学科</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="全部学科" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部学科</SelectItem>
                {Object.entries(SUBJECT_NAMES).map(([key, name]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>年级</Label>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger>
                <SelectValue placeholder="全部年级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部年级</SelectItem>
                {Object.entries(GRADE_NAMES).map(([key, name]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>待审核题目</CardTitle>
              <CardDescription>
                共 {pendingData?.total || 0} 道题目待审核
                {selectedQuestions.length > 0 && (
                  <span className="ml-2">（已选择 {selectedQuestions.length} 道）</span>
                )}
              </CardDescription>
            </div>
            {selectedQuestions.length > 0 && (
              <Button onClick={handleExport} disabled={exportMutation.isPending}>
                <Download className="h-4 w-4 mr-1" />
                导出选中题目
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : !pendingData?.questions.length ? (
            <div className="text-center py-8 text-muted-foreground">暂无待审核题目</div>
          ) : (
            <div className="space-y-4">
              {pendingData.questions.map((question: any) => (
                <Card key={question.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(question.id)}
                        onChange={() => handleToggleQuestion(question.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{question.title}</h3>
                          <Badge className={STATUS_COLORS[question.reviewStatus]}>
                            {STATUS_NAMES[question.reviewStatus]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{SUBJECT_NAMES[question.subject]}</span>
                          <span>{GRADE_NAMES[question.grade]}</span>
                          <span>{DIFFICULTY_NAMES[question.difficulty]}</span>
                          <span>
                            {new Date(question.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{question.content}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(question)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(question)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          编辑
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 分页 */}
          {pendingData && pendingData.total > pageSize && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {currentPage + 1} 页 / 共 {Math.ceil(pendingData.total / pageSize)} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(currentPage + 1) * pageSize >= pendingData.total}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 查看详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>题目详情</DialogTitle>
            <DialogDescription>审核AI生成的题目</DialogDescription>
          </DialogHeader>

          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <Label>标题</Label>
                <p className="mt-1">{selectedQuestion.title}</p>
              </div>

              <div>
                <Label>题目内容</Label>
                <p className="mt-1 whitespace-pre-wrap">{selectedQuestion.content}</p>
              </div>

              <div>
                <Label>答案</Label>
                <p className="mt-1 whitespace-pre-wrap">{selectedQuestion.answer}</p>
              </div>

              {selectedQuestion.explanation && (
                <div>
                  <Label>解析</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedQuestion.explanation}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>学科</Label>
                  <p className="mt-1">{SUBJECT_NAMES[selectedQuestion.subject]}</p>
                </div>
                <div>
                  <Label>年级</Label>
                  <p className="mt-1">{GRADE_NAMES[selectedQuestion.grade]}</p>
                </div>
                <div>
                  <Label>难度</Label>
                  <p className="mt-1">{DIFFICULTY_NAMES[selectedQuestion.difficulty]}</p>
                </div>
              </div>

              <div>
                <Label>审核意见（可选）</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="请输入审核意见..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReview('reject')}
              disabled={reviewMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              拒绝
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview('request_revision')}
              disabled={reviewMutation.isPending}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              需修改
            </Button>
            <Button
              onClick={() => handleReview('approve')}
              disabled={reviewMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              批准
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑题目</DialogTitle>
            <DialogDescription>修改题目内容</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>标题</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>题目内容</Label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                className="mt-1"
                rows={6}
              />
            </div>

            <div>
              <Label>答案</Label>
              <Textarea
                value={editForm.answer}
                onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label>解析</Label>
              <Textarea
                value={editForm.explanation}
                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label>难度</Label>
              <Select
                value={editForm.difficulty}
                onValueChange={(value: any) => setEditForm({ ...editForm, difficulty: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={modifyMutation.isPending}
            >
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导出对话框 */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导出题目</DialogTitle>
            <DialogDescription>
              将选中的 {selectedQuestions.length} 道题目导出为文件
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>导出格式</Label>
              <Select
                value={exportFormat}
                onValueChange={(value: any) => setExportFormat(value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word">Word文档 (.docx)</SelectItem>
                  <SelectItem value="markdown">Markdown (.md)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>导出选项</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeAnswer"
                  checked={includeAnswer}
                  onChange={(e) => setIncludeAnswer(e.target.checked)}
                />
                <label htmlFor="includeAnswer" className="text-sm">
                  包含答案
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeExplanation"
                  checked={includeExplanation}
                  onChange={(e) => setIncludeExplanation(e.target.checked)}
                />
                <label htmlFor="includeExplanation" className="text-sm">
                  包含解析
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmExport}
              disabled={exportMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-1" />
              确认导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
