import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoicePlayerProps {
  script: string;
  title?: string;
}

export function VoicePlayer({ script, title = "AI语音讲解" }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRate] = useState("1");
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // 检查浏览器是否支持Web Speech API
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      toast.error("您的浏览器不支持语音播放功能");
    }

    return () => {
      // 组件卸载时停止播放
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = () => {
    if (!isSupported) {
      toast.error("您的浏览器不支持语音播放功能");
      return;
    }

    if (isPaused) {
      // 恢复播放
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // 创建新的语音合成实例
    const utterance = new SpeechSynthesisUtterance(script);
    utteranceRef.current = utterance;

    // 设置语音参数
    utterance.rate = parseFloat(rate);
    utterance.pitch = 1;
    utterance.volume = isMuted ? 0 : 1;
    utterance.lang = 'zh-CN';

    // 事件监听
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      console.error("语音播放错误:", event);
      toast.error("语音播放出错，请重试");
      setIsPlaying(false);
      setIsPaused(false);
    };

    // 开始播放
    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (window.speechSynthesis && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleRateChange = (value: string) => {
    setRate(value);
    // 如果正在播放，需要重新开始以应用新的速率
    if (isPlaying || isPaused) {
      handleStop();
      setTimeout(() => {
        handlePlay();
      }, 100);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (utteranceRef.current) {
      utteranceRef.current.volume = newMuted ? 0 : 1;
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>您的浏览器不支持语音播放功能</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>点击播放按钮收听AI讲解</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 播放控制按钮 */}
        <div className="flex items-center gap-2">
          {!isPlaying && !isPaused && (
            <Button onClick={handlePlay} size="lg">
              <Play className="mr-2 h-4 w-4" />
              播放讲解
            </Button>
          )}

          {isPlaying && (
            <Button onClick={handlePause} size="lg" variant="secondary">
              <Pause className="mr-2 h-4 w-4" />
              暂停
            </Button>
          )}

          {isPaused && (
            <Button onClick={handlePlay} size="lg">
              <Play className="mr-2 h-4 w-4" />
              继续播放
            </Button>
          )}

          {(isPlaying || isPaused) && (
            <Button onClick={handleStop} size="lg" variant="outline">
              停止
            </Button>
          )}

          <Button
            onClick={toggleMute}
            size="icon"
            variant="ghost"
            className="ml-auto"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 播放速度控制 */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground min-w-[60px]">播放速度</span>
          <Select value={rate} onValueChange={handleRateChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1.0x（正常）</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2.0x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 讲解稿文本展示 */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">讲解稿内容：</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {script}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
