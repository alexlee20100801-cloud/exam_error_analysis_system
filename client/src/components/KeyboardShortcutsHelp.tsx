import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: ShortcutItem[] = [
  {
    keys: ["Ctrl", "/"],
    description: "显示快捷键帮助",
    category: "通用",
  },
  {
    keys: ["Ctrl", "K"],
    description: "打开菜单搜索",
    category: "导航",
  },
  {
    keys: ["Ctrl", "N"],
    description: "新建错题",
    category: "错题管理",
  },
  {
    keys: ["Ctrl", "S"],
    description: "保存当前编辑",
    category: "编辑",
  },
  {
    keys: ["Esc"],
    description: "关闭弹窗/对话框",
    category: "通用",
  },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  // 按类别分组快捷键
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            键盘快捷键
          </DialogTitle>
          <DialogDescription>
            使用键盘快捷键可以更高效地操作系统
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIndex < item.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 提示：在输入框中输入时，快捷键会自动禁用（除了 Esc 键）
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
