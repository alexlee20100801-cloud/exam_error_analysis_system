import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Download, FileText, Loader2 } from "lucide-react";

interface LearningReportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LearningReportExportDialog({ open, onOpenChange }: LearningReportExportDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);

  // 获取报告预览数据
  const { data: previewData, isLoading: previewLoading } = trpc.learningReportExport.getReportPreview.useQuery(
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    {
      enabled: open,
    }
  );

  // 导出报告
  const exportMutation = trpc.learningReportExport.exportReport.useMutation({
    onSuccess: (data) => {
      toast.success("报告导出成功！");
      // 打开下载链接
      window.open(data.url, "_blank");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`导出失败：${error.message}`);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      includeCharts,
      includeDetails,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            导出学习报告
          </DialogTitle>
          <DialogDescription>
            选择导出选项，生成包含学习数据和统计图表的PDF报告
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 时间范围 */}
          <div className="space-y-2">
            <Label>时间范围（可选）</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                  开始日期
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                  结束日期
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              不选择时间范围将导出全部数据
            </p>
          </div>

          {/* 导出选项 */}
          <div className="space-y-2">
            <Label>导出内容</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                />
                <label
                  htmlFor="includeCharts"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  包含统计图表
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDetails"
                  checked={includeDetails}
                  onCheckedChange={(checked) => setIncludeDetails(checked as boolean)}
                />
                <label
                  htmlFor="includeDetails"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  包含详细数据
                </label>
              </div>
            </div>
          </div>

          {/* 预览数据 */}
          {previewLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">加载预览数据...</span>
            </div>
          )}

          {previewData && !previewLoading && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="text-sm font-medium">报告预览</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">错题总数：</span>
                  <span className="font-medium">{previewData.summary.totalErrors} 道</span>
                </div>
                <div>
                  <span className="text-muted-foreground">掌握率：</span>
                  <span className="font-medium">{previewData.summary.masteryRate}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">练习次数：</span>
                  <span className="font-medium">{previewData.summary.totalPractices} 次</span>
                </div>
                <div>
                  <span className="text-muted-foreground">复习次数：</span>
                  <span className="font-medium">{previewData.summary.reviewCount} 次</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                导出PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
