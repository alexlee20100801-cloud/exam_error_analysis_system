import { useState, useEffect, useRef, useCallback } from "react";

export type SpeechRecognitionStatus = "idle" | "listening" | "processing" | "error";

interface UseSpeechRecognitionOptions {
  lang?: string; // 语言代码，如 'zh-CN', 'en-US'
  continuous?: boolean; // 是否持续识别
  interimResults?: boolean; // 是否返回临时结果
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    lang = "zh-CN",
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // 检查浏览器支持
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
    } else {
      setIsSupported(false);
      setError("您的浏览器不支持语音识别功能");
    }
  }, []);

  // 配置识别器
  useEffect(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setStatus("listening");
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        setInterimTranscript("");
        onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        setInterimTranscript(interimTranscript);
        onResult?.(interimTranscript, false);
      }
    };

    recognition.onerror = (event: any) => {
      setStatus("error");
      let errorMessage = "语音识别出错";
      
      switch (event.error) {
        case "no-speech":
          errorMessage = "未检测到语音，请重试";
          break;
        case "audio-capture":
          errorMessage = "无法访问麦克风，请检查权限";
          break;
        case "not-allowed":
          errorMessage = "麦克风权限被拒绝";
          break;
        case "network":
          errorMessage = "网络错误，请检查网络连接";
          break;
        case "aborted":
          errorMessage = "语音识别已取消";
          break;
        default:
          errorMessage = `语音识别错误: ${event.error}`;
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      setStatus("idle");
    };

    return () => {
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
      }
    };
  }, [lang, continuous, interimResults, onResult, onError]);

  const start = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError("语音识别不可用");
      return;
    }

    try {
      setTranscript("");
      setInterimTranscript("");
      setError(null);
      recognitionRef.current.start();
    } catch (err: any) {
      if (err.name === "InvalidStateError") {
        // 已经在运行中，先停止再启动
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
        }, 100);
      } else {
        setError("启动语音识别失败");
        setStatus("error");
      }
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (recognitionRef.current && status === "listening") {
      recognitionRef.current.stop();
    }
  }, [status]);

  const abort = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setStatus("idle");
      setTranscript("");
      setInterimTranscript("");
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setStatus("idle");
  }, []);

  return {
    isSupported,
    status,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    abort,
    reset,
  };
}
