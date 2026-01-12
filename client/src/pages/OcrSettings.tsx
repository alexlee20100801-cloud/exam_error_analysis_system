import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Settings, Scan, Crop, Type, FlaskConical, Sparkles, History,
  Loader2, Check, X, Upload, Image, Eye, RefreshCw, Wand2,
  ZoomIn, ZoomOut, RotateCw, Move, Square, Calculator, Beaker,
  FileText, Clock, CheckCircle2, XCircle, AlertTriangle, Info
} from 'lucide-react';

// 学科选项
const subjectOptions = [
  { value: 'chinese', label: '语文' },
  { value: 'math', label: '数学' },
  { value: 'english', label: '英语' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
  { value: 'biology', label: '生物' },
  { value: 'politics', label: '政治' },
  { value: 'history', label: '历史' },
  { value: 'geography', label: '地理' },
];

// 灵敏度选项
const sensitivityOptions = [
  { value: 'low', label: '低', description: '适合清晰的打印文档' },
  { value: 'medium', label: '中', description: '适合大多数场景' },
  { value: 'high', label: '高', description: '适合手写或模糊图片' },
];

export default function OcrSettings() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OCR配置状态
  const [config, setConfig] = useState({
    autoBorderDetection: true,
    borderDetectionSensitivity: 'medium' as 'low' | 'medium' | 'high',
    autoPerspectiveCorrection: true,
    autoContrastEnhancement: true,
    autoNoiseReduction: true,
    autoBinarization: false,
    handwritingMode: false,
    mathSymbolEnhancement: true,
    chemicalFormulaEnhancement: false,
    defaultSubject: 'math' as any,
  });

  // 获取用户OCR配置
  const { data: userConfig, isLoading: loadingConfig, refetch: refetchConfig } = 
    trpc.ocrEnhanced.getConfig.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取OCR统计
  const { data: statistics, isLoading: loadingStats } = 
    trpc.ocrEnhanced.getStatistics.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取批量处理历史
  const { data: batches, isLoading: loadingBatches } = 
    trpc.ocrEnhanced.getBatches.useQuery({ limit: 10 }, {
      enabled: !!user,
    });

  // 更新配置
  const updateConfigMutation = trpc.ocrEnhanced.updateConfig.useMutation({
    onSuccess: () => {
      toast.success('配置已保存');
      refetchConfig();
    },
    onError: (err) => {
      toast.error(err.message || '保存失败');
    },
  });

  // 处理图片
  const processImageMutation = trpc.ocrEnhanced.processImage.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      setIsProcessing(false);
      toast.success('处理完成');
    },
    onError: (err) => {
      setIsProcessing(false);
      toast.error(err.message || '处理失败');
    },
  });

  // 边框检测
  const detectBorderMutation = trpc.ocrEnhanced.detectBorder.useMutation({
    onSuccess: (data) => {
      setTestResult(prev => ({ ...prev, borderDetection: data }));
      toast.success('边框检测完成');
    },
    onError: (err) => {
      toast.error(err.message || '边框检测失败');
    },
  });

  // 手写识别增强
  const enhanceHandwritingMutation = trpc.ocrEnhanced.enhanceHandwriting.useMutation({
    onSuccess: (data) => {
      setTestResult(prev => ({ ...prev, handwriting: data }));
      toast.success('手写识别增强完成');
    },
    onError: (err) => {
      toast.error(err.message || '手写识别增强失败');
    },
  });

  // 加载用户配置
  useEffect(() => {
    if (userConfig) {
      setConfig({
        autoBorderDetection: userConfig.autoBorderDetection ?? true,
        borderDetectionSensitivity: userConfig.borderDetectionSensitivity || 'medium',
        autoPerspectiveCorrection: userConfig.autoPerspectiveCorrection ?? true,
        autoContrastEnhancement: userConfig.autoContrastEnhancement ?? true,
        autoNoiseReduction: userConfig.autoNoiseReduction ?? true,
        autoBinarization: userConfig.autoBinarization ?? false,
        handwritingMode: userConfig.handwritingMode ?? false,
        mathSymbolEnhancement: userConfig.mathSymbolEnhancement ?? true,
        chemicalFormulaEnhancement: userConfig.chemicalFormulaEnhancement ?? false,
        defaultSubject: userConfig.defaultSubject || 'math',
      });
    }
  }, [userConfig]);

  // 保存配置
  const handleSaveConfig = () => {
    updateConfigMutation.mutate(config);
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setTestImage(event.target?.result as string);
      setTestResult(null);
    };
    reader.readAsDataURL(file);
  };

  // 执行测试
  const handleTest = async () => {
    if (!testImage) {
      toast.error('请先上传测试图片');
      return;
    }

    setIsProcessing(true);
    setTestResult(null);

    // 这里需要先上传图片获取URL，简化处理直接使用base64
    // 实际应该先上传到S3
    processImageMutation.mutate({
      imageUrl: testImage,
      autoBorderDetection: config.autoBorderDetection,
      autoPerspectiveCorrection: config.autoPerspectiveCorrection,
      handwritingMode: config.handwritingMode,
      subject: config.defaultSubject,
      mathSymbolEnhancement: config.mathSymbolEnhancement,
      chemicalFormulaEnhancement: config.chemicalFormulaEnhancement,
    });
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">OCR设置</h1>
            <p className="text-muted-foreground mt-1">
              配置图像识别参数，优化错题识别效果
            </p>
          </div>
          <Button onClick={() => setTestDialogOpen(true)}>
            <FlaskConical className="h-4 w-4 mr-2" />
            测试OCR效果
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>边框检测次数</CardDescription>
              <CardTitle className="text-2xl">
                {loadingStats ? <Skeleton className="h-8 w-16" /> : statistics?.totalBorderDetections || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>图片处理数</CardDescription>
              <CardTitle className="text-2xl">
                {loadingStats ? <Skeleton className="h-8 w-16" /> : statistics?.totalImagesProcessed || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>平均置信度</CardDescription>
              <CardTitle className="text-2xl">
                {loadingStats ? <Skeleton className="h-8 w-16" /> : `${statistics?.averageConfidence || 0}%`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>批量任务数</CardDescription>
              <CardTitle className="text-2xl">
                {loadingStats ? <Skeleton className="h-8 w-16" /> : statistics?.totalBatches || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="settings">基础设置</TabsTrigger>
            <TabsTrigger value="border">边框检测</TabsTrigger>
            <TabsTrigger value="recognition">识别增强</TabsTrigger>
            <TabsTrigger value="history">处理历史</TabsTrigger>
          </TabsList>

          {/* 基础设置 */}
          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  全局设置
                </CardTitle>
                <CardDescription>
                  配置OCR处理的默认参数
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 默认学科 */}
                <div className="space-y-2">
                  <Label>默认学科</Label>
                  <Select
                    value={config.defaultSubject}
                    onValueChange={(value: any) => setConfig({ ...config, defaultSubject: value })}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    根据学科优化识别算法，提高特定符号的识别准确率
                  </p>
                </div>

                <Separator />

                {/* 自动处理选项 */}
                <div className="space-y-4">
                  <h4 className="font-medium">自动处理</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Crop className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">自动边框检测</p>
                          <p className="text-sm text-muted-foreground">自动识别并裁剪题目区域</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.autoBorderDetection}
                        onCheckedChange={(checked) => setConfig({ ...config, autoBorderDetection: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <RotateCw className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">自动透视校正</p>
                          <p className="text-sm text-muted-foreground">校正倾斜或变形的图片</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.autoPerspectiveCorrection}
                        onCheckedChange={(checked) => setConfig({ ...config, autoPerspectiveCorrection: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">自动对比度增强</p>
                          <p className="text-sm text-muted-foreground">增强文字与背景的对比度</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.autoContrastEnhancement}
                        onCheckedChange={(checked) => setConfig({ ...config, autoContrastEnhancement: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Wand2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">自动降噪</p>
                          <p className="text-sm text-muted-foreground">减少图片噪点干扰</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.autoNoiseReduction}
                        onCheckedChange={(checked) => setConfig({ ...config, autoNoiseReduction: checked })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                  {updateConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  保存设置
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* 边框检测 */}
          <TabsContent value="border" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Crop className="h-5 w-5" />
                  边框检测设置
                </CardTitle>
                <CardDescription>
                  配置自动边框检测的灵敏度和行为
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 灵敏度设置 */}
                <div className="space-y-4">
                  <Label>检测灵敏度</Label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {sensitivityOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          config.borderDetectionSensitivity === option.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground'
                        }`}
                        onClick={() => setConfig({ ...config, borderDetectionSensitivity: option.value as any })}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{option.label}</span>
                          {config.borderDetectionSensitivity === option.value && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 高级选项 */}
                <div className="space-y-4">
                  <h4 className="font-medium">高级选项</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">自动二值化</p>
                        <p className="text-sm text-muted-foreground">
                          将图片转换为黑白，适合文字清晰的打印文档
                        </p>
                      </div>
                      <Switch
                        checked={config.autoBinarization}
                        onCheckedChange={(checked) => setConfig({ ...config, autoBinarization: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    边框检测功能会自动识别图片中的题目区域，并进行裁剪。如果检测效果不理想，可以尝试调整灵敏度或手动裁剪。
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                  {updateConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  保存设置
                </Button>
              </CardFooter>
            </Card>

            {/* 边框检测说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">边框检测原理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                        <Scan className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium">边缘检测</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      使用Canny算法检测图片中的边缘，识别题目边框
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                        <Square className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-medium">轮廓提取</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      提取闭合轮廓，筛选出最可能是题目区域的矩形
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                        <Move className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium">透视变换</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      对检测到的区域进行透视校正，得到正视图
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 识别增强 */}
          <TabsContent value="recognition" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  识别增强设置
                </CardTitle>
                <CardDescription>
                  配置手写识别和特殊符号识别增强
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 手写识别 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                        <Type className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium">手写识别模式</p>
                        <p className="text-sm text-muted-foreground">
                          优化手写文字的识别效果，适合手写作业和笔记
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={config.handwritingMode}
                      onCheckedChange={(checked) => setConfig({ ...config, handwritingMode: checked })}
                    />
                  </div>
                </div>

                <Separator />

                {/* 特殊符号识别 */}
                <div className="space-y-4">
                  <h4 className="font-medium">特殊符号识别增强</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">数学符号增强</p>
                          <p className="text-sm text-muted-foreground">
                            优化数学公式、符号的识别
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={config.mathSymbolEnhancement}
                        onCheckedChange={(checked) => setConfig({ ...config, mathSymbolEnhancement: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                          <Beaker className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">化学式增强</p>
                          <p className="text-sm text-muted-foreground">
                            优化化学方程式、分子式的识别
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={config.chemicalFormulaEnhancement}
                        onCheckedChange={(checked) => setConfig({ ...config, chemicalFormulaEnhancement: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    启用特殊符号增强后，系统会使用专门的模型来识别数学公式和化学方程式，可能会增加处理时间。
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                  {updateConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  保存设置
                </Button>
              </CardFooter>
            </Card>

            {/* 识别效果示例 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">识别效果示例</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      数学公式识别
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="p-2 bg-muted rounded">
                        <p className="text-muted-foreground">输入：手写的二次方程</p>
                        <p className="font-mono mt-1">x² + 2x + 1 = 0</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="text-muted-foreground">输入：分数和根号</p>
                        <p className="font-mono mt-1">√(a² + b²) = c</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-3 flex items-center gap-2">
                      <Beaker className="h-4 w-4" />
                      化学式识别
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="p-2 bg-muted rounded">
                        <p className="text-muted-foreground">输入：化学方程式</p>
                        <p className="font-mono mt-1">2H₂ + O₂ → 2H₂O</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="text-muted-foreground">输入：有机分子式</p>
                        <p className="font-mono mt-1">C₆H₁₂O₆</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 处理历史 */}
          <TabsContent value="history" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-5 w-5" />
                  批量处理历史
                </CardTitle>
                <CardDescription>
                  查看OCR批量处理任务的历史记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBatches ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : batches && batches.length > 0 ? (
                  <div className="space-y-3">
                    {batches.map((batch: any) => (
                      <div
                        key={batch.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            batch.status === 'completed' ? 'bg-green-100 dark:bg-green-900' :
                            batch.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900' :
                            batch.status === 'failed' ? 'bg-red-100 dark:bg-red-900' :
                            'bg-muted'
                          }`}>
                            {batch.status === 'completed' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : batch.status === 'processing' ? (
                              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                            ) : batch.status === 'failed' ? (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{batch.batchName || '批量处理任务'}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{batch.processedImages || 0} / {batch.totalImages} 张图片</span>
                              <span>·</span>
                              <span>{new Date(batch.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {batch.status === 'processing' && (
                            <div className="w-32">
                              <Progress 
                                value={((batch.processedImages || 0) / batch.totalImages) * 100} 
                              />
                            </div>
                          )}
                          <Badge variant={
                            batch.status === 'completed' ? 'default' :
                            batch.status === 'processing' ? 'secondary' :
                            batch.status === 'failed' ? 'destructive' :
                            'outline'
                          }>
                            {batch.status === 'completed' ? '已完成' :
                             batch.status === 'processing' ? '处理中' :
                             batch.status === 'failed' ? '失败' :
                             '等待中'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无处理历史</p>
                    <p className="text-sm mt-1">批量上传图片后将显示处理记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* OCR测试对话框 */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>OCR效果测试</DialogTitle>
              <DialogDescription>
                上传图片测试当前OCR配置的识别效果
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 上传区域 */}
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                {testImage ? (
                  <div className="space-y-4">
                    <div className="relative border rounded-lg overflow-hidden">
                      <img
                        src={testImage}
                        alt="测试图片"
                        className="w-full max-h-64 object-contain bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setTestImage(null);
                          setTestResult(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        更换图片
                      </Button>
                      <Button
                        onClick={handleTest}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Scan className="h-4 w-4 mr-2" />
                        )}
                        开始识别
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium">点击上传测试图片</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      支持 JPG、PNG、WEBP 格式
                    </p>
                  </div>
                )}
              </div>

              {/* 识别结果 */}
              {testResult && (
                <div className="space-y-4">
                  <Separator />
                  <h4 className="font-medium">识别结果</h4>
                  
                  {testResult.success ? (
                    <div className="space-y-4">
                      {/* 边框检测结果 */}
                      {testResult.borderDetection && (
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Crop className="h-4 w-4" />
                            <span className="font-medium">边框检测</span>
                            <Badge variant="secondary">
                              置信度: {testResult.borderDetection.confidence}%
                            </Badge>
                          </div>
                          {testResult.borderDetection.croppedImageUrl && (
                            <img
                              src={testResult.borderDetection.croppedImageUrl}
                              alt="裁剪结果"
                              className="max-h-48 rounded border"
                            />
                          )}
                        </div>
                      )}

                      {/* 文字识别结果 */}
                      {testResult.text && (
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Type className="h-4 w-4" />
                            <span className="font-medium">识别文字</span>
                          </div>
                          <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                            {testResult.text}
                          </div>
                        </div>
                      )}

                      {/* 处理信息 */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          处理时间: {testResult.processTime || '-'}ms
                        </span>
                        {testResult.confidence && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            置信度: {testResult.confidence}%
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {testResult.error || '识别失败，请检查图片质量或调整设置后重试'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
