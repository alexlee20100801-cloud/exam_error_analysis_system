import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Image as ImageIcon, FileCheck } from 'lucide-react';
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

export default function DocumentUpload() {
  const [, setLocation] = useLocation();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedContent, setParsedContent] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  
  // 表单数据
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    subject: 'chinese' | 'math' | 'english' | 'physics' | 'chemistry' | 'biology' | 'politics' | 'history' | 'geography';
    grade: 'junior1' | 'junior2' | 'junior3' | 'senior1' | 'senior2' | 'senior3';
    schoolLevel: 'junior' | 'senior';
    difficulty: 'easy' | 'medium' | 'hard';
    semester: 'first' | 'second';
  }>({
    title: '',
    content: '',
    userAnswer: '',
    correctAnswer: '',
    explanation: '',
    subject: 'math',
    grade: 'junior1',
    schoolLevel: 'junior',
    difficulty: 'medium',
    semester: 'first'
  });

  const uploadMutation = trpc.documentUpload.uploadAndParse.useMutation();
  const saveMutation = trpc.documentUpload.saveAsErrorQuestion.useMutation();

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('文件类型不支持', {
        description: '请上传图片（JPG/PNG）、PDF或Word文档'
      });
      return;
    }

    // 验证文件大小
    const maxSize = file.type.startsWith('image/') ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('文件过大', {
        description: `文件大小不能超过${file.type.startsWith('image/') ? '5MB' : '10MB'}`
      });
      return;
    }

    setSelectedFile(file);
    setParsedContent(null);
  }, []);

  // 上传并解析文档
  const handleUploadAndParse = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // 将文件转换为Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64 = base64Data.split(',')[1]; // 移除data:image/...;base64,前缀

        const result = await uploadMutation.mutateAsync({
          fileData: base64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type
        });

        if (result.success && result.parsedContent) {
          setParsedContent(result.parsedContent);
          setFileUrl(result.fileUrl || '');
          
          // 自动填充表单
          const { structuredData } = result.parsedContent;
          setFormData(prev => ({
            ...prev,
            title: structuredData.title || prev.title,
            content: structuredData.content || prev.content,
            userAnswer: structuredData.userAnswer || prev.userAnswer,
            correctAnswer: structuredData.correctAnswer || prev.correctAnswer,
            explanation: structuredData.explanation || prev.explanation,
            subject: (structuredData.subject as any) || prev.subject,
            difficulty: (structuredData.difficulty as any) || prev.difficulty
          }));

          toast.success('解析成功', {
            description: `文档已成功解析（置信度：${(result.parsedContent.confidence * 100).toFixed(0)}%）`
          });
        } else {
          toast.error('解析失败', {
            description: result.error || '文档解析失败，请重试'
          });
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      toast.error('上传失败', {
        description: error.message || '文件上传失败，请重试'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 保存错题
  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error('信息不完整', {
        description: '请至少填写题目标题和内容'
      });
      return;
    }

    try {
      const result = await saveMutation.mutateAsync({
        ...formData,
        imageUrl: fileUrl
      });

      if (result.success) {
        toast.success('保存成功', {
          description: '错题已成功添加到错题本'
        });
        setLocation('/error-book');
      }
    } catch (error: any) {
      toast.error('保存失败', {
        description: error.message || '保存错题失败，请重试'
      });
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">多格式错题上传</h1>
        <p className="text-muted-foreground mt-2">
          支持图片OCR识别、Word文档、PDF文档，自动提取题目信息
        </p>
      </div>

      {/* 文件上传区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            上传文档
          </CardTitle>
          <CardDescription>
            支持格式：图片（JPG/PNG，最大5MB）、PDF文档（最大10MB）、Word文档（.docx/.doc，最大10MB）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf,.doc,.docx"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              {selectedFile.type.startsWith('image/') ? (
                <ImageIcon className="h-8 w-8 text-blue-500" />
              ) : (
                <FileText className="h-8 w-8 text-green-500" />
              )}
              <div className="flex-1">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                onClick={handleUploadAndParse}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  '开始解析'
                )}
              </Button>
            </div>
          )}

          {parsedContent && (
            <Alert>
              <FileCheck className="h-4 w-4" />
              <AlertDescription>
                文档解析完成！置信度：{(parsedContent.confidence * 100).toFixed(0)}%
                <br />
                请检查并校正下方识别的内容，然后保存。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 内容校正表单 */}
      {parsedContent && (
        <Card>
          <CardHeader>
            <CardTitle>校正识别内容</CardTitle>
            <CardDescription>
              请检查并修改AI识别的内容，确保准确无误
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">学科</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value: any) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="grade">年级</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value: any) => {
                    const schoolLevel = value.startsWith('junior') ? 'junior' : 'senior';
                    setFormData({ ...formData, grade: value, schoolLevel });
                  }}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="difficulty">难度</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">简单</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困难</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">学期</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value: any) => setFormData({ ...formData, semester: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">上学期</SelectItem>
                    <SelectItem value="second">下学期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">题目标题 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：二次函数的应用"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">题目内容 *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="完整的题目内容"
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userAnswer">我的答案</Label>
                <Textarea
                  id="userAnswer"
                  value={formData.userAnswer}
                  onChange={(e) => setFormData({ ...formData, userAnswer: e.target.value })}
                  placeholder="你当时的答案"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="correctAnswer">正确答案</Label>
                <Textarea
                  id="correctAnswer"
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  placeholder="标准答案"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation">详细解析</Label>
              <Textarea
                id="explanation"
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="题目的详细解析和解题思路"
                rows={4}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存错题'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/error-book')}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
