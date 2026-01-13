import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const forgotPasswordMutation = trpc.authLocal.forgotPassword.useMutation({
    onSuccess: (data) => {
      setMessage(data.message);
      setIsLoading(false);
    },
    onError: (error) => {
      setMessage(error.message || "请求失败");
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    forgotPasswordMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold">忘记密码</CardTitle>
          <CardDescription>输入您的邮箱地址，我们将发送密码重置链接</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <Alert className={message.includes("已发送") ? "bg-green-50" : "bg-red-50"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                邮箱地址
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              发送重置链接
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">想起密码了？</span>
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
              >
                返回登录
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
