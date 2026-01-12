import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Settings, MessageSquare, Mail, Phone, Bell, Shield, Eye, EyeOff,
  Loader2, Check, X, Send, RefreshCw, AlertTriangle, Info, ExternalLink,
  Smartphone, Globe, Key, Lock, CheckCircle2, XCircle
} from 'lucide-react';

// 服务状态类型
type ServiceStatus = 'configured' | 'not_configured' | 'error' | 'testing';

// 微信图标组件
const WechatIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
  </svg>
);

// 阿里云图标组件
const AliyunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M2.4 8.4h19.2v7.2H2.4z" opacity=".3"/>
    <path d="M21.6 6H2.4C1.08 6 0 7.08 0 8.4v7.2c0 1.32 1.08 2.4 2.4 2.4h19.2c1.32 0 2.4-1.08 2.4-2.4V8.4c0-1.32-1.08-2.4-2.4-2.4zm0 9.6H2.4V8.4h19.2v7.2z"/>
    <path d="M6 10.8h2.4v2.4H6zm4.8 0h2.4v2.4h-2.4zm4.8 0H18v2.4h-2.4z"/>
  </svg>
);

export default function NotificationServiceSettings() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('wechat');
  
  // 密码可见性状态
  const [showWechatSecret, setShowWechatSecret] = useState(false);
  const [showAliyunSecret, setShowAliyunSecret] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  
  // 微信公众号配置
  const [wechatConfig, setWechatConfig] = useState({
    appId: '',
    appSecret: '',
    templateId: '',
    enabled: false,
  });
  
  // 阿里云短信配置
  const [aliyunSmsConfig, setAliyunSmsConfig] = useState({
    accessKeyId: '',
    accessKeySecret: '',
    signName: '',
    templateCode: '',
    enabled: false,
  });
  
  // SMTP邮件配置
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 465,
    secure: true,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    enabled: false,
  });
  
  // 服务状态
  const [serviceStatus, setServiceStatus] = useState<{
    wechat: ServiceStatus;
    aliyunSms: ServiceStatus;
    smtp: ServiceStatus;
  }>({
    wechat: 'not_configured',
    aliyunSms: 'not_configured',
    smtp: 'not_configured',
  });
  
  // 测试状态
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testWechatOpenId, setTestWechatOpenId] = useState('');
  
  // 获取通知服务配置
  const { data: notificationConfig, isLoading: loadingConfig, refetch: refetchConfig } = 
    trpc.notificationService.getServiceConfig.useQuery(undefined, {
      enabled: !!user,
    });
  
  // 保存配置
  const saveConfigMutation = trpc.notificationService.saveServiceConfig.useMutation({
    onSuccess: () => {
      toast.success('配置已保存');
      refetchConfig();
    },
    onError: (err) => {
      toast.error(err.message || '保存失败');
    },
  });
  
  // 测试通知发送
  const testNotificationMutation = trpc.notificationService.testNotification.useMutation({
    onSuccess: (data) => {
      setTestingService(null);
      if (data.success) {
        toast.success('测试通知发送成功！');
      } else {
        toast.error(data.message || '测试发送失败');
      }
    },
    onError: (err) => {
      setTestingService(null);
      toast.error(err.message || '测试发送失败');
    },
  });
  
  // 加载配置
  useEffect(() => {
    if (notificationConfig) {
      if (notificationConfig.wechat) {
        setWechatConfig({
          appId: notificationConfig.wechat.appId || '',
          appSecret: notificationConfig.wechat.appSecret || '',
          templateId: notificationConfig.wechat.templateId || '',
          enabled: notificationConfig.wechat.enabled || false,
        });
        setServiceStatus(prev => ({
          ...prev,
          wechat: notificationConfig.wechat.appId ? 'configured' : 'not_configured',
        }));
      }
      if (notificationConfig.aliyunSms) {
        setAliyunSmsConfig({
          accessKeyId: notificationConfig.aliyunSms.accessKeyId || '',
          accessKeySecret: notificationConfig.aliyunSms.accessKeySecret || '',
          signName: notificationConfig.aliyunSms.signName || '',
          templateCode: notificationConfig.aliyunSms.templateCode || '',
          enabled: notificationConfig.aliyunSms.enabled || false,
        });
        setServiceStatus(prev => ({
          ...prev,
          aliyunSms: notificationConfig.aliyunSms.accessKeyId ? 'configured' : 'not_configured',
        }));
      }
      if (notificationConfig.smtp) {
        setSmtpConfig({
          host: notificationConfig.smtp.host || '',
          port: notificationConfig.smtp.port || 465,
          secure: notificationConfig.smtp.secure ?? true,
          username: notificationConfig.smtp.username || '',
          password: notificationConfig.smtp.password || '',
          fromEmail: notificationConfig.smtp.fromEmail || '',
          fromName: notificationConfig.smtp.fromName || '',
          enabled: notificationConfig.smtp.enabled || false,
        });
        setServiceStatus(prev => ({
          ...prev,
          smtp: notificationConfig.smtp.host ? 'configured' : 'not_configured',
        }));
      }
    }
  }, [notificationConfig]);
  
  // 保存微信配置
  const handleSaveWechat = () => {
    saveConfigMutation.mutate({
      service: 'wechat',
      config: wechatConfig,
    });
  };
  
  // 保存阿里云短信配置
  const handleSaveAliyunSms = () => {
    saveConfigMutation.mutate({
      service: 'aliyunSms',
      config: aliyunSmsConfig,
    });
  };
  
  // 保存SMTP配置
  const handleSaveSmtp = () => {
    saveConfigMutation.mutate({
      service: 'smtp',
      config: smtpConfig,
    });
  };
  
  // 测试微信通知
  const handleTestWechat = () => {
    if (!testWechatOpenId) {
      toast.error('请输入测试用的OpenID');
      return;
    }
    setTestingService('wechat');
    testNotificationMutation.mutate({
      service: 'wechat',
      recipient: testWechatOpenId,
      testMessage: '这是一条测试通知消息',
    });
  };
  
  // 测试短信
  const handleTestSms = () => {
    if (!testPhone) {
      toast.error('请输入测试手机号');
      return;
    }
    setTestingService('aliyunSms');
    testNotificationMutation.mutate({
      service: 'aliyunSms',
      recipient: testPhone,
      testMessage: '这是一条测试短信',
    });
  };
  
  // 测试邮件
  const handleTestEmail = () => {
    if (!testEmail) {
      toast.error('请输入测试邮箱');
      return;
    }
    setTestingService('smtp');
    testNotificationMutation.mutate({
      service: 'smtp',
      recipient: testEmail,
      testMessage: '这是一封测试邮件',
    });
  };
  
  // 获取状态徽章
  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'configured':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />已配置</Badge>;
      case 'not_configured':
        return <Badge variant="secondary"><Info className="h-3 w-3 mr-1" />未配置</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />配置错误</Badge>;
      case 'testing':
        return <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1 animate-spin" />测试中</Badge>;
      default:
        return null;
    }
  };
  
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!user) {
    setLocation('/login');
    return null;
  }
  
  // 检查是否是管理员
  if (user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">权限不足</h2>
          <p className="text-muted-foreground">只有管理员可以配置通知服务</p>
          <Button variant="outline" onClick={() => setLocation('/settings')}>
            返回设置
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              通知服务配置
            </h1>
            <p className="text-muted-foreground mt-1">
              配置微信公众号、阿里云短信、邮件等通知渠道
            </p>
          </div>
        </div>
        
        {/* 服务状态概览 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <WechatIcon />
                微信公众号
              </CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">微信模板消息</CardTitle>
                {getStatusBadge(serviceStatus.wechat)}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                阿里云短信
              </CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">短信通知</CardTitle>
                {getStatusBadge(serviceStatus.aliyunSms)}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                SMTP邮件
              </CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">邮件通知</CardTitle>
                {getStatusBadge(serviceStatus.smtp)}
              </div>
            </CardHeader>
          </Card>
        </div>
        
        {/* 配置标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wechat" className="flex items-center gap-2">
              <WechatIcon />
              微信公众号
            </TabsTrigger>
            <TabsTrigger value="aliyunSms" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              阿里云短信
            </TabsTrigger>
            <TabsTrigger value="smtp" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              SMTP邮件
            </TabsTrigger>
          </TabsList>
          
          {/* 微信公众号配置 */}
          <TabsContent value="wechat" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <WechatIcon />
                  微信公众号配置
                </CardTitle>
                <CardDescription>
                  配置微信公众号的AppID和AppSecret，用于发送模板消息
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>获取配置信息</AlertTitle>
                  <AlertDescription>
                    请登录<a href="https://mp.weixin.qq.com" target="_blank" rel="noopener noreferrer" className="text-primary underline mx-1">微信公众平台</a>
                    ，在「开发」-「基本配置」中获取AppID和AppSecret
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wechat-appid">AppID（应用ID）</Label>
                    <Input
                      id="wechat-appid"
                      placeholder="wx1234567890abcdef"
                      value={wechatConfig.appId}
                      onChange={(e) => setWechatConfig({ ...wechatConfig, appId: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wechat-secret">AppSecret（应用密钥）</Label>
                    <div className="relative">
                      <Input
                        id="wechat-secret"
                        type={showWechatSecret ? 'text' : 'password'}
                        placeholder="••••••••••••••••••••••••••••••••"
                        value={wechatConfig.appSecret}
                        onChange={(e) => setWechatConfig({ ...wechatConfig, appSecret: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowWechatSecret(!showWechatSecret)}
                      >
                        {showWechatSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wechat-template">模板消息ID</Label>
                    <Input
                      id="wechat-template"
                      placeholder="TEMPLATE_ID_1234567890"
                      value={wechatConfig.templateId}
                      onChange={(e) => setWechatConfig({ ...wechatConfig, templateId: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      在公众号后台「模板消息」中添加模板后获取
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">启用微信通知</p>
                      <p className="text-sm text-muted-foreground">开启后将通过微信公众号发送通知</p>
                    </div>
                    <Switch
                      checked={wechatConfig.enabled}
                      onCheckedChange={(checked) => setWechatConfig({ ...wechatConfig, enabled: checked })}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleSaveWechat}
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  保存配置
                </Button>
              </CardFooter>
            </Card>
            
            {/* 微信测试发送 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">测试发送</CardTitle>
                <CardDescription>验证微信通知配置是否正确</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>测试用户OpenID</Label>
                  <Input
                    placeholder="输入要接收测试消息的用户OpenID"
                    value={testWechatOpenId}
                    onChange={(e) => setTestWechatOpenId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    可以在公众号后台「用户管理」中查看关注用户的OpenID
                  </p>
                </div>
                <Button
                  onClick={handleTestWechat}
                  disabled={testingService === 'wechat' || !wechatConfig.appId}
                >
                  {testingService === 'wechat' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  发送测试消息
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 阿里云短信配置 */}
          <TabsContent value="aliyunSms" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AliyunIcon />
                  阿里云短信配置
                </CardTitle>
                <CardDescription>
                  配置阿里云短信服务的AccessKey，用于发送短信通知
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>获取配置信息</AlertTitle>
                  <AlertDescription>
                    请登录<a href="https://ram.console.aliyun.com/manage/ak" target="_blank" rel="noopener noreferrer" className="text-primary underline mx-1">阿里云RAM控制台</a>
                    创建AccessKey，并在<a href="https://dysms.console.aliyun.com" target="_blank" rel="noopener noreferrer" className="text-primary underline mx-1">短信服务控制台</a>
                    配置签名和模板
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aliyun-keyid">AccessKey ID</Label>
                    <Input
                      id="aliyun-keyid"
                      placeholder="LTAI5txxxxxxxxxxxxxxxxxx"
                      value={aliyunSmsConfig.accessKeyId}
                      onChange={(e) => setAliyunSmsConfig({ ...aliyunSmsConfig, accessKeyId: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="aliyun-secret">AccessKey Secret</Label>
                    <div className="relative">
                      <Input
                        id="aliyun-secret"
                        type={showAliyunSecret ? 'text' : 'password'}
                        placeholder="••••••••••••••••••••••••••••••••"
                        value={aliyunSmsConfig.accessKeySecret}
                        onChange={(e) => setAliyunSmsConfig({ ...aliyunSmsConfig, accessKeySecret: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowAliyunSecret(!showAliyunSecret)}
                      >
                        {showAliyunSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="aliyun-sign">短信签名</Label>
                    <Input
                      id="aliyun-sign"
                      placeholder="例如：错题分析系统"
                      value={aliyunSmsConfig.signName}
                      onChange={(e) => setAliyunSmsConfig({ ...aliyunSmsConfig, signName: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      需要在阿里云短信控制台申请并审核通过的签名
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="aliyun-template">短信模板CODE</Label>
                    <Input
                      id="aliyun-template"
                      placeholder="SMS_123456789"
                      value={aliyunSmsConfig.templateCode}
                      onChange={(e) => setAliyunSmsConfig({ ...aliyunSmsConfig, templateCode: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      需要在阿里云短信控制台申请并审核通过的模板
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">启用短信通知</p>
                      <p className="text-sm text-muted-foreground">开启后将通过阿里云短信发送通知</p>
                    </div>
                    <Switch
                      checked={aliyunSmsConfig.enabled}
                      onCheckedChange={(checked) => setAliyunSmsConfig({ ...aliyunSmsConfig, enabled: checked })}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleSaveAliyunSms}
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  保存配置
                </Button>
              </CardFooter>
            </Card>
            
            {/* 短信测试发送 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">测试发送</CardTitle>
                <CardDescription>验证短信通知配置是否正确</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>测试手机号</Label>
                  <Input
                    placeholder="输入要接收测试短信的手机号"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleTestSms}
                  disabled={testingService === 'aliyunSms' || !aliyunSmsConfig.accessKeyId}
                >
                  {testingService === 'aliyunSms' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  发送测试短信
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* SMTP邮件配置 */}
          <TabsContent value="smtp" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  SMTP邮件配置
                </CardTitle>
                <CardDescription>
                  配置SMTP服务器信息，用于发送邮件通知
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>常用SMTP服务器</AlertTitle>
                  <AlertDescription>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>QQ邮箱: smtp.qq.com (端口465/SSL)</li>
                      <li>163邮箱: smtp.163.com (端口465/SSL)</li>
                      <li>Gmail: smtp.gmail.com (端口587/TLS)</li>
                      <li>阿里企业邮箱: smtp.mxhichina.com (端口465/SSL)</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP服务器</Label>
                    <Input
                      id="smtp-host"
                      placeholder="smtp.example.com"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">端口</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      placeholder="465"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 465 })}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">使用SSL/TLS加密</p>
                    <p className="text-sm text-muted-foreground">推荐开启以确保传输安全</p>
                  </div>
                  <Switch
                    checked={smtpConfig.secure}
                    onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, secure: checked })}
                  />
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-username">用户名/邮箱</Label>
                    <Input
                      id="smtp-username"
                      placeholder="your@email.com"
                      value={smtpConfig.username}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">密码/授权码</Label>
                    <div className="relative">
                      <Input
                        id="smtp-password"
                        type={showSmtpPassword ? 'text' : 'password'}
                        placeholder="••••••••••••••••"
                        value={smtpConfig.password}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      >
                        {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      部分邮箱需要使用授权码而非登录密码
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-from-email">发件人邮箱</Label>
                    <Input
                      id="smtp-from-email"
                      placeholder="noreply@example.com"
                      value={smtpConfig.fromEmail}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtp-from-name">发件人名称</Label>
                    <Input
                      id="smtp-from-name"
                      placeholder="错题分析系统"
                      value={smtpConfig.fromName}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">启用邮件通知</p>
                    <p className="text-sm text-muted-foreground">开启后将通过邮件发送通知</p>
                  </div>
                  <Switch
                    checked={smtpConfig.enabled}
                    onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, enabled: checked })}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleSaveSmtp}
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  保存配置
                </Button>
              </CardFooter>
            </Card>
            
            {/* 邮件测试发送 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">测试发送</CardTitle>
                <CardDescription>验证邮件通知配置是否正确</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>测试邮箱</Label>
                  <Input
                    type="email"
                    placeholder="输入要接收测试邮件的邮箱地址"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleTestEmail}
                  disabled={testingService === 'smtp' || !smtpConfig.host}
                >
                  {testingService === 'smtp' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  发送测试邮件
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* 安全提示 */}
        <Alert variant="default">
          <Shield className="h-4 w-4" />
          <AlertTitle>安全提示</AlertTitle>
          <AlertDescription>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 所有密钥信息将加密存储，不会明文显示</li>
              <li>• 建议为通知服务创建专用的API密钥，并设置最小权限</li>
              <li>• 定期更换密钥以确保安全</li>
              <li>• 不要在公共场合或不安全的网络环境下配置密钥</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}
