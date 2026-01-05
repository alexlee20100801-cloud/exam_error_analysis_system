import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Tag, Plus } from "lucide-react";
import { toast } from "sonner";

interface TagSelectorProps {
  errorQuestionId: number;
  selectedTags?: Array<{ id: number; name: string; color: string }>;
  onTagsChange?: () => void;
}

export function TagSelector({ errorQuestionId, selectedTags = [], onTagsChange }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: allTags = [] } = trpc.tags.list.useQuery();

  const addTagMutation = trpc.tags.addToErrorQuestion.useMutation({
    onSuccess: () => {
      utils.tags.getErrorQuestionTags.invalidate({ errorQuestionId });
      onTagsChange?.();
      toast.success("标签添加成功");
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  const removeTagMutation = trpc.tags.removeFromErrorQuestion.useMutation({
    onSuccess: () => {
      utils.tags.getErrorQuestionTags.invalidate({ errorQuestionId });
      onTagsChange?.();
      toast.success("标签移除成功");
    },
    onError: (error) => {
      toast.error(`移除失败: ${error.message}`);
    },
  });

  const handleToggleTag = (tagId: number, isChecked: boolean) => {
    if (isChecked) {
      addTagMutation.mutate({ errorQuestionId, tagId });
    } else {
      removeTagMutation.mutate({ errorQuestionId, tagId });
    }
  };

  const selectedTagIds = selectedTags.map((t) => t.id);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selectedTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Tag className="h-3 w-3 mr-1" />
            {selectedTags.length > 0 ? "管理标签" : "添加标签"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <div className="font-medium text-sm">选择标签</div>
            {allTags.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                还没有创建任何标签
                <br />
                请先在标签管理中创建标签
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allTags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <Checkbox
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={(checked) => handleToggleTag(tag.id, checked as boolean)}
                      disabled={addTagMutation.isPending || removeTagMutation.isPending}
                    />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm flex-1">{tag.name}</span>
                    <span className="text-xs text-muted-foreground">{tag.errorCount}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
