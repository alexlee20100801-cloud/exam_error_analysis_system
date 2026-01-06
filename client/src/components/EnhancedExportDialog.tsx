import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileDown, CheckCircle2, FileText, Image as ImageIcon, Layout, Settings } from "lucide-react";
import { toast } from "sonner";
import { getSubjectName } from "@shared/subjects";

interface EnhancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFilters?: {
    subjects?: string[];
    grades?: string[];
    knowledgePointIds?: number[];
    difficulties?: string[];
    isMastered?: boolean;
    errorQuestionIds?: number[];
  };
}

export function EnhancedExportDialog({
  open,
  onOpenChange,
  defaultFilters = {},
}: EnhancedExportDialogProps) {
  // 导出格式
  const [format, setFormat] = useState<'pdf' | 'word'>('pdf');
  
  // 导出内容选项
  const [contentOptions, setContentOptions] = useState({
    includeAnswer: true,
    includeExplanation: true,
    includeAnalysis: true,
    includeNotes: true,
    includeImage: true,
  });

  // 布局选项
  const [layoutOptions, setLayoutOptions] = useState({
    pageSize: 'A4' as 'A4' | 'Letter',
    columns: '1' as '1' | '2',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    enableAILayout: true,
  });

  // 预览筛选结果
  const { data: preview, isLoading: previewLoading } = trpc.errorExport.previewExport.useQuery(
    defaultFilters,
    { enabled: open }
  );

  // 导出mutation
  const exportMutation = (trpc as any).enhancedExport.exportErrorQuestions.useMutation({
    onSuccess: (data: any) => {
      if (data.success && data.fileData) {
        // 将base64转换为Blob并下载
        const byteCharacters = atob(data.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`${format === 'pdf' ? 'PDF' : 'Word'}文件已生成并开始下载`);
        onOpenChange(false);
      } else {
        toast.error("导出失败");
      }
    },
    onError: (error: any) => {
      toast.error(`导出失败：${error.message}`);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      format,
      ...defaultFilters,
      ...contentOptions,
      ...layoutOptions,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            增强导出
          </DialogTitle>
          <DialogDescription>
            自定义导出格式、布局和内容，支持PDF和Word格式
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="format">
              <FileText className="h-4 w-4 mr-2" />
              格式
            </TabsTrigger>
            <TabsTrigger value="content">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              内容
            </TabsTrigger>
            <TabsTrigger value="layout">
              <Layout className="h-4 w-4 mr-2" />
              布局
            </TabsTrigger>
            <TabsTrigger value="preview">
              <ImageIcon className="h-4 w-4 mr-2" />
              预览
            </TabsTrigger>
          </TabsList>

          {/* 格式选择 */}
          <TabsContent value="format" className="space-y-4">
            <div className="space-y-4">
              <Label className="text-base font-semibold">选择导出格式</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'pdf' | 'word')}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="pdf" id="format-pdf" />
                  <Label htmlFor="format-pdf" className="flex-1 cursor-pointer">
                    <div className="font-medium">PDF格式</div>
                    <div className="text-sm text-muted-foreground">
                      适合打印和分享，保持格式一致性
                    </div>
                  </Label>
                  <Badge variant="secondary">推荐</Badge>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="word" id="format-word" />
                  <Label htmlFor="format-word" className="flex-1 cursor-pointer">
                    <div className="font-medium">Word格式</div>
                    <div className="text-sm text-muted-foreground">
                      可编辑，支持进一步修改和批注
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          {/* 内容选择 */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-4">
              <Label className="text-base font-semibold">选择导出内容</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAnswer"
                    checked={contentOptions.includeAnswer}
                    onCheckedChange={(checked) =>
                      setContentOptions({ ...contentOptions, includeAnswer: checked as boolean })
                    }
                  />
                  <Label htmlFor="includeAnswer" className="cursor-pointer">
                    正确答案
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeExplanation"
                    checked={contentOptions.includeExplanation}
                    onCheckedChange={(checked) =>
                      setContentOptions({ ...contentOptions, includeExplanation: checked as boolean })
                    }
                  />
                  <Label htmlFor="includeExplanation" className="cursor-pointer">
                    详细解析
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAnalysis"
                    checked={contentOptions.includeAnalysis}
                    onCheckedChange={(checked) =>
                      setContentOptions({ ...contentOptions, includeAnalysis: checked as boolean })
                    }
                  />
                  <Label htmlFor="includeAnalysis" className="cursor-pointer">
                    AI错误分析
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeNotes"
                    checked={contentOptions.includeNotes}
                    onCheckedChange={(checked) =>
                      setContentOptions({ ...contentOptions, includeNotes: checked as boolean })
                    }
                  />
                  <Label htmlFor="includeNotes" className="cursor-pointer">
                    我的笔记
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeImage"
                    checked={contentOptions.includeImage}
                    onCheckedChange={(checked) =>
                      setContentOptions({ ...contentOptions, includeImage: checked as boolean })
                    }
                  />
                  <Label htmlFor="includeImage" className="cursor-pointer">
                    题目图片
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 布局选项 */}
          <TabsContent value="layout" className="space-y-4">
            <div className="space-y-6">
              {/* 纸张大小 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">纸张大小</Label>
                <Select 
                  value={layoutOptions.pageSize} 
                  onValueChange={(v) => setLayoutOptions({ ...layoutOptions, pageSize: v as 'A4' | 'Letter' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="Letter">Letter (216 × 279 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 栏数 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">页面布局</Label>
                <RadioGroup 
                  value={layoutOptions.columns} 
                  onValueChange={(v) => setLayoutOptions({ ...layoutOptions, columns: v as '1' | '2' })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="columns-1" />
                    <Label htmlFor="columns-1" className="cursor-pointer">单栏布局（适合详细内容）</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="columns-2" />
                    <Label htmlFor="columns-2" className="cursor-pointer">双栏布局（节省纸张）</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 字体大小 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">字体大小</Label>
                <Select 
                  value={layoutOptions.fontSize} 
                  onValueChange={(v) => setLayoutOptions({ ...layoutOptions, fontSize: v as 'small' | 'medium' | 'large' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">小号 (10pt)</SelectItem>
                    <SelectItem value="medium">中号 (12pt)</SelectItem>
                    <SelectItem value="large">大号 (14pt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI优化 */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableAILayout"
                  checked={layoutOptions.enableAILayout}
                  onCheckedChange={(checked) =>
                    setLayoutOptions({ ...layoutOptions, enableAILayout: checked as boolean })
                  }
                />
                <Label htmlFor="enableAILayout" className="cursor-pointer">
                  <div className="font-medium">启用AI布局优化</div>
                  <div className="text-sm text-muted-foreground">
                    自动调整间距、对齐和排版，使文档更美观
                  </div>
                </Label>
              </div>
            </div>
          </TabsContent>

          {/* 预览 */}
          <TabsContent value="preview" className="space-y-4">
            {previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {/* 统计信息 */}
                <div className="rounded-lg border p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">导出预览</span>
                    <Badge variant="secondary" className="text-xl px-4 py-1">
                      {preview.totalCount} 道题目
                    </Badge>
                  </div>

                  {preview.totalCount > 0 && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">导出格式</div>
                        <div className="font-medium">{format === 'pdf' ? 'PDF文档' : 'Word文档'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">纸张大小</div>
                        <div className="font-medium">{layoutOptions.pageSize}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">页面布局</div>
                        <div className="font-medium">{layoutOptions.columns === '1' ? '单栏' : '双栏'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">字体大小</div>
                        <div className="font-medium">
                          {layoutOptions.fontSize === 'small' ? '小号' : layoutOptions.fontSize === 'medium' ? '中号' : '大号'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 题目列表预览 */}
                {preview.totalCount > 0 && preview.preview.length > 0 && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">题目预览（前5道）</span>
                      <span className="text-xs text-muted-foreground">实际导出包含全部题目</span>
                    </div>
                    <div className="space-y-2">
                      {preview.preview.map((q, index) => (
                        <div
                          key={q.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{q.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getSubjectName(q.subject)}
                              </Badge>
                              {(q as any).difficulty && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    (q as any).difficulty === 'easy' ? 'border-green-500 text-green-600' :
                                    (q as any).difficulty === 'medium' ? 'border-yellow-500 text-yellow-600' :
                                    'border-red-500 text-red-600'
                                  }`}
                                >
                                  {(q as any).difficulty === 'easy' ? '简单' : (q as any).difficulty === 'medium' ? '中等' : '困难'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {preview.totalCount === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>没有符合条件的错题</p>
                  </div>
                )}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {preview && preview.totalCount > 0 && (
              <span>将导出 <strong className="text-foreground">{preview.totalCount}</strong> 道题目</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending || !preview || preview.totalCount === 0}
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  导出{format === 'pdf' ? 'PDF' : 'Word'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
