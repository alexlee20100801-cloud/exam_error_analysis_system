import { useState, useEffect } from "react";
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
import { Loader2, BookOpen, Eye, EyeOff, Check, X, Smartphone, User, MessageSquare } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

// 用户名注册表单验证
const usernameRegisterSchema = z
  .object({
    username: z
      .string()
      .min(3, "用户名至少3个字符")
      .max(20, "用户名最多20个字符")
      .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
    email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
    name: z.string().max(50, "姓名最多50个字符").optional().or(z.literal("")),
    password: z
      .string()
      .min(6, "密码至少6个字符")
      .max(50, "密码最多50个字符")
      .regex(/[a-zA-Z]/, "密码必须包含字母")
      .regex(/[0-9]/, "密码必须包含数字"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

// 手机号注册表单验证
const phoneRegisterSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
  code: z.string().length(6, "验证码必须是6位数字"),
  name: z.string().max(50, "姓名最多50个字符").optional().or(z.literal("")),
});

// 微信号注册表单验证
const wechatRegisterSchema = z
  .object({
    wechatId: z.string().min(1, "请输入微信号"),
    name: z.string().max(50, "姓名最多50个字符").optional().or(z.literal("")),
    password: z
      .string()
      .min(6, "密码至少6个字符")
      .max(50, "密码最多50个字符")
      .regex(/[a-zA-Z]/, "密码必须包含字母")
      .regex(/[0-9]/, "密码必须包含数字"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type UsernameRegisterFormData = z.infer<typeof usernameRegisterSchema>;
type PhoneRegisterFormData = z.infer<typeof phoneRegisterSchema>;
type WechatRegisterFormData = z.infer<typeof wechatRegisterSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("username");
  const [countdown, setCountdown] = useState(0);

  // 用户名注册表单
  const usernameForm = useForm<UsernameRegisterFormData>({
    resolver: zodResolver(usernameRegisterSchema),
    mode: "onChange",
  });

  // 手机号注册表单
  const phoneForm = useForm<PhoneRegisterFormData>({
    resolver: zodResolver(phoneRegisterSchema),
  });

  // 微信号注册表单
  const wechatForm = useForm<WechatRegisterFormData>({
    resolver: zodResolver(wechatRegisterSchema),
    mode: "onChange",
  });

  const username = usernameForm.watch("username");
  const debouncedUsername = useDebounce(username, 500);

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 检查用户名是否可用
  const { data: usernameCheck, isLoading: checkingUsername } =
    trpc.passwordAuth.checkUsername.useQuery(
      { username: debouncedUsername },
      {
        enabled: !!debouncedUsername && debouncedUsername.length >= 3,
      }
    );

  // 用户名注册
  const usernameRegisterMutation = trpc.passwordAuth.register.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err) => {
      setError(err.message || "注册失败，请重试");
    },
  });

  // 发送验证码
  const sendCodeMutation = trpc.smsAuth.sendCode.useMutation({
    onSuccess: () => {
      setCountdown(60);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || "发送验证码失败");
    },
  });

  // 手机号注册
  const phoneRegisterMutation = trpc.smsAuth.register.useMutation({
    onSuccess: () => {
      setLocation("/login");
    },
    onError: (err) => {
      setError(err.message || "注册失败，请重试");
    },
  });

  const onUsernameSubmit = (data: UsernameRegisterFormData) => {
    setError(null);
    usernameRegisterMutation.mutate({
      username: data.username,
      password: data.password,
      confirmPassword: data.confirmPassword,
      email: data.email || undefined,
      name: data.name || undefined,
    });
  };

  const onPhoneSubmit = (data: PhoneRegisterFormData) => {
    setError(null);
    phoneRegisterMutation.mutate({
      phone: data.phone,
      code: data.code,
      name: data.name || undefined,
    });
  };

  const onWechatSubmit = (data: WechatRegisterFormData) => {
    setError(null);
    // 微信号注册实际上使用用户名注册接口
    usernameRegisterMutation.mutate({
      username: data.wechatId,
      password: data.password,
      confirmPassword: data.confirmPassword,
      name: data.name || undefined,
    });
  };

  const handleSendCode = () => {
    const phone = phoneForm.getValues("phone");
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    sendCodeMutation.mutate({ phone, type: "register" });
  };

  // 密码强度指示器
  const password = usernameForm.watch("password") || wechatForm.watch("password");
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, text: "", color: "" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, text: "弱", color: "bg-red-500" };
    if (score <= 3) return { level: 2, text: "中", color: "bg-yellow-500" };
    return { level: 3, text: "强", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password || "");
  const isLoading = usernameRegisterMutation.isPending || phoneRegisterMutation.isPending || sendCodeMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">创建账户</CardTitle>
          <CardDescription>
            注册一个新的错题分析学习系统账户
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
              <TabsTrigger value="username" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">用户名</span>
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">手机号</span>
              </TabsTrigger>
              <TabsTrigger value="wechat" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">微信号</span>
              </TabsTrigger>
            </TabsList>

            {/* 用户名注册 */}
            <TabsContent value="username">
              <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名 *</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入用户名"
                      {...usernameForm.register("username")}
                      disabled={isLoading}
                    />
                    {debouncedUsername && debouncedUsername.length >= 3 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : usernameCheck?.available ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {usernameForm.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {usernameForm.formState.errors.username.message}
                    </p>
                  )}
                  {usernameCheck && !usernameCheck.available && (
                    <p className="text-sm text-destructive">
                      {usernameCheck.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">姓名（可选）</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="请输入您的姓名"
                    {...usernameForm.register("name")}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">邮箱（可选）</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入邮箱地址"
                    {...usernameForm.register("email")}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">密码 *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      {...usernameForm.register("password")}
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
                  {usernameForm.watch("password") && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${passwordStrength.color}`}
                          style={{
                            width: `${(passwordStrength.level / 3) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {passwordStrength.text}
                      </span>
                    </div>
                  )}
                  {usernameForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {usernameForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码 *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="请再次输入密码"
                      {...usernameForm.register("confirmPassword")}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {usernameForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {usernameForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || (usernameCheck && !usernameCheck.available)}
                >
                  {usernameRegisterMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    "注册"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 手机号注册 */}
            <TabsContent value="phone">
              <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号 *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="code">验证码 *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      type="text"
                      placeholder="请输入验证码"
                      maxLength={6}
                      {...phoneForm.register("code")}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || sendCodeMutation.isPending}
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

                <div className="space-y-2">
                  <Label htmlFor="phoneName">姓名（可选）</Label>
                  <Input
                    id="phoneName"
                    type="text"
                    placeholder="请输入您的姓名"
                    {...phoneForm.register("name")}
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {phoneRegisterMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    "注册"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 微信号注册 */}
            <TabsContent value="wechat">
              <form onSubmit={wechatForm.handleSubmit(onWechatSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wechatId">微信号 *</Label>
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
                  <Label htmlFor="wechatName">姓名（可选）</Label>
                  <Input
                    id="wechatName"
                    type="text"
                    placeholder="请输入您的姓名"
                    {...wechatForm.register("name")}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wechatPassword">密码 *</Label>
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
                  {wechatForm.watch("password") && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${getPasswordStrength(wechatForm.watch("password") || "").color}`}
                          style={{
                            width: `${(getPasswordStrength(wechatForm.watch("password") || "").level / 3) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getPasswordStrength(wechatForm.watch("password") || "").text}
                      </span>
                    </div>
                  )}
                  {wechatForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {wechatForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wechatConfirmPassword">确认密码 *</Label>
                  <div className="relative">
                    <Input
                      id="wechatConfirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="请再次输入密码"
                      {...wechatForm.register("confirmPassword")}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {wechatForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {wechatForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {usernameRegisterMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    "注册"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            已有账户？{" "}
            <Link href="/login" className="text-primary hover:underline">
              立即登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
