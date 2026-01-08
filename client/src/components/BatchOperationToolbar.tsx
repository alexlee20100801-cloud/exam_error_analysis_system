import { Button } from "@/components/ui/button";
import { 
  CheckCheck, 
  CalendarPlus, 
  BarChart3, 
  Tag, 
  FileDown, 
  Share2, 
  Trash2, 
  Loader2,
  X,
  Printer
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchOperationToolbarProps {
  selectedCount: number;
  totalCount: number;
  onMarkMastered: () => void;
  onAddToReview: () => void;
  onUpdateDifficulty: () => void;
  onAddTag: () => void;
  onBatchExport: () => void;
  onAdvancedExport: () => void;
  onPrintPreview: () => void;
  onShare: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isMarkingMastered?: boolean;
  isAddingToReview?: boolean;
  isUpdatingDifficulty?: boolean;
  isAddingTag?: boolean;
  isDeleting?: boolean;
}

export function BatchOperationToolbar({
  selectedCount,
  totalCount,
  onMarkMastered,
  onAddToReview,
  onUpdateDifficulty,
  onAddTag,
  onBatchExport,
  onAdvancedExport,
  onPrintPreview,
  onShare,
  onDelete,
  onClearSelection,
  isMarkingMastered = false,
  isAddingToReview = false,
  isUpdatingDifficulty = false,
  isAddingTag = false,
  isDeleting = false,
}: BatchOperationToolbarProps) {
  const isVisible = selectedCount > 0;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="bg-background/95 backdrop-blur-sm border-t shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* 选中信息 */}
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">
                已选择 <span className="text-primary text-lg font-bold">{selectedCount}</span> / {totalCount} 道错题
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                清除选择
              </Button>
            </div>

            {/* 批量操作按钮组 */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkMastered}
                disabled={isMarkingMastered}
                className="h-9"
              >
                {isMarkingMastered ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-1.5" />
                )}
                标记已掌握
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onAddToReview}
                disabled={isAddingToReview}
                className="h-9"
              >
                {isAddingToReview ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4 mr-1.5" />
                )}
                加入复习
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onUpdateDifficulty}
                disabled={isUpdatingDifficulty}
                className="h-9"
              >
                {isUpdatingDifficulty ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                )}
                修改难度
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onAddTag}
                disabled={isAddingTag}
                className="h-9"
              >
                {isAddingTag ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Tag className="h-4 w-4 mr-1.5" />
                )}
                添加标签
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onBatchExport}
                className="h-9"
              >
                <FileDown className="h-4 w-4 mr-1.5" />
                批量导出
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onAdvancedExport}
                className="h-9"
              >
                <FileDown className="h-4 w-4 mr-1.5" />
                高级导出
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onPrintPreview}
                className="h-9"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                打印预览
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="h-9"
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                创建分享
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="h-9"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                批量删除
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
