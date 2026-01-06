/**
 * 错题导出对话框组件
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { format as formatDate } from "date-fns";
import { zhCN } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<"pdf" | "word">("pdf");
  const [subject, setSubject] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isMastered, setIsMastered] = useState<string>("");

  // 获取导出统计信息
  const { data: stats } = trpc.export.getExportStats.useQuery();

  // 导出mutation
  const exportMutation = trpc.export.exportErrorQuestions.useMutation({
    onSuccess: (data) => {
      // 下载文件
      const blob = base64ToBlob(data.data, data.mimeType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`成功导出 ${data.questionCount} 道错题！`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`导出失败：${error.message}`);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      format,
      subject: subject || undefined,
      grade: grade || undefined,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      isMastered: isMastered === "" ? undefined : isMastered === "true",
    });
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导出错题本</DialogTitle>
          <DialogDescription>选择导出格式和筛选条件，生成可打印的错题文档</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 统计信息 */}
          {stats && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">当前错题统计</p>
              <p className="text-muted-foreground">
                共 {stats.total} 道错题，已掌握 {stats.byMastered.mastered} 道，未掌握 {stats.byMastered.notMastered} 道
              </p>
            </div>
          )}

          {/* 导出格式 */}
          <div className="grid gap-2">
            <Label htmlFor="format">导出格式</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as "pdf" | "word")}>
              <SelectTrigger id="format">
                <SelectValue placeholder="选择格式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF 文档（推荐打印）</SelectItem>
                <SelectItem value="word">Word 文档（可编辑）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 学科筛选 */}
          <div className="grid gap-2">
            <Label htmlFor="subject">学科（可选）</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="全部学科" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="math">数学</SelectItem>
                <SelectItem value="chinese">语文</SelectItem>
                <SelectItem value="english">英语</SelectItem>
                <SelectItem value="physics">物理</SelectItem>
                <SelectItem value="chemistry">化学</SelectItem>
                <SelectItem value="biology">生物</SelectItem>
                <SelectItem value="politics">政治</SelectItem>
                <SelectItem value="history">历史</SelectItem>
                <SelectItem value="geography">地理</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 年级筛选 */}
          <div className="grid gap-2">
            <Label htmlFor="grade">年级（可选）</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger id="grade">
                <SelectValue placeholder="全部年级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="junior1">初一</SelectItem>
                <SelectItem value="junior2">初二</SelectItem>
                <SelectItem value="junior3">初三</SelectItem>
                <SelectItem value="senior1">高一</SelectItem>
                <SelectItem value="senior2">高二</SelectItem>
                <SelectItem value="senior3">高三</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 时间范围 */}
          <div className="grid gap-2">
            <Label>时间范围（可选）</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? formatDate(startDate, "PPP", { locale: zhCN }) : <span>开始日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? formatDate(endDate, "PPP", { locale: zhCN }) : <span>结束日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* 掌握状态 */}
          <div className="grid gap-2">
            <Label htmlFor="mastered">掌握状态（可选）</Label>
            <Select value={isMastered} onValueChange={setIsMastered}>
              <SelectTrigger id="mastered">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">未掌握</SelectItem>
                <SelectItem value="true">已掌握</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exportMutation.isPending}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在生成...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                导出
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
