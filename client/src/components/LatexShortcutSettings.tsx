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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { latexShortcutManager, LatexShortcut } from '@/lib/latexShortcuts';
import { RotateCcw, Edit2, Check, X } from 'lucide-react';

interface LatexShortcutSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS = {
  basic: '基础运算',
  greek: '希腊字母',
  operator: '运算符',
  advanced: '高级',
};

export function LatexShortcutSettings({ open, onOpenChange }: LatexShortcutSettingsProps) {
  const [shortcuts, setShortcuts] = useState<Record<string, LatexShortcut[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState('');

  useEffect(() => {
    if (open) {
      loadShortcuts();
    }
  }, [open]);

  const loadShortcuts = () => {
    const grouped = latexShortcutManager.getShortcutsByCategory();
    setShortcuts(grouped);
  };

  const handleEdit = (shortcut: LatexShortcut) => {
    setEditingId(shortcut.id);
    setEditingKey(shortcut.defaultKey);
  };

  const handleSave = (id: string) => {
    try {
      if (!editingKey.trim()) {
        toast.error('快捷键不能为空');
        return;
      }

      latexShortcutManager.updateShortcut(id, editingKey);
      setEditingId(null);
      setEditingKey('');
      loadShortcuts();
      toast.success('快捷键已更新');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingKey('');
  };

  const handleReset = () => {
    if (confirm('确定要重置所有快捷键为默认配置吗？')) {
      latexShortcutManager.resetToDefaults();
      loadShortcuts();
      toast.success('已重置为默认配置');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const keys: string[] = [];

    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Meta');

    const key = e.key;
    if (key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
      keys.push(key.toUpperCase());
    }

    if (keys.length > 1) {
      setEditingKey(keys.join('+'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LaTeX快捷键设置</DialogTitle>
          <DialogDescription>
            自定义LaTeX公式的键盘快捷键，提升输入效率
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置为默认
            </Button>
          </div>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(shortcuts).map(([category, items]) => (
              <TabsContent key={category} value={category} className="space-y-3">
                {items.map((shortcut: any) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{shortcut.name}</span>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {shortcut.template.replace('|', '█')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {editingId === shortcut.id ? (
                        <>
                          <Input
                            value={editingKey}
                            onChange={(e) => setEditingKey(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="按下快捷键..."
                            className="w-40 font-mono text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(shortcut.id)}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancel}>
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="font-mono px-3 py-1">
                            {shortcut.defaultKey}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(shortcut)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">使用说明</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 点击编辑按钮后，在输入框中按下新的快捷键组合</li>
              <li>• 支持 Ctrl、Shift、Alt 等修饰键组合</li>
              <li>• 快捷键不能冲突，系统会自动检测</li>
              <li>• 模板中的 | 表示光标位置</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
