import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Practice() {
  const { t } = useTranslation();
  const { data: progress } = trpc.practice.getProgress.useQuery();
  
  const learningKnowledgePoints = progress?.filter(p => p.status === "learning" || p.status === "reviewing") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('practice.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('practice.subtitle')}</p>
        </div>

        {learningKnowledgePoints.length > 0 ? (
          <div className="grid gap-4">
            {learningKnowledgePoints.slice(0, 10).map((item: any) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{t('practice.knowledgePoint')} ID: {item.knowledgePointId}</CardTitle>
                  <CardDescription>
                    {t('practice.masteryLevel')}: {Math.round(item.masteryLevel || 0)}% · 
                    {t('practice.practiceCount')}: {item.practiceCount || 0} · 
                    {t('practice.accuracy')}: {(item.practiceCount || 0) > 0 ? Math.round(((item.correctCount || 0) / (item.practiceCount || 1)) * 100) : 0}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button>{t('practice.startPractice')}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{t('practice.noTask')}</p>
              <p className="text-sm text-muted-foreground">{t('practice.noTaskHint')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
