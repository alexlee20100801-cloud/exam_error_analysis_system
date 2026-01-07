import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedQuestionIds?: number[];
}

export function AdvancedExportDialog({
  open,
  onOpenChange,
  selectedQuestionIds,
}: AdvancedExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<"word" | "pdf">("word");
  
  // 页眉页脚设置
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [headerCenter, setHeaderCenter] = useState("错题本");
  const [footerEnabled, setFooterEnabled] = useState(true);
  const [footerCenter, setFooterCenter] = useState("深圳初高中错题分析学习系统");
  const [showPageNumber, setShowPageNumber] = useState(true);
  
  // 水印设置
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("仅供学习使用");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.1);
  const [watermarkFontSize, setWatermarkFontSize] = useState(72);
  const [watermarkRotation, setWatermarkRotation] = useState(-45);
  
  // 纸张设置
  const [paperSize, setPaperSize] = useState<"A4" | "A5" | "Letter" | "Legal">("A4");
  
  // 页边距设置 (单位: 英寸)
  const [marginTop, setMarginTop] = useState(1);
  const [marginBottom, setMarginBottom] = useState(1);
  const [marginLeft, setMarginLeft] = useState(1);
  const [marginRight, setMarginRight] = useState(1);
  
  // 字体设置
  const [fontName, setFontName] = useState("宋体");
  const [fontSize, setFontSize] = useState(11);

  const exportWordMutation = trpc.advancedExport.exportWordWithOptions.useMutation({
    onSuccess: (data) => {
      toast.success("导出成功！");
      // 下载文件
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`导出失败：${error.message}`);
    },
  });

  const exportPdfMutation = trpc.advancedExport.exportPdfWithOptions.useMutation({
    onSuccess: (data) => {
      toast.success("导出成功！");
      // 下载文件
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`导出失败：${error.message}`);
    },
  });

  const handleExport = () => {
    const options = {
      header: {
        enabled: headerEnabled,
        centerText: headerCenter,
      },
      footer: {
        enabled: footerEnabled,
        centerText: footerCenter,
        showPageNumber,
      },
      watermark: {
        enabled: watermarkEnabled,
        text: watermarkText,
        opacity: watermarkOpacity,
        fontSize: watermarkFontSize,
        rotation: watermarkRotation,
      },
      paperSize,
      margins: {
        top: marginTop * 1440, // 转换为twips
        bottom: marginBottom * 1440,
        left: marginLeft * 1440,
        right: marginRight * 1440,
      },
      font: {
        name: fontName,
        size: fontSize * 2, // 转换为半点
      },
    };

    if (exportFormat === "word") {
      exportWordMutation.mutate({
        questionIds: selectedQuestionIds,
        options,
      });
    } else {
      exportPdfMutation.mutate({
        questionIds: selectedQuestionIds,
        options,
      });
    }
  };

  const isExporting = exportWordMutation.isPending || exportPdfMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>高级导出设置</DialogTitle>
          <DialogDescription>
            自定义导出格式和样式选项
            {selectedQuestionIds && selectedQuestionIds.length > 0 && (
              <span className="ml-2 text-primary font-semibold">
                （已选择 {selectedQuestionIds.length} 道错题）
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 导出格式选择 */}
          <div className="space-y-2">
            <Label>导出格式</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "word" | "pdf")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="word">Word文档 (.docx)</SelectItem>
                <SelectItem value="pdf">PDF文档 (.pdf)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="header-footer" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="header-footer">页眉页脚</TabsTrigger>
              <TabsTrigger value="watermark">水印</TabsTrigger>
              <TabsTrigger value="paper">纸张</TabsTrigger>
              <TabsTrigger value="font">字体</TabsTrigger>
            </TabsList>

            {/* 页眉页脚设置 */}
            <TabsContent value="header-footer" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="header-enabled"
                    checked={headerEnabled}
                    onCheckedChange={(checked) => setHeaderEnabled(checked as boolean)}
                  />
                  <Label htmlFor="header-enabled" className="cursor-pointer">启用页眉</Label>
                </div>
                
                {headerEnabled && (
                  <div className="space-y-2 pl-6">
                    <Label>页眉内容（居中）</Label>
                    <Input
                      value={headerCenter}
                      onChange={(e) => setHeaderCenter(e.target.value)}
                      placeholder="输入页眉文字"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="footer-enabled"
                    checked={footerEnabled}
                    onCheckedChange={(checked) => setFooterEnabled(checked as boolean)}
                  />
                  <Label htmlFor="footer-enabled" className="cursor-pointer">启用页脚</Label>
                </div>
                
                {footerEnabled && (
                  <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                      <Label>页脚内容（居中）</Label>
                      <Input
                        value={footerCenter}
                        onChange={(e) => setFooterCenter(e.target.value)}
                        placeholder="输入页脚文字"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="page-number"
                        checked={showPageNumber}
                        onCheckedChange={(checked) => setShowPageNumber(checked as boolean)}
                      />
                      <Label htmlFor="page-number" className="cursor-pointer">显示页码</Label>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 水印设置 */}
            <TabsContent value="watermark" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="watermark-enabled"
                    checked={watermarkEnabled}
                    onCheckedChange={(checked) => setWatermarkEnabled(checked as boolean)}
                  />
                  <Label htmlFor="watermark-enabled" className="cursor-pointer">启用水印</Label>
                </div>
                
                {watermarkEnabled && (
                  <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                      <Label>水印文字</Label>
                      <Input
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="输入水印文字"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>透明度：{watermarkOpacity.toFixed(2)}</Label>
                      <Slider
                        value={[watermarkOpacity]}
                        onValueChange={(v) => setWatermarkOpacity(v[0])}
                        min={0.05}
                        max={0.5}
                        step={0.05}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>字号：{watermarkFontSize}pt</Label>
                      <Slider
                        value={[watermarkFontSize]}
                        onValueChange={(v) => setWatermarkFontSize(v[0])}
                        min={36}
                        max={120}
                        step={6}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>旋转角度：{watermarkRotation}°</Label>
                      <Slider
                        value={[watermarkRotation]}
                        onValueChange={(v) => setWatermarkRotation(v[0])}
                        min={-90}
                        max={90}
                        step={15}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 纸张设置 */}
            <TabsContent value="paper" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>纸张大小</Label>
                  <Select value={paperSize} onValueChange={(v) => setPaperSize(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 (210mm × 297mm)</SelectItem>
                      <SelectItem value="A5">A5 (148mm × 210mm)</SelectItem>
                      <SelectItem value="Letter">Letter (8.5" × 11")</SelectItem>
                      <SelectItem value="Legal">Legal (8.5" × 14")</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>上边距：{marginTop}"</Label>
                    <Slider
                      value={[marginTop]}
                      onValueChange={(v) => setMarginTop(v[0])}
                      min={0.5}
                      max={2}
                      step={0.1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>下边距：{marginBottom}"</Label>
                    <Slider
                      value={[marginBottom]}
                      onValueChange={(v) => setMarginBottom(v[0])}
                      min={0.5}
                      max={2}
                      step={0.1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>左边距：{marginLeft}"</Label>
                    <Slider
                      value={[marginLeft]}
                      onValueChange={(v) => setMarginLeft(v[0])}
                      min={0.5}
                      max={2}
                      step={0.1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>右边距：{marginRight}"</Label>
                    <Slider
                      value={[marginRight]}
                      onValueChange={(v) => setMarginRight(v[0])}
                      min={0.5}
                      max={2}
                      step={0.1}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 字体设置 */}
            <TabsContent value="font" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>字体</Label>
                  <Select value={fontName} onValueChange={setFontName}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="宋体">宋体</SelectItem>
                      <SelectItem value="黑体">黑体</SelectItem>
                      <SelectItem value="楷体">楷体</SelectItem>
                      <SelectItem value="仿宋">仿宋</SelectItem>
                      <SelectItem value="微软雅黑">微软雅黑</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>字号：{fontSize}pt</Label>
                  <Slider
                    value={[fontSize]}
                    onValueChange={(v) => setFontSize(v[0])}
                    min={9}
                    max={16}
                    step={0.5}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                导出
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
