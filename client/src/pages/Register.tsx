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
import { Loader2, BookOpen, Eye, EyeOff, Check, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const registerSchema = z
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

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const username = watch("username");
  const debouncedUsername = useDebounce(username, 500);

  // 检查用户名是否可用
  const { data: usernameCheck, isLoading: checkingUsername } =
    trpc.passwordAuth.checkUsername.useQuery(
      { username: debouncedUsername },
      {
        enabled: !!debouncedUsername && debouncedUsername.length >= 3,
      }
    );

  const registerMutation = trpc.passwordAuth.register.useMutation({
    onSuccess: () => {
      // 注册成功，跳转到首页
      window.location.href = "/";
    },
    onError: (err) => {
      setError(err.message || "注册失败，请重试");
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    setError(null);
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      confirmPassword: data.confirmPassword,
      email: data.email || undefined,
      name: data.name || undefined,
    });
  };

  // 密码强度指示器
  const password = watch("password");
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  {...register("username")}
                  disabled={registerMutation.isPending}
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
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username.message}
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
                {...register("name")}
                disabled={registerMutation.isPending}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱（可选）</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱地址"
                {...register("email")}
                disabled={registerMutation.isPending}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  {...register("password")}
                  disabled={registerMutation.isPending}
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
              {password && (
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
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                密码需要6-50个字符，包含字母和数字
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码 *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="请再次输入密码"
                  {...register("confirmPassword")}
                  disabled={registerMutation.isPending}
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
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending || (usernameCheck && !usernameCheck.available)}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                "注册"
              )}
            </Button>
          </form>
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
