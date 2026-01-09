import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, FileDown } from "lucide-react";

interface BatchExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedQuestionIds: number[];
  onExportComplete?: () => void;
}

export function BatchExportDialog({ 
  open, 
  onOpenChange, 
  selectedQuestionIds,
  onExportComplete 
}: BatchExportDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<"word" | "pdf" | "markdown">("word");
  
  // 获取模板列表
  const { data: templates = [], isLoading: isLoadingTemplates } = trpc.exportTemplates.list.useQuery();
  
  // 批量导出mutation
  const batchExportMutation = trpc.exportTemplates.batchExport.useMutation({
    onSuccess: (data) => {
      if (data.success && data.downloadUrl) {
        // 触发下载
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || `batch_export_${Date.now()}.${exportFormat === 'word' ? 'docx' : exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`成功导出 ${selectedQuestionIds.length} 道错题`);
        onOpenChange(false);
        onExportComplete?.();
      } else {
        toast.error(data.error || "导出失败");
      }
    },
    onError: (error) => {
      toast.error(`导出失败：${error.message}`);
    },
  });
  
  const handleExport = () => {
    if (selectedQuestionIds.length === 0) {
      toast.error("请先选择要导出的错题");
      return;
    }
    
    if (!selectedTemplateId) {
      toast.error("请选择导出模板");
      return;
    }
    
    batchExportMutation.mutate({
      questionIds: selectedQuestionIds,
      templateId: selectedTemplateId,
      format: exportFormat,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>批量导出错题</DialogTitle>
          <DialogDescription>
            已选择 {selectedQuestionIds.length} 道错题，请选择导出模板和格式
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 模板选择 */}
          <div className="space-y-2">
            <Label htmlFor="template">导出模板</Label>
            {isLoadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载模板中...
              </div>
            ) : (
              <Select
                value={selectedTemplateId?.toString() || ""}
                onValueChange={(value) => setSelectedTemplateId(parseInt(value))}
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="选择模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                      {template.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {template.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* 格式选择 */}
          <div className="space-y-2">
            <Label htmlFor="format">导出格式</Label>
            <Select
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as "word" | "pdf" | "markdown")}
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="word">Word (.docx)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 模板预览提示 */}
          {selectedTemplateId && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">
                💡 提示：您可以在"导出模板"页面预览模板效果
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={batchExportMutation.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={batchExportMutation.isPending || !selectedTemplateId}
          >
            {batchExportMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                开始导出
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
