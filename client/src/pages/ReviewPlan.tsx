import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function ReviewPlan() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">复习计划</h1>
          <p className="text-muted-foreground mt-2">智能复习提醒和计划管理</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">复习计划功能开发中...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
