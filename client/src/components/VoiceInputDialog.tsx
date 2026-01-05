import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Mic, Pause, Play, RotateCcw, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (text: string) => void;
  lang?: string;
  title?: string;
  description?: string;
}

export function VoiceInputDialog({
  open,
  onOpenChange,
  onConfirm,
  lang = "zh-CN",
  title = "语音输入",
  description = "点击开始录音，系统会自动识别您的语音",
}: VoiceInputDialogProps) {
  const [editableText, setEditableText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const {
    isSupported,
    status,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  } = useSpeechRecognition({
    lang,
    continuous: true, // 持续识别
    interimResults: true,
  });

  // 同步识别结果到可编辑文本
  useEffect(() => {
    if (transcript) {
      setEditableText(transcript);
    }
  }, [transcript]);

  // 显示错误提示
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // 重置对话框状态
  useEffect(() => {
    if (!open) {
      setEditableText("");
      setIsPaused(false);
      setHasStarted(false);
      reset();
    }
  }, [open, reset]);

  const handleStart = () => {
    start();
    setHasStarted(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    stop();
    setIsPaused(true);
  };

  const handleResume = () => {
    start();
    setIsPaused(false);
  };

  const handleStop = () => {
    stop();
    setIsPaused(false);
  };

  const handleReset = () => {
    reset();
    setEditableText("");
    setHasStarted(false);
    setIsPaused(false);
  };

  const handleConfirm = () => {
    if (editableText.trim()) {
      onConfirm(editableText);
      onOpenChange(false);
      toast.success("语音输入已添加");
    } else {
      toast.error("请输入内容");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isListening = status === "listening";
  const isProcessing = status === "processing";

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>语音输入不可用</DialogTitle>
            <DialogDescription>
              您的浏览器不支持语音识别功能，请使用Chrome、Edge或Safari浏览器
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCancel}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 录音控制按钮 */}
          <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
            {!hasStarted ? (
              <Button
                onClick={handleStart}
                size="lg"
                className="gap-2"
                disabled={isProcessing}
              >
                <Mic className="h-5 w-5" />
                开始录音
              </Button>
            ) : (
              <>
                {isListening && !isPaused ? (
                  <Button
                    onClick={handlePause}
                    size="lg"
                    variant="outline"
                    className="gap-2"
                  >
                    <Pause className="h-5 w-5" />
                    暂停
                  </Button>
                ) : isPaused ? (
                  <Button
                    onClick={handleResume}
                    size="lg"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-5 w-5" />
                    继续录音
                  </Button>
                ) : (
                  <Button
                    onClick={handleStart}
                    size="lg"
                    className="gap-2"
                  >
                    <Mic className="h-5 w-5" />
                    开始录音
                  </Button>
                )}

                {hasStarted && (
                  <Button
                    onClick={handleStop}
                    size="lg"
                    variant="destructive"
                    className="gap-2"
                  >
                    <X className="h-5 w-5" />
                    停止
                  </Button>
                )}

                <Button
                  onClick={handleReset}
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  disabled={isListening}
                >
                  <RotateCcw className="h-5 w-5" />
                  重录
                </Button>
              </>
            )}
          </div>

          {/* 录音状态指示器 */}
          {isListening && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                <AlertDescription className="text-red-700 dark:text-red-400">
                  正在录音中...
                </AlertDescription>
              </div>
            </Alert>
          )}

          {isPaused && (
            <Alert>
              <AlertDescription>
                录音已暂停，点击"继续录音"按钮恢复
              </AlertDescription>
            </Alert>
          )}

          {/* 临时识别结果 */}
          {interimTranscript && isListening && (
            <Alert>
              <AlertDescription className="text-muted-foreground italic">
                识别中: {interimTranscript}
              </AlertDescription>
            </Alert>
          )}

          {/* 可编辑的识别文本 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              识别结果（可编辑修正）
            </label>
            <Textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              placeholder="识别的文本将显示在这里，您可以手动编辑修正..."
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              已识别 {editableText.length} 个字符
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!editableText.trim() || isListening}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            确认添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
