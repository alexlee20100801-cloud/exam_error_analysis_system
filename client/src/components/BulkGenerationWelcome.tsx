import { useState } from "react";
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
import { Sparkles, BookOpen, CheckCircle2, Zap } from "lucide-react";

/**
 * AI题库生成欢迎引导弹窗
 */

interface BulkGenerationWelcomeProps {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

export function BulkGenerationWelcome({ open, onClose, onStartTour }: BulkGenerationWelcomeProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("bulk-generation-welcome-seen", "true");
    }
    onClose();
  };

  const handleStartTour = () => {
    if (dontShowAgain) {
      localStorage.setItem("bulk-generation-welcome-seen", "true");
    }
    onStartTour();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl">欢迎使用AI题库生成</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            自动批量生成高质量题目，快速充实您的题库资源
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">智能分类生成</h4>
                <p className="text-sm text-muted-foreground">
                  按学科、年级、知识点、难度自动生成题目，确保题库全面覆盖
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">质量自动控制</h4>
                <p className="text-sm text-muted-foreground">
                  内置质量评估和去重算法，自动过滤低质量题目，确保题库准确性
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">快速上手</h4>
                <p className="text-sm text-muted-foreground">
                  提供预设配置模板，选择模板即可一键开始生成，无需复杂配置
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <h4 className="font-medium mb-2 text-sm">💡 使用建议</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 首次使用建议从小批量（50-100题）开始测试</li>
              <li>• 生成后记得在"题目审核"页面进行人工审核</li>
              <li>• 可以根据题库缺口调整生成配置，智能补充</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dont-show"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              不再显示此欢迎页
            </label>
          </div>
          <Button variant="outline" onClick={handleClose}>
            直接开始
          </Button>
          <Button onClick={handleStartTour}>
            查看引导教程
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
