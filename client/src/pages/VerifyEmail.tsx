import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 验证令牌
  const verifyMutation = trpc.emailVerification.verifyToken.useMutation({
    onSuccess: (data) => {
      setVerificationResult(data);
    },
    onError: (error) => {
      setVerificationResult({
        success: false,
        message: error.message || "验证失败，请稍后重试",
      });
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token });
    }
  }, [token]);

  const handleGoHome = () => {
    setLocation("/");
  };

  const handleGoToSettings = () => {
    setLocation("/learning-report");
  };

  if (verifyMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <CardTitle>正在验证邮箱</CardTitle>
            <CardDescription>请稍候...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!verificationResult) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>验证链接无效</CardTitle>
            <CardDescription>请检查链接是否完整或重新发送验证邮件</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleGoHome}>返回首页</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              verificationResult.success ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {verificationResult.success ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>
          <CardTitle>
            {verificationResult.success ? "邮箱验证成功！" : "验证失败"}
          </CardTitle>
          <CardDescription>{verificationResult.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {verificationResult.success ? (
            <>
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                <div className="flex items-start gap-2">
                  <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">您现在可以接收邮件通知了！</p>
                    <p className="text-xs">
                      系统将通过邮件向您发送复习提醒、学习报告等重要通知。
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGoHome} variant="outline" className="flex-1">
                  返回首页
                </Button>
                <Button onClick={handleGoToSettings} className="flex-1">
                  通知设置
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium mb-1">可能的原因：</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>验证链接已过期（有效期24小时）</li>
                  <li>验证链接已被使用</li>
                  <li>验证链接不完整或已损坏</li>
                </ul>
              </div>
              <Button onClick={handleGoToSettings} className="w-full">
                重新发送验证邮件
              </Button>
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                返回首页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
