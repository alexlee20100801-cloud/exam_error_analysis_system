import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export default function LearningReport() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">学习报告</h1>
          <p className="text-muted-foreground mt-2">查看学习数据和进步曲线</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">学习报告功能开发中...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
