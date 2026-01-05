import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { VoiceInputDialog } from "@/components/VoiceInputDialog";

interface VoiceInputButtonEnhancedProps {
  onTranscript: (text: string) => void;
  lang?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  mode?: "simple" | "advanced"; // simple: 原有模式, advanced: 对话框模式
}

export function VoiceInputButtonEnhanced({
  onTranscript,
  lang = "zh-CN",
  disabled = false,
  variant = "outline",
  size = "default",
  className = "",
  mode = "advanced",
}: VoiceInputButtonEnhancedProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    if (mode === "advanced") {
      setDialogOpen(true);
    }
  };

  const handleConfirm = (text: string) => {
    onTranscript(text);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled}
        className={className}
        title="点击打开语音输入对话框"
      >
        <Mic className="h-4 w-4" />
        {size !== "icon" && <span className="ml-2">语音输入</span>}
      </Button>

      <VoiceInputDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirm}
        lang={lang}
      />
    </>
  );
}
