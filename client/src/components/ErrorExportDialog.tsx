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
import { Loader2, FileDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getSubjectName } from "@shared/subjects";

interface ErrorExportDialogProps {
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

export function ErrorExportDialog({
  open,
  onOpenChange,
  defaultFilters = {},
}: ErrorExportDialogProps) {
  const [exportOptions, setExportOptions] = useState({
    includeAnswer: true,
    includeExplanation: true,
    includeAnalysis: true,
    includeNotes: true,
    includeImage: true,
  });

  // 预览筛选结果
  const { data: preview, isLoading: previewLoading } = trpc.errorExport.previewExport.useQuery(
    defaultFilters,
    { enabled: open }
  );

  // 导出mutation
  const exportMutation = trpc.errorExport.exportToPdf.useMutation({
    onSuccess: (data) => {
      if (data.success && data.pdfData) {
        // 将base64转换为Blob并下载
        const byteCharacters = atob(data.pdfData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || "错题集.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("PDF已生成并开始下载");
        onOpenChange(false);
      } else {
        toast.error(data.error || "导出失败");
      }
    },
    onError: (error) => {
      toast.error(`导出失败：${error.message}`);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      ...defaultFilters,
      ...exportOptions,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导出错题集</DialogTitle>
          <DialogDescription>
            选择要包含的内容，然后导出为PDF格式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 预览信息 */}
          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : preview ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">符合条件的错题</span>
                <Badge variant="secondary" className="text-lg">
                  {preview.totalCount} 道
                </Badge>
              </div>

              {preview.totalCount > 0 && preview.preview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">预览（前5道）：</p>
                  <div className="space-y-1">
                    {preview.preview.map((q) => (
                      <div
                        key={q.id}
                        className="text-sm flex items-center gap-2 text-muted-foreground"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="truncate">{q.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {getSubjectName(q.subject)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.totalCount === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  没有符合条件的错题
                </p>
              )}
            </div>
          ) : null}

          {/* 导出选项 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">导出内容</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAnswer"
                  checked={exportOptions.includeAnswer}
                  onCheckedChange={(checked) =>
                    setExportOptions({ ...exportOptions, includeAnswer: checked as boolean })
                  }
                />
                <label
                  htmlFor="includeAnswer"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  正确答案
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeExplanation"
                  checked={exportOptions.includeExplanation}
                  onCheckedChange={(checked) =>
                    setExportOptions({ ...exportOptions, includeExplanation: checked as boolean })
                  }
                />
                <label
                  htmlFor="includeExplanation"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  详细解析
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAnalysis"
                  checked={exportOptions.includeAnalysis}
                  onCheckedChange={(checked) =>
                    setExportOptions({ ...exportOptions, includeAnalysis: checked as boolean })
                  }
                />
                <label
                  htmlFor="includeAnalysis"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  AI错误分析
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeNotes"
                  checked={exportOptions.includeNotes}
                  onCheckedChange={(checked) =>
                    setExportOptions({ ...exportOptions, includeNotes: checked as boolean })
                  }
                />
                <label
                  htmlFor="includeNotes"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  我的笔记
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImage"
                  checked={exportOptions.includeImage}
                  onCheckedChange={(checked) =>
                    setExportOptions({ ...exportOptions, includeImage: checked as boolean })
                  }
                />
                <label
                  htmlFor="includeImage"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  题目图片
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
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
                导出PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
