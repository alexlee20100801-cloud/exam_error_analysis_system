import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export function Payment() {
  const [, params] = useRoute("/payment/:orderNo");
  const [, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "error">("pending");

  const orderQuery = trpc.payment.getOrder.useQuery(
    { orderNo: params?.orderNo || "" },
    { enabled: !!params?.orderNo }
  );

  const simulatePaymentMutation = trpc.payment.simulatePayment.useMutation({
    onSuccess: (data) => {
      setPaymentStatus("success");
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: () => {
      setPaymentStatus("error");
    },
  });

  const handleSimulatePayment = () => {
    if (params?.orderNo) {
      simulatePaymentMutation.mutate({ orderNo: params.orderNo });
    }
  };

  if (orderQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orderQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-center mb-2">订单不存在</h2>
          <p className="text-center text-muted-foreground mb-4">
            未找到该订单信息
          </p>
          <Button className="w-full" onClick={() => setLocation("/")}>
            返回首页
          </Button>
        </Card>
      </div>
    );
  }

  const { order, plan } = orderQuery.data;

  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="p-8 max-w-md">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-center mb-2">支付成功！</h2>
          <p className="text-center text-muted-foreground mb-4">
            您的账号已自动创建，登录凭证已发送至您的邮箱
          </p>
          <p className="text-sm text-center text-muted-foreground">
            3秒后自动跳转...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-16">
      <div className="container max-w-2xl">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-6">确认支付</h1>

          <div className="space-y-6">
            {/* 订单信息 */}
            <div className="bg-muted p-6 rounded-lg">
              <h3 className="font-semibold mb-4">订单信息</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">订单号</span>
                  <span className="font-mono">{order.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">套餐</span>
                  <span className="font-semibold">{plan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">有效期</span>
                  <span>{plan?.durationDays} 天</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>应付金额</span>
                  <span className="text-purple-600">
                    ¥{(order.amount / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 支付方式选择 */}
            <div>
              <h3 className="font-semibold mb-4">选择支付方式</h3>
              <div className="grid grid-cols-3 gap-4">
                <Button variant="outline" className="h-20" disabled>
                  <div className="text-center">
                    <div className="text-2xl mb-1">💳</div>
                    <div className="text-sm">Stripe</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-20" disabled>
                  <div className="text-center">
                    <div className="text-2xl mb-1">💚</div>
                    <div className="text-sm">微信支付</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-20" disabled>
                  <div className="text-center">
                    <div className="text-2xl mb-1">💙</div>
                    <div className="text-sm">支付宝</div>
                  </div>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                * 支付方式需要管理员在后台配置后启用
              </p>
            </div>

            {/* 测试支付按钮 */}
            <div className="border-t pt-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>测试模式：</strong>
                  点击下方按钮可模拟支付成功，系统将自动创建账号并发送凭证
                </p>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleSimulatePayment}
                disabled={simulatePaymentMutation.isPending}
              >
                {simulatePaymentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    处理中...
                  </>
                ) : (
                  "模拟支付（测试）"
                )}
              </Button>
            </div>

            {paymentStatus === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  支付处理失败，请重试或联系客服
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
