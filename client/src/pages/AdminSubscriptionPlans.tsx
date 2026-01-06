import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";


export function AdminSubscriptionPlans() {
  const utils = trpc.useUtils();

  const plansQuery = trpc.subscriptionPlan.getAllAdmin.useQuery();
  const initDefaultsMutation = trpc.subscriptionPlan.initializeDefaults.useMutation({
    onSuccess: () => {
      alert("默认套餐已初始化");
      utils.subscriptionPlan.getAllAdmin.invalidate();
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">套餐管理</h1>
            <p className="text-muted-foreground">管理订阅套餐和定价</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => initDefaultsMutation.mutate()}
              disabled={initDefaultsMutation.isPending}
            >
              {initDefaultsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              初始化默认套餐
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建套餐
            </Button>
          </div>
        </div>

        {plansQuery.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plansQuery.data?.map((plan) => (
            <Card key={plan.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <Badge variant={plan.isActive ? "default" : "secondary"}>
                  {plan.isActive ? "启用" : "禁用"}
                </Badge>
              </div>

              <p className="text-muted-foreground text-sm mb-4">
                {plan.description}
              </p>

              <div className="text-3xl font-bold mb-4">
                ¥{(plan.price / 100).toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.durationDays}天
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">功能数量：</span>
                  <span className="font-semibold">{plan.features.length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">AI分析：</span>
                  <span className="font-semibold">
                    {plan.maxAiAnalysis === -1 ? "无限" : plan.maxAiAnalysis}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  编辑
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  删除
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {plansQuery.data?.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">暂无套餐</p>
            <Button
              variant="outline"
              onClick={() => initDefaultsMutation.mutate()}
            >
              初始化默认套餐
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
