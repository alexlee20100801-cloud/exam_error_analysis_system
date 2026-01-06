import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Check, Crown, Zap, Star } from "lucide-react";
import { useLocation } from "wouter";

export function SubscriptionPlans() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({
    email: "",
    phone: "",
    name: "",
  });

  const plansQuery = trpc.subscriptionPlan.getAll.useQuery();
  const createOrderMutation = trpc.payment.createOrder.useMutation({
    onSuccess: (data) => {
      // 跳转到支付页面
      setLocation(`/payment/${data.orderNo}`);
    },
  });

  const handleBuyClick = (plan: any) => {
    setSelectedPlan(plan);
    setShowBuyDialog(true);
  };

  const handleConfirmBuy = () => {
    if (!selectedPlan) return;

    if (!buyerInfo.email && !buyerInfo.phone) {
      alert("请至少填写邮箱或手机号");
      return;
    }

    createOrderMutation.mutate({
      planId: selectedPlan.id,
      buyerInfo,
    });
  };

  const getPlanIcon = (index: number) => {
    const icons = [Zap, Star, Crown];
    return icons[index % icons.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">选择适合您的套餐</h1>
          <p className="text-lg text-muted-foreground">
            解锁强大的学习功能，提升学习效率
          </p>
        </div>

        {plansQuery.isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plansQuery.data?.map((plan, index) => {
            const Icon = getPlanIcon(index);
            const isPopular = index === 1;

            return (
              <Card
                key={plan.id}
                className={`relative p-8 ${
                  isPopular
                    ? "border-2 border-purple-500 shadow-xl scale-105"
                    : "border shadow-md"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    最受欢迎
                  </div>
                )}

                <div className="text-center mb-6">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                      isPopular
                        ? "bg-purple-100 text-purple-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {plan.description}
                  </p>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      ¥{(plan.price / 100).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">
                      /{plan.durationDays}天
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature: string) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{getFeatureName(feature)}</span>
                    </li>
                  ))}
                  {plan.maxAiAnalysis !== -1 && (
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">
                        AI分析 {plan.maxAiAnalysis} 次
                      </span>
                    </li>
                  )}
                  {plan.maxAiAnalysis === -1 && (
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">无限次AI分析</span>
                    </li>
                  )}
                </ul>

                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => handleBuyClick(plan)}
                >
                  立即购买
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 购买确认对话框 */}
      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认购买</DialogTitle>
            <DialogDescription>
              请填写您的联系方式，支付成功后将自动创建账号并发送凭证
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">{selectedPlan?.name}</h4>
              <p className="text-2xl font-bold">
                ¥{selectedPlan && (selectedPlan.price / 100).toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                type="email"
                value={buyerInfo.email}
                onChange={(e) =>
                  setBuyerInfo({ ...buyerInfo, email: e.target.value })
                }
                placeholder="用于接收账号凭证"
              />
            </div>

            <div>
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                value={buyerInfo.phone}
                onChange={(e) =>
                  setBuyerInfo({ ...buyerInfo, phone: e.target.value })
                }
                placeholder="选填"
              />
            </div>

            <div>
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={buyerInfo.name}
                onChange={(e) =>
                  setBuyerInfo({ ...buyerInfo, name: e.target.value })
                }
                placeholder="选填"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBuyDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmBuy}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "创建订单中..." : "确认购买"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getFeatureName(feature: string): string {
  const featureNames: Record<string, string> = {
    error_questions: "错题管理",
    practice: "智能练习",
    ai_analysis: "AI智能分析",
    video_learning: "视频学习",
    basic_stats: "基础统计",
    advanced_stats: "高级统计报告",
    exam_generator: "AI试卷生成",
    learning_path: "个性化学习路径",
    parent_supervision: "家长监督功能",
  };
  return featureNames[feature] || feature;
}
