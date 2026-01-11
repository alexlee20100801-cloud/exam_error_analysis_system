import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, Eye, EyeOff, Smartphone, User, MessageSquare } from "lucide-react";
import { getLoginUrl } from "@/const";
import { CaptchaInput } from "@/components/CaptchaInput";

// 密码登录表单验证
const passwordLoginSchema = z.object({
  account: z.string().min(1, "请输入用户名或邮箱"),
  password: z.string().min(1, "请输入密码"),
});

// 手机验证码登录表单验证
const phoneLoginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
  code: z.string().length(6, "验证码必须是6位数字"),
});

// 微信号+密码登录表单验证
const wechatLoginSchema = z.object({
  wechatId: z.string().min(1, "请输入微信号"),
  password: z.string().min(1, "请输入密码"),
});

type PasswordLoginFormData = z.infer<typeof passwordLoginSchema>;
type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;
type WechatLoginFormData = z.infer<typeof wechatLoginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("password");
  const [countdown, setCountdown] = useState(0);
  // 图形验证码状态
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [showCaptcha, setShowCaptcha] = useState(false);

  // 密码登录表单
  const passwordForm = useForm<PasswordLoginFormData>({
    resolver: zodResolver(passwordLoginSchema),
  });

  // 手机验证码登录表单
  const phoneForm = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
  });

  // 微信号登录表单
  const wechatForm = useForm<WechatLoginFormData>({
    resolver: zodResolver(wechatLoginSchema),
  });

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 密码登录
  const passwordLoginMutation = trpc.passwordAuth.login.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err) => {
      setError(err.message || "登录失败，请重试");
    },
  });

  // 发送验证码
  const sendCodeMutation = trpc.smsAuth.sendCode.useMutation({
    onSuccess: () => {
      setCountdown(60);
      setError(null);
      setCaptchaCode(""); // 清空图形验证码
    },
    onError: (err) => {
      setError(err.message || "发送验证码失败");
      // 如果发送失败，显示图形验证码
      if (err.message?.includes("请等待") || err.message?.includes("频繁")) {
        setShowCaptcha(true);
      }
    },
  });

  // 手机验证码登录
  const phoneLoginMutation = trpc.smsAuth.login.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err) => {
      setError(err.message || "登录失败，请重试");
    },
  });

  const onPasswordSubmit = (data: PasswordLoginFormData) => {
    setError(null);
    passwordLoginMutation.mutate(data);
  };

  const onPhoneSubmit = (data: PhoneLoginFormData) => {
    setError(null);
    phoneLoginMutation.mutate(data);
  };

  const onWechatSubmit = (data: WechatLoginFormData) => {
    setError(null);
    // 微信号登录实际上使用密码登录接口，account 为微信号
    passwordLoginMutation.mutate({
      account: data.wechatId,
      password: data.password,
    });
  };

  const handleSendCode = useCallback(() => {
    const phone = phoneForm.getValues("phone");
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    
    // 检查是否需要图形验证码
    if (!showCaptcha) {
      // 首次发送不需要图形验证码，但如果失败则显示
      sendCodeMutation.mutate({ phone, type: "login" });
    } else {
      // 需要图形验证码
      if (!captchaCode || captchaCode.length < 4) {
        setError("请输入图形验证码");
        return;
      }
      sendCodeMutation.mutate({ 
        phone, 
        type: "login",
        captchaId,
        captchaCode,
      });
    }
  }, [phoneForm, showCaptcha, captchaCode, captchaId, sendCodeMutation]);

  const isLoading = passwordLoginMutation.isPending || phoneLoginMutation.isPending || sendCodeMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">欢迎回来</CardTitle>
          <CardDescription>
            登录您的错题分析学习系统账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(null); }}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="password" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">账号</span>
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">验证码</span>
              </TabsTrigger>
              <TabsTrigger value="wechat" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">微信号</span>
              </TabsTrigger>
            </TabsList>

            {/* 账号密码登录 */}
            <TabsContent value="password">
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account">用户名或邮箱</Label>
                  <Input
                    id="account"
                    type="text"
                    placeholder="请输入用户名或邮箱"
                    {...passwordForm.register("account")}
                    disabled={isLoading}
                  />
                  {passwordForm.formState.errors.account && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.account.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      {...passwordForm.register("password")}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {passwordForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {passwordLoginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    "登录"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 手机验证码登录 */}
            <TabsContent value="phone">
              <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入手机号"
                    {...phoneForm.register("phone")}
                    disabled={isLoading}
                  />
                  {phoneForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {phoneForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {/* 图形验证码（防止短信轰炸） */}
                {showCaptcha && (
                  <div className="space-y-2">
                    <Label>图形验证码</Label>
                    <CaptchaInput
                      value={captchaCode}
                      onChange={setCaptchaCode}
                      captchaId={captchaId}
                      onCaptchaIdChange={setCaptchaId}
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">短信验证码</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      type="text"
                      placeholder="请输入短信验证码"
                      maxLength={6}
                      {...phoneForm.register("code")}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || sendCodeMutation.isPending || (showCaptcha && captchaCode.length < 4)}
                      className="w-28 shrink-0"
                    >
                      {sendCodeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}秒`
                      ) : (
                        "获取验证码"
                      )}
                    </Button>
                  </div>
                  {phoneForm.formState.errors.code && (
                    <p className="text-sm text-destructive">
                      {phoneForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {phoneLoginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    "登录"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  未注册的手机号将自动创建账户
                </p>
              </form>
            </TabsContent>

            {/* 微信号+密码登录 */}
            <TabsContent value="wechat">
              <form onSubmit={wechatForm.handleSubmit(onWechatSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wechatId">微信号</Label>
                  <Input
                    id="wechatId"
                    type="text"
                    placeholder="请输入微信号"
                    {...wechatForm.register("wechatId")}
                    disabled={isLoading}
                  />
                  {wechatForm.formState.errors.wechatId && (
                    <p className="text-sm text-destructive">
                      {wechatForm.formState.errors.wechatId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wechatPassword">密码</Label>
                  <div className="relative">
                    <Input
                      id="wechatPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      {...wechatForm.register("password")}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {wechatForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {wechatForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {passwordLoginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    "登录"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                或者
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
          >
            使用 Manus 账号登录
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            还没有账户？{" "}
            <Link href="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
