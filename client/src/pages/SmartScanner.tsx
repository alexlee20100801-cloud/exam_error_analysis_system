import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  FileText,
  Download,
  Sparkles,
  Check,
  X,
  Loader2,
  ScanLine,
  Zap,
  FileImage,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SmartScanner() {
  const { data: user } = trpc.auth.me.useQuery();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const smartScanMutation = trpc.smartScanner.smartScan.useMutation();
  const batchScanMutation = trpc.smartScanner.batchSmartScan.useMutation();
  const imagesToPdfMutation = trpc.smartScanner.imagesToPdf.useMutation();

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      toast.error("请选择图片文件");
      return;
    }

    // 读取图片为base64
    const readers = imageFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((images) => {
      setSelectedImages(images);
      toast.success(`已选择 ${images.length} 张图片`);
    });
  };

  // 智能扫描
  const handleSmartScan = async () => {
    if (!user?.id || selectedImages.length === 0) {
      toast.error("请先选择图片");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingStep("正在预处理图像...");

    try {
      if (selectedImages.length === 1) {
        // 单张图片处理
        const result = await smartScanMutation.mutateAsync({
          imageData: selectedImages[0],
          userId: user.id,
          autoEnhance: true,
        });

        setProcessedImages([result.imageUrl]);
        setOcrResults([result.ocrResult]);
        setProgress(100);
        setProcessingStep("完成！");

        toast.success("扫描完成！");
      } else {
        // 批量处理
        setProcessingStep("正在批量处理图像...");
        const result = await batchScanMutation.mutateAsync({
          images: selectedImages,
          userId: user.id,
          autoEnhance: true,
        });

        setProcessedImages(result.results.map((r) => r.imageUrl));
        setOcrResults(result.results.map((r) => r.ocrResult));
        setProgress(100);
        setProcessingStep("完成！");

        toast.success(
          `批量扫描完成！成功 ${result.successCount}/${result.totalCount} 张`
        );
      }
    } catch (error) {
      console.error("扫描失败:", error);
      toast.error("扫描失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  // 导出为PDF
  const handleExportToPdf = async () => {
    if (!user?.id || processedImages.length === 0) {
      toast.error("没有可导出的图片");
      return;
    }

    try {
      toast.info("正在生成PDF...");

      const result = await imagesToPdfMutation.mutateAsync({
        images: processedImages,
        userId: user.id,
        options: {
          pageSize: "A4",
          quality: 90,
        },
      });

      // 下载PDF
      const link = document.createElement("a");
      link.href = result.pdfUrl;
      link.download = `scan-${Date.now()}.pdf`;
      link.click();

      toast.success("PDF已生成并下载");
    } catch (error) {
      console.error("导出PDF失败:", error);
      toast.error("导出PDF失败");
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">智能扫描</h1>
        <p className="text-muted-foreground">
          AI驱动的文档扫描系统，自动优化图像质量并识别文字内容
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左侧：上传和预览 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                上传图片
              </CardTitle>
              <CardDescription>
                支持JPG、PNG等格式，可批量上传多张图片
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-32"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8" />
                    <span>选择图片</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-32"
                  disabled
                  title="相机功能需要在移动设备上使用"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-8 w-8" />
                    <span>拍照</span>
                  </div>
                </Button>
              </div>

              {selectedImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      已选择 {selectedImages.length} 张图片
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedImages([])}
                    >
                      清空
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {selectedImages.map((img, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={img}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-full object-cover rounded border"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSmartScan}
                disabled={isProcessing || selectedImages.length === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    开始智能扫描
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5 animate-pulse" />
                  处理进度
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{processingStep}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>图像质量评估</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>自动去阴影</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>亮度对比度调整</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>OCR文字识别</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：结果展示 */}
        <div className="space-y-6">
          {processedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    扫描结果
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportToPdf}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    导出PDF
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="images">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="images">处理后图像</TabsTrigger>
                    <TabsTrigger value="text">识别文字</TabsTrigger>
                  </TabsList>

                  <TabsContent value="images" className="space-y-4">
                    {processedImages.map((img, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            图片 {index + 1}
                          </span>
                          <Badge variant="secondary">已优化</Badge>
                        </div>
                        <img
                          src={img}
                          alt={`处理后 ${index + 1}`}
                          className="w-full rounded border"
                        />
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="text" className="space-y-4">
                    {ocrResults.map((result, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            图片 {index + 1}
                          </span>
                          {result.success ? (
                            <Badge variant="default">
                              <Check className="mr-1 h-3 w-3" />
                              识别成功
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <X className="mr-1 h-3 w-3" />
                              识别失败
                            </Badge>
                          )}
                        </div>

                        {result.success ? (
                          <div className="p-4 bg-muted rounded text-sm whitespace-pre-wrap">
                            {result.correctedContent || result.content}
                          </div>
                        ) : (
                          <Alert variant="destructive">
                            <AlertDescription>
                              {result.error || "识别失败"}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {processedImages.length === 0 && (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <FileImage className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>扫描结果将显示在这里</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
