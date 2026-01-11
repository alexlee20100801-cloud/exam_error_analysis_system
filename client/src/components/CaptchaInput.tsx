import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaptchaInputProps {
  value: string;
  onChange: (value: string) => void;
  captchaId: string;
  onCaptchaIdChange: (captchaId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CaptchaInput({
  value,
  onChange,
  captchaId,
  onCaptchaIdChange,
  className,
  disabled = false,
}: CaptchaInputProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  
  const { data, refetch, isLoading, isFetching } = trpc.captcha.getCaptcha.useQuery(undefined, {
    enabled: false,
  });

  // 处理验证码数据更新
  useEffect(() => {
    if (data) {
      setSvgContent(data.svg);
      onCaptchaIdChange(data.captchaId);
    }
  }, [data, onCaptchaIdChange]);

  // 初始化时获取验证码
  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleRefresh = useCallback(() => {
    onChange(""); // 清空输入
    refetch();
  }, [onChange, refetch]);

  const isRefreshing = isLoading || isFetching;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        type="text"
        placeholder="请输入图形验证码"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        maxLength={4}
        className="flex-1"
        disabled={disabled}
        autoComplete="off"
      />
      <div className="flex items-center gap-1">
        {svgContent ? (
          <div
            className="h-10 w-[120px] cursor-pointer rounded border bg-white"
            onClick={handleRefresh}
            dangerouslySetInnerHTML={{ __html: svgContent }}
            title="点击刷新验证码"
          />
        ) : (
          <div className="flex h-10 w-[120px] items-center justify-center rounded border bg-muted">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing || disabled}
          title="刷新验证码"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}

// 简化版本的图形验证码组件，用于表单中
interface SimpleCaptchaProps {
  onVerified: (captchaId: string, code: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SimpleCaptcha({
  onVerified,
  className,
  disabled = false,
}: SimpleCaptchaProps) {
  const [code, setCode] = useState("");
  const [captchaId, setCaptchaId] = useState("");

  useEffect(() => {
    if (code.length === 4 && captchaId) {
      onVerified(captchaId, code);
    }
  }, [code, captchaId, onVerified]);

  return (
    <CaptchaInput
      value={code}
      onChange={setCode}
      captchaId={captchaId}
      onCaptchaIdChange={setCaptchaId}
      className={className}
      disabled={disabled}
    />
  );
}

export default CaptchaInput;
