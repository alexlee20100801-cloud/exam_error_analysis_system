import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { toast } from "sonner";

interface TagManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // yellow
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // teal
];

export function TagManagementDialog({ open, onOpenChange }: TagManagementDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(PRESET_COLORS[0]);
  const [tagDescription, setTagDescription] = useState("");

  const utils = trpc.useUtils();
  const { data: tags = [], isLoading } = trpc.tags.list.useQuery();
  const createMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      resetForm();
      toast.success("标签创建成功");
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateMutation = trpc.tags.update.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      resetForm();
      toast.success("标签更新成功");
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      toast.success("标签删除成功");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingTagId(null);
    setTagName("");
    setTagColor(PRESET_COLORS[0]);
    setTagDescription("");
  };

  const handleSubmit = () => {
    if (!tagName.trim()) {
      toast.error("请输入标签名称");
      return;
    }

    if (editingTagId) {
      updateMutation.mutate({
        tagId: editingTagId,
        name: tagName,
        color: tagColor,
        description: tagDescription,
      });
    } else {
      createMutation.mutate({
        name: tagName,
        color: tagColor,
        description: tagDescription,
      });
    }
  };

  const handleEdit = (tag: any) => {
    setEditingTagId(tag.id);
    setTagName(tag.name);
    setTagColor(tag.color);
    setTagDescription(tag.description || "");
    setIsCreating(true);
  };

  const handleDelete = (tagId: number) => {
    if (confirm("确定要删除这个标签吗？删除后将从所有错题中移除该标签。")) {
      deleteMutation.mutate({ tagId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 创建/编辑表单 */}
          {isCreating ? (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{editingTagId ? "编辑标签" : "创建新标签"}</h3>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>标签名称</Label>
                  <Input
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="例如：易错、重点、考前必看"
                    maxLength={50}
                  />
                </div>

                <div>
                  <Label>标签颜色</Label>
                  <div className="flex gap-2 mt-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          tagColor === color ? "border-gray-900 scale-110" : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setTagColor(color)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>描述（可选）</Label>
                  <Textarea
                    value={tagDescription}
                    onChange={(e) => setTagDescription(e.target.value)}
                    placeholder="标签的用途说明"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingTagId ? "更新" : "创建"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    取消
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsCreating(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              创建新标签
            </Button>
          )}

          {/* 标签列表 */}
          <div className="space-y-2">
            <h3 className="font-medium">我的标签</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">还没有创建任何标签</div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color || '#6366f1' }} />
                      <div>
                        <div className="font-medium">{tag.name}</div>
                        {tag.description && <div className="text-sm text-muted-foreground">{tag.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{tag.errorCount} 道错题</span>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tag)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
