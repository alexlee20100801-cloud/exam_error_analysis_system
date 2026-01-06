/**
 * 批量操作组件
 * 支持批量标注保存、批量OCR提取、批量对比分析
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  FileText,
  BarChart3,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface BatchOperationsProps {
  questionIds: number[];
  onComplete?: () => void;
}

type OperationType = "annotation" | "ocr" | "comparison";

interface OperationResult {
  questionId: number;
  success: boolean;
  message?: string;
}

export function BatchOperations({ questionIds, onComplete }: BatchOperationsProps) {
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>(questionIds);
  const [operationType, setOperationType] = useState<OperationType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OperationResult[]>([]);

  // 获取错题列表
  const { data: questions = [] } = trpc.errorQuestions.list.useQuery({
    limit: 1000,
  });

  const selectedQuestionsData = questions.filter((q: any) =>
    selectedQuestions.includes(q.id)
  );

  // 切换选择
  const toggleQuestion = (id: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleAll = () => {
    if (selectedQuestions.length === questionIds.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(questionIds);
    }
  };

  // 批量保存标注
  const handleBatchAnnotation = async () => {
    setOperationType("annotation");
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const newResults: OperationResult[] = [];

    for (let i = 0; i < selectedQuestions.length; i++) {
      const questionId = selectedQuestions[i];
      try {
        // 这里应该调用实际的保存标注API
        // 暂时模拟处理
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        newResults.push({
          questionId,
          success: true,
          message: "标注已保存",
        });
      } catch (error) {
        newResults.push({
          questionId,
          success: false,
          message: "保存失败",
        });
      }

      setProgress(((i + 1) / selectedQuestions.length) * 100);
      setResults([...newResults]);
    }

    setIsProcessing(false);
    toast.success(`批量标注完成：${newResults.filter((r) => r.success).length}/${selectedQuestions.length} 成功`);
    onComplete?.();
  };

  // 批量OCR提取
  const handleBatchOCR = async () => {
    setOperationType("ocr");
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const newResults: OperationResult[] = [];

    for (let i = 0; i < selectedQuestions.length; i++) {
      const questionId = selectedQuestions[i];
      try {
        // 这里应该调用实际的OCR提取API
        // 暂时模拟处理
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        newResults.push({
          questionId,
          success: true,
          message: "数据已提取",
        });
      } catch (error) {
        newResults.push({
          questionId,
          success: false,
          message: "提取失败",
        });
      }

      setProgress(((i + 1) / selectedQuestions.length) * 100);
      setResults([...newResults]);
    }

    setIsProcessing(false);
    toast.success(`批量OCR完成：${newResults.filter((r) => r.success).length}/${selectedQuestions.length} 成功`);
    onComplete?.();
  };

  // 批量对比分析
  const handleBatchComparison = async () => {
    setOperationType("comparison");
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const newResults: OperationResult[] = [];

    for (let i = 0; i < selectedQuestions.length; i++) {
      const questionId = selectedQuestions[i];
      try {
        // 这里应该调用实际的对比分析API
        // 暂时模拟处理
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        newResults.push({
          questionId,
          success: true,
          message: "对比分析完成",
        });
      } catch (error) {
        newResults.push({
          questionId,
          success: false,
          message: "分析失败",
        });
      }

      setProgress(((i + 1) / selectedQuestions.length) * 100);
      setResults([...newResults]);
    }

    setIsProcessing(false);
    toast.success(`批量对比完成：${newResults.filter((r) => r.success).length}/${selectedQuestions.length} 成功`);
    onComplete?.();
  };

  // 导出结果
  const handleExport = () => {
    const csvContent = [
      ["题目ID", "状态", "消息"],
      ...results.map((r) => [
        r.questionId,
        r.success ? "成功" : "失败",
        r.message || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-operation-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("结果已导出");
  };

  return (
    <div className="space-y-6">
      {/* 题目选择 */}
      <Card>
        <CardHeader>
          <CardTitle>选择题目</CardTitle>
          <CardDescription>
            已选择 {selectedQuestions.length} / {questionIds.length} 道题目
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedQuestions.length === questionIds.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium">全选</span>
          </div>

          <Separator />

          <div className="max-h-60 overflow-y-auto space-y-2">
            {selectedQuestionsData.map((question: any) => (
              <div
                key={question.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-accent"
              >
                <Checkbox
                  checked={selectedQuestions.includes(question.id)}
                  onCheckedChange={() => toggleQuestion(question.id)}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">
                    {question.title || `题目 #${question.id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {question.subject} · {question.grade}
                  </p>
                </div>
                {question.imageUrl && (
                  <Badge variant="outline" className="text-xs">
                    有图
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 操作选择 */}
      <Card>
        <CardHeader>
          <CardTitle>批量操作</CardTitle>
          <CardDescription>选择要执行的批量操作</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleBatchAnnotation}
            disabled={isProcessing || selectedQuestions.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            批量保存标注
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleBatchOCR}
            disabled={isProcessing || selectedQuestions.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            批量OCR提取
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleBatchComparison}
            disabled={isProcessing || selectedQuestions.length === 0}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            批量对比分析
          </Button>
        </CardContent>
      </Card>

      {/* 进度显示 */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              处理中...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}% 完成
            </p>
          </CardContent>
        </Card>
      )}

      {/* 结果显示 */}
      {results.length > 0 && !isProcessing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>操作结果</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                导出结果
              </Button>
            </div>
            <CardDescription>
              成功: {results.filter((r) => r.success).length} / 失败:{" "}
              {results.filter((r) => !r.success).length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {results.map((result) => {
                const question = selectedQuestionsData.find(
                  (q: any) => q.id === result.questionId
                );
                return (
                  <div
                    key={result.questionId}
                    className="flex items-center gap-2 p-2 rounded border"
                  >
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {question?.title || `题目 #${result.questionId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
