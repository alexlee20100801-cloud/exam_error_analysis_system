import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, BookOpen, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface ErrorAnalysisCardProps {
  analysis: {
    knowledgePoints: string[];
    errorReason: string;
    correctAnswer: string;
    detailedExplanation: string;
    studyAdvice: string;
    difficulty: "easy" | "medium" | "hard";
  };
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
}

const DIFFICULTY_LABELS = {
  easy: { label: "简单", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  medium: { label: "中等", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  hard: { label: "困难", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export function ErrorAnalysisCard({ analysis, onReanalyze, isReanalyzing }: ErrorAnalysisCardProps) {
  const difficultyInfo = DIFFICULTY_LABELS[analysis.difficulty];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            AI 智能分析
          </CardTitle>
          {onReanalyze && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReanalyze}
              disabled={isReanalyzing}
            >
              {isReanalyzing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  重新分析中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新分析
                </>
              )}
            </Button>
          )}
        </div>
        <CardDescription>基于AI的知识点分析和学习建议</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 难度和知识点 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">难度等级：</span>
            <Badge className={difficultyInfo.color}>{difficultyInfo.label}</Badge>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">涉及知识点：</span>
            <div className="flex flex-wrap gap-2">
              {analysis.knowledgePoints.map((point, index) => (
                <Badge key={index} variant="secondary">
                  {point}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* 错误原因 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="h-4 w-4 text-red-500" />
            错误原因
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-900 dark:text-red-100 whitespace-pre-wrap">
              {analysis.errorReason}
            </p>
          </div>
        </div>

        {/* 正确答案 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            正确答案
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
              {analysis.correctAnswer}
            </p>
          </div>
        </div>

        {/* 详细解析 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-blue-500" />
            详细解析
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
              {analysis.detailedExplanation}
            </p>
          </div>
        </div>

        {/* 学习建议 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            学习建议
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap">
              {analysis.studyAdvice}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
