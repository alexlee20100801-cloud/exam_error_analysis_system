import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Lightbulb, TrendingUp, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface SimilarQuestionsSectionProps {
  questionId: number;
}

export function SimilarQuestionsSection({ questionId }: SimilarQuestionsSectionProps) {
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = trpc.similarQuestions.getSimilar.useQuery(
    { questionId, limit: 5 },
    { enabled: questionId > 0 }
  );

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI相似题目推荐
          </CardTitle>
          <CardDescription>正在分析知识点并推荐相似题目...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return null; // 静默失败，不影响主体验
  }

  const similarQuestions = data.questions || [];

  if (similarQuestions.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI相似题目推荐
          </CardTitle>
          <CardDescription>基于知识点分析推荐相似题目</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              暂无相似题目推荐。继续添加更多错题，系统将为您智能推荐相关练习。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const difficultyColors = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const difficultyLabels = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  };

  return (
    <Card className="mb-6 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI相似题目推荐
        </CardTitle>
        <CardDescription>
          基于知识点分析，为您推荐 {similarQuestions.length} 道相似题目
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {similarQuestions.map((q: any, index: number) => (
          <div
            key={q.id}
            className="flex items-start gap-3 p-4 rounded-lg border hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all cursor-pointer group"
            onClick={() => setLocation(`/error-questions/${q.id}`)}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-sm font-semibold text-purple-700 dark:text-purple-300">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm line-clamp-1 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                  {q.title}
                </h4>
                <Badge
                  variant="secondary"
                  className={`text-xs ${difficultyColors[q.difficulty as keyof typeof difficultyColors] || ""}`}
                >
                  {difficultyLabels[q.difficulty as keyof typeof difficultyLabels] || q.difficulty}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <TrendingUp className="h-3 w-3" />
                <span>相似度：{Math.round(q.similarity)}%</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {q.reason}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-500 transition-colors flex-shrink-0" />
          </div>
        ))}
        
        <Alert className="mt-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <Lightbulb className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-xs">
            <strong>提示：</strong>通过练习相似题目，可以更好地巩固相关知识点，提升解题能力。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
