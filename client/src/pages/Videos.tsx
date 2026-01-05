import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";

export default function Videos() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">视频学习</h1>
          <p className="text-muted-foreground mt-2">观看相关知识点讲解视频</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">视频学习功能开发中...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
