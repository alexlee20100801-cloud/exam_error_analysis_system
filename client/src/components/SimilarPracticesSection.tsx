import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Lightbulb, ArrowRight, Target, TrendingUp } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useLocation } from "wouter";

interface SimilarPracticesSectionProps {
  practicePoolId: number;
}

const difficultyMap: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  medium: { label: "中等", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  hard: { label: "困难", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const reasonIconMap: Record<string, React.ReactNode> = {
  same_knowledge_point: <Target className="h-3 w-3" />,
  similar_difficulty: <TrendingUp className="h-3 w-3" />,
  same_question_type: <Lightbulb className="h-3 w-3" />,
  error_prone: <Lightbulb className="h-3 w-3" />,
};

export function SimilarPracticesSection({ practicePoolId }: SimilarPracticesSectionProps) {
  const [, setLocation] = useLocation();
  
  const { data, isLoading } = trpc.practicePools.getSimilarPractices.useQuery({
    practicePoolId,
    limit: 5,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            相似题推荐
          </CardTitle>
          <CardDescription>正在加载推荐题目...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data?.success || !data.recommendations || data.recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            相似题推荐
          </CardTitle>
          <CardDescription>暂无相似题目推荐</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          相似题推荐
        </CardTitle>
        <CardDescription>
          基于知识点、难度和题型为您推荐 {data.recommendations.length} 道相似题目
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.recommendations.map((rec: any, index: number) => (
            <div
              key={rec.practicePoolId}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {/* 序号 */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {index + 1}
              </div>

              {/* 题目信息 */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium mb-2 line-clamp-2">
                  {rec.errorQuestion?.title || "练习题"}
                </h4>
                
                {/* 题目预览 */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {rec.practiceQuestion?.content || ""}
                </p>

                {/* 标签和推荐理由 */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* 难度标签 */}
                  {rec.practiceQuestion?.difficulty && (
                    <Badge className={difficultyMap[rec.practiceQuestion.difficulty]?.color || ""}>
                      {difficultyMap[rec.practiceQuestion.difficulty]?.label || rec.practiceQuestion.difficulty}
                    </Badge>
                  )}

                  {/* 相似度 */}
                  <Badge variant="outline" className="text-xs">
                    匹配度 {rec.similarity}%
                  </Badge>

                  {/* 推荐理由 */}
                  {rec.reasonTexts && rec.reasonTexts.map((reason: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
                      {reasonIconMap[rec.reasons[idx]]}
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <FavoriteButton
                  questionId={rec.practiceQuestion?.id || 0}
                  questionType="practice_question"
                  size="sm"
                  showText={false}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLocation(`/practice/${rec.practicePoolId}`)}
                >
                  <span className="hidden sm:inline">去练习</span>
                  <ArrowRight className="h-4 w-4 sm:ml-2" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
