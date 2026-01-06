import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, AlertCircle, Smartphone, CreditCard } from "lucide-react";
import QRCode from "qrcode";

export function Payment() {
  const [, params] = useRoute("/payment/:orderNo");
  const [, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "error">("pending");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "stripe">("wechat");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const orderQuery = trpc.payment.getOrder.useQuery(
    { orderNo: params?.orderNo || "" },
    { enabled: !!params?.orderNo }
  );

  // 创建支付二维码
  const createQrCodeMutation = trpc.payment.createPaymentQrCode.useMutation({
    onSuccess: async (data) => {
      setQrCodeUrl(data.qrCode);
      // 生成二维码图片
      if (canvasRef.current && data.qrCode) {
        try {
          await QRCode.toCanvas(canvasRef.current, data.qrCode, {
            width: 256,
            margin: 2,
          });
        } catch (error) {
          console.error("生成二维码失败:", error);
        }
      }
      // 开始轮询支付状态
      startPolling();
    },
    onError: (error) => {
      alert(`创建支付二维码失败：${error.message}`);
    },
  });

  // 查询支付状态
  const queryStatusQuery = trpc.payment.queryPaymentStatus.useQuery(
    { orderNo: params?.orderNo || "" },
    {
      enabled: false, // 手动触发
      refetchInterval: false,
    }
  );

  // 开始轮询支付状态
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      const result = await queryStatusQuery.refetch();
      if (result.data?.status === "paid") {
        setPaymentStatus("success");
        stopPolling();
        setTimeout(() => {
          setLocation("/dashboard");
        }, 3000);
      }
    }, 3000); // 每3秒查询一次
  };

  // 停止轮询
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // 切换支付方式时创建二维码
  const handlePaymentMethodChange = (method: "wechat" | "alipay" | "stripe") => {
    setPaymentMethod(method);
    if (method !== "stripe" && params?.orderNo) {
      createQrCodeMutation.mutate({
        orderNo: params.orderNo,
        paymentMethod: method,
      });
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
          <p className="text-center text-muted-foreground mb-4">未找到该订单信息</p>
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
          <p className="text-sm text-center text-muted-foreground">3秒后自动跳转...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-16">
      <div className="container max-w-3xl">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-6">确认支付</h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 左侧：订单信息 */}
            <div>
              <div className="bg-muted p-6 rounded-lg mb-6">
                <h3 className="font-semibold mb-4">订单信息</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">订单号</span>
                    <span className="font-mono text-sm">{order.orderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">套餐</span>
                    <span className="font-semibold">{plan?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">有效期</span>
                    <span>{plan?.durationDays}天</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold mt-4 pt-4 border-t">
                    <span>支付金额</span>
                    <span className="text-primary">
                      ¥{(order.amount / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>• 支付成功后系统将自动创建账号</p>
                <p>• 登录凭证将发送至您的邮箱</p>
                <p>• 订单有效期2小时</p>
              </div>
            </div>

            {/* 右侧：支付方式 */}
            <div>
              <Tabs value={paymentMethod} onValueChange={(v) => handlePaymentMethodChange(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="wechat">
                    <Smartphone className="h-4 w-4 mr-2" />
                    微信
                  </TabsTrigger>
                  <TabsTrigger value="alipay">
                    <CreditCard className="h-4 w-4 mr-2" />
                    支付宝
                  </TabsTrigger>
                  <TabsTrigger value="stripe">Stripe</TabsTrigger>
                </TabsList>

                <TabsContent value="wechat" className="mt-6">
                  <div className="text-center">
                    <h3 className="font-semibold mb-4">微信扫码支付</h3>
                    {createQrCodeMutation.isPending ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : qrCodeUrl ? (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <canvas ref={canvasRef} className="border-4 border-gray-200 rounded-lg" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          请使用微信扫描二维码完成支付
                        </p>
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          等待支付中...
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() =>
                          handlePaymentMethodChange("wechat")
                        }
                        className="w-full"
                      >
                        生成支付二维码
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="alipay" className="mt-6">
                  <div className="text-center">
                    <h3 className="font-semibold mb-4">支付宝扫码支付</h3>
                    {createQrCodeMutation.isPending ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : qrCodeUrl ? (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <canvas ref={canvasRef} className="border-4 border-gray-200 rounded-lg" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          请使用支付宝扫描二维码完成支付
                        </p>
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          等待支付中...
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() =>
                          handlePaymentMethodChange("alipay")
                        }
                        className="w-full"
                      >
                        生成支付二维码
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="stripe" className="mt-6">
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Stripe支付功能开发中...</p>
                    <Button disabled className="w-full">
                      暂不可用
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
