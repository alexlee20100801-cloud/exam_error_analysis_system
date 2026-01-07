import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ImageRegionSelector, Region } from '@/components/ImageRegionSelector';
import { trpc } from '@/lib/trpc';
import { Upload, FileText, Image, FileSpreadsheet, Loader2, Check, ArrowRight, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

/**
 * 智能文档处理页面
 * 支持多格式上传、可视化框选、AI识别、手写笔迹清除、多格式导出
 */
export function SmartDocumentProcessor() {
  const [, setLocation] = useLocation();
  // Using sonner toast
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'select' | 'processing' | 'result'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [recognizedContents, setRecognizedContents] = useState<any[]>([]);

  const uploadMutation = trpc.documentUpload.upload.useMutation();
  const createRegionMutation = trpc.documentUpload.createRegion.useMutation();
  const recognizeContentMutation = trpc.documentUpload.recognizeContent.useMutation();
  const updateStatusMutation = trpc.documentUpload.updateStatus.useMutation();
  const exportMutation = trpc.documentUpload.export.useMutation();
  const { data: documentContents } = trpc.documentUpload.getDocumentContents.useQuery(
    { documentId: documentId! },
    { enabled: !!documentId && step === 'result' }
  );

  // 文件选择处理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('文件类型不支持', {
        description: '请上传图片、PDF或Word文档',
      });
      return;
    }

    // 验证文件大小（最大50MB）
    if (file.size > 50 * 1024 * 1024) {
      toast.error('文件过大', {
        description: '文件大小不能超过50MB',
      });
      return;
    }

    setSelectedFile(file);

    // 生成预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 上传文件
  const handleUpload = async () => {
    if (!selectedFile || !previewUrl) return;

    try {
      // 转换为base64
      const base64 = previewUrl.split(',')[1];

      // 确定文件类型
      let fileType: 'image' | 'pdf' | 'word' = 'image';
      if (selectedFile.type === 'application/pdf') {
        fileType = 'pdf';
      } else if (selectedFile.type.includes('word')) {
        fileType = 'word';
      }

      // 上传文件
      const result = await uploadMutation.mutateAsync({
        fileName: selectedFile.name,
        fileType,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        fileData: base64,
      });

      setDocumentId(result.id);
      setPreviewUrl(result.fileUrl);
      setStep('select');

      toast.success('上传成功', {
        description: '请框选需要识别的区域',
      });
    } catch (error: any) {
      toast.error('上传失败', {
        description: error.message || '请稍后重试',
      });
    }
  };

  // 确认框选区域
  const handleConfirmRegions = async () => {
    if (!documentId || regions.length === 0) {
      toast.error('请框选区域', {
        description: '至少需要框选一个区域',
      });
      return;
    }

    setStep('processing');
    setProcessingProgress(0);

    try {
      // 更新文档状态
      await updateStatusMutation.mutateAsync({
        documentId,
        status: 'processing',
      });

      const contents: any[] = [];

      // 创建所有区域并识别
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];

        // 创建区域
        const regionResult = await createRegionMutation.mutateAsync({
          documentId,
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          regionType: region.type,
          needsHandwritingRemoval: true,
        });

        // 识别内容
        const contentResult = await recognizeContentMutation.mutateAsync({
          regionId: regionResult.id,
          documentId,
          imageUrl: previewUrl!,
          regionType: region.type,
        });

        contents.push({
          ...contentResult,
          regionType: region.type,
        });

        // 更新进度
        setProcessingProgress(Math.round(((i + 1) / regions.length) * 100));
      }

      // 更新文档状态为完成
      await updateStatusMutation.mutateAsync({
        documentId,
        status: 'completed',
      });

      setRecognizedContents(contents);
      setStep('result');

      toast.success('处理完成', {
        description: `成功识别 ${regions.length} 个区域`,
      });
    } catch (error: any) {
      toast.error('处理失败', {
        description: error.message || '请稍后重试',
      });

      // 更新文档状态为失败
      if (documentId) {
        await updateStatusMutation.mutateAsync({
          documentId,
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }
  };

  // 导出文档
  const handleExport = async (format: 'word' | 'pdf' | 'markdown' | 'latex' | 'json') => {
    if (!documentId) return;

    try {
      const result = await exportMutation.mutateAsync({
        documentId,
        format,
        config: {
          includeImages: true,
          includeMetadata: true,
        },
      });

      // 下载文件
      window.open(result.fileUrl, '_blank');

      toast.success('导出成功', {
        description: `已生成 ${format.toUpperCase()} 文件`,
      });
    } catch (error: any) {
      toast.error('导出失败', {
        description: error.message || '请稍后重试',
      });
    }
  };

  // 重新开始
  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewUrl(null);
    setDocumentId(null);
    setRegions([]);
    setProcessingProgress(0);
    setRecognizedContents([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">智能文档处理系统</h1>
        <p className="text-muted-foreground">
          上传文档 → 框选区域 → AI识别 → 清除笔迹 → 导出多格式
        </p>
      </div>

      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="font-medium">上传</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-4" />
          <div className={`flex items-center gap-2 ${step === 'select' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="font-medium">框选</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-4" />
          <div className={`flex items-center gap-2 ${step === 'processing' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'processing' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="font-medium">识别</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-4" />
          <div className={`flex items-center gap-2 ${step === 'result' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'result' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              4
            </div>
            <span className="font-medium">结果</span>
          </div>
        </div>
      </div>

      {/* 上传步骤 */}
      {step === 'upload' && (
        <Card className="p-8">
          <div className="max-w-xl mx-auto">
            <div className="mb-6">
              <Label htmlFor="file-upload" className="text-base font-medium">
                选择文件
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                支持 JPG、PNG、HEIC、PDF、Word 格式，最大 50MB
              </p>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                {selectedFile ? selectedFile.name : '点击或拖拽文件到这里'}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : '支持多种格式'}
              </p>
            </div>

            <Input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />

            {previewUrl && (
              <div className="mt-6">
                <img
                  src={previewUrl}
                  alt="预览"
                  className="max-w-full max-h-96 mx-auto rounded-lg border"
                />
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    下一步
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 框选步骤 */}
      {step === 'select' && previewUrl && (
        <div className="space-y-4">
          <ImageRegionSelector
            imageUrl={previewUrl}
            regions={regions}
            onRegionsChange={setRegions}
          />

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={handleReset}>
              重新上传
            </Button>
            <Button
              size="lg"
              onClick={handleConfirmRegions}
              disabled={regions.length === 0 || createRegionMutation.isPending}
            >
              {createRegionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  开始识别 ({regions.length} 个区域)
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 处理步骤 */}
      {step === 'processing' && (
        <Card className="p-8">
          <div className="max-w-xl mx-auto text-center">
            <Loader2 className="h-16 w-16 mx-auto mb-6 text-blue-600 animate-spin" />
            <h2 className="text-2xl font-bold mb-4">AI 正在识别内容...</h2>
            <p className="text-muted-foreground mb-6">
              正在处理 {regions.length} 个区域，请稍候
            </p>
            <Progress value={processingProgress} className="mb-4" />
            <p className="text-sm text-muted-foreground">{processingProgress}% 完成</p>
          </div>
        </Card>
      )}

      {/* 结果步骤 */}
      {step === 'result' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">识别结果</h2>
                <p className="text-muted-foreground">
                  成功识别 {documentContents?.length || 0} 个区域
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  处理新文档
                </Button>
                <Select onValueChange={(value) => handleExport(value as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="导出格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="latex">LaTeX</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="word">Word</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 识别内容列表 */}
            <div className="space-y-4">
              {documentContents?.map((content, index) => (
                <Card key={content.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium px-2 py-1 bg-gray-100 rounded">
                          {content.contentType}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          置信度: {content.confidence}%
                        </span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm">
                          {content.userEditedContent || content.editableContent}
                        </pre>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
