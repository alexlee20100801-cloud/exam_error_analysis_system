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
import { Loader2, Upload, FileText, Image as ImageIcon, FileCheck, Trash2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ImageCropper } from '@/components/ImageCropper';
import { Progress } from '@/components/ui/progress';
import { LatexText } from '@/components/LatexPreview';

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

interface FileItem {
  id: string;
  file: File;
  status: 'pending' | 'cropping' | 'parsing' | 'parsed' | 'error';
  preview?: string;
  croppedImages?: string[];
  parsedContent?: any;
  fileUrl?: string;
  error?: string;
}

interface ParsedQuestion {
  id: string;
  fileId: string;
  cropIndex?: number;
  parsedContent: any;
  fileUrl: string;
  formData: {
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
  };
  saved: boolean;
}

export default function DocumentUpload() {
  const [, setLocation] = useLocation();
  
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [currentCroppingFile, setCurrentCroppingFile] = useState<FileItem | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const uploadMutation = trpc.documentUpload.uploadAndParse.useMutation();
  const saveMutation = trpc.documentUpload.saveAsErrorQuestion.useMutation();

  // 处理文件选择（支持多文件）
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const newFileItems: FileItem[] = [];

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        toast.error(`文件 ${file.name} 类型不支持`, {
          description: '请上传图片（JPG/PNG）、PDF或Word文档'
        });
        continue;
      }

      const maxSize = file.type.startsWith('image/') ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`文件 ${file.name} 过大`, {
          description: `文件大小不能超过${file.type.startsWith('image/') ? '5MB' : '10MB'}`
        });
        continue;
      }

      const fileItem: FileItem = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending'
      };

      // 为图片生成预览
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileItems(prev => prev.map(item =>
            item.id === fileItem.id ? { ...item, preview: e.target?.result as string } : item
          ));
        };
        reader.readAsDataURL(file);
      }

      newFileItems.push(fileItem);
    }

    setFileItems(prev => [...prev, ...newFileItems]);
    toast.success(`已添加 ${newFileItems.length} 个文件`);
  }, []);

  // 删除文件
  const handleRemoveFile = (fileId: string) => {
    setFileItems(prev => prev.filter(item => item.id !== fileId));
    setParsedQuestions(prev => prev.filter(q => q.fileId !== fileId));
  };

  // 开始处理图片（显示裁剪界面）
  const handleStartCropping = (fileItem: FileItem) => {
    setCurrentCroppingFile(fileItem);
    setFileItems(prev => prev.map(item =>
      item.id === fileItem.id ? { ...item, status: 'cropping' } : item
    ));
  };

  // 裁剪完成
  const handleCropComplete = async (croppedImages: string[]) => {
    if (!currentCroppingFile) return;

    setFileItems(prev => prev.map(item =>
      item.id === currentCroppingFile.id
        ? { ...item, croppedImages, status: 'parsing' }
        : item
    ));

    setCurrentCroppingFile(null);

    // 解析裁剪后的图片
    await parseImages(currentCroppingFile.id, croppedImages);
  };

  // 跳过裁剪，直接识别全图
  const handleSkipCropping = async () => {
    if (!currentCroppingFile || !currentCroppingFile.preview) return;

    setFileItems(prev => prev.map(item =>
      item.id === currentCroppingFile.id
        ? { ...item, status: 'parsing' }
        : item
    ));

    const fileId = currentCroppingFile.id;
    setCurrentCroppingFile(null);

    // 解析原图
    await parseImages(fileId, [currentCroppingFile.preview]);
  };

  // 取消裁剪
  const handleCancelCropping = () => {
    if (currentCroppingFile) {
      setFileItems(prev => prev.map(item =>
        item.id === currentCroppingFile.id ? { ...item, status: 'pending' } : item
      ));
    }
    setCurrentCroppingFile(null);
  };

  // 解析图片
  const parseImages = async (fileId: string, images: string[]) => {
    try {
      const questions: ParsedQuestion[] = [];

      for (let i = 0; i < images.length; i++) {
        const base64 = images[i].split(',')[1];

        const result = await uploadMutation.mutateAsync({
          fileData: base64,
          fileName: `crop-${i + 1}.jpg`,
          mimeType: 'image/jpeg'
        });

        if (result.success && result.parsedContent) {
          const { structuredData } = result.parsedContent;
          
          questions.push({
            id: `${fileId}-${i}`,
            fileId,
            cropIndex: i,
            parsedContent: result.parsedContent,
            fileUrl: result.fileUrl || '',
            formData: {
              title: structuredData.title || '',
              content: structuredData.content || '',
              userAnswer: structuredData.userAnswer || '',
              correctAnswer: structuredData.correctAnswer || '',
              explanation: structuredData.explanation || '',
              subject: (structuredData.subject as any) || 'math',
              grade: 'junior1',
              schoolLevel: 'junior',
              difficulty: (structuredData.difficulty as any) || 'medium',
              semester: 'first'
            },
            saved: false
          });
        }
      }

      setParsedQuestions(prev => [...prev, ...questions]);

      setFileItems(prev => prev.map(item =>
        item.id === fileId ? { ...item, status: 'parsed' } : item
      ));

      toast.success(`成功解析 ${questions.length} 个题目`);
    } catch (error: any) {
      setFileItems(prev => prev.map(item =>
        item.id === fileId ? { ...item, status: 'error', error: error.message } : item
      ));
      toast.error('解析失败', {
        description: error.message || '请重试'
      });
    }
  };

  // 批量处理所有文件
  const handleProcessAll = async () => {
    const pendingFiles = fileItems.filter(item => item.status === 'pending');
    
    if (pendingFiles.length === 0) {
      toast.error('没有待处理的文件');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileItem = pendingFiles[i];
      
      // 更新进度
      setProcessingProgress(((i + 1) / pendingFiles.length) * 100);

      if (fileItem.file.type.startsWith('image/')) {
        // 图片文件：跳过裁剪，直接识别全图
        if (fileItem.preview) {
          setFileItems(prev => prev.map(item =>
            item.id === fileItem.id ? { ...item, status: 'parsing' } : item
          ));
          await parseImages(fileItem.id, [fileItem.preview]);
        }
      } else {
        // 非图片文件：直接上传解析
        try {
          setFileItems(prev => prev.map(item =>
            item.id === fileItem.id ? { ...item, status: 'parsing' } : item
          ));

          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Data = e.target?.result as string;
            const base64 = base64Data.split(',')[1];

            const result = await uploadMutation.mutateAsync({
              fileData: base64,
              fileName: fileItem.file.name,
              mimeType: fileItem.file.type
            });

            if (result.success && result.parsedContent) {
              const { structuredData } = result.parsedContent;
              
              setParsedQuestions(prev => [...prev, {
                id: fileItem.id,
                fileId: fileItem.id,
                parsedContent: result.parsedContent,
                fileUrl: result.fileUrl || '',
                formData: {
                  title: structuredData.title || '',
                  content: structuredData.content || '',
                  userAnswer: structuredData.userAnswer || '',
                  correctAnswer: structuredData.correctAnswer || '',
                  explanation: structuredData.explanation || '',
                  subject: (structuredData.subject as any) || 'math',
                  grade: 'junior1',
                  schoolLevel: 'junior',
                  difficulty: (structuredData.difficulty as any) || 'medium',
                  semester: 'first'
                },
                saved: false
              }]);

              setFileItems(prev => prev.map(item =>
                item.id === fileItem.id ? { ...item, status: 'parsed' } : item
              ));
            }
          };
          reader.readAsDataURL(fileItem.file);
        } catch (error: any) {
          setFileItems(prev => prev.map(item =>
            item.id === fileItem.id ? { ...item, status: 'error', error: error.message } : item
          ));
        }
      }
    }

    setIsProcessing(false);
    toast.success('批量处理完成');
  };

  // 更新题目表单数据
  const updateQuestionFormData = (questionId: string, updates: Partial<ParsedQuestion['formData']>) => {
    setParsedQuestions(prev => prev.map(q =>
      q.id === questionId ? { ...q, formData: { ...q.formData, ...updates } } : q
    ));
  };

  // 保存单个题目
  const handleSaveQuestion = async (question: ParsedQuestion) => {
    if (!question.formData.title || !question.formData.content) {
      toast.error('信息不完整', {
        description: '请至少填写题目标题和内容'
      });
      return;
    }

    try {
      const result = await saveMutation.mutateAsync({
        ...question.formData,
        imageUrl: question.fileUrl
      });

      if (result.success) {
        setParsedQuestions(prev => prev.map(q =>
          q.id === question.id ? { ...q, saved: true } : q
        ));
        toast.success('保存成功');
      }
    } catch (error: any) {
      toast.error('保存失败', {
        description: error.message || '请重试'
      });
    }
  };

  // 批量保存所有题目
  const handleSaveAll = async () => {
    const unsavedQuestions = parsedQuestions.filter(q => !q.saved);
    
    if (unsavedQuestions.length === 0) {
      toast.info('所有题目已保存');
      return;
    }

    let successCount = 0;
    for (const question of unsavedQuestions) {
      try {
        const result = await saveMutation.mutateAsync({
          ...question.formData,
          imageUrl: question.fileUrl
        });

        if (result.success) {
          setParsedQuestions(prev => prev.map(q =>
            q.id === question.id ? { ...q, saved: true } : q
          ));
          successCount++;
        }
      } catch (error) {
        console.error('保存失败:', error);
      }
    }

    toast.success(`成功保存 ${successCount} 个题目`);
    
    if (successCount === unsavedQuestions.length) {
      setTimeout(() => {
        setLocation('/error-questions');
      }, 1000);
    }
  };

  // 如果正在裁剪，显示裁剪界面
  if (currentCroppingFile && currentCroppingFile.preview) {
    return (
      <div className="container max-w-6xl py-8">
        <ImageCropper
          imageUrl={currentCroppingFile.preview}
          onCropComplete={handleCropComplete}
          onSkip={handleSkipCropping}
          onCancel={handleCancelCropping}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">多格式错题上传</h1>
        <p className="text-muted-foreground mt-2">
          支持批量上传图片、Word文档、PDF文档，自动提取题目信息
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
            <br />
            可一次选择多个文件进行批量上传
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf,.doc,.docx"
              onChange={handleFileSelect}
              multiple
            />
          </div>

          {/* 文件列表 */}
          {fileItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">文件列表 ({fileItems.length})</h3>
                <div className="flex gap-2">
                  {fileItems.some(f => f.status === 'pending') && (
                    <Button
                      onClick={handleProcessAll}
                      disabled={isProcessing}
                      size="sm"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        '批量处理全部'
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={processingProgress} />
                  <p className="text-sm text-muted-foreground text-center">
                    处理进度: {Math.round(processingProgress)}%
                  </p>
                </div>
              )}

              <div className="grid gap-3">
                {fileItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-muted rounded-lg"
                  >
                    {item.file.type.startsWith('image/') ? (
                      <ImageIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileText className="h-8 w-8 text-green-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        {item.status === 'parsing' && ' • 解析中...'}
                        {item.status === 'parsed' && ' • 已解析'}
                        {item.status === 'cropping' && ' • 框选中...'}
                        {item.status === 'error' && ` • 错误: ${item.error}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {item.status === 'pending' && item.file.type.startsWith('image/') && (
                        <Button
                          size="sm"
                          onClick={() => handleStartCropping(item)}
                        >
                          框选区域
                        </Button>
                      )}
                      {item.status === 'parsed' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {item.status === 'parsing' && (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(item.id)}
                        disabled={item.status === 'parsing'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 解析结果列表 */}
      {parsedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              识别结果 ({parsedQuestions.length} 个题目)
            </h2>
            <Button
              onClick={handleSaveAll}
              disabled={parsedQuestions.every(q => q.saved) || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                `批量保存全部 (${parsedQuestions.filter(q => !q.saved).length})`
              )}
            </Button>
          </div>

          {parsedQuestions.map((question, index) => (
            <Card key={question.id} className={question.saved ? 'opacity-60' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>题目 {index + 1}</span>
                  {question.saved && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      已保存
                    </Badge>
                  )}
                  <div className="flex gap-2">
                    {question.parsedContent && (
                      <Badge variant="outline">
                        置信度: {(question.parsedContent.confidence * 100).toFixed(0)}%
                      </Badge>
                    )}
                    {question.parsedContent?.hasFormulas && (
                      <Badge variant="secondary" className="gap-1">
                        <FileCheck className="h-3 w-3" />
                        包含公式
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>学科</Label>
                    <Select
                      value={question.formData.subject}
                      onValueChange={(value: any) =>
                        updateQuestionFormData(question.id, { subject: value })
                      }
                      disabled={question.saved}
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
                    <Label>年级</Label>
                    <Select
                      value={question.formData.grade}
                      onValueChange={(value: any) => {
                        const schoolLevel = value.startsWith('junior') ? 'junior' : 'senior';
                        updateQuestionFormData(question.id, { grade: value, schoolLevel });
                      }}
                      disabled={question.saved}
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
                    <Label>难度</Label>
                    <Select
                      value={question.formData.difficulty}
                      onValueChange={(value: any) =>
                        updateQuestionFormData(question.id, { difficulty: value })
                      }
                      disabled={question.saved}
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
                    <Label>学期</Label>
                    <Select
                      value={question.formData.semester}
                      onValueChange={(value: any) =>
                        updateQuestionFormData(question.id, { semester: value })
                      }
                      disabled={question.saved}
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
                  <Label>题目标题 *</Label>
                  <Input
                    value={question.formData.title}
                    onChange={(e) =>
                      updateQuestionFormData(question.id, { title: e.target.value })
                    }
                    placeholder="例如：二次函数的应用"
                    disabled={question.saved}
                  />
                </div>

                <div className="space-y-2">
                  <Label>题目内容 *</Label>
                  <Textarea
                    value={question.formData.content}
                    onChange={(e) =>
                      updateQuestionFormData(question.id, { content: e.target.value })
                    }
                    placeholder="完整的题目内容（公式已自动转换为LaTeX格式）"
                    rows={4}
                    disabled={question.saved}
                    className="font-mono text-sm"
                  />
                  {question.formData.content && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-2">预览：</p>
                      <LatexText text={question.formData.content} className="prose dark:prose-invert max-w-none text-sm" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>我的答案</Label>
                    <Textarea
                      value={question.formData.userAnswer}
                      onChange={(e) =>
                        updateQuestionFormData(question.id, { userAnswer: e.target.value })
                      }
                      placeholder="你当时的答案（公式已自动转换为LaTeX格式）"
                      rows={3}
                      disabled={question.saved}
                      className="font-mono text-sm"
                    />
                    {question.formData.userAnswer && (
                      <div className="p-2 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">预览：</p>
                        <LatexText text={question.formData.userAnswer} className="prose dark:prose-invert max-w-none text-sm" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>正确答案</Label>
                    <Textarea
                      value={question.formData.correctAnswer}
                      onChange={(e) =>
                        updateQuestionFormData(question.id, { correctAnswer: e.target.value })
                      }
                      placeholder="标准答案（公式已自动转换为LaTeX格式）"
                      rows={3}
                      disabled={question.saved}
                      className="font-mono text-sm"
                    />
                    {question.formData.correctAnswer && (
                      <div className="p-2 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">预览：</p>
                        <LatexText text={question.formData.correctAnswer} className="prose dark:prose-invert max-w-none text-sm" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>详细解析</Label>
                  <Textarea
                    value={question.formData.explanation}
                    onChange={(e) =>
                      updateQuestionFormData(question.id, { explanation: e.target.value })
                    }
                    placeholder="题目的详细解析和解题思路（公式已自动转换为LaTeX格式）"
                    rows={3}
                    disabled={question.saved}
                    className="font-mono text-sm"
                  />
                  {question.formData.explanation && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-2">预览：</p>
                      <LatexText text={question.formData.explanation} className="prose dark:prose-invert max-w-none text-sm" />
                    </div>
                  )}
                </div>

                {!question.saved && (
                  <Button
                    onClick={() => handleSaveQuestion(question)}
                    disabled={saveMutation.isPending}
                    className="w-full"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      '保存此题目'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
