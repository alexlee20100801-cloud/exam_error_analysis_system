import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { latexTagManager, LatexTag, TAG_COLORS } from '@/lib/latexTags';
import { Plus, Edit2, Trash2, Tag as TagIcon } from 'lucide-react';

interface LatexTagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LatexTagManager({ open, onOpenChange }: LatexTagManagerProps) {
  const [tags, setTags] = useState<LatexTag[]>([]);
  const [tagStats, setTagStats] = useState<Map<string, number>>(new Map());
  const [editingTag, setEditingTag] = useState<LatexTag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open]);

  const loadTags = () => {
    const allTags = latexTagManager.getAllTags();
    const stats = latexTagManager.getTagStats();
    setTags(allTags);
    setTagStats(stats);
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast.error('标签名称不能为空');
      return;
    }

    latexTagManager.createTag(newTagName, newTagColor);
    setNewTagName('');
    setNewTagColor('blue');
    setShowCreateForm(false);
    loadTags();
    toast.success('标签创建成功');
  };

  const handleUpdateTag = () => {
    if (!editingTag) return;

    if (!newTagName.trim()) {
      toast.error('标签名称不能为空');
      return;
    }

    latexTagManager.updateTag(editingTag.id, newTagName, newTagColor);
    setEditingTag(null);
    setNewTagName('');
    setNewTagColor('blue');
    loadTags();
    toast.success('标签更新成功');
  };

  const handleDeleteTag = (tag: LatexTag) => {
    if (confirm(`确定要删除标签"${tag.name}"吗？这将从所有公式中移除该标签。`)) {
      latexTagManager.deleteTag(tag.id);
      loadTags();
      toast.success('标签已删除');
    }
  };

  const handleEditTag = (tag: LatexTag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
    setShowCreateForm(false);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setNewTagName('');
    setNewTagColor('blue');
  };

  const getColorClass = (color: string) => {
    return TAG_COLORS.find((c) => c.value === color)?.class || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
          <DialogDescription>
            创建和管理LaTeX公式标签，用于分类和快速查找
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 创建/编辑表单 */}
          {(showCreateForm || editingTag) && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h4 className="font-medium">
                {editingTag ? '编辑标签' : '创建新标签'}
              </h4>
              <div className="space-y-2">
                <Label>标签名称</Label>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="例如：期中考试、力学专题"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>标签颜色</Label>
                <Select value={newTagColor} onValueChange={setNewTagColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.class}`} />
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {editingTag ? (
                  <>
                    <Button onClick={handleUpdateTag} size="sm">
                      保存修改
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleCreateTag} size="sm">
                      创建标签
                    </Button>
                    <Button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTagName('');
                        setNewTagColor('blue');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      取消
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 创建按钮 */}
          {!showCreateForm && !editingTag && (
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建新标签
            </Button>
          )}

          {/* 标签列表 */}
          <div className="space-y-2">
            <h4 className="font-medium">已有标签 ({tags.length})</h4>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无标签，点击上方按钮创建
              </p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getColorClass(tag.color)}`} />
                      <div>
                        <div className="font-medium">{tag.name}</div>
                        <div className="text-xs text-muted-foreground">
                          使用 {tagStats.get(tag.id) || 0} 次
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTag(tag)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTag(tag)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">使用说明</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 为历史公式添加标签，方便分类管理</li>
              <li>• 使用标签筛选功能快速查找相关公式</li>
              <li>• 支持多标签组合筛选（AND/OR模式）</li>
              <li>• 删除标签会从所有公式中移除该标签</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
