import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/RichTextEditor';
import { toast } from 'sonner';
import { ArrowLeft, Save, Eye, Code } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// 学科映射
const SUBJECT_MAP: Record<string, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  politics: '道法',
  history: '历史',
  geography: '地理'
};

// 年级映射
const GRADE_MAP: Record<string, string> = {
  junior1: '初一',
  junior2: '初二',
  junior3: '初三',
  senior1: '高一',
  senior2: '高二',
  senior3: '高三'
};

export default function DocumentEditor() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/document-editor/:id');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    userAnswer: '',
    correctAnswer: '',
    explanation: '',
    subject: 'math' as const,
    grade: 'junior1' as const,
    schoolLevel: 'junior' as const,
    difficulty: 'medium' as const,
    semester: 'first' as const
  });

  const [activeTab, setActiveTab] = useState<'content' | 'userAnswer' | 'correctAnswer' | 'explanation'>('content');
  const [isSaving, setIsSaving] = useState(false);

  // 如果有ID，加载现有数据
  const { data: errorQuestion, isLoading } = trpc.errorQuestions.getById.useQuery(
    // @ts-ignore
    { questionId: parseInt(params?.id || '0') },
    // @ts-ignore
    { enabled: !!params?.id }
  );

  // @ts-ignore
  const saveMutation = trpc.documentUpload.saveAsErrorQuestion.useMutation();
  const updateMutation = trpc.errorQuestions.update.useMutation();

  useEffect(() => {
    if (errorQuestion) {
      setFormData({
        title: errorQuestion.title || '',
        content: errorQuestion.content || '',
        userAnswer: errorQuestion.userAnswer || '',
        correctAnswer: errorQuestion.correctAnswer || '',
        // @ts-ignore
        explanation: errorQuestion.explanation || '',
        subject: errorQuestion.subject as any,
        grade: errorQuestion.grade as any,
        schoolLevel: errorQuestion.schoolLevel as any,
        difficulty: errorQuestion.difficulty as any,
        semester: errorQuestion.semester as any
      });
    }
  }, [errorQuestion]);

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error('信息不完整', {
        description: '请至少填写题目标题和内容'
      });
      return;
    }

    setIsSaving(true);
    try {
      // @ts-ignore
      if (params?.id) {
        // 更新现有题目
        const result = await updateMutation.mutateAsync({
          // @ts-ignore
          id: parseInt(params.id),
          ...formData
        });
        
        if (result.success) {
          toast.success('保存成功');
          setLocation('/error-questions');
        }
      } else {
        // 创建新题目
        const result = await saveMutation.mutateAsync({
          ...formData,
          imageUrl: ''
        });
        
        if (result.success) {
          toast.success('保存成功');
          setLocation('/error-questions');
        }
      }
    } catch (error: any) {
      toast.error('保存失败', {
        description: error.message || '请重试'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/error-questions')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {params && (params as any).id ? '编辑错题' : '新建错题'}
            </h1>
            <p className="text-muted-foreground mt-1">
              使用富文本编辑器编辑题目内容
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          💡 提示：使用富文本编辑器可以添加格式、列表、表格等，让内容更易读。支持数学公式、图片插入等功能。
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：基本信息 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>设置题目的基本属性</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">题目标题 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：二次函数最值问题"
              />
            </div>

            <div>
              <Label htmlFor="subject">学科 *</Label>
              <Select
                value={formData.subject}
                onValueChange={(value: any) => setFormData({ ...formData, subject: value })}
              >
                <SelectTrigger id="subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUBJECT_MAP).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="grade">年级 *</Label>
              <Select
                value={formData.grade}
                onValueChange={(value: any) => {
                  const schoolLevel = value.startsWith('junior') ? 'junior' : 'senior';
                  // @ts-ignore
                  setFormData({ ...formData, grade: value, schoolLevel });
                }}
              >
                <SelectTrigger id="grade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GRADE_MAP).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">难度</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="semester">学期</Label>
              <Select
                value={formData.semester}
                onValueChange={(value: any) => setFormData({ ...formData, semester: value })}
              >
                <SelectTrigger id="semester">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">上学期</SelectItem>
                  <SelectItem value="second">下学期</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 右侧：内容编辑 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>题目内容</CardTitle>
            <CardDescription>使用富文本编辑器编辑各部分内容</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content">题目内容</TabsTrigger>
                <TabsTrigger value="userAnswer">我的答案</TabsTrigger>
                <TabsTrigger value="correctAnswer">正确答案</TabsTrigger>
                <TabsTrigger value="explanation">解析</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-4">
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  placeholder="输入题目内容..."
                  className="min-h-[400px]"
                />
              </TabsContent>

              <TabsContent value="userAnswer" className="mt-4">
                <RichTextEditor
                  content={formData.userAnswer}
                  onChange={(userAnswer) => setFormData({ ...formData, userAnswer })}
                  placeholder="输入你的答案..."
                  className="min-h-[400px]"
                />
              </TabsContent>

              <TabsContent value="correctAnswer" className="mt-4">
                <RichTextEditor
                  content={formData.correctAnswer}
                  onChange={(correctAnswer) => setFormData({ ...formData, correctAnswer })}
                  placeholder="输入正确答案..."
                  className="min-h-[400px]"
                />
              </TabsContent>

              <TabsContent value="explanation" className="mt-4">
                <RichTextEditor
                  content={formData.explanation}
                  onChange={(explanation) => setFormData({ ...formData, explanation })}
                  placeholder="输入解析..."
                  className="min-h-[400px]"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
