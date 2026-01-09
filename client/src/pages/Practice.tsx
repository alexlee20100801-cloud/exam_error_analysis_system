import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Practice() {
  const { data: progress } = trpc.practice.getProgress.useQuery();
  
  const learningKnowledgePoints = progress?.filter(p => p.status === "learning" || p.status === "reviewing") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">练习中心</h1>
          <p className="text-muted-foreground mt-2">针对性练习，巩固薄弱知识点</p>
        </div>

        {learningKnowledgePoints.length > 0 ? (
          <div className="grid gap-4">
            {learningKnowledgePoints.slice(0, 10).map((item: any) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>知识点 ID: {item.knowledgePointId}</CardTitle>
                  <CardDescription>
                    掌握度: {Math.round(item.masteryLevel || 0)}% · 
                    练习次数: {item.practiceCount || 0} · 
                    正确率: {(item.practiceCount || 0) > 0 ? Math.round(((item.correctCount || 0) / (item.practiceCount || 1)) * 100) : 0}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button>开始练习</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">暂无练习任务</p>
              <p className="text-sm text-muted-foreground">先上传错题并进行AI分析，系统会自动生成练习任务</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
