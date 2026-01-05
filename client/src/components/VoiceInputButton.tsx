import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useEffect } from "react";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  lang?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function VoiceInputButton({
  onTranscript,
  lang = "zh-CN",
  disabled = false,
  variant = "outline",
  size = "default",
  className = "",
}: VoiceInputButtonProps) {
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
    continuous: false,
    interimResults: true,
  });

  // 当识别完成时，将结果传递给父组件
  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
      reset();
    }
  }, [transcript, onTranscript, reset]);

  // 显示错误提示
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // 显示临时识别结果
  useEffect(() => {
    if (interimTranscript && status === "listening") {
      toast.info(`识别中: ${interimTranscript}`, { duration: 1000 });
    }
  }, [interimTranscript, status]);

  if (!isSupported) {
    return null; // 不支持语音识别时不显示按钮
  }

  const handleClick = () => {
    if (status === "listening") {
      stop();
    } else {
      start();
    }
  };

  const isListening = status === "listening";
  const isProcessing = status === "processing";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`${className} ${isListening ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : ""}`}
      title={isListening ? "点击停止录音" : "点击开始语音输入"}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {size !== "icon" && <span className="ml-2">处理中...</span>}
        </>
      ) : isListening ? (
        <>
          <div className="relative">
            <Mic className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
          </div>
          {size !== "icon" && <span className="ml-2">正在录音...</span>}
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" />
          {size !== "icon" && <span className="ml-2">语音输入</span>}
        </>
      )}
    </Button>
  );
}
