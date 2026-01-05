import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface VoiceInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  lang?: string;
  rows?: number;
  required?: boolean;
  id?: string;
  showHint?: boolean;
}

export function VoiceInputField({
  label,
  value,
  onChange,
  placeholder = "请输入内容，或点击语音输入按钮...",
  lang = "zh-CN",
  rows = 6,
  required = false,
  id,
  showHint = false,
}: VoiceInputFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <VoiceInputButton
          onTranscript={(text) => onChange(value + text)}
          lang={lang}
          size="sm"
        />
      </div>
      
      {showHint && (
        <Alert className="py-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            点击麦克风图标开始语音输入，系统会自动识别您的语音并转换为文字
          </AlertDescription>
        </Alert>
      )}
      
      <Textarea
        id={fieldId}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="resize-none"
      />
    </div>
  );
}
