import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AIAnnotationAssistantProps {
  imageUrl: string;
  subject?: string;
  onAcceptAnnotations: (annotations: any[]) => void;
}

export function AIAnnotationAssistant({
  imageUrl,
  subject,
  onAcceptAnnotations,
}: AIAnnotationAssistantProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);

  const generateMutation = trpc.aiAnnotation.generateSuggestions.useMutation({
    onSuccess: (data) => {
      setSuggestions(data);
    },
  });

  const handleGenerate = () => {
    setOpen(true);
    generateMutation.mutate({ imageUrl, subject });
  };

  const handleAccept = () => {
    if (suggestions?.suggestions) {
      onAcceptAnnotations(suggestions.suggestions);
      setOpen(false);
      setSuggestions(null);
    }
  };

  const handleReject = () => {
    setOpen(false);
    setSuggestions(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "高";
    if (confidence >= 0.6) return "中";
    return "低";
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI分析中...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI辅助标注
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI标注建议</DialogTitle>
            <DialogDescription>
              AI已分析图表并生成标注建议，您可以接受、拒绝或手动调整
            </DialogDescription>
          </DialogHeader>

          {generateMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                AI分析失败，请稍后重试
              </AlertDescription>
            </Alert>
          )}

          {suggestions && (
            <div className="space-y-4">
              {/* 图表类型和置信度 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">识别结果</CardTitle>
                      <CardDescription className="mt-1">
                        图表类型：{suggestions.chartType}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">置信度</div>
                      <div className={`text-lg font-semibold ${getConfidenceColor(suggestions.confidence)}`}>
                        {(suggestions.confidence * 100).toFixed(0)}%
                      </div>
                      <Badge
                        variant={
                          suggestions.confidence >= 0.8
                            ? "default"
                            : suggestions.confidence >= 0.6
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {getConfidenceLabel(suggestions.confidence)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* 标注列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">生成的标注</CardTitle>
                  <CardDescription>
                    共 {suggestions.suggestions.length} 个标注点
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {suggestions.suggestions.map((annotation: any, index: number) => (
                      <div
                        key={annotation.id}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <div>
                            <div className="text-sm font-medium">
                              {annotation.type === "arrow" && "箭头"}
                              {annotation.type === "text" && `文字: ${annotation.text}`}
                              {annotation.type === "circle" && "圆圈"}
                              {annotation.type === "rectangle" && "矩形"}
                              {annotation.type === "highlight" && "高亮"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              位置: ({annotation.x.toFixed(0)}, {annotation.y.toFixed(0)})
                            </div>
                          </div>
                        </div>
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: annotation.color }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleReject}>
                  <X className="w-4 h-4 mr-2" />
                  拒绝
                </Button>
                <Button onClick={handleAccept}>
                  <Check className="w-4 h-4 mr-2" />
                  接受并应用
                </Button>
              </div>

              {/* 提示 */}
              {suggestions.confidence < 0.6 && (
                <Alert>
                  <AlertDescription>
                    AI识别置信度较低，建议手动检查和调整标注位置
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
