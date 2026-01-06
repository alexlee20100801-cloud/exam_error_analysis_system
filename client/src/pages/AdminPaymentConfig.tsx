/**
 * 管理员支付配置页面
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";

export default function AdminPaymentConfig() {
  const [activeTab, setActiveTab] = useState("wechat");

  // 获取所有支付配置
  const { data: configs, isLoading, refetch } = trpc.paymentConfig.getAll.useQuery();

  // 微信支付配置
  const [wechatConfig, setWechatConfig] = useState({
    appId: "",
    mchId: "",
    apiV3Key: "",
    serialNo: "",
    privateKey: "",
    isEnabled: false,
  });

  // 支付宝配置
  const [alipayConfig, setAlipayConfig] = useState({
    appId: "",
    privateKey: "",
    alipayPublicKey: "",
    gateway: "",
    isEnabled: false,
  });

  // 保存微信支付配置
  const saveWechatMutation = trpc.paymentConfig.saveWechat.useMutation({
    onSuccess: () => {
      alert("微信支付配置保存成功！");
      refetch();
    },
    onError: (error) => {
      alert(`保存失败：${error.message}`);
    },
  });

  // 保存支付宝配置
  const saveAlipayMutation = trpc.paymentConfig.saveAlipay.useMutation({
    onSuccess: () => {
      alert("支付宝配置保存成功！");
      refetch();
    },
    onError: (error) => {
      alert(`保存失败：${error.message}`);
    },
  });

  const handleSaveWechat = () => {
    if (!wechatConfig.appId || !wechatConfig.mchId || !wechatConfig.apiV3Key) {
      alert("请填写所有必填字段");
      return;
    }
    saveWechatMutation.mutate(wechatConfig);
  };

  const handleSaveAlipay = () => {
    if (!alipayConfig.appId || !alipayConfig.privateKey || !alipayConfig.alipayPublicKey) {
      alert("请填写所有必填字段");
      return;
    }
    saveAlipayMutation.mutate(alipayConfig);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const wechatEnabled = configs?.find((c) => c.paymentMethod === "wechat")?.isEnabled;
  const alipayEnabled = configs?.find((c) => c.paymentMethod === "alipay")?.isEnabled;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">支付配置管理</h1>
        <p className="text-muted-foreground">
          配置微信支付和支付宝支付的商户信息，启用后用户可以使用对应的支付方式购买套餐
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>重要提示：</strong>
          配置信息将加密存储在数据库中。请确保您已经在微信支付和支付宝开放平台完成商户认证并获取相关密钥。
        </AlertDescription>
      </Alert>

      {/* 支付方式状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stripe支付</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">已启用</span>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">系统已集成</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">微信支付</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${wechatEnabled ? "text-green-600" : "text-gray-400"}`}>
                {wechatEnabled ? "已启用" : "未启用"}
              </span>
              {wechatEnabled ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">需要配置商户信息</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">支付宝支付</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${alipayEnabled ? "text-green-600" : "text-gray-400"}`}>
                {alipayEnabled ? "已启用" : "未启用"}
              </span>
              {alipayEnabled ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">需要配置商户信息</p>
          </CardContent>
        </Card>
      </div>

      {/* 配置表单 */}
      <Card>
        <CardHeader>
          <CardTitle>支付方式配置</CardTitle>
          <CardDescription>配置微信支付和支付宝的商户信息</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wechat">微信支付</TabsTrigger>
              <TabsTrigger value="alipay">支付宝支付</TabsTrigger>
            </TabsList>

            {/* 微信支付配置 */}
            <TabsContent value="wechat" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="wechat-appid">应用ID (AppID) *</Label>
                <Input
                  id="wechat-appid"
                  placeholder="wx1234567890abcdef"
                  value={wechatConfig.appId}
                  onChange={(e) => setWechatConfig({ ...wechatConfig, appId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wechat-mchid">商户号 (MchID) *</Label>
                <Input
                  id="wechat-mchid"
                  placeholder="1234567890"
                  value={wechatConfig.mchId}
                  onChange={(e) => setWechatConfig({ ...wechatConfig, mchId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wechat-apiv3key">APIv3密钥 *</Label>
                <Input
                  id="wechat-apiv3key"
                  type="password"
                  placeholder="32位字符串"
                  value={wechatConfig.apiV3Key}
                  onChange={(e) => setWechatConfig({ ...wechatConfig, apiV3Key: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">在微信支付商户平台设置的32位密钥</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wechat-serialno">证书序列号 *</Label>
                <Input
                  id="wechat-serialno"
                  placeholder="证书序列号"
                  value={wechatConfig.serialNo}
                  onChange={(e) => setWechatConfig({ ...wechatConfig, serialNo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wechat-privatekey">商户私钥 (PEM格式) *</Label>
                <Textarea
                  id="wechat-privatekey"
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  rows={6}
                  value={wechatConfig.privateKey}
                  onChange={(e) => setWechatConfig({ ...wechatConfig, privateKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">从商户证书文件中提取的私钥内容</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="wechat-enabled"
                  checked={wechatConfig.isEnabled}
                  onCheckedChange={(checked) => setWechatConfig({ ...wechatConfig, isEnabled: checked })}
                />
                <Label htmlFor="wechat-enabled">启用微信支付</Label>
              </div>

              <Button
                onClick={handleSaveWechat}
                disabled={saveWechatMutation.isPending}
                className="w-full"
              >
                {saveWechatMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    保存微信支付配置
                  </>
                )}
              </Button>
            </TabsContent>

            {/* 支付宝配置 */}
            <TabsContent value="alipay" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="alipay-appid">应用ID (AppID) *</Label>
                <Input
                  id="alipay-appid"
                  placeholder="2021001234567890"
                  value={alipayConfig.appId}
                  onChange={(e) => setAlipayConfig({ ...alipayConfig, appId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alipay-privatekey">应用私钥 (PKCS8格式) *</Label>
                <Textarea
                  id="alipay-privatekey"
                  placeholder="MIIEvQIBADANBgkqhkiG9w0BAQEFAASC..."
                  rows={6}
                  value={alipayConfig.privateKey}
                  onChange={(e) => setAlipayConfig({ ...alipayConfig, privateKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">应用私钥字符串（不含BEGIN/END标记）</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alipay-publickey">支付宝公钥 *</Label>
                <Textarea
                  id="alipay-publickey"
                  placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
                  rows={6}
                  value={alipayConfig.alipayPublicKey}
                  onChange={(e) => setAlipayConfig({ ...alipayConfig, alipayPublicKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">从支付宝开放平台获取的公钥</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alipay-gateway">网关地址（可选）</Label>
                <Input
                  id="alipay-gateway"
                  placeholder="https://openapi.alipay.com/gateway.do"
                  value={alipayConfig.gateway}
                  onChange={(e) => setAlipayConfig({ ...alipayConfig, gateway: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">留空使用默认正式环境网关</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="alipay-enabled"
                  checked={alipayConfig.isEnabled}
                  onCheckedChange={(checked) => setAlipayConfig({ ...alipayConfig, isEnabled: checked })}
                />
                <Label htmlFor="alipay-enabled">启用支付宝支付</Label>
              </div>

              <Button
                onClick={handleSaveAlipay}
                disabled={saveAlipayMutation.isPending}
                className="w-full"
              >
                {saveAlipayMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    保存支付宝配置
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 帮助文档 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>配置帮助</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">微信支付配置步骤：</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>登录微信支付商户平台（pay.weixin.qq.com）</li>
              <li>在"账户中心 - API安全"中设置APIv3密钥</li>
              <li>下载商户API证书，提取私钥和序列号</li>
              <li>填写上述信息并启用</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">支付宝配置步骤：</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>登录支付宝开放平台（open.alipay.com）</li>
              <li>创建应用并提交审核</li>
              <li>使用密钥生成工具生成应用私钥和公钥</li>
              <li>上传应用公钥到开放平台，获取支付宝公钥</li>
              <li>填写应用ID、应用私钥和支付宝公钥</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
